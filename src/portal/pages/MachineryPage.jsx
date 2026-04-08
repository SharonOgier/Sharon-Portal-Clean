import React, { useState, useMemo } from "react";
import { FileText, Plus, Trash2, PenLine, Fuel, Wrench, AlertTriangle, Clock, Calendar, Download, Eye, Archive, ChevronLeft, Camera } from "lucide-react";
import html2pdf from "html2pdf.js";

const MACHINERY_TYPES = ["Tractor", "Header", "Spray rig", "Truck", "Quad bike", "Other"];
const SERVICE_TYPES = ["Oil change", "Filter", "Full service", "Repair", "Tyres", "Other"];

export default function MachineryPage(props) {
  const {
    machinery = [],
    machineryServiceRecords = [],
    machineryBreakdowns = [],
    machineryFuelLogs = [],
    savingMachinery,
    savingMachineryServiceRecord,
    savingMachineryBreakdown,
    savingMachineryFuelLog,
    saveMachinery,
    deleteMachinery,
    saveMachineryServiceRecord,
    deleteMachineryServiceRecord,
    saveMachineryBreakdown,
    deleteMachineryBreakdown,
    saveMachineryFuelLog,
    deleteMachineryFuelLog,
    colours, cardStyle,
    buttonPrimary, buttonSecondary,
    inputStyle, labelStyle,
    currency, formatDateAU, safeNumber,
    todayLocal,
    DashboardHero, InsightChip, MetricCard,
    SectionCard, DataTable, EmptyState,
    confirm,
    uploadReceiptToSupabase,
    toast
  } = props;

  const [view, setView] = useState("list"); // 'list', 'add', 'detail'
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [activeTab, setActiveTab] = useState("history"); // 'history', 'breakdowns', 'fuel', 'details'
  const [editingRecord, setEditingRecord] = useState(null);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Sync selectedMachineId from props if provided (e.g. from Dashboard)
  React.useEffect(() => {
    if (props.selectedMachineId && props.selectedMachineId !== selectedMachineId) {
      setSelectedMachineId(props.selectedMachineId);
      setView("detail");
    }
  }, [props.selectedMachineId]);

  const [machineForm, setMachineForm] = useState({
    name: "", type: "Tractor", make: "", model: "", year: "", rego: "",
    hoursMeter: "", purchaseDate: todayLocal(), purchasePrice: "",
    photoUrl: "", serviceIntervalHours: "", serviceIntervalMonths: "",
  });

  const selectedMachine = useMemo(() =>
    machinery.find(m => String(m.id) === String(selectedMachineId)),
    [machinery, selectedMachineId]
  );

  const filteredServiceRecords = useMemo(() =>
    machineryServiceRecords.filter(r => String(r.machineId) === String(selectedMachineId) && !r.archived),
    [machineryServiceRecords, selectedMachineId]
  );

  const filteredBreakdowns = useMemo(() =>
    machineryBreakdowns.filter(r => String(r.machineId) === String(selectedMachineId)),
    [machineryBreakdowns, selectedMachineId]
  );

  const filteredFuelLogs = useMemo(() =>
    machineryFuelLogs.filter(r => String(r.machineId) === String(selectedMachineId)),
    [machineryFuelLogs, selectedMachineId]
  );

  const getMachineStatus = (machine) => {
    if (!machine) return { status: "unknown", message: "" };

    const records = machineryServiceRecords.filter(r => String(r.machineId) === String(machine.id) && !r.archived);
    if (records.length === 0) {
       // Check against purchase date or hours
       return { status: "good", message: "No service history yet" };
    }

    const lastService = [...records].sort((a, b) => b.date.localeCompare(a.date))[0];
    const lastServiceHours = safeNumber(lastService.hours);
    const currentHours = safeNumber(machine.hoursMeter);

    const intervalHours = safeNumber(machine.serviceIntervalHours);
    const intervalMonths = safeNumber(machine.serviceIntervalMonths);

    const hoursRemaining = intervalHours ? (lastServiceHours + intervalHours - currentHours) : Infinity;

    const lastServiceDate = new Date(lastService.date);
    const nextServiceDate = new Date(lastServiceDate);
    if (intervalMonths) nextServiceDate.setMonth(nextServiceDate.getMonth() + intervalMonths);

    const today = new Date(todayLocal());
    const daysRemaining = intervalMonths ? Math.ceil((nextServiceDate - today) / (1000 * 60 * 60 * 24)) : Infinity;

    if (hoursRemaining <= 0 || daysRemaining <= 0) {
      return { status: "overdue", message: hoursRemaining <= 0 ? "Hours overdue" : "Date overdue" };
    }
    if (hoursRemaining <= 50 || daysRemaining <= 14) {
      const hStr = hoursRemaining <= 50 ? `${hoursRemaining} hours` : "";
      const dStr = daysRemaining <= 14 ? `${daysRemaining} days` : "";
      return { status: "soon", message: `Due in ${[hStr, dStr].filter(Boolean).join(" / ")}` };
    }

    return { status: "good", message: "Service status good" };
  };

  const handleSaveMachine = async () => {
    if (!machineForm.name) return alert("Machine name is required");
    const saved = await saveMachinery({ ...machineForm, id: selectedMachineId });
    if (saved) {
      if (!selectedMachineId) {
        setSelectedMachineId(saved.id);
        setView("detail");
      } else {
        setView("detail");
      }
      setMachineForm({
        name: "", type: "Tractor", make: "", model: "", year: "", rego: "",
        hoursMeter: "", purchaseDate: todayLocal(), purchasePrice: "",
        photoUrl: "", serviceIntervalHours: "", serviceIntervalMonths: "",
      });
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const res = await uploadReceiptToSupabase(file);
      if (selectedMachineId) {
        await saveMachinery({ ...selectedMachine, photoUrl: res.receiptUrl });
      } else {
        setMachineForm(p => ({ ...p, photoUrl: res.receiptUrl }));
      }
      toast.success("Photo uploaded!");
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const exportServiceHistory = (machine) => {
    const records = filteredServiceRecords;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #14202B;">
        <h1 style="color: ${colours.purple}; margin-bottom: 8px;">Service History Report</h1>
        <h2 style="margin-bottom: 24px;">${machine.name} (${machine.make} ${machine.model})</h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; padding: 16px; background: #F8FAFC; border-radius: 12px;">
          <div>
            <p><strong>Type:</strong> ${machine.type}</p>
            <p><strong>Year:</strong> ${machine.year}</p>
            <p><strong>Rego:</strong> ${machine.rego}</p>
          </div>
          <div>
            <p><strong>Purchase Date:</strong> ${formatDateAU(machine.purchaseDate)}</p>
            <p><strong>Purchase Price:</strong> ${currency(machine.purchasePrice)}</p>
            <p><strong>Current Meter:</strong> ${machine.hoursMeter}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: ${colours.purple}; color: white;">
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Date</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Meter</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Type</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Who</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Parts</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Labour</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td style="padding: 12px; border: 1px solid #ddd;">${formatDateAU(r.date)}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${r.hours}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${r.type}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${r.who}</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${currency(r.partsCost)}</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${currency(r.labourCost)}</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${currency(safeNumber(r.partsCost) + safeNumber(r.labourCost))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 32px; text-align: right; font-size: 18px;">
          <strong>Total Lifetime Service Cost: ${currency(records.reduce((s, r) => s + safeNumber(r.partsCost) + safeNumber(r.labourCost), 0))}</strong>
        </div>

        <div style="margin-top: 60px; font-size: 12px; color: #64748B; text-align: center;">
          Generated by Mustered — Farm Management Portal
        </div>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `Service_History_${machine.name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().from(html).set(opt).save();
  };

  const overdueCount = machinery.filter(m => getMachineStatus(m).status === "overdue").length;
  const soonCount = machinery.filter(m => getMachineStatus(m).status === "soon").length;

  if (view === "list") {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <DashboardHero title="Machinery & Equipment" subtitle="Track maintenance, breakdowns, and fuel usage for your farm fleet." highlight={machinery.length + " machines"}>
          <InsightChip label="Service overdue" value={String(overdueCount)} />
          <InsightChip label="Due soon" value={String(soonCount)} />
          <InsightChip label="Monthly fuel" value={currency(machineryFuelLogs.filter(l => l.date.startsWith(todayLocal().slice(0, 7))).reduce((s, l) => s + safeNumber(l.totalCost), 0))} />
        </DashboardHero>

        {(overdueCount > 0 || soonCount > 0) && (
          <div style={{ display: "grid", gap: 10 }}>
            {machinery.map(m => {
              const status = getMachineStatus(m);
              if (status.status === "good") return null;
              return (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12,
                  background: status.status === "overdue" ? "#FEF2F2" : "#FFF7ED",
                  border: `1px solid ${status.status === "overdue" ? "#FECACA" : "#FED7AA"}`,
                  cursor: "pointer"
                }} onClick={() => { setSelectedMachineId(m.id); setView("detail"); }}>
                  <AlertTriangle size={18} color={status.status === "overdue" ? "#DC2626" : "#EA580C"} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, color: status.status === "overdue" ? "#991B1B" : "#92400E" }}>{m.name}</span>
                    <span style={{ marginLeft: 8, color: status.status === "overdue" ? "#B91C1C" : "#A16207" }}>{status.message}</span>
                  </div>
                  <Eye size={16} color={colours.muted} />
                </div>
              );
            })}
          </div>
        )}

        <SectionCard title="Fleet Register" right={
          <button style={buttonPrimary} onClick={() => {
            setMachineForm({
              name: "", type: "Tractor", make: "", model: "", year: "", rego: "",
              hoursMeter: "", purchaseDate: todayLocal(), purchasePrice: "",
              photoUrl: "", serviceIntervalHours: "", serviceIntervalMonths: "",
            });
            setSelectedMachineId(null);
            setView("add");
          }}>
            <Plus size={16} style={{ marginRight: 8 }} /> Add Machinery
          </button>
        }>
          <DataTable
            rows={machinery}
            columns={[
              { key: "name", label: "Machine", render: (v, row) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {row.photoUrl ? (
                    <img src={row.photoUrl} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: colours.bg, display: "grid", placeItems: "center" }}>
                      <Camera size={18} color={colours.muted} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700 }}>{v}</div>
                    <div style={{ fontSize: 11, color: colours.muted }}>{row.make} {row.model}</div>
                  </div>
                </div>
              )},
              { key: "type", label: "Type" },
              { key: "hoursMeter", label: "Meter", render: (v) => `${v} hrs/km` },
              { key: "status", label: "Service Status", render: (_, row) => {
                const status = getMachineStatus(row);
                const color = status.status === "overdue" ? "#DC2626" : status.status === "soon" ? "#EA580C" : "#166534";
                const bg = status.status === "overdue" ? "#FEE2E2" : status.status === "soon" ? "#FFEDD5" : "#DCFCE7";
                return (
                  <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: bg, color }}>
                    {status.message}
                  </span>
                );
              }},
              { key: "actions", label: "", render: (_, row) => (
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button style={{ ...buttonSecondary, padding: "6px 10px" }} onClick={() => { setSelectedMachineId(row.id); setView("detail"); }}>
                    <Eye size={14} />
                  </button>
                  <button style={{ ...buttonSecondary, padding: "6px 10px" }} onClick={() => {
                    setSelectedMachineId(row.id);
                    setMachineForm({ ...row });
                    setView("add");
                  }}>
                    <PenLine size={14} />
                  </button>
                </div>
              )}
            ]}
            emptyState={{
              title: "No machinery logged",
              message: "Start tracking your farm equipment by adding your first machine.",
              icon: "🚜"
            }}
          />
        </SectionCard>
      </div>
    );
  }

  if (view === "add") {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ ...buttonSecondary, padding: 8 }} onClick={() => setView("list")}>
            <ChevronLeft size={18} />
          </button>
          <h2 style={{ fontSize: 24, fontWeight: 900 }}>{selectedMachineId ? "Edit Machine" : "Add New Machinery"}</h2>
        </div>

        <SectionCard title="Machine Details">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            <div>
              <label style={labelStyle}>Machine Name *</label>
              <input style={inputStyle} value={machineForm.name} onChange={e => setMachineForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Main Tractor" />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select style={inputStyle} value={machineForm.type} onChange={e => setMachineForm(p => ({ ...p, type: e.target.value }))}>
                {MACHINERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Make</label>
              <input style={inputStyle} value={machineForm.make} onChange={e => setMachineForm(p => ({ ...p, make: e.target.value }))} placeholder="e.g. John Deere" />
            </div>
            <div>
              <label style={labelStyle}>Model</label>
              <input style={inputStyle} value={machineForm.model} onChange={e => setMachineForm(p => ({ ...p, model: e.target.value }))} placeholder="e.g. 6120M" />
            </div>
            <div>
              <label style={labelStyle}>Year</label>
              <input style={inputStyle} value={machineForm.year} onChange={e => setMachineForm(p => ({ ...p, year: e.target.value }))} placeholder="e.g. 2022" />
            </div>
            <div>
              <label style={labelStyle}>Registration Number</label>
              <input style={inputStyle} value={machineForm.rego} onChange={e => setMachineForm(p => ({ ...p, rego: e.target.value }))} placeholder="e.g. ABC-123" />
            </div>
            <div>
              <label style={labelStyle}>Current Meter Reading (Hours/km)</label>
              <input type="number" style={inputStyle} value={machineForm.hoursMeter} onChange={e => setMachineForm(p => ({ ...p, hoursMeter: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Purchase Date</label>
              <input type="date" style={inputStyle} value={machineForm.purchaseDate} onChange={e => setMachineForm(p => ({ ...p, purchaseDate: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Purchase Price</label>
              <input type="number" style={inputStyle} value={machineForm.purchasePrice} onChange={e => setMachineForm(p => ({ ...p, purchasePrice: e.target.value }))} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Service Intervals">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={labelStyle}>Service Every X Hours/km</label>
              <input type="number" style={inputStyle} value={machineForm.serviceIntervalHours} onChange={e => setMachineForm(p => ({ ...p, serviceIntervalHours: e.target.value }))} placeholder="e.g. 250" />
            </div>
            <div>
              <label style={labelStyle}>Service Every X Months</label>
              <input type="number" style={inputStyle} value={machineForm.serviceIntervalMonths} onChange={e => setMachineForm(p => ({ ...p, serviceIntervalMonths: e.target.value }))} placeholder="e.g. 12" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Photo">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {machineForm.photoUrl ? (
              <div style={{ position: "relative" }}>
                <img src={machineForm.photoUrl} style={{ width: 120, height: 120, borderRadius: 12, objectFit: "cover" }} />
                <button
                  onClick={() => setMachineForm(p => ({ ...p, photoUrl: "" }))}
                  style={{ position: "absolute", top: -8, right: -8, background: "#EF4444", color: "white", border: "none", borderRadius: "50%", padding: 4, cursor: "pointer" }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <div style={{ width: 120, height: 120, borderRadius: 12, background: colours.bg, border: `2px dashed ${colours.border}`, display: "grid", placeItems: "center" }}>
                <Camera size={32} color={colours.muted} />
              </div>
            )}
            <div>
              <input type="file" accept="image/*" id="machine-photo" style={{ display: "none" }} onChange={handlePhotoUpload} />
              <label htmlFor="machine-photo" style={{ ...buttonSecondary, cursor: "pointer" }}>
                {uploadingPhoto ? "Uploading..." : "Upload Photo"}
              </label>
              <p style={{ fontSize: 12, color: colours.muted, marginTop: 8 }}>JPG, PNG or WebP. Max 10MB.</p>
            </div>
          </div>
        </SectionCard>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button style={buttonSecondary} onClick={() => setView("list")}>Cancel</button>
          <button style={buttonPrimary} onClick={handleSaveMachine} disabled={savingMachinery}>
            {savingMachinery ? "Saving..." : selectedMachineId ? "Update Machine" : "Save Machine"}
          </button>
        </div>
      </div>
    );
  }

  if (view === "detail" && selectedMachine) {
    const status = getMachineStatus(selectedMachine);
    const yearServiceCost = filteredServiceRecords
      .filter(r => r.date.startsWith(new Date().getFullYear().toString()))
      .reduce((s, r) => s + safeNumber(r.partsCost) + safeNumber(r.labourCost), 0);

    const yearBreakdownCost = filteredBreakdowns
      .filter(r => r.date.startsWith(new Date().getFullYear().toString()))
      .reduce((s, r) => s + safeNumber(r.repairCost), 0);

    const yearBreakdownDowntime = filteredBreakdowns
      .filter(r => r.date.startsWith(new Date().getFullYear().toString()))
      .reduce((s, r) => s + safeNumber(r.downtimeHours), 0);

    const lifetimeServiceCost = machineryServiceRecords
      .filter(r => String(r.machineId) === String(selectedMachineId))
      .reduce((s, r) => s + safeNumber(r.partsCost) + safeNumber(r.labourCost), 0);

    const lifetimeBreakdownCost = filteredBreakdowns
      .reduce((s, r) => s + safeNumber(r.repairCost), 0);

    return (
      <div style={{ display: "grid", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ ...buttonSecondary, padding: 8 }} onClick={() => setView("list")}>
            <ChevronLeft size={18} />
          </button>
          <h2 style={{ fontSize: 24, fontWeight: 900 }}>{selectedMachine.name}</h2>
          <span style={{
            padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: status.status === "overdue" ? "#FEE2E2" : status.status === "soon" ? "#FFEDD5" : "#DCFCE7",
            color: status.status === "overdue" ? "#DC2626" : status.status === "soon" ? "#EA580C" : "#166534"
          }}>
            {status.message}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <MetricCard title="Annual Service" value={currency(yearServiceCost)} subtitle="Cost this calendar year" accent={colours.purple} />
          <MetricCard title="Annual Repairs" value={currency(yearBreakdownCost)} subtitle="Cost this calendar year" accent="#DC2626" />
          <MetricCard title="Annual Downtime" value={`${yearBreakdownDowntime} hrs`} subtitle="Hours out of action" accent="#EA580C" />
          <MetricCard title="Lifetime Cost" value={currency(safeNumber(selectedMachine.purchasePrice) + lifetimeServiceCost + lifetimeBreakdownCost)} subtitle="Purchase + all maintenance" accent={colours.navy} />
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${colours.border}`, gap: 24, marginBottom: 4 }}>
          {[
            { id: "history", label: "Service History", icon: Wrench },
            { id: "breakdowns", label: "Breakdowns", icon: AlertTriangle },
            { id: "fuel", label: "Fuel Tracking", icon: Fuel },
            { id: "details", label: "Details", icon: PenLine },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "12px 4px", background: "none", border: "none",
              borderBottom: activeTab === tab.id ? `2px solid ${colours.purple}` : "2px solid transparent",
              color: activeTab === tab.id ? colours.purple : colours.muted,
              fontWeight: activeTab === tab.id ? 700 : 500, cursor: "pointer", transition: "all 0.2s"
            }}>
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "history" && (
          <SectionCard title="Service Records" right={
            <div style={{ display: "flex", gap: 8 }}>
              <button style={buttonSecondary} onClick={() => exportServiceHistory(selectedMachine)}>
                <Download size={16} style={{ marginRight: 8 }} /> Export PDF
              </button>
              <button style={buttonPrimary} onClick={() => { setShowAddRecord(true); setEditingRecord(null); }}>
                <Plus size={16} style={{ marginRight: 8 }} /> Log Service
              </button>
            </div>
          }>
            <DataTable
              rows={filteredServiceRecords}
              columns={[
                { key: "date", label: "Date", render: v => formatDateAU(v) },
                { key: "hours", label: "Meter", render: v => `${v} hrs/km` },
                { key: "type", label: "Type" },
                { key: "who", label: "Performed By" },
                { key: "total", label: "Cost", render: (_, row) => currency(safeNumber(row.partsCost) + safeNumber(row.labourCost)) },
                { key: "actions", label: "", render: (_, row) => (
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button style={{ ...buttonSecondary, padding: "6px 10px" }} onClick={() => { setEditingRecord(row); setShowAddRecord(true); }}>
                      <PenLine size={14} />
                    </button>
                    <button style={{ ...buttonSecondary, padding: "6px 10px", color: "#B91C1C" }} onClick={() => {
                      confirm({
                        title: "Archive Service Record?",
                        message: "Service records are permanent and will be archived rather than deleted.",
                        confirmLabel: "Archive",
                        onConfirm: () => deleteMachineryServiceRecord(row.id)
                      });
                    }}>
                      <Archive size={14} />
                    </button>
                  </div>
                )}
              ]}
              emptyState={{ title: "No service history", message: "Keep your maintenance logs up to date for better resale value.", icon: "🔧" }}
            />
          </SectionCard>
        )}

        {activeTab === "breakdowns" && (
          <SectionCard title="Breakdown Log" right={
            <button style={buttonPrimary} onClick={() => { setShowAddRecord(true); setEditingRecord(null); }}>
              <Plus size={16} style={{ marginRight: 8 }} /> Log Breakdown
            </button>
          }>
            <DataTable
              rows={filteredBreakdowns}
              columns={[
                { key: "date", label: "Date", render: v => formatDateAU(v) },
                { key: "description", label: "Description" },
                { key: "downtimeHours", label: "Downtime", render: v => `${v} hrs` },
                { key: "repairCost", label: "Repair Cost", render: v => currency(v) },
                { key: "repairedBy", label: "Repaired By" },
                { key: "actions", label: "", render: (_, row) => (
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button style={{ ...buttonSecondary, padding: "6px 10px" }} onClick={() => { setEditingRecord(row); setShowAddRecord(true); }}>
                      <PenLine size={14} />
                    </button>
                    <button style={{ ...buttonSecondary, padding: "6px 10px", color: "#DC2626" }} onClick={() => deleteMachineryBreakdown(row.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              ]}
              emptyState={{ title: "No breakdowns logged", message: "Track faults and downtime to identify problem equipment.", icon: "⚠️" }}
            />
          </SectionCard>
        )}

        {activeTab === "fuel" && (
          <SectionCard title="Fuel Tracking" right={
            <button style={buttonPrimary} onClick={() => { setShowAddRecord(true); setEditingRecord(null); }}>
              <Plus size={16} style={{ marginRight: 8 }} /> Log Fuel
            </button>
          }>
            <DataTable
              rows={filteredFuelLogs}
              columns={[
                { key: "date", label: "Date", render: v => formatDateAU(v) },
                { key: "litres", label: "Litres" },
                { key: "totalCost", label: "Cost", render: v => currency(v) },
                { key: "hoursAtFill", label: "Meter", render: v => `${v} hrs/km` },
                { key: "efficiency", label: "Cost / Unit", render: (_, row) => {
                  const logs = [...filteredFuelLogs].sort((a, b) => a.date.localeCompare(b.date));
                  const idx = logs.findIndex(l => l.id === row.id);
                  if (idx === 0) return "—";
                  const prev = logs[idx-1];
                  const diff = safeNumber(row.hoursAtFill) - safeNumber(prev.hoursAtFill);
                  if (diff <= 0) return "—";
                  return `${currency(safeNumber(row.totalCost) / diff)} per hr/km`;
                }},
                { key: "actions", label: "", render: (_, row) => (
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button style={{ ...buttonSecondary, padding: "6px 10px" }} onClick={() => { setEditingRecord(row); setShowAddRecord(true); }}>
                      <PenLine size={14} />
                    </button>
                    <button style={{ ...buttonSecondary, padding: "6px 10px", color: "#DC2626" }} onClick={() => deleteMachineryFuelLog(row.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              ]}
              emptyState={{ title: "No fuel logs", message: "Track fuel usage to monitor equipment efficiency and costs.", icon: "⛽" }}
            />
          </SectionCard>
        )}

        {activeTab === "details" && (
          <div style={{ display: "grid", gap: 20 }}>
            <SectionCard title="Machine Specifications">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><span style={labelStyle}>Name</span> <div>{selectedMachine.name}</div></div>
                <div><span style={labelStyle}>Type</span> <div>{selectedMachine.type}</div></div>
                <div><span style={labelStyle}>Make</span> <div>{selectedMachine.make}</div></div>
                <div><span style={labelStyle}>Model</span> <div>{selectedMachine.model}</div></div>
                <div><span style={labelStyle}>Year</span> <div>{selectedMachine.year}</div></div>
                <div><span style={labelStyle}>Registration</span> <div>{selectedMachine.rego}</div></div>
                <div><span style={labelStyle}>Purchase Date</span> <div>{formatDateAU(selectedMachine.purchaseDate)}</div></div>
                <div><span style={labelStyle}>Purchase Price</span> <div>{currency(selectedMachine.purchasePrice)}</div></div>
              </div>
            </SectionCard>
            <SectionCard title="Service Settings">
               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><span style={labelStyle}>Service Interval (Hours)</span> <div>{selectedMachine.serviceIntervalHours || "Not set"}</div></div>
                <div><span style={labelStyle}>Service Interval (Months)</span> <div>{selectedMachine.serviceIntervalMonths || "Not set"}</div></div>
              </div>
            </SectionCard>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button style={{ ...buttonSecondary, color: "#DC2626", borderColor: "#FCA5A5" }} onClick={() => {
                confirm({
                  title: "Remove Machinery?",
                  message: "Are you sure you want to remove this machine from the register?",
                  confirmLabel: "Remove",
                  onConfirm: () => { deleteMachinery(selectedMachine.id); setView("list"); }
                });
              }}>
                <Trash2 size={16} style={{ marginRight: 8 }} /> Remove Machine
              </button>
              <button style={buttonPrimary} onClick={() => { setMachineForm({ ...selectedMachine }); setView("add"); }}>
                <PenLine size={16} style={{ marginRight: 8 }} /> Edit Details
              </button>
            </div>
          </div>
        )}

        {showAddRecord && (
          <RecordModal
            type={activeTab}
            machine={selectedMachine}
            record={editingRecord}
            onClose={() => { setShowAddRecord(false); setEditingRecord(null); }}
            onSave={async (data) => {
              if (activeTab === "history") await saveMachineryServiceRecord({ ...data, machineId: selectedMachine.id });
              if (activeTab === "breakdowns") await saveMachineryBreakdown({ ...data, machineId: selectedMachine.id });
              if (activeTab === "fuel") await saveMachineryFuelLog({ ...data, machineId: selectedMachine.id });
              setShowAddRecord(false);
              setEditingRecord(null);
            }}
            props={props}
          />
        )}
      </div>
    );
  }

  return null;
}

function RecordModal({ type, machine, record, onClose, onSave, props }) {
  const { colours, labelStyle, inputStyle, buttonPrimary, buttonSecondary, todayLocal } = props;

  const [formData, setFormData] = useState(record || {
    date: todayLocal(),
    hours: machine.hoursMeter || "",
    type: "Full service",
    partsUsed: "",
    partsCost: "",
    labourCost: "",
    who: "",
    notes: "",
    description: "",
    downtimeHours: "",
    repairCost: "",
    repairedBy: "",
    litres: "",
    costPerLitre: "",
    totalCost: "",
    hoursAtFill: machine.hoursMeter || "",
  });

  const titles = { history: "Service Record", breakdowns: "Breakdown Event", fuel: "Fuel Log" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.5)", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>{record ? "Edit" : "Log"} {titles[type]}</div>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" style={inputStyle} value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
          </div>

          {type === "history" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Meter Reading (hrs/km)</label>
                  <input type="number" style={inputStyle} value={formData.hours} onChange={e => setFormData(p => ({ ...p, hours: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Service Type</label>
                  <select style={inputStyle} value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}>
                    {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Who Performed Service</label>
                <input style={inputStyle} value={formData.who} onChange={e => setFormData(p => ({ ...p, who: e.target.value }))} placeholder="Staff, external mechanic..." />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Parts Cost</label>
                  <input type="number" style={inputStyle} value={formData.partsCost} onChange={e => setFormData(p => ({ ...p, partsCost: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Labour Cost</label>
                  <input type="number" style={inputStyle} value={formData.labourCost} onChange={e => setFormData(p => ({ ...p, labourCost: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Parts Used & Notes</label>
                <textarea style={{ ...inputStyle, minHeight: 80 }} value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </>
          )}

          {type === "breakdowns" && (
            <>
              <div>
                <label style={labelStyle}>Description of Fault</label>
                <textarea style={{ ...inputStyle, minHeight: 80 }} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Downtime Hours</label>
                  <input type="number" style={inputStyle} value={formData.downtimeHours} onChange={e => setFormData(p => ({ ...p, downtimeHours: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Repair Cost</label>
                  <input type="number" style={inputStyle} value={formData.repairCost} onChange={e => setFormData(p => ({ ...p, repairCost: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Repaired By</label>
                <input style={inputStyle} value={formData.repairedBy} onChange={e => setFormData(p => ({ ...p, repairedBy: e.target.value }))} />
              </div>
            </>
          )}

          {type === "fuel" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Litres</label>
                  <input type="number" style={inputStyle} value={formData.litres} onChange={e => {
                    const l = e.target.value;
                    setFormData(p => ({ ...p, litres: l, totalCost: (safeNumber(l) * safeNumber(p.costPerLitre)).toFixed(2) }));
                  }} />
                </div>
                <div>
                  <label style={labelStyle}>Cost Per Litre</label>
                  <input type="number" step="0.001" style={inputStyle} value={formData.costPerLitre} onChange={e => {
                    const c = e.target.value;
                    setFormData(p => ({ ...p, costPerLitre: c, totalCost: (safeNumber(p.litres) * safeNumber(c)).toFixed(2) }));
                  }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Total Cost</label>
                  <input type="number" style={inputStyle} value={formData.totalCost} onChange={e => setFormData(p => ({ ...p, totalCost: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Meter at Fill</label>
                  <input type="number" style={inputStyle} value={formData.hoursAtFill} onChange={e => setFormData(p => ({ ...p, hoursAtFill: e.target.value }))} />
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <button style={buttonSecondary} onClick={onClose}>Cancel</button>
          <button style={buttonPrimary} onClick={() => onSave(formData)}>Save Record</button>
        </div>
      </div>
    </div>
  );
}

function safeNumber(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}
