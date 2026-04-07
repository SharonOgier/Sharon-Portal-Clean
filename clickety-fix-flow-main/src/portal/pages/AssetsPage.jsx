import React, { useState, useMemo } from "react";
import { exportToCSV } from "../PortalHelpers";

// ATO depreciation methods
const DEPRECIATION_METHODS = [
  { value: "instant", label: "Instant Asset Write-Off" },
  { value: "prime_cost", label: "Prime Cost (Straight Line)" },
  { value: "diminishing", label: "Diminishing Value" },
  { value: "none", label: "No Depreciation" },
];

const ASSET_TYPES = [
  "Vehicle", "Tractor", "Harvester", "Farm Equipment", "Tools",
  "Computer & IT", "Office Equipment", "Furniture", "Building/Improvement",
  "Livestock Infrastructure", "Irrigation", "Fencing", "Other",
];

const ASSET_STATUSES = ["Active", "Disposed", "Written Off", "Sold"];

function calcDepreciation(asset) {
  const cost = parseFloat(asset.purchasePrice) || 0;
  const salvage = parseFloat(asset.salvageValue) || 0;
  const life = parseFloat(asset.effectiveLife) || 0;
  const method = asset.depreciationMethod || "none";
  const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;

  if (!purchaseDate || !cost || method === "none") return { annual: 0, writtenDown: cost, schedule: [] };
  if (method === "instant") return { annual: cost, writtenDown: 0, schedule: [{ year: purchaseDate.getFullYear(), depreciation: cost, closingValue: 0 }] };

  const now = new Date();
  const yearsHeld = Math.max(0, (now.getFullYear() - purchaseDate.getFullYear()) + ((now.getMonth() - purchaseDate.getMonth()) / 12));
  const depreciableAmount = cost - salvage;
  const schedule = [];
  let openingValue = cost;

  if (method === "prime_cost" && life > 0) {
    const annualDep = depreciableAmount / life;
    for (let y = 0; y < Math.ceil(life); y++) {
      const dep = Math.min(annualDep, openingValue - salvage);
      if (dep <= 0) break;
      openingValue -= dep;
      schedule.push({ year: purchaseDate.getFullYear() + y, depreciation: dep, closingValue: Math.max(openingValue, salvage) });
    }
    const totalDep = Math.min(depreciableAmount, annualDep * Math.min(yearsHeld, life));
    return { annual: annualDep, writtenDown: Math.max(cost - totalDep, salvage), schedule };
  }

  if (method === "diminishing" && life > 0) {
    const rate = (2 / life); // 200% diminishing value rate per ATO
    for (let y = 0; y < Math.ceil(life * 2); y++) {
      const dep = Math.max(0, Math.min(openingValue * rate, openingValue - salvage));
      if (dep <= 0.01) break;
      openingValue -= dep;
      schedule.push({ year: purchaseDate.getFullYear() + y, depreciation: dep, closingValue: Math.max(openingValue, salvage) });
    }
    let wdv = cost;
    for (let y = 0; y < Math.min(yearsHeld, schedule.length); y++) {
      wdv -= schedule[y].depreciation;
    }
    return { annual: schedule.length ? schedule[0].depreciation : 0, writtenDown: Math.max(wdv, salvage), schedule };
  }

  return { annual: 0, writtenDown: cost, schedule: [] };
}

