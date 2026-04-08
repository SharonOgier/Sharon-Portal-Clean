import React, { useMemo, useState } from "react";
import { exportToCSV } from "../PortalHelpers";

const WEATHER_OPTIONS = ["Clear", "Cloudy", "Light rain"];

const emptyRecord = {
  id: null,
  date: "",
  propertyId: "",
  subLocationId: "",
  chemicalProductName: "",
  epaRegistrationNumber: "",
  targetPestOrWeed: "",
  rateApplied: "",
  rateUnit: "per hectare",
  totalQuantityUsed: "",
  waterVolume: "",
  withholdingPeriodDays: "",
  reEntryPeriodDays: "",
  windSpeed: "",
  windDirection: "",
  temperature: "",
  operatorName: "",
  operatorId: "",
  equipmentUsed: "",
  weatherConditions: "Clear",
  batchLotNumber: "",
  notes: "",
  archived: false,
};

const toIsoDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const addDays = (dateValue, days) => {
  const base = new Date(dateValue);
  if (Number.isNaN(base.getTime())) return "";
  base.setDate(base.getDate() + Math.max(0, Number(days || 0)));
  return base.toISOString().slice(0, 10);
};

export default function ChemicalRecordsPage(props) {
  const {
    profile = {},
    chemicalRecords = [],
    properties = [],
    jobs = [],
    teamMembers = [],
    subcontractorDisplayNames = [],
    colours,
    cardStyle,
    buttonPrimary,
    buttonSecondary,
    inputStyle,
    labelStyle,
    DashboardHero,
    InsightChip,
    MetricCard,
    SectionCard,
    DataTable,
    EmptyState,
    saveChemicalRecord = async () => null,
    archiveChemicalRecord = async () => false,
    formatDateAU = (v) => v || "",
    safeNumber = (v) => Number(v || 0),
    confirm = ({ onConfirm }) => typeof onConfirm === "function" && onConfirm(),
  } = props;

  const [form, setForm] = useState(emptyRecord);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [withholdingAlert, setWithholdingAlert] = useState("");
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    propertyId: "",
    chemicalName: "",
    operatorName: "",
  });

  const propertyMap = useMemo(() => {
    const map = new Map();
    (properties || []).forEach((p) => map.set(String(p.id), p));
    return map;
  }, [properties]);

  const operatorOptions = useMemo(() => {
    const values = new Set();
    const out = [];
    const ownerName = `${String(profile.firstName || "").trim()} ${String(profile.lastName || "").trim()}`.trim();
    if (ownerName) {
      out.push({ id: "owner", label: ownerName });
      values.add(ownerName.toLowerCase());
    }
    (teamMembers || []).forEach((m) => {
      const label = String(m?.name || m?.fullName || m?.email || m?.member_user_id || "").trim();
      if (!label) return;
      const key = label.toLowerCase();
      if (values.has(key)) return;
      values.add(key);
      out.push({ id: `team-${m.id || label}`, label });
    });
    (subcontractorDisplayNames || []).forEach((label, i) => {
      const clean = String(label || "").trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (values.has(key)) return;
      values.add(key);
      out.push({ id: `sub-${i}`, label: clean });
    });
    return out;
  }, [profile.firstName, profile.lastName, subcontractorDisplayNames, teamMembers]);

  const activeRecords = useMemo(
    () => (Array.isArray(chemicalRecords) ? chemicalRecords : []).filter((r) => !r.archived),
    [chemicalRecords]
  );

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      if (filters.dateFrom && String(record.date || "") < filters.dateFrom) return false;
      if (filters.dateTo && String(record.date || "") > filters.dateTo) return false;
      if (filters.propertyId && String(record.propertyId || "") !== String(filters.propertyId)) return false;
      if (filters.chemicalName && !String(record.chemicalProductName || "").toLowerCase().includes(filters.chemicalName.toLowerCase().trim())) return false;
      if (filters.operatorName && !String(record.operatorName || "").toLowerCase().includes(filters.operatorName.toLowerCase().trim())) return false;
      return true;
    });
  }, [activeRecords, filters]);

  const propertiesWithActiveWithholding = useMemo(() => {
    const today = toIsoDate(new Date());
    return activeRecords
      .filter((r) => String(r.withholdingEndDate || "") >= today)
      .map((r) => ({
        ...r,
        propertyName: propertyMap.get(String(r.propertyId || ""))?.name || "Unknown paddock",
      }));
  }, [activeRecords, propertyMap]);

  const livestockWarningCount = useMemo(() => {
    if (!jobs?.length) return 0;
    return propertiesWithActiveWithholding.reduce((count, record) => {
      const hazardJobs = jobs.filter((job) => {
        const jobDate = String(job.startDate || job.date || "");
        if (!jobDate || jobDate > String(record.withholdingEndDate || "")) return false;
        const sameProperty = String(job.propertyId || "") === String(record.propertyId || "");
        if (!sameProperty) return false;
        const title = `${job.title || ""} ${job.name || ""} ${job.notes || ""}`.toLowerCase();
        return title.includes("livestock") || title.includes("graze") || title.includes("stock");
      });
      return count + hazardJobs.length;
    }, 0);
  }, [jobs, propertiesWithActiveWithholding]);

  const validateForm = (payload) => {
    const requiredMap = [
      ["date", "Date"],
      ["propertyId", "Paddock / Location"],
      ["chemicalProductName", "Chemical product name"],
      ["epaRegistrationNumber", "EPA registration number"],
      ["targetPestOrWeed", "Pest/weed being treated"],
      ["rateApplied", "Rate applied"],
      ["totalQuantityUsed", "Total quantity used"],
      ["waterVolume", "Water volume"],
      ["withholdingPeriodDays", "Withholding period"],
      ["reEntryPeriodDays", "Re-entry period"],
      ["windSpeed", "Wind speed"],
      ["windDirection", "Wind direction"],
      ["temperature", "Temperature"],
      ["operatorName", "Operator name"],
      ["equipmentUsed", "Equipment used"],
      ["weatherConditions", "Weather conditions"],
      ["batchLotNumber", "Batch / lot number"],
    ];
    const missing = requiredMap
      .filter(([key]) => String(payload[key] ?? "").trim() === "")
      .map(([, label]) => label);
    return missing;
  };

  const openCreate = () => {
    setForm({
      ...emptyRecord,
      date: toIsoDate(new Date()),
    });
    setEditorOpen(true);
  };

  const openEdit = (record) => {
    setForm({
      ...emptyRecord,
      ...record,
      date: toIsoDate(record?.date || new Date()),
    });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    const missing = validateForm(form);
    if (missing.length) {
      alert(`Missing required fields:\n- ${missing.join("\n- ")}`);
      return;
    }
    const withholdingDays = Math.max(0, safeNumber(form.withholdingPeriodDays));
    const withholdingEndDate = withholdingDays > 0 ? addDays(form.date, withholdingDays) : "";

    const payload = {
      ...form,
      withholdingPeriodDays: safeNumber(form.withholdingPeriodDays),
      reEntryPeriodDays: safeNumber(form.reEntryPeriodDays),
      withholdingEndDate,
      archived: false,
      createdAt: form.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveChemicalRecord(payload);
    if (!saved) return;

    if (withholdingDays > 0 && withholdingEndDate) {
      setWithholdingAlert(`Withholding period active until ${formatDateAU(withholdingEndDate)}. Do not send livestock to this paddock until this date.`);
    } else {
      setWithholdingAlert("");
    }
    setEditorOpen(false);
    setForm(emptyRecord);
  };

  const handleArchive = (record) => {
    confirm({
      title: "Archive chemical record?",
      message: "Records are retained for compliance and marked archived only.",
      confirmLabel: "Archive",
      onConfirm: () => archiveChemicalRecord(record.id),
    });
  };

  const handleExportCsv = () => {
    exportToCSV(activeRecords, [
      { key: "date", label: "Date" },
      { key: "propertyId", label: "Paddock/Location", exportValue: (row) => propertyMap.get(String(row.propertyId || ""))?.name || "" },
      { key: "subLocationId", label: "Sub-location", exportValue: (row) => {
        const p = propertyMap.get(String(row.propertyId || ""));
        return p?.subLocations?.find((s) => String(s.id) === String(row.subLocationId || ""))?.name || "";
      } },
      { key: "chemicalProductName", label: "Chemical product name" },
      { key: "epaRegistrationNumber", label: "EPA registration number" },
      { key: "targetPestOrWeed", label: "Pest/weed treated" },
      { key: "rateApplied", label: "Rate applied" },
      { key: "rateUnit", label: "Rate unit" },
      { key: "totalQuantityUsed", label: "Total quantity used" },
      { key: "waterVolume", label: "Water volume" },
      { key: "withholdingPeriodDays", label: "Withholding period (days)" },
      { key: "withholdingEndDate", label: "Withholding end date" },
      { key: "reEntryPeriodDays", label: "Re-entry period (days)" },
      { key: "windSpeed", label: "Wind speed" },
      { key: "windDirection", label: "Wind direction" },
      { key: "temperature", label: "Temperature" },
      { key: "operatorName", label: "Operator name" },
      { key: "equipmentUsed", label: "Equipment used" },
      { key: "weatherConditions", label: "Weather conditions" },
      { key: "batchLotNumber", label: "Batch/lot number" },
      { key: "notes", label: "Notes" },
    ], "chemical-use-records.csv");
  };

  const handleExportPdf = () => {
    const businessName = profile.businessName || "Business";
    const abn = profile.abn || "N/A";
    const rows = activeRecords.map((record) => {
      const property = propertyMap.get(String(record.propertyId || ""));
      const locationName = property?.name || "Unknown";
      const subName = property?.subLocations?.find((s) => String(s.id) === String(record.subLocationId || ""))?.name || "";
      return `
        <tr>
          <td>${record.date || ""}</td>
          <td>${locationName}${subName ? ` / ${subName}` : ""}</td>
          <td>${record.chemicalProductName || ""}</td>
          <td>${record.epaRegistrationNumber || ""}</td>
          <td>${record.targetPestOrWeed || ""}</td>
          <td>${record.rateApplied || ""} ${record.rateUnit || ""}</td>
          <td>${record.totalQuantityUsed || ""}</td>
          <td>${record.waterVolume || ""}</td>
          <td>${record.withholdingPeriodDays || ""} days</td>
          <td>${record.withholdingEndDate || ""}</td>
          <td>${record.reEntryPeriodDays || ""} days</td>
          <td>${record.windSpeed || ""} / ${record.windDirection || ""}</td>
          <td>${record.temperature || ""}</td>
          <td>${record.operatorName || ""}</td>
          <td>${record.equipmentUsed || ""}</td>
          <td>${record.weatherConditions || ""}</td>
          <td>${record.batchLotNumber || ""}</td>
        </tr>
      `;
    }).join("");

    const html = `
      <html>
        <head>
          <title>Chemical Use Spray Diary</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; padding: 16px; }
            h1 { margin: 0 0 8px; font-size: 22px; }
            p { margin: 2px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
            th, td { border: 1px solid #D1D5DB; padding: 6px; vertical-align: top; }
            th { background: #F3F4F6; text-align: left; }
            .signature { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            .line { border-bottom: 1px solid #111827; height: 28px; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <h1>Chemical Use Spray Diary</h1>
          <p><strong>Business:</strong> ${businessName}</p>
          <p><strong>ABN:</strong> ${abn}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Paddock/Location</th><th>Product</th><th>EPA Reg #</th><th>Target</th>
                <th>Rate</th><th>Qty</th><th>Water</th><th>WHP</th><th>WHP End</th><th>REP</th>
                <th>Wind</th><th>Temp</th><th>Operator</th><th>Equipment</th><th>Weather</th><th>Batch/Lot</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="signature">
            <div>
              <div class="line"></div>
              <p>Operator signature</p>
            </div>
            <div>
              <div class="line"></div>
              <p>Date signed</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const w = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero title="Chemical Records" subtitle="Maintain compliant chemical use records for Australian farming operations." highlight={`${activeRecords.length} active`}>
        <InsightChip label="Active records" value={String(activeRecords.length)} />
        <InsightChip label="Withholding active" value={String(propertiesWithActiveWithholding.length)} />
        <InsightChip label="Livestock warnings" value={String(livestockWarningCount)} />
      </DashboardHero>

      {withholdingAlert && (
        <div style={{ ...cardStyle, border: "2px solid #F59E0B", background: "#FEF3C7", padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#92400E", marginBottom: 4 }}>Withholding Alert</div>
          <div style={{ fontSize: 14, color: "#7C2D12", lineHeight: 1.6 }}>{withholdingAlert}</div>
        </div>
      )}

      {propertiesWithActiveWithholding.length > 0 && (
        <div style={{ ...cardStyle, border: "1px solid #FCA5A5", background: "#FEF2F2", padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#991B1B", marginBottom: 8 }}>Paddock Warnings</div>
          <div style={{ display: "grid", gap: 6 }}>
            {propertiesWithActiveWithholding.slice(0, 6).map((item) => (
              <div key={item.id} style={{ fontSize: 13, color: "#7F1D1D" }}>
                {item.propertyName}: withholding active until <strong>{formatDateAU(item.withholdingEndDate)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <MetricCard title="Total active" value={String(activeRecords.length)} subtitle="Non-archived records" accent={colours.teal} />
        <MetricCard title="Filtered results" value={String(filteredRecords.length)} subtitle="Current list filters" accent={colours.purple} />
        <MetricCard title="Withholding flags" value={String(propertiesWithActiveWithholding.length)} subtitle="Paddocks under WHP" accent={"#DC2626"} />
      </div>

      <SectionCard
        title="Chemical Record List"
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={buttonSecondary} onClick={handleExportCsv}>Export CSV</button>
            <button style={buttonSecondary} onClick={handleExportPdf}>Export PDF Spray Diary</button>
            <button style={buttonPrimary} onClick={openCreate}>+ New Chemical Record</button>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
          <div><label style={labelStyle}>Date from</label><input type="date" style={inputStyle} value={filters.dateFrom} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} /></div>
          <div><label style={labelStyle}>Date to</label><input type="date" style={inputStyle} value={filters.dateTo} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} /></div>
          <div>
            <label style={labelStyle}>Paddock/Location</label>
            <select style={inputStyle} value={filters.propertyId} onChange={(e) => setFilters((p) => ({ ...p, propertyId: e.target.value }))}>
              <option value="">All</option>
              {properties.map((property) => <option key={property.id} value={String(property.id)}>{property.name}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Chemical name</label><input style={inputStyle} value={filters.chemicalName} onChange={(e) => setFilters((p) => ({ ...p, chemicalName: e.target.value }))} /></div>
          <div><label style={labelStyle}>Operator</label><input style={inputStyle} value={filters.operatorName} onChange={(e) => setFilters((p) => ({ ...p, operatorName: e.target.value }))} /></div>
        </div>

        <DataTable
          emptyState={{
            icon: "🧪",
            title: "No chemical records yet",
            message: "Create your first record to start your spray diary compliance trail.",
          }}
          columns={[
            { key: "date", label: "Date", render: (value) => formatDateAU(value) },
            { key: "propertyId", label: "Paddock/Location", render: (_value, row) => propertyMap.get(String(row.propertyId || ""))?.name || "—" },
            { key: "chemicalProductName", label: "Chemical" },
            { key: "operatorName", label: "Operator" },
            { key: "withholdingEndDate", label: "WHP End", render: (value) => value ? formatDateAU(value) : "—" },
            {
              key: "actions",
              label: "",
              render: (_v, row) => (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button style={buttonSecondary} onClick={() => setViewRecord(row)}>View</button>
                  <button style={buttonSecondary} onClick={() => openEdit(row)}>Edit</button>
                  <button style={{ ...buttonSecondary, color: "#B91C1C" }} onClick={() => handleArchive(row)}>Archive</button>
                </div>
              ),
            },
          ]}
          rows={filteredRecords}
        />
      </SectionCard>

      {(editorOpen || viewRecord) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 4000, overflowY: "auto", padding: 16 }}>
          <div style={{ maxWidth: 980, margin: "0 auto", background: colours.bg, borderRadius: 18, padding: 18, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: colours.text }}>{editorOpen ? "Chemical Record" : "Chemical Record Detail"}</div>
              <button style={buttonSecondary} onClick={() => { setEditorOpen(false); setViewRecord(null); }}>Close</button>
            </div>

            {viewRecord && !editorOpen && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                {Object.entries(viewRecord).map(([key, value]) => (
                  <div key={key} style={{ ...cardStyle, padding: 10 }}>
                    <div style={{ fontSize: 11, color: colours.muted, textTransform: "uppercase", fontWeight: 700 }}>{key}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: colours.text }}>{String(value ?? "—")}</div>
                  </div>
                ))}
              </div>
            )}

            {editorOpen && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <div><label style={labelStyle}>Date *</label><input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></div>
                  <div>
                    <label style={labelStyle}>Paddock / Location *</label>
                    <select style={inputStyle} value={form.propertyId} onChange={(e) => setForm((p) => ({ ...p, propertyId: e.target.value, subLocationId: "" }))}>
                      <option value="">Select paddock/property</option>
                      {properties.map((property) => <option key={property.id} value={String(property.id)}>{property.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Sub-location</label>
                    <select style={inputStyle} value={form.subLocationId || ""} onChange={(e) => setForm((p) => ({ ...p, subLocationId: e.target.value }))}>
                      <option value="">None</option>
                      {(propertyMap.get(String(form.propertyId || ""))?.subLocations || []).map((sub) => (
                        <option key={sub.id} value={String(sub.id)}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Chemical product name *</label><input style={inputStyle} value={form.chemicalProductName} onChange={(e) => setForm((p) => ({ ...p, chemicalProductName: e.target.value }))} /></div>
                  <div><label style={labelStyle}>EPA registration number *</label><input style={inputStyle} value={form.epaRegistrationNumber} onChange={(e) => setForm((p) => ({ ...p, epaRegistrationNumber: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Pest/weed treated *</label><input style={inputStyle} value={form.targetPestOrWeed} onChange={(e) => setForm((p) => ({ ...p, targetPestOrWeed: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Rate applied *</label><input style={inputStyle} value={form.rateApplied} onChange={(e) => setForm((p) => ({ ...p, rateApplied: e.target.value }))} placeholder="e.g. 2.5" /></div>
                  <div>
                    <label style={labelStyle}>Rate unit *</label>
                    <select style={inputStyle} value={form.rateUnit} onChange={(e) => setForm((p) => ({ ...p, rateUnit: e.target.value }))}>
                      <option value="per hectare">per hectare</option>
                      <option value="per litre">per litre</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Total quantity used *</label><input style={inputStyle} value={form.totalQuantityUsed} onChange={(e) => setForm((p) => ({ ...p, totalQuantityUsed: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Water volume *</label><input style={inputStyle} value={form.waterVolume} onChange={(e) => setForm((p) => ({ ...p, waterVolume: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Withholding period (days) *</label><input type="number" min="0" style={inputStyle} value={form.withholdingPeriodDays} onChange={(e) => setForm((p) => ({ ...p, withholdingPeriodDays: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Re-entry period (days) *</label><input type="number" min="0" style={inputStyle} value={form.reEntryPeriodDays} onChange={(e) => setForm((p) => ({ ...p, reEntryPeriodDays: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Wind speed *</label><input style={inputStyle} value={form.windSpeed} onChange={(e) => setForm((p) => ({ ...p, windSpeed: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Wind direction *</label><input style={inputStyle} value={form.windDirection} onChange={(e) => setForm((p) => ({ ...p, windDirection: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Temperature at application *</label><input style={inputStyle} value={form.temperature} onChange={(e) => setForm((p) => ({ ...p, temperature: e.target.value }))} placeholder="e.g. 21 C" /></div>
                  <div>
                    <label style={labelStyle}>Operator name *</label>
                    <select
                      style={inputStyle}
                      value={form.operatorName}
                      onChange={(e) => {
                        const label = e.target.value;
                        const option = operatorOptions.find((x) => x.label === label);
                        setForm((p) => ({ ...p, operatorName: label, operatorId: option?.id || "" }));
                      }}
                    >
                      <option value="">Select operator</option>
                      {operatorOptions.map((option) => <option key={option.id} value={option.label}>{option.label}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Equipment used *</label><input style={inputStyle} value={form.equipmentUsed} onChange={(e) => setForm((p) => ({ ...p, equipmentUsed: e.target.value }))} /></div>
                  <div>
                    <label style={labelStyle}>Weather conditions *</label>
                    <select style={inputStyle} value={form.weatherConditions} onChange={(e) => setForm((p) => ({ ...p, weatherConditions: e.target.value }))}>
                      {WEATHER_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Batch/Lot number *</label><input style={inputStyle} value={form.batchLotNumber} onChange={(e) => setForm((p) => ({ ...p, batchLotNumber: e.target.value }))} /></div>
                </div>
                <div><label style={labelStyle}>Notes (optional)</label><textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={form.notes || ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button style={buttonSecondary} onClick={() => { setEditorOpen(false); setForm(emptyRecord); }}>Cancel</button>
                  <button style={buttonPrimary} onClick={handleSave}>Save Chemical Record</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
