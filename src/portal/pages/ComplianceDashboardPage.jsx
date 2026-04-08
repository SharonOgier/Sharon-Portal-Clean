import React, { useMemo } from "react";
import { useTerminology } from "../TerminologyContext";

export default function ComplianceDashboardPage(props) {
  const {
    chemicalRecords = [],
    livestockRecords = [],
    jobs = [],
    properties = [],
    colours = {},
    cardStyle = {},
    SectionCard,
    MetricCard,
    DataTable,
    DashboardHero,
    InsightChip,
    formatDateAU = (v) => v || "",
    todayLocal = () => new Date().toISOString().slice(0, 10),
  } = props;

  const { t } = useTerminology();
  const today = todayLocal();

  const propertyMap = useMemo(() => {
    const map = new Map();
    (properties || []).forEach((p) => map.set(String(p.id), p));
    return map;
  }, [properties]);

  // Chemical Compliance Logic
  const activeChemicalWHP = useMemo(() => {
    return chemicalRecords.filter(r => !r.archived && r.withholdingEndDate && r.withholdingEndDate >= today);
  }, [chemicalRecords, today]);

  // Livestock Compliance Logic
  const activeLivestockWHP = useMemo(() => {
    return livestockRecords.filter(r => !r.archived && r.kind === "treatment" && r.withholdingEndDate && r.withholdingEndDate >= today);
  }, [livestockRecords, today]);

  // Compliance Audit Logic
  const auditAlerts = useMemo(() => {
    const alerts = [];

    // Check jobs for spray/chemical keywords without records
    const chemicalKeywords = ['spray', 'roundup', 'herbicide', 'pesticide', 'chemical'];
    const chemicalJobs = jobs.filter(j => {
      const text = `${j.title} ${j.notes}`.toLowerCase();
      return chemicalKeywords.some(k => text.includes(k));
    });

    chemicalJobs.forEach(j => {
      const jobDate = j.startDate || j.date;
      const hasRecord = chemicalRecords.some(r => {
        const recordDate = r.date;
        return Math.abs(new Date(jobDate) - new Date(recordDate)) <= (2 * 24 * 60 * 60 * 1000); // 2 day window
      });
      if (!hasRecord) {
        alerts.push({
          id: `chem-audit-${j.id}`,
          type: "Warning",
          category: "Chemical",
          message: `Job "${j.title}" mentions spraying but no chemical record found within 2 days.`,
          date: jobDate
        });
      }
    });

    // Check jobs for livestock treatment keywords without records
    const livestockKeywords = ['drench', 'vaccinate', 'vaccine', 'treatment', 'dip'];
    const livestockJobs = jobs.filter(j => {
      const text = `${j.title} ${j.notes}`.toLowerCase();
      return livestockKeywords.some(k => text.includes(k));
    });

    livestockJobs.forEach(j => {
      const jobDate = j.startDate || j.date;
      const hasRecord = livestockRecords.some(r => {
        const recordDate = r.date;
        return r.kind === "treatment" && Math.abs(new Date(jobDate) - new Date(recordDate)) <= (2 * 24 * 60 * 60 * 1000);
      });
      if (!hasRecord) {
        alerts.push({
          id: `live-audit-${j.id}`,
          type: "Warning",
          category: "Livestock",
          message: `Job "${j.title}" mentions treatment but no livestock treatment record found within 2 days.`,
          date: jobDate
        });
      }
    });

    return alerts;
  }, [jobs, chemicalRecords, livestockRecords]);

  const nlisStatus = activeLivestockWHP.length > 0 ? "❌ Mob cannot be sold" : "✔ All clear";

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero
        title="Compliance Dashboard"
        subtitle="Single view of chemical, livestock and NLIS compliance status."
        highlight={auditAlerts.length > 0 ? "❌ Action Required" : "✔ Compliant"}
      >
        <InsightChip label="Active WHP" value={String(activeChemicalWHP.length)} />
        <InsightChip label="Livestock WHP" value={String(activeLivestockWHP.length)} />
        <InsightChip label="Audit Alerts" value={String(auditAlerts.length)} />
      </DashboardHero>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <MetricCard
          title="Chemical Status"
          value={activeChemicalWHP.length > 0 ? "❌ Restricted" : "✔ Clear"}
          subtitle={`${activeChemicalWHP.length} paddocks under WHP`}
          accent={activeChemicalWHP.length > 0 ? "#DC2626" : colours.teal}
        />
        <MetricCard
          title="Livestock Status"
          value={activeLivestockWHP.length > 0 ? "❌ Restricted" : "✔ Clear"}
          subtitle={`${activeLivestockWHP.length} mobs under WHP/ESI`}
          accent={activeLivestockWHP.length > 0 ? "#DC2626" : colours.teal}
        />
        <MetricCard
          title="NLIS Sale Status"
          value={nlisStatus}
          subtitle={activeLivestockWHP.length > 0 ? "Active withholding periods detectd" : "No active withholding detected"}
          accent={activeLivestockWHP.length > 0 ? "#DC2626" : colours.teal}
        />
      </div>

      <SectionCard title="Active Withholding Periods (WHP)">
        <DataTable
          emptyState={{
            icon: "✔",
            title: "No active withholding",
            message: "All paddocks and locations are currently clear of chemical withholding periods.",
          }}
          columns={[
            { key: "date", label: "Applied", render: (v) => formatDateAU(v) },
            { key: "propertyId", label: "Location", render: (v) => propertyMap.get(String(v))?.name || "Unknown" },
            { key: "chemicalProductName", label: "Product" },
            { key: "withholdingEndDate", label: "Clear Date", render: (v) => formatDateAU(v) },
          ]}
          rows={activeChemicalWHP}
        />
      </SectionCard>

      <SectionCard title="Livestock Withholding & ESI">
        <DataTable
          emptyState={{
            icon: "🐄",
            title: "No livestock restricted",
            message: "No mobs are currently under withholding periods or export slaughter intervals.",
          }}
          columns={[
            { key: "date", label: "Date", render: (v) => formatDateAU(v) },
            { key: "mobName", label: "Mob" },
            { key: "productUsed", label: "Treatment" },
            { key: "withholdingEndDate", label: "Clear Date", render: (v) => formatDateAU(v) },
          ]}
          rows={activeLivestockWHP}
        />
      </SectionCard>

      <SectionCard title="Compliance Audit Trail">
        <DataTable
          emptyState={{
            icon: "✔",
            title: "Audit Clean",
            message: "No missing compliance records identified from job descriptions.",
          }}
          columns={[
            { key: "date", label: "Job Date", render: (v) => formatDateAU(v) },
            { key: "category", label: "Category" },
            { key: "message", label: "Issue" },
            { key: "type", label: "Level" },
          ]}
          rows={auditAlerts}
        />
      </SectionCard>
    </div>
  );
}