export default function AssetsPage(props) {
  const {
    assets = [], expenses = [],
    colours, cardStyle, buttonPrimary, buttonSecondary,
    inputStyle, labelStyle, currency, formatDateAU, safeNumber,
    todayLocal, DashboardHero, InsightChip, MetricCard,
    SectionCard, DataTable, EmptyState,
    saveAsset, deleteAsset, confirm,
    setImportType = () => {}, setImportRows = () => {},
    setImportError = () => {}, setShowImportModal = () => {},
  } = props;

  const [form, setForm] = useState({
    name: "", assetType: "Farm Equipment", purchaseDate: todayLocal(),
    purchasePrice: "", salvageValue: "0", effectiveLife: "",
    depreciationMethod: "prime_cost", status: "Active", notes: "",
    previousOwners: "", serialNumber: "", location: "",
    linkedExpenseId: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSchedule, setShowSchedule] = useState(null);

  const totalCost = assets.reduce((s, a) => s + safeNumber(a.purchasePrice), 0);
  const activeAssets = assets.filter(a => (a.status || "Active") === "Active");
  const totalWDV = activeAssets.reduce((s, a) => s + calcDepreciation(a).writtenDown, 0);
  const totalAnnualDep = activeAssets.reduce((s, a) => s + calcDepreciation(a).annual, 0);
  const typeCounts = assets.reduce((acc, a) => { const t = a.assetType || "Other"; acc[t] = (acc[t] || 0) + 1; return acc; }, {});

  const resetForm = () => {
    setForm({ name: "", assetType: "Farm Equipment", purchaseDate: todayLocal(), purchasePrice: "", salvageValue: "0", effectiveLife: "", depreciationMethod: "prime_cost", status: "Active", notes: "", previousOwners: "", serialNumber: "", location: "", linkedExpenseId: "" });
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.name.trim()) return alert("Asset name is required.");
    const payload = { ...form, id: editingId || Date.now() };
    saveAsset(payload);
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (asset) => {
    setForm({
      name: asset.name || "", assetType: asset.assetType || "Farm Equipment",
      purchaseDate: asset.purchaseDate || todayLocal(),
      purchasePrice: asset.purchasePrice || "", salvageValue: asset.salvageValue || "0",
      effectiveLife: asset.effectiveLife || "", depreciationMethod: asset.depreciationMethod || "prime_cost",
      status: asset.status || "Active", notes: asset.notes || "",
      previousOwners: asset.previousOwners || "", serialNumber: asset.serialNumber || "",
      location: asset.location || "", linkedExpenseId: asset.linkedExpenseId || "",
    });
    setEditingId(asset.id);
    setShowForm(true);
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero title="Asset Register" subtitle="Track all business assets, depreciation schedules, and ownership history. ATO-compliant depreciation methods." highlight={currency(totalWDV)}>
        <InsightChip label="Total assets" value={String(assets.length)} />
        <InsightChip label="Active" value={String(activeAssets.length)} />
        <InsightChip label="Annual depreciation" value={currency(totalAnnualDep)} />
      </DashboardHero>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <MetricCard title="Total cost" value={currency(totalCost)} subtitle="Original purchase price of all assets." accent={colours.purple} />
        <MetricCard title="Written-down value" value={currency(totalWDV)} subtitle="Current book value of active assets." accent={colours.teal} />
        <MetricCard title="Annual depreciation" value={currency(totalAnnualDep)} subtitle="Total depreciation expense this year." accent={colours.purple} />
        <MetricCard title="Asset types" value={String(Object.keys(typeCounts).length)} subtitle="Distinct categories of assets." accent={colours.teal} />
      </div>

      <SectionCard title={editingId ? "Edit Asset" : "Add Asset"} right={
        <button style={buttonPrimary} onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "Add Asset"}
        </button>
      }>
        {showForm && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div>
              <label style={labelStyle}>Asset Name *</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. John Deere 6120M" />
            </div>
            <div>
              <label style={labelStyle}>Asset Type</label>
              <select style={inputStyle} value={form.assetType} onChange={e => setForm(p => ({ ...p, assetType: e.target.value }))}>
                {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Serial / Rego Number</label>
              <input style={inputStyle} value={form.serialNumber} onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. North paddock shed" />
            </div>
            <div>
              <label style={labelStyle}>Purchase Date</label>
              <input type="date" style={inputStyle} value={form.purchaseDate} onChange={e => setForm(p => ({ ...p, purchaseDate: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Purchase Price ($)</label>
              <input type="number" style={inputStyle} value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Linked Purchase Expense</label>
              <select style={inputStyle} value={form.linkedExpenseId || ""} onChange={e => {
                const exp = expenses.find(ex => String(ex.id) === e.target.value);
                setForm(p => ({
                  ...p,
                  linkedExpenseId: e.target.value,
                  purchasePrice: exp ? String(safeNumber(exp.amount)) : p.purchasePrice,
                  purchaseDate: exp?.date || p.purchaseDate,
                }));
              }}>
                <option value="">— none —</option>
                {expenses.filter(e => safeNumber(e.amount) > 0).map(e => (
                  <option key={e.id} value={e.id}>
                    {e.date} — {e.supplier || e.category} — {currency(safeNumber(e.amount))}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Depreciation Method</label>
              <select style={inputStyle} value={form.depreciationMethod} onChange={e => setForm(p => ({ ...p, depreciationMethod: e.target.value }))}>
                {DEPRECIATION_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Effective Life (years)</label>
              <input type="number" style={inputStyle} value={form.effectiveLife} onChange={e => setForm(p => ({ ...p, effectiveLife: e.target.value }))} placeholder="ATO effective life" />
            </div>
            <div>
              <label style={labelStyle}>Salvage Value ($)</label>
              <input type="number" style={inputStyle} value={form.salvageValue} onChange={e => setForm(p => ({ ...p, salvageValue: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Previous Owners / Chain of Ownership</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.previousOwners} onChange={e => setForm(p => ({ ...p, previousOwners: e.target.value }))} placeholder="e.g. Purchased from Smith Family Farm (2018), originally bought new from dealer (2015)" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button style={buttonPrimary} onClick={handleSave}>{editingId ? "Update Asset" : "Save Asset"}</button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Depreciation Schedule Modal */}
      {showSchedule && (() => {
        const asset = assets.find(a => a.id === showSchedule);
        if (!asset) return null;
        const dep = calcDepreciation(asset);
        return (
          <SectionCard title={`Depreciation Schedule — ${asset.name}`} right={
            <button style={buttonSecondary} onClick={() => setShowSchedule(null)}>Close</button>
          }>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div><span style={{ fontSize: 11, color: colours.muted }}>Method:</span> <strong>{DEPRECIATION_METHODS.find(m => m.value === asset.depreciationMethod)?.label || "N/A"}</strong></div>
              <div><span style={{ fontSize: 11, color: colours.muted }}>Cost:</span> <strong>{currency(asset.purchasePrice)}</strong></div>
              <div><span style={{ fontSize: 11, color: colours.muted }}>Written-down:</span> <strong>{currency(dep.writtenDown)}</strong></div>
            </div>
            {dep.schedule.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colours.border}` }}>
                    <th style={{ textAlign: "left", padding: 8 }}>Year</th>
                    <th style={{ textAlign: "right", padding: 8 }}>Depreciation</th>
                    <th style={{ textAlign: "right", padding: 8 }}>Closing Value</th>
                  </tr>
                </thead>
                <tbody>
                  {dep.schedule.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${colours.border}` }}>
                      <td style={{ padding: 8 }}>{row.year}</td>
                      <td style={{ textAlign: "right", padding: 8 }}>{currency(row.depreciation)}</td>
                      <td style={{ textAlign: "right", padding: 8 }}>{currency(row.closingValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: colours.muted, fontSize: 14 }}>No depreciation schedule available for this method.</div>
            )}
          </SectionCard>
        );
      })()}

      <SectionCard title="Asset List" right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={buttonSecondary} onClick={() => exportToCSV(assets, [
            { key: "name", label: "Asset Name" }, { key: "assetType", label: "Type" },
            { key: "serialNumber", label: "Serial/Rego" }, { key: "location", label: "Location" },
            { key: "purchaseDate", label: "Purchase Date" }, { key: "purchasePrice", label: "Purchase Price" },
            { key: "depreciationMethod", label: "Depreciation Method" }, { key: "effectiveLife", label: "Effective Life (yrs)" },
            { key: "salvageValue", label: "Salvage Value" }, { key: "status", label: "Status" },
            { key: "previousOwners", label: "Ownership History" },
          ], "assets.csv")}>Export CSV</button>
          <button style={buttonSecondary} onClick={() => { setImportType("assets"); setImportRows([]); setImportError(""); setShowImportModal(true); }}>Import CSV</button>
        </div>
      }>
        <DataTable
          emptyState={{ icon: "🏗️", title: "No assets yet", message: "Add your first asset using the form above. Track vehicles, equipment, tools and more with ATO-compliant depreciation." }}
          columns={[
            { key: "name", label: "Asset Name" },
            { key: "assetType", label: "Type" },
            { key: "serialNumber", label: "Serial/Rego" },
            { key: "purchaseDate", label: "Purchased", render: v => formatDateAU(v) },
            { key: "purchasePrice", label: "Cost", render: v => currency(v) },
            { key: "status", label: "Status", render: v => (
              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: v === "Active" ? "#E7F6F5" : v === "Sold" ? "#FEF3C7" : "#FEE2E2", color: v === "Active" ? colours.teal : v === "Sold" ? "#92400E" : "#991B1B" }}>
                {v || "Active"}
              </span>
            )},
            { key: "wdv", label: "WDV", render: (_, row) => currency(calcDepreciation(row).writtenDown) },
            { key: "actions", label: "Actions", render: (_, row) => (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button style={{ ...buttonSecondary, fontSize: 12, padding: "4px 10px" }} onClick={() => setShowSchedule(row.id)}>Depreciation</button>
                <button style={{ ...buttonSecondary, fontSize: 12, padding: "4px 10px" }} onClick={() => handleEdit(row)}>Edit</button>
                <button style={{ ...buttonSecondary, fontSize: 12, padding: "4px 10px", color: "#991B1B", borderColor: "#FCA5A5" }} onClick={() => deleteAsset(row.id)}>Delete</button>
              </div>
            )},
          ]}
          rows={assets}
        />
      </SectionCard>
    </div>
  );
}
