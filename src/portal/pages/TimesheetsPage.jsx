import React, { useState, useMemo } from "react";
import { exportToCSV } from "../PortalHelpers";

const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fmtDateAU = (iso) => { if (!iso) return "—"; const p = iso.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; };

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0,0,0,0);
  return d;
};

const getWeekDates = (weekStart) => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
};

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const calcHours = (start, end) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? Math.round(diff / 60 * 100) / 100 : 0;
};

// ── Log Time Wizard ────────────────────────────────────────────────────────
function LogTimeWizard({ jobs, clients, allStaff, colours, inputStyle, buttonPrimary, buttonSecondary, profile, saveJob, saveProfileToSupabase, onClose }) {
  const ADMIN_CATEGORIES = [
    { id: "__admin__", label: "General / Admin" },
    { id: "__travel__", label: "Travel" },
    { id: "__training__", label: "Training" },
    { id: "__meetings__", label: "Meetings" },
  ];

  const [step, setStep] = useState(0); // 0=staff, 1=job, 2=details, 3=done
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [entryDate, setEntryDate] = useState(fmtDate(new Date()));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [manualHours, setManualHours] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [String(c.id), c])), [clients]);
  const realJobs = useMemo(() => jobs.filter((j) => !j.isAdminJob), [jobs]);

  const isAdminEntry = ADMIN_CATEGORIES.some(c => c.id === selectedJobId);
  const adminLabel = ADMIN_CATEGORIES.find(c => c.id === selectedJobId)?.label || "Admin";

  const computedHours = useManual ? (Number(manualHours) || 0) : calcHours(startTime, endTime);

  const handleSave = async () => {
    if (!selectedJobId || computedHours <= 0) return;
    setSaving(true);
    try {
      if (isAdminEntry) {
        const entry = {
          id: `${selectedStaffName || profile.businessName || "Owner"}-${selectedJobId}-${entryDate}`,
          date: entryDate,
          hours: computedHours,
          staff: selectedStaffName || profile.businessName || "Owner",
          startTime: useManual ? null : startTime,
          endTime: useManual ? null : endTime,
          notes: notes.trim() || "",
          category: adminLabel,
          updatedAt: new Date().toISOString(),
        };
        const existingEntries = Array.isArray(profile.overheadTimeEntries) ? profile.overheadTimeEntries : [];
        const idx = existingEntries.findIndex((t) =>
          t.date === entry.date &&
          t.staff === entry.staff &&
          (t.category || "") === (entry.category || "")
        );
        const nextEntries = idx >= 0
          ? existingEntries.map((t, i) => (i === idx ? entry : t))
          : [...existingEntries, entry];
        const savedProfile = await saveProfileToSupabase?.({
          ...profile,
          overheadTimeEntries: nextEntries,
        });
        if (!savedProfile) {
          setSaving(false);
          return;
        }
      } else {
        const job = realJobs.find((j) => String(j.id) === String(selectedJobId));
        if (!job || !saveJob) {
          setSaving(false);
          return;
        }
        const entries = [...(job.timeEntries || [])];
        const entry = {
          date: entryDate,
          hours: computedHours,
          staff: selectedStaffName || profile.businessName || "Owner",
          startTime: useManual ? undefined : startTime,
          endTime: useManual ? undefined : endTime,
          notes: notes.trim() || undefined,
          updatedAt: new Date().toISOString(),
        };
        const idx = entries.findIndex(t => t.date === entryDate && t.staff === entry.staff);
        if (idx >= 0) entries[idx] = entry; else entries.push(entry);
        const savedJob = await saveJob({ ...job, timeEntries: entries }, { silent: true });
        if (!savedJob) {
          setSaving(false);
          return;
        }
      }
      setStep(3);
    } catch (err) {
      console.error("Failed to save time entry:", err);
    }
    setSaving(false);
  };

  const overlay = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  };
  const modal = {
    background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480,
    maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  };
  const header = {
    padding: "20px 24px 16px", borderBottom: "1px solid #E2E8F0",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  };
  const body = { padding: "20px 24px 24px" };
  const stepDots = { display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 };
  const dot = (active) => ({
    width: 10, height: 10, borderRadius: "50%",
    background: active ? (colours.purple || "#6A1B9A") : "#E2E8F0",
    transition: "background 0.2s",
  });
  const optionBtn = (selected) => ({
    display: "block", width: "100%", textAlign: "left", padding: "14px 16px",
    border: `2px solid ${selected ? (colours.purple || "#6A1B9A") : "#E2E8F0"}`,
    borderRadius: 12, background: selected ? "#F5ECFB" : "#fff", cursor: "pointer",
    marginBottom: 8, fontSize: 14, fontWeight: selected ? 700 : 500, color: colours.text || "#111",
    transition: "all 0.15s",
  });
  const fieldLabel = { fontSize: 12, fontWeight: 700, color: colours.muted || "#64748B", textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.3 };
  const fieldGroup = { marginBottom: 16 };

  const steps = ["Staff", "Job", "Details", "Done"];

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: colours.purple || "#6A1B9A" }}>⏱️ Log Time</div>
            <div style={{ fontSize: 12, color: colours.muted || "#64748B", marginTop: 2 }}>Step {Math.min(step + 1, 3)} of 3 — {steps[step]}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: colours.muted || "#64748B", padding: 4 }}>✕</button>
        </div>

        <div style={body}>
          {/* Step dots */}
          <div style={stepDots}>
            {[0,1,2].map(i => <div key={i} style={dot(step >= i)} />)}
          </div>

          {/* Step 0: Pick staff */}
          {step === 0 && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: colours.text, marginBottom: 12 }}>Who logged the time?</div>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {allStaff.map(s => (
                  <button key={s} style={optionBtn(selectedStaffName === s)} onClick={() => setSelectedStaffName(s)}>
                    👤 {s}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  style={{ ...buttonPrimary, opacity: selectedStaffName ? 1 : 0.5, padding: "10px 28px" }}
                  disabled={!selectedStaffName}
                  onClick={() => setStep(1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Pick job or admin category */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: colours.text, marginBottom: 12 }}>What was the time for?</div>
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {/* Admin / overhead categories */}
                <div style={{ fontSize: 11, fontWeight: 700, color: colours.muted, textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 }}>Business Overheads</div>
                {ADMIN_CATEGORIES.map(c => (
                  <button key={c.id} style={optionBtn(selectedJobId === c.id)} onClick={() => setSelectedJobId(c.id)}>
                    <span style={{ marginRight: 6 }}>🏢</span> {c.label}
                  </button>
                ))}

                <div style={{ fontSize: 11, fontWeight: 700, color: colours.muted, textTransform: "uppercase", marginTop: 16, marginBottom: 6, letterSpacing: 0.5 }}>Jobs</div>
                {realJobs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: colours.muted, fontSize: 13 }}>No jobs found.</div>
                ) : (
                  realJobs.map(j => {
                    const client = clientMap[String(j.clientId)];
                    return (
                      <button key={j.id} style={optionBtn(selectedJobId === j.id)} onClick={() => setSelectedJobId(j.id)}>
                        <div style={{ fontWeight: 700 }}>{j.title || "Untitled"}</div>
                        {client && <div style={{ fontSize: 12, color: colours.muted, marginTop: 2 }}>{client.name}</div>}
                        {j.startDate && <div style={{ fontSize: 11, color: colours.muted, marginTop: 2 }}>📅 {fmtDateAU(j.startDate)}</div>}
                      </button>
                    );
                  })
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                <button style={{ ...buttonSecondary, padding: "10px 20px" }} onClick={() => setStep(0)}>← Back</button>
                <button
                  style={{ ...buttonPrimary, opacity: selectedJobId ? 1 : 0.5, padding: "10px 28px" }}
                  disabled={!selectedJobId}
                  onClick={() => setStep(2)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Enter details */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: colours.text, marginBottom: 16 }}>Enter time details</div>

              <div style={fieldGroup}>
                <div style={fieldLabel}>Date</div>
                <input type="date" style={{ ...inputStyle }} value={entryDate} onChange={e => setEntryDate(e.target.value)} />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <button
                  style={{ ...(!useManual ? buttonPrimary : buttonSecondary), padding: "6px 16px", fontSize: 12 }}
                  onClick={() => setUseManual(false)}
                >
                  Start / End Time
                </button>
                <button
                  style={{ ...(useManual ? buttonPrimary : buttonSecondary), padding: "6px 16px", fontSize: 12 }}
                  onClick={() => setUseManual(true)}
                >
                  Manual Hours
                </button>
              </div>

              {!useManual ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={fieldGroup}>
                    <div style={fieldLabel}>Start Time</div>
                    <input type="time" style={{ ...inputStyle }} value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div style={fieldGroup}>
                    <div style={fieldLabel}>End Time</div>
                    <input type="time" style={{ ...inputStyle }} value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div style={fieldGroup}>
                  <div style={fieldLabel}>Hours</div>
                  <input type="number" step="0.25" min="0" max="24" style={{ ...inputStyle }} value={manualHours} onChange={e => setManualHours(e.target.value)} placeholder="e.g. 8" />
                </div>
              )}

              <div style={{
                background: "#F5ECFB", borderRadius: 10, padding: "12px 16px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 24 }}>⏱️</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colours.muted }}>Calculated Hours</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: colours.purple || "#6A1B9A" }}>{computedHours.toFixed(1)}h</div>
                </div>
              </div>

              <div style={fieldGroup}>
                <div style={fieldLabel}>Notes (optional)</div>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this time entry..." />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <button style={{ ...buttonSecondary, padding: "10px 20px" }} onClick={() => setStep(1)}>← Back</button>
                <button
                  style={{ ...buttonPrimary, opacity: computedHours > 0 ? 1 : 0.5, padding: "10px 28px" }}
                  disabled={computedHours <= 0 || saving}
                  onClick={handleSave}
                >
                  {saving ? "Saving..." : "Save Entry ✓"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: colours.text, marginBottom: 6 }}>Time logged!</div>
              <div style={{ fontSize: 14, color: colours.muted, marginBottom: 8 }}>
                {computedHours.toFixed(1)}h for <strong>{selectedStaffName}</strong>
              </div>
              <div style={{ fontSize: 13, color: colours.muted, marginBottom: 24 }}>
                {fmtDateAU(entryDate)} · {isAdminEntry ? adminLabel : (realJobs.find(j => String(j.id) === String(selectedJobId))?.title || "")}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button style={{ ...buttonSecondary, padding: "10px 20px" }} onClick={onClose}>Done</button>
                <button style={{ ...buttonPrimary, padding: "10px 20px" }} onClick={() => {
                  setStep(0);
                  setSelectedStaffName("");
                  setSelectedJobId("");
                  setEntryDate(fmtDate(new Date()));
                  setStartTime("08:00");
                  setEndTime("16:00");
                  setManualHours("");
                  setNotes("");
                }}>
                  Log Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main TimesheetsPage ────────────────────────────────────────────────────
export default function TimesheetsPage({
  jobs = [], clients = [], colours = {}, cardStyle = {}, buttonPrimary = {}, buttonSecondary = {},
  inputStyle = {}, labelStyle = {}, currency = v => `$${Number(v||0).toFixed(2)}`,
  DashboardHero = ({ children }) => <div>{children}</div>,
  InsightChip = () => null, MetricCard = () => null,
  SectionCard = ({ title, children, right }) => <section><div style={{ display: "flex", justifyContent: "space-between" }}><h3>{title}</h3>{right}</div>{children}</section>,
  EmptyState = ({ icon, title, message }) => <div>{icon} {title} {message}</div>,
  saveJob, saveProfileToSupabase, profile = {},
}) {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const weekDates = getWeekDates(weekStart);
  const weekEnd = weekDates[6];
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [editingCell, setEditingCell] = useState(null);
  const [editHours, setEditHours] = useState("");
  const [showWizard, setShowWizard] = useState(false);

  const weekLabel = `${fmtDateAU(fmtDate(weekStart))} – ${fmtDateAU(fmtDate(weekEnd))}`;

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goThisWeek = () => setWeekStart(getWeekStart(today));

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [String(c.id), c])), [clients]);
  const realJobs = useMemo(() => jobs.filter((j) => !j.isAdminJob), [jobs]);
  const overheadEntries = useMemo(() => Array.isArray(profile.overheadTimeEntries) ? profile.overheadTimeEntries : [], [profile.overheadTimeEntries]);

  const allStaff = useMemo(() => {
    const set = new Set();
    realJobs.forEach(j => {
      if (j.assignedTo) set.add(j.assignedTo);
      (j.timeEntries || []).forEach(te => { if (te.staff) set.add(te.staff); });
    });
    overheadEntries.forEach((te) => { if (te?.staff) set.add(te.staff); });
    const ownerName = profile.businessName || profile.name || "Owner";
    set.add(ownerName);
    return Array.from(set).sort();
  }, [realJobs, overheadEntries, profile.businessName, profile.name]);

  const weekJobs = useMemo(() => {
    const ws = fmtDate(weekStart);
    const we = fmtDate(weekEnd);
    return realJobs.filter(j => {
      const jStart = j.startDate || "";
      const jEnd = j.endDate || jStart;
      const dateOverlap = jStart && jStart <= we && jEnd >= ws;
      const hasTimeEntryThisWeek = (j.timeEntries || []).some(te => te.date >= ws && te.date <= we);
      return dateOverlap || hasTimeEntryThisWeek;
    });
  }, [realJobs, weekStart, weekEnd]);

  const timesheetData = useMemo(() => {
    const ownerName = profile.businessName || profile.name || "Owner";
    const data = [];
    const ws = fmtDate(weekStart);
    const we = fmtDate(weekEnd);

    const filteredJobs = selectedStaff === "all" ? weekJobs : weekJobs.filter(j => {
      const assigned = j.assignedTo || ownerName;
      const hasMatchingEntry = (j.timeEntries || []).some((t) => t.staff === selectedStaff);
      return assigned === selectedStaff || hasMatchingEntry;
    });

    filteredJobs.forEach(j => {
      const assigned = selectedStaff !== "all"
        ? selectedStaff
        : ((j.timeEntries || []).find((t) => t.staff)?.staff || j.assignedTo || ownerName);
      const clientName = clientMap[String(j.clientId)]?.name || "—";
      const days = {};
      let totalHours = 0;

      weekDates.forEach(d => {
        const dateStr = fmtDate(d);
        const matchingEntries = (j.timeEntries || []).filter(t => t.date === dateStr && (selectedStaff === "all" || t.staff === selectedStaff));
        let hrs = matchingEntries.reduce((sum, t) => sum + Number(t.hours || 0), 0);

        if (!hrs && (j.startDate === dateStr || (j.startDate <= dateStr && (j.endDate || j.startDate) >= dateStr))) {
          hrs = calcHours(j.startTime, j.endTime);
        }

        days[dateStr] = hrs;
        totalHours += hrs;
      });

      if (totalHours > 0 || filteredJobs.length <= 20) {
        data.push({ jobId: j.id, jobTitle: j.title || "Untitled", clientName, assignedTo: assigned, days, totalHours, hourlyRate: j.hourlyRate || 0 });
      }
    });

    const filteredOverhead = overheadEntries.filter((entry) =>
      entry?.date >= ws && entry?.date <= we && (selectedStaff === "all" || entry?.staff === selectedStaff)
    );
    const overheadMap = new Map();

    filteredOverhead.forEach((entry) => {
      const staff = entry?.staff || ownerName;
      const category = entry?.category || "General / Admin";
      const key = `${staff}__${category}`;
      if (!overheadMap.has(key)) {
        const days = {};
        weekDates.forEach((d) => { days[fmtDate(d)] = 0; });
        overheadMap.set(key, {
          jobId: `overhead::${encodeURIComponent(staff)}::${encodeURIComponent(category)}`,
          jobTitle: category,
          clientName: "Non-billable",
          assignedTo: staff,
          days,
          totalHours: 0,
          hourlyRate: 0,
        });
      }
      const row = overheadMap.get(key);
      const dateStr = entry.date;
      const hrs = Number(entry.hours || 0);
      row.days[dateStr] = (row.days[dateStr] || 0) + hrs;
      row.totalHours += hrs;
    });

    overheadMap.forEach((row) => {
      if (row.totalHours > 0) data.push(row);
    });

    return data;
  }, [weekJobs, weekDates, selectedStaff, clientMap, profile.businessName, profile.name, overheadEntries, weekStart, weekEnd]);

  const dayTotals = useMemo(() => {
    const totals = {};
    weekDates.forEach(d => { totals[fmtDate(d)] = 0; });
    timesheetData.forEach(row => {
      Object.entries(row.days).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + v; });
    });
    return totals;
  }, [timesheetData, weekDates]);

  const grandTotal = timesheetData.reduce((s, r) => s + r.totalHours, 0);

  const staffSummary = useMemo(() => {
    const map = {};
    timesheetData.forEach(row => {
      if (!map[row.assignedTo]) map[row.assignedTo] = 0;
      map[row.assignedTo] += row.totalHours;
    });
    return Object.entries(map).map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours);
  }, [timesheetData]);

  const deleteRow = async (row) => {
    if (!confirm(`Delete all time entries for "${row.jobTitle}" (${row.assignedTo}) this week?`)) return;
    const ws = fmtDate(weekStart);
    const we = fmtDate(weekEnd);

    if (String(row.jobId).startsWith("overhead::")) {
      const [, encodedStaff = "", encodedCategory = ""] = String(row.jobId).split("::");
      const staff = decodeURIComponent(encodedStaff);
      const category = decodeURIComponent(encodedCategory);
      const existing = Array.isArray(profile.overheadTimeEntries) ? profile.overheadTimeEntries : [];
      const next = existing.filter((e) => !(e.date >= ws && e.date <= we && (e.staff || "") === staff && (e.category || "") === category));
      await saveProfileToSupabase?.({ ...profile, overheadTimeEntries: next });
    } else {
      const job = realJobs.find((j) => String(j.id) === String(row.jobId));
      if (!job || !saveJob) return;
      const kept = (job.timeEntries || []).filter((t) => !(t.date >= ws && t.date <= we && (selectedStaff === "all" || t.staff === selectedStaff)));
      await saveJob({ ...job, timeEntries: kept }, { silent: true });
    }
  };

  const saveTimeEntry = async (jobId, dateStr, hours) => {
    const numericHours = Number(hours) || 0;

    if (String(jobId).startsWith("overhead::")) {
      const [, encodedStaff = "", encodedCategory = "General%20%2F%20Admin"] = String(jobId).split("::");
      const staff = decodeURIComponent(encodedStaff);
      const category = decodeURIComponent(encodedCategory);
      const existingEntries = Array.isArray(profile.overheadTimeEntries) ? profile.overheadTimeEntries : [];
      const nextEntries = existingEntries.filter((entry) => !(entry.date === dateStr && (entry.staff || "") === staff && (entry.category || "") === category));
      if (numericHours > 0) {
        nextEntries.push({
          id: `${staff}-${category}-${dateStr}`,
          date: dateStr,
          hours: numericHours,
          staff,
          category,
          updatedAt: new Date().toISOString(),
        });
      }
      await saveProfileToSupabase?.({ ...profile, overheadTimeEntries: nextEntries });
      setEditingCell(null);
      return;
    }

    const job = realJobs.find(j => String(j.id) === String(jobId));
    if (!job || !saveJob) return;
    const entries = [...(job.timeEntries || [])];
    const idx = entries.findIndex(t => t.date === dateStr && (selectedStaff === "all" || t.staff === selectedStaff));
    const entry = { date: dateStr, hours: numericHours, staff: selectedStaff !== "all" ? selectedStaff : (job.assignedTo || profile.businessName || "Owner"), updatedAt: new Date().toISOString() };
    if (idx >= 0) entries[idx] = entry; else entries.push(entry);
    await saveJob({ ...job, timeEntries: entries }, { silent: true });
    setEditingCell(null);
  };

  const exportTimesheet = () => {
    const rows = timesheetData.map(row => {
      const r = {
        "Staff": row.assignedTo,
        "Job": row.jobTitle,
        "Client": row.clientName,
      };
      weekDates.forEach((d, i) => { r[DAYS[i] + " " + fmtDateAU(fmtDate(d))] = row.days[fmtDate(d)] || 0; });
      r["Total Hours"] = row.totalHours;
      if (row.hourlyRate) r["Rate"] = row.hourlyRate;
      if (row.hourlyRate) r["Amount"] = (row.totalHours * row.hourlyRate).toFixed(2);
      return r;
    });
    const totalsRow = { "Staff": "", "Job": "TOTALS", "Client": "" };
    weekDates.forEach((d, i) => { totalsRow[DAYS[i] + " " + fmtDateAU(fmtDate(d))] = dayTotals[fmtDate(d)] || 0; });
    totalsRow["Total Hours"] = grandTotal;
    rows.push(totalsRow);

    const headers = Object.keys(rows[0] || {});
    const csvContent = [headers.join(","), ...rows.map(r => headers.map(h => {
      const v = r[h];
      return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
    }).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet_${fmtDate(weekStart)}_to_${fmtDate(weekEnd)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero
        title="Timesheets"
        subtitle="Weekly time tracking per staff member per job. Click any cell to enter hours manually."
        highlight={`${grandTotal.toFixed(1)}h`}
      >
        <InsightChip label="This Week" value={weekLabel} />
        <InsightChip label="Staff" value={String(staffSummary.length)} />
        <InsightChip label="Jobs" value={String(timesheetData.length)} />
      </DashboardHero>

      {/* Staff summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {staffSummary.slice(0, 6).map(s => (
          <MetricCard key={s.name} title={s.name} value={`${s.hours.toFixed(1)}h`} subtitle="this week" accent={colours.purple} />
        ))}
        <MetricCard title="Total Hours" value={`${grandTotal.toFixed(1)}h`} subtitle="all staff this week" accent={colours.teal} />
      </div>

      {/* Controls */}
      <SectionCard title="Weekly Timesheet" right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button style={{ ...buttonPrimary, padding: "8px 18px", fontSize: 13 }} onClick={() => setShowWizard(true)}>⏱️ Log Time</button>
          <select style={{ ...inputStyle, width: "auto", minWidth: 140 }} value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
            <option value="all">All Staff</option>
            {allStaff.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button style={buttonSecondary} onClick={exportTimesheet}>📥 Export CSV</button>
        </div>
      }>
        {/* Week navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button style={{ ...buttonSecondary, padding: "6px 14px" }} onClick={prevWeek}>◀ Prev</button>
          <button style={{ ...buttonSecondary, padding: "6px 14px", fontWeight: 800 }} onClick={goThisWeek}>Today</button>
          <button style={{ ...buttonSecondary, padding: "6px 14px" }} onClick={nextWeek}>Next ▶</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: colours.text }}>{weekLabel}</span>
        </div>

        {timesheetData.length === 0 ? (
          <EmptyState icon="⏱️" title="No time recorded this week" message="Jobs with scheduled times will appear here automatically. Use the Log Time button or click any cell to log hours manually." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Staff</th>
                  <th style={thStyle}>Job</th>
                  <th style={thStyle}>Client</th>
                  {weekDates.map((d, i) => {
                    const isToday = fmtDate(d) === fmtDate(today);
                    const isWeekend = i >= 5;
                    return (
                      <th key={i} style={{ ...thStyle, textAlign: "center", minWidth: 60, background: isToday ? "#E8F5E9" : isWeekend ? "#FFF8E1" : undefined }}>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{DAYS[i]}</div>
                        <div style={{ fontSize: 10, color: colours.muted }}>{fmtDate(d).slice(8)}/{fmtDate(d).slice(5,7)}</div>
                      </th>
                    );
                  })}
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 70, background: "#F5ECFB" }}>Total</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {timesheetData.map((row, ri) => (
                  <tr key={row.jobId + "-" + ri} style={{ background: ri % 2 === 0 ? "#FFFFFF" : "#FAFBFC" }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: colours.text }}>{row.assignedTo}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, color: colours.purple }}>{row.jobTitle}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: colours.muted }}>{row.clientName}</span>
                    </td>
                    {weekDates.map((d, i) => {
                      const dateStr = fmtDate(d);
                      const hrs = row.days[dateStr] || 0;
                      const isEditing = editingCell?.jobId === row.jobId && editingCell?.dateStr === dateStr;
                      const isToday = dateStr === fmtDate(today);
                      const isWeekend = i >= 5;
                      return (
                        <td key={i} style={{ ...tdStyle, textAlign: "center", cursor: "pointer", background: isToday ? "#E8F5E9" : isWeekend ? "#FFF8E1" : undefined, padding: 4 }}
                          onClick={() => { if (!isEditing) { setEditingCell({ jobId: row.jobId, dateStr }); setEditHours(String(hrs || "")); } }}
                        >
                          {isEditing ? (
                            <input
                              type="number" step="0.25" min="0" max="24"
                              style={{ ...inputStyle, width: 50, textAlign: "center", padding: "4px", fontSize: 13 }}
                              value={editHours}
                              onChange={e => setEditHours(e.target.value)}
                              onBlur={() => saveTimeEntry(row.jobId, dateStr, editHours)}
                              onKeyDown={e => { if (e.key === "Enter") saveTimeEntry(row.jobId, dateStr, editHours); if (e.key === "Escape") setEditingCell(null); }}
                              autoFocus
                            />
                          ) : (
                            <span style={{ fontWeight: hrs > 0 ? 700 : 400, color: hrs > 0 ? colours.text : "#CBD5E1", fontSize: 13 }}>
                              {hrs > 0 ? hrs.toFixed(hrs % 1 === 0 ? 0 : 1) : "–"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, color: colours.purple, background: "#F5ECFB" }}>
                      {row.totalHours.toFixed(row.totalHours % 1 === 0 ? 0 : 1)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", padding: 4 }}>
                      {row.totalHours > 0 && (
                        <button
                          onClick={() => deleteRow(row)}
                          title="Delete this week's entries"
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "#EF4444", padding: "4px 6px", borderRadius: 4 }}
                          onMouseOver={e => e.currentTarget.style.background = "#FEE2E2"}
                          onMouseOut={e => e.currentTarget.style.background = "none"}
                        >🗑️</button>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ borderTop: `3px solid ${colours.purple || "#6A1B9A"}` }}>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight: 800, color: colours.text, fontSize: 14 }}>TOTALS</td>
                  {weekDates.map((d, i) => {
                    const dateStr = fmtDate(d);
                    const total = dayTotals[dateStr] || 0;
                    const isToday = dateStr === fmtDate(today);
                    const isWeekend = i >= 5;
                    return (
                      <td key={i} style={{ ...tdStyle, textAlign: "center", fontWeight: 800, fontSize: 14, color: colours.text, background: isToday ? "#C8E6C9" : isWeekend ? "#FFF3E0" : "#F1F5F9" }}>
                        {total > 0 ? total.toFixed(total % 1 === 0 ? 0 : 1) : "–"}
                      </td>
                    );
                  })}
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 900, fontSize: 16, color: "#FFFFFF", background: colours.purple || "#6A1B9A", borderRadius: "0 0 8px 0" }}>
                    {grandTotal.toFixed(grandTotal % 1 === 0 ? 0 : 1)}
                  </td>
                  <td style={tdStyle}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Log Time Wizard Modal */}
      {showWizard && (
        <LogTimeWizard
          jobs={jobs}
          clients={clients}
          allStaff={allStaff}
          colours={colours}
          inputStyle={inputStyle}
          buttonPrimary={buttonPrimary}
          buttonSecondary={buttonSecondary}
          profile={profile}
          saveJob={saveJob}
          saveProfileToSupabase={saveProfileToSupabase}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "2px solid #E2E8F0",
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: 0.3,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #F1F5F9",
  whiteSpace: "nowrap",
};
