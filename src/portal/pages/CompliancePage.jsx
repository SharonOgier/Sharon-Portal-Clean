import React, { useMemo } from "react";
import {
  SectionCard,
  DashboardHero,
  InsightChip,
  DataTable,
  EmptyState,
} from "../PortalComponents";
import {
  formatDateAU,
  todayLocal,
  parseLocalDate,
  colours,
} from "../PortalHelpers";
import { useTerminology } from "../TerminologyContext";

export default function CompliancePage({
  chemicalRecords = [],
  livestockRecords = [],
  jobs = [],
  properties = [],
}) {
  const { t } = useTerminology();
  const today = todayLocal();

  // 1. Chemical Compliance Logic
  const chemicalAlerts = useMemo(() => {
    return chemicalRecords
      .filter((r) => !r.archived && r.withholdingEndDate && r.withholdingEndDate > today)
      .map((r) => {
        const prop = properties.find((p) => String(p.id) === String(r.propertyId));
        return {
          id: r.id,
          type: "Chemical WHP",
          location: prop ? prop.name : "Unknown Property",
          details: r.chemicalName || "Chemical Treatment",
          expiry: r.withholdingEndDate,
          status: "Active WHP",
        };
      });
  }, [chemicalRecords, properties, today]);

  // 2. Livestock Compliance Logic
  const livestockAlerts = useMemo(() => {
    return livestockRecords
      .filter((r) => !r.archived)
      .filter((r) => {
        const whpActive = r.withholdingEndDate && r.withholdingEndDate > today;
        const esiActive = r.esiEndDate && r.esiEndDate > today;
        return whpActive || esiActive;
      })
      .map((r) => {
        const prop = properties.find((p) => String(p.id) === String(r.propertyId));
        const activeDates = [];
        if (r.withholdingEndDate && r.withholdingEndDate > today) activeDates.push(`WHP: ${formatDateAU(r.withholdingEndDate)}`);
        if (r.esiEndDate && r.esiEndDate > today) activeDates.push(`ESI: ${formatDateAU(r.esiEndDate)}`);

        return {
          id: r.id,
          type: "Livestock WHP",
          location: prop ? prop.name : "Unknown Property",
          details: `${r.mobName || "Mob"} - ${r.treatment || "Treatment"}`,
          expiry: r.withholdingEndDate > (r.esiEndDate || "") ? r.withholdingEndDate : (r.esiEndDate || r.withholdingEndDate),
          status: activeDates.join(", "),
        };
      });
  }, [livestockRecords, properties, today]);

  // 3. NLIS Status (Simulated/Basic logic based on available data)
  // In a real app, this might check for missing movement IDs or dates
  const nlisAlerts = useMemo(() => {
    return livestockRecords
      .filter(r => !r.archived && r.type === 'movement' && !r.nlisTransferId)
      .map(r => ({
        id: r.id,
        type: "NLIS Transfer",
        location: "Movement Record",
        details: `Missing NLIS Transfer ID for ${r.mobName || 'Mob'} movement`,
        expiry: "-",
        status: "Action Required"
      }));
  }, [livestockRecords]);

  // 4. Audit Logic: Missing Records
  const auditAlerts = useMemo(() => {
    const chemicalKeywords = ["spray", "pesticide", "herbicide", "fungicide", "chemical", "roundup", "glyphosate"];
    const alerts = [];

    jobs.forEach((job) => {
      const text = `${job.title} ${job.description || ""}`.toLowerCase();
      const mentionsChemical = chemicalKeywords.some((k) => text.includes(k));

      if (mentionsChemical) {
        // Look for a chemical record on the same day and property
        const hasRecord = chemicalRecords.some(
          (r) =>
            !r.archived &&
            r.date === job.startDate &&
            String(r.propertyId) === String(job.propertyId)
        );

        if (!hasRecord) {
          const prop = properties.find((p) => String(p.id) === String(job.propertyId));
          alerts.push({
            id: `audit-${job.id}`,
            type: "Audit Flag",
            location: prop ? prop.name : "Unknown Property",
            details: `Job "${job.title}" mentions chemicals but no spray record exists.`,
            expiry: job.startDate,
            status: "Missing Record",
          });
        }
      }
    });

    return alerts;
  }, [jobs, chemicalRecords, properties]);

  const allAlerts = [...chemicalAlerts, ...livestockAlerts, ...nlisAlerts, ...auditAlerts];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <DashboardHero
        title="Compliance Dashboard"
        subtitle="Consolidated view of chemical withholding, livestock status, and record audits."
        highlight={allAlerts.length > 0 ? "⚠️ Action Required" : "✅ All Clear"}
      >
        <InsightChip label="Active WHPs" value={String(chemicalAlerts.length + livestockAlerts.length)} />
        <InsightChip label="Audit Flags" value={String(auditAlerts.length)} />
        <InsightChip label="NLIS Actions" value={String(nlisAlerts.length)} />
      </DashboardHero>

      <SectionCard title="Active Compliance Alerts">
        {allAlerts.length > 0 ? (
          <DataTable
            columns={[
              { key: "type", label: "Type" },
              { key: "location", label: "Location" },
              { key: "details", label: "Details" },
              { key: "expiry", label: "Critical Date", render: (v) => v === "-" ? "-" : formatDateAU(v) },
              {
                key: "status",
                label: "Status",
                render: (v) => (
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      background: v.includes("Missing") || v.includes("Action") ? "#FEF2F2" : "#FFF7ED",
                      color: v.includes("Missing") || v.includes("Action") ? "#991B1B" : "#92400E",
                    }}
                  >
                    {v}
                  </span>
                ),
              },
            ]}
            rows={allAlerts}
          />
        ) : (
          <EmptyState
            title="No compliance issues"
            description="Your chemical records and livestock movements appear to be up to date."
            icon="✅"
          />
        )}
      </SectionCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <SectionCard title="Withholding Logic Guide">
          <div style={{ fontSize: 14, lineHeight: 1.6, color: colours.text }}>
            <p><strong>Chemical WHP:</strong> Calculated from the last application date plus the product withholding period.</p>
            <p><strong>Livestock ESI:</strong> Export Slaughter Interval must be observed before animals are sold for export.</p>
            <p><strong>Audit Logic:</strong> Our system scans your task titles and descriptions for chemical-related keywords. If a spray task is logged without a corresponding Compliance Record, it will be flagged here.</p>
          </div>
        </SectionCard>

        <SectionCard title="Regulatory Links">
          <div style={{ display: "grid", gap: 12 }}>
            <a href="https://www.integritysystems.com.au/nlis/" target="_blank" rel="noreferrer" style={{ color: colours.purple, fontWeight: 600, textDecoration: "none" }}>NLIS Integrity Systems →</a>
            <a href="https://apvma.gov.au/node/10801" target="_blank" rel="noreferrer" style={{ color: colours.purple, fontWeight: 600, textDecoration: "none" }}>APVMA Withholding Periods →</a>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
