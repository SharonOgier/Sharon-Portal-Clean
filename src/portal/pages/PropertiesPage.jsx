import React, { useState, useMemo } from "react";
import { useTerminology } from "../TerminologyContext";

// ---------------------------------------------------------------------------
// PROPERTY TYPES
// ---------------------------------------------------------------------------
const PROPERTY_TYPES = ["Residential", "Commercial", "Farm / Rural"];

const PASTURE_TYPES = ["Kikuyu", "Rhodes grass", "Native", "Lucerne", "Clover", "Mixed", "Other"];
const WATER_SOURCES = ["Dam", "Trough", "Creek", "Bore", "Tank", "None"];
const FENCING_CONDITIONS = ["Good", "Fair", "Poor"];
const SPELLING_WARNING_DAYS = 21;

const todayIso = () => new Date().toISOString().slice(0, 10);
const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const daysBetween = (fromIso, toIso = todayIso()) => {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const diff = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};
const addDaysIso = (isoDate, days) => {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + safeNumber(days));
  return d.toISOString().slice(0, 10);
};
const isPaddockSubLocation = (sub = {}) => {
  if (sub.isPaddock) return true;
  const type = String(sub.type || "").toLowerCase();
  if (type === "paddock") return true;
  return String(sub.name || "").toLowerCase().includes("paddock");
};
const normaliseSubLocation = (sub = {}) => ({
  ...sub,
  isPaddock: isPaddockSubLocation(sub),
  type: isPaddockSubLocation(sub) ? "Paddock" : String(sub.type || ""),
  sizeHectares: sub.sizeHectares ?? "",
  pastureType: sub.pastureType ?? "",
  waterSource: sub.waterSource ?? "",
  fencingCondition: sub.fencingCondition ?? "",
  gpsBoundary: sub.gpsBoundary ?? "",
});
const sortByDateDesc = (rows = []) => [...rows].sort((a, b) => {
  const left = String(a.date || a.createdAt || "");
  const right = String(b.date || b.createdAt || "");
  return right.localeCompare(left);
});
// ---------------------------------------------------------------------------
// SUB-LOCATION EDITOR (inline)
// ---------------------------------------------------------------------------
function SubLocationEditor({ subLocations = [], onChange, inputStyle, labelStyle, buttonPrimary, buttonSecondary, colours }) {
  const { t } = useTerminology();
  const add = () => onChange([...subLocations, normaliseSubLocation({ id: Date.now(), name: "", description: "" })]);
  const update = (id, field, value) => onChange(subLocations.map((s) => (s.id === id ? normaliseSubLocation({ ...s, [field]: value }) : s)));
  const remove = (id) => onChange(subLocations.filter((s) => s.id !== id));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={{ ...labelStyle, margin: 0, fontWeight: 800, fontSize: 13 }}>{t("subLocations")}</label>
        <button style={{ ...buttonSecondary, fontSize: 12, padding: "6px 14px" }} onClick={add}>+ Add {t("subLocation")}</button>
      </div>
      {subLocations.length === 0 && (
        <div style={{ fontSize: 13, color: colours.muted, padding: "10px 0" }}>
          No {t("subLocations").toLowerCase()} yet. Add areas like {t("paddocks").toLowerCase()}, sheds, rooms, or zones.
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {subLocations.map((raw) => {
          const s = normaliseSubLocation(raw);
          return (
            <div key={s.id} style={{ display: "grid", gap: 10, padding: 12, borderRadius: 10, border: `1px solid ${colours.border}`, background: "#FAFAFA" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, alignItems: "start" }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Name</label>
                  <input style={inputStyle} value={s.name || ""} onChange={(e) => update(s.id, "name", e.target.value)} placeholder="e.g. Paddock 4" />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Description</label>
                  <input style={inputStyle} value={s.description || ""} onChange={(e) => update(s.id, "description", e.target.value)} placeholder="Optional description" />
                </div>
                <button style={{ ...buttonSecondary, color: "#DC2626", fontSize: 11, padding: "6px 10px", marginTop: 22 }} onClick={() => remove(s.id)}>x</button>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ ...labelStyle, margin: 0, fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={Boolean(s.isPaddock)} onChange={(e) => update(s.id, "isPaddock", e.target.checked)} />
                  Tag as {t("paddock").toLowerCase()}
                </label>
                {s.isPaddock && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#166534", background: "#DCFCE7", borderRadius: 999, padding: "2px 10px" }}>
                    {t("paddock")} record enabled
                  </span>
                )}
              </div>

              {s.isPaddock && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Size (ha)</label>
                    <input style={inputStyle} type="number" min="0" step="0.1" value={s.sizeHectares || ""} onChange={(e) => update(s.id, "sizeHectares", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Pasture type</label>
                    <select style={inputStyle} value={s.pastureType || ""} onChange={(e) => update(s.id, "pastureType", e.target.value)}>
                      <option value="">Select...</option>
                      {PASTURE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Water source</label>
                    <select style={inputStyle} value={s.waterSource || ""} onChange={(e) => update(s.id, "waterSource", e.target.value)}>
                      <option value="">Select...</option>
                      {WATER_SOURCES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Fencing condition</label>
                    <select style={inputStyle} value={s.fencingCondition || ""} onChange={(e) => update(s.id, "fencingCondition", e.target.value)}>
                      <option value="">Select...</option>
                      {FENCING_CONDITIONS.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ ...labelStyle, fontSize: 11 }}>GPS boundary (optional)</label>
                    <input style={inputStyle} value={s.gpsBoundary || ""} onChange={(e) => update(s.id, "gpsBoundary", e.target.value)} placeholder="lat,lng|lat,lng|lat,lng" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------
// PROPERTY FORM
// ---------------------------------------------------------------------------
function PropertyForm({ form, setForm, clients = [], inputStyle, labelStyle, cardStyle, buttonPrimary, buttonSecondary, colours, onSave, onCancel, isEditing }) {
  const { t } = useTerminology();
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Core fields */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div>
          <label style={labelStyle}>{t("property")} name *</label>
          <input style={inputStyle} value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Smith Farm, 42 Main St" />
        </div>
        <div>
          <label style={labelStyle}>Linked contact</label>
          <select style={inputStyle} value={form.clientId || ""} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
            <option value="">— None —</option>
            {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t("property")} type</label>
          <select style={inputStyle} value={form.propertyType || ""} onChange={e => setForm(p => ({ ...p, propertyType: e.target.value }))}>
            <option value="">Select…</option>
            {PROPERTY_TYPES.map(type => <option key={type}>{type}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Full address</label>
        <input style={inputStyle} value={form.address || ""} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Example Rd, Town VIC 3000" />
      </div>

      {/* GPS coordinates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={labelStyle}>Latitude</label>
          <input style={inputStyle} type="number" step="any" value={form.gpsLat || ""} onChange={e => setForm(p => ({ ...p, gpsLat: e.target.value }))} placeholder="-33.8688" />
        </div>
        <div>
          <label style={labelStyle}>Longitude</label>
          <input style={inputStyle} type="number" step="any" value={form.gpsLng || ""} onChange={e => setForm(p => ({ ...p, gpsLng: e.target.value }))} placeholder="151.2093" />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes about this property…" />
      </div>

      {/* Sub-locations */}
      <div style={{ ...cardStyle, padding: 16, border: `1px solid ${colours.border}` }}>
        <SubLocationEditor
          subLocations={(form.subLocations || []).map(normaliseSubLocation)}
          onChange={subs => setForm(p => ({ ...p, subLocations: subs.map(normaliseSubLocation) }))}
          inputStyle={inputStyle} labelStyle={labelStyle}
          buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
          colours={colours}
        />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
        <button style={buttonSecondary} onClick={onCancel}>Cancel</button>
        <button style={buttonPrimary} onClick={onSave}>{isEditing ? "Save Changes" : `Save ${t("property")}`}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PROPERTY DETAIL VIEW
// ---------------------------------------------------------------------------
function PaddockPanel({ property, paddock, allProperties = [], jobs = [], chemicalRecords = [], paddockEvents = [], savePaddockEvent, archivePaddockEvent, colours, cardStyle, buttonPrimary, buttonSecondary, inputStyle, labelStyle, setActivePage, formatDateAU = (v) => v || "" }) {
  const { t } = useTerminology();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRainModal, setShowRainModal] = useState(false);
  const [showPastureModal, setShowPastureModal] = useState(false);
  const [showSpellingModal, setShowSpellingModal] = useState(false);
  const [moveForm, setMoveForm] = useState({ date: todayIso(), mobName: "", headCount: "", destination: "" });
  const [rainForm, setRainForm] = useState({ date: todayIso(), millimetres: "", notes: "" });
  const [pastureForm, setPastureForm] = useState({ date: todayIso(), score: "3", notes: "" });
  const [spellingForm, setSpellingForm] = useState({ startDate: todayIso(), durationDays: "", notes: "" });

  const activePaddockEvents = useMemo(() => sortByDateDesc((paddockEvents || []).filter((event) => (
    !event.archived && String(event.propertyId || "") === String(property.id) && String(event.subLocationId || "") === String(paddock.id)
  ))), [paddockEvents, property.id, paddock.id]);

  const chemicalForPaddock = useMemo(() => sortByDateDesc((chemicalRecords || []).filter((record) => {
    if (record.archived) return false;
    if (String(record.propertyId || "") !== String(property.id)) return false;
    if (record.subLocationId && String(record.subLocationId) !== String(paddock.id)) return false;
    return true;
  })), [chemicalRecords, property.id, paddock.id]);

  const completedJobsForPaddock = useMemo(() => sortByDateDesc((jobs || []).filter((job) => {
    const status = String(job?.status || "").toLowerCase();
    const completed = status.includes("complete") || status === "done";
    if (!completed) return false;
    const sameProperty = String(job.propertyId || job.siteId || "") === String(property.id);
    if (!sameProperty) return false;
    if (job.subLocationId) return String(job.subLocationId) === String(paddock.id);
    const text = `${job.title || ""} ${job.name || ""} ${job.notes || ""}`.toLowerCase();
    return text.includes(String(paddock.name || "").toLowerCase());
  })), [jobs, property.id, paddock.id, paddock.name]);

  const timeline = useMemo(() => {
    const baseEvents = activePaddockEvents.map((event) => ({
      key: `event-${event.id || event.clientRef}`,
      date: event.date || event.startDate || event.createdAt,
      title: event.title || (event.eventType === "rainfall" ? `Rainfall ${safeNumber(event.millimetres)} mm` : "Paddock event"),
      notes: event.notes || "",
      source: "paddockEvents",
      raw: event,
    }));
    const chemicalItems = chemicalForPaddock.map((record) => ({
      key: `chemical-${record.id}`,
      date: record.date,
      title: `${record.chemicalProductName || "Chemical"} applied`,
      notes: `${record.targetPestOrWeed || ""}${record.withholdingEndDate ? ` | WHP until ${record.withholdingEndDate}` : ""}`,
      source: "chemicalRecords",
      raw: record,
    }));
    const jobItems = completedJobsForPaddock.map((job) => ({
      key: `job-${job.id}`,
      date: job.completedDate || job.startDate || job.date || job.updatedAt,
      title: job.title || job.name || `Job #${job.id}`,
      notes: job.notes || "",
      source: "jobs",
      raw: job,
    }));
    return sortByDateDesc([...baseEvents, ...chemicalItems, ...jobItems]);
  }, [activePaddockEvents, chemicalForPaddock, completedJobsForPaddock]);

  const grazingEventsAsc = useMemo(() => [...activePaddockEvents].filter((event) => String(event.eventType || "").startsWith("mob_move_")).sort((a, b) => String(a.date || a.createdAt || "").localeCompare(String(b.date || b.createdAt || ""))), [activePaddockEvents]);
  const currentMob = useMemo(() => {
    let state = null;
    grazingEventsAsc.forEach((event) => {
      if (event.eventType === "mob_move_in") state = { name: event.mobName || "Mob", headCount: safeNumber(event.headCount) };
      if (event.eventType === "mob_move_out") state = null;
    });
    return state;
  }, [grazingEventsAsc]);
  const lastGrazedDate = useMemo(() => {
    const recent = [...grazingEventsAsc].reverse()[0];
    return recent?.date || "";
  }, [grazingEventsAsc]);

  const lastSpellingDate = useMemo(() => {
    const spelling = sortByDateDesc(activePaddockEvents.filter((event) => event.eventType === "spelling_period"))[0];
    if (!spelling) return "";
    return safeNumber(spelling.durationDays) > 0 ? addDaysIso(spelling.startDate || spelling.date, safeNumber(spelling.durationDays)) : (spelling.startDate || spelling.date || "");
  }, [activePaddockEvents]);

  const activeWithholding = useMemo(() => chemicalForPaddock.filter((record) => String(record.withholdingEndDate || "") >= todayIso()), [chemicalForPaddock]);

  const rainfallEvents = useMemo(() => activePaddockEvents.filter((event) => event.eventType === "rainfall"), [activePaddockEvents]);
  const rainfallYear = new Date().getFullYear();
  const rainfallByMonth = useMemo(() => {
    const bucket = new Array(12).fill(0);
    rainfallEvents.forEach((event) => {
      const d = new Date(event.date);
      if (Number.isNaN(d.getTime()) || d.getFullYear() !== rainfallYear) return;
      bucket[d.getMonth()] += safeNumber(event.millimetres);
    });
    return bucket;
  }, [rainfallEvents, rainfallYear]);
  const annualRainfallTotal = rainfallByMonth.reduce((sum, n) => sum + n, 0);
  const peakRain = Math.max(...rainfallByMonth, 1);

  const destinationOptions = useMemo(() => {
    const options = [];
    allProperties.forEach((prop) => {
      (prop.subLocations || []).map(normaliseSubLocation).filter(isPaddockSubLocation).forEach((sub) => {
        if (String(prop.id) === String(property.id) && String(sub.id) === String(paddock.id)) return;
        options.push({ key: `${prop.id}::${sub.id}`, property: prop, sub });
      });
    });
    return options;
  }, [allProperties, property.id, paddock.id]);

  const destinationPicked = destinationOptions.find((item) => item.key === moveForm.destination) || null;
  const destinationWithholdingWarning = useMemo(() => {
    if (!destinationPicked) return "";
    const conflict = (chemicalRecords || []).find((record) => !record.archived && String(record.propertyId || "") === String(destinationPicked.property.id) && (!record.subLocationId || String(record.subLocationId || "") === String(destinationPicked.sub.id)) && String(record.withholdingEndDate || "") >= todayIso());
    return conflict ? `Destination has active withholding until ${conflict.withholdingEndDate}.` : "";
  }, [destinationPicked, chemicalRecords]);
  const destinationRecentGrazeWarning = useMemo(() => {
    if (!destinationPicked) return "";
    const destinationEvents = (paddockEvents || []).filter((event) => !event.archived && String(event.propertyId || "") === String(destinationPicked.property.id) && String(event.subLocationId || "") === String(destinationPicked.sub.id) && (event.eventType === "mob_move_in" || event.eventType === "mob_move_out"));
    const recent = sortByDateDesc(destinationEvents)[0];
    if (!recent?.date) return "";
    const days = daysBetween(recent.date);
    return (days !== null && days < SPELLING_WARNING_DAYS) ? `Destination was grazed ${days} day(s) ago and may need more spelling.` : "";
  }, [destinationPicked, paddockEvents]);

  const submitMoveMob = async () => {
    if (!moveForm.mobName.trim() || !moveForm.destination || safeNumber(moveForm.headCount) <= 0 || !moveForm.date) return;
    const destination = destinationOptions.find((item) => item.key === moveForm.destination);
    if (!destination) return;
    const ref = `move-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await savePaddockEvent({ eventType: "mob_move_out", date: moveForm.date, propertyId: property.id, subLocationId: paddock.id, mobName: moveForm.mobName.trim(), headCount: safeNumber(moveForm.headCount), destinationPropertyId: destination.property.id, destinationSubLocationId: destination.sub.id, destinationPaddockName: destination.sub.name, title: `Mob moved out to ${destination.sub.name}`, moveRef: ref, archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await savePaddockEvent({ eventType: "mob_move_in", date: moveForm.date, propertyId: destination.property.id, subLocationId: destination.sub.id, mobName: moveForm.mobName.trim(), headCount: safeNumber(moveForm.headCount), originPropertyId: property.id, originSubLocationId: paddock.id, originPaddockName: paddock.name, title: `Mob moved in from ${paddock.name}`, moveRef: ref, archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setShowMoveModal(false);
    setMoveForm({ date: todayIso(), mobName: "", headCount: "", destination: "" });
  };

  const submitRainfall = async () => {
    if (!rainForm.date) return;
    await savePaddockEvent({ eventType: "rainfall", date: rainForm.date, propertyId: property.id, subLocationId: paddock.id, millimetres: safeNumber(rainForm.millimetres), notes: rainForm.notes, title: `Rainfall ${safeNumber(rainForm.millimetres)} mm`, archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setShowRainModal(false);
    setRainForm({ date: todayIso(), millimetres: "", notes: "" });
  };

  const submitPasture = async () => {
    const score = safeNumber(pastureForm.score);
    if (!pastureForm.date || score < 1 || score > 5) return;
    await savePaddockEvent({ eventType: "pasture_assessment", date: pastureForm.date, propertyId: property.id, subLocationId: paddock.id, score, notes: pastureForm.notes, title: `Pasture assessment ${score}/5`, archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setShowPastureModal(false);
    setPastureForm({ date: todayIso(), score: "3", notes: "" });
  };

  const submitSpelling = async () => {
    const days = safeNumber(spellingForm.durationDays);
    if (!spellingForm.startDate || days <= 0) return;
    await savePaddockEvent({ eventType: "spelling_period", date: spellingForm.startDate, startDate: spellingForm.startDate, durationDays: days, endDate: addDaysIso(spellingForm.startDate, days), propertyId: property.id, subLocationId: paddock.id, notes: spellingForm.notes, title: `Paddock rested for ${days} days`, archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setShowSpellingModal(false);
    setSpellingForm({ startDate: todayIso(), durationDays: "", notes: "" });
  };

  const exportTimelinePdf = () => {
    const rows = timeline.map((item) => `<tr><td>${item.date || ""}</td><td>${item.title || ""}</td><td>${item.notes || ""}</td></tr>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px}</style></head><body><h1>${t("paddock")} History Report</h1><p><strong>${t("property")}:</strong> ${property.name || ""}</p><p><strong>${t("paddock")}:</strong> ${paddock.name || ""}</p><table><thead><tr><th>Date</th><th>Activity</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ ...cardStyle, padding: 14, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1E3A8A", marginBottom: 6 }}>{t("paddock")} Record</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <div><strong>Name:</strong> {paddock.name || `Unnamed ${t("paddock").toLowerCase()}`}</div>
          <div><strong>Size:</strong> {paddock.sizeHectares ? `${paddock.sizeHectares} ha` : "Not set"}</div>
          <div><strong>Pasture:</strong> {paddock.pastureType || "Not set"}</div>
          <div><strong>Water source:</strong> {paddock.waterSource || "Not set"}</div>
          <div><strong>Fencing:</strong> {paddock.fencingCondition || "Not set"}</div>
          <div><strong>GPS boundary:</strong> {paddock.gpsBoundary ? "Saved" : "No boundary drawn"}</div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 14, background: "#F8FAFC", border: `1px solid ${colours.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: colours.muted, marginBottom: 8 }}>Current Status</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          <div><div style={{ fontSize: 11, color: colours.muted }}>Current mob</div><div style={{ fontWeight: 700 }}>{currentMob ? `${currentMob.name} (${currentMob.headCount} head)` : "No mob currently assigned"}</div></div>
          <div><div style={{ fontSize: 11, color: colours.muted }}>Withholding active</div><div style={{ fontWeight: 700, color: activeWithholding.length ? "#B45309" : "#166534" }}>{activeWithholding.length ? "Yes" : "No"}</div></div>
          <div><div style={{ fontSize: 11, color: colours.muted }}>Last spelling date</div><div style={{ fontWeight: 700 }}>{lastSpellingDate ? formatDateAU(lastSpellingDate) : "Not recorded"}</div></div>
          <div><div style={{ fontSize: 11, color: colours.muted }}>Days since last grazed</div><div style={{ fontWeight: 700 }}>{lastGrazedDate ? `${daysBetween(lastGrazedDate)} day(s)` : "Not recorded"}</div></div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={buttonPrimary} onClick={() => setShowMoveModal(true)}>Move Mob</button>
        <button style={buttonSecondary} onClick={() => setShowRainModal(true)}>Log Rainfall</button>
        <button style={buttonSecondary} onClick={() => setShowPastureModal(true)}>Log {t("paddock")} Assessment</button>
        <button style={buttonSecondary} onClick={() => setShowSpellingModal(true)}>Log Spelling Period</button>
        <button style={buttonSecondary} onClick={exportTimelinePdf}>Export {t("paddock")} History PDF</button>
      </div>

      <div style={{ ...cardStyle, padding: 14, border: `1px solid ${colours.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: colours.muted, marginBottom: 8 }}>Rainfall Journal ({rainfallYear})</div>
        <div style={{ fontSize: 12, marginBottom: 8, color: colours.text }}>Total annual rainfall: <strong>{annualRainfallTotal.toFixed(1)} mm</strong></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 6, alignItems: "end", minHeight: 130 }}>
          {rainfallByMonth.map((value, idx) => {
            const pct = peakRain > 0 ? Math.max(4, (value / peakRain) * 100) : 4;
            return (
              <div key={idx} style={{ display: "grid", gap: 4, justifyItems: "center" }}>
                <div style={{ width: "100%", background: "#DBEAFE", borderRadius: 6, height: 96, display: "flex", alignItems: "end" }}><div style={{ width: "100%", height: `${pct}%`, background: "#2563EB", borderRadius: 6 }} /></div>
                <div style={{ fontSize: 10, color: colours.muted }}>{["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][idx]}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 14, border: `1px solid ${colours.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: colours.muted, marginBottom: 8 }}>{t("paddock")} History Timeline ({timeline.length})</div>
        {timeline.length === 0 ? <div style={{ color: colours.muted, fontSize: 13 }}>No {t("paddock").toLowerCase()} history yet.</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {timeline.map((item) => (
              <div key={item.key} style={{ border: `1px solid ${colours.border}`, borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div style={{ fontWeight: 700 }}>{item.title}</div><div style={{ fontSize: 12, color: colours.muted }}>{formatDateAU(item.date)}</div></div>
                {item.notes && <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>{item.notes}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 11, color: colours.muted }}>Source: {item.source === "jobs" ? t("schedule") : item.source === "chemicalRecords" ? "Chemical Records" : `${t("paddock")} Journal`}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {item.source === "jobs" && <button style={buttonSecondary} onClick={() => setActivePage("scheduling")}>Open {t("job").toLowerCase()}</button>}
                    {item.source === "chemicalRecords" && <button style={buttonSecondary} onClick={() => setActivePage("chemical records")}>Open chemical record</button>}
                    {item.source === "paddockEvents" && <button style={{ ...buttonSecondary, color: "#B91C1C" }} onClick={() => archivePaddockEvent(item.raw.id)}>Archive</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showMoveModal || showRainModal || showPastureModal || showSpellingModal) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 60, padding: 16 }}>
          <div style={{ ...cardStyle, width: "min(680px, 96vw)", maxHeight: "90vh", overflow: "auto", padding: 16, background: "#fff" }}>
            {showMoveModal && (
              <div style={{ display: "grid", gap: 10 }}>
                <h4 style={{ margin: 0, fontSize: 18 }}>Move Mob</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={moveForm.date} onChange={(e) => setMoveForm((p) => ({ ...p, date: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Mob name</label><input style={inputStyle} value={moveForm.mobName} onChange={(e) => setMoveForm((p) => ({ ...p, mobName: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Number of head</label><input type="number" min="1" style={inputStyle} value={moveForm.headCount} onChange={(e) => setMoveForm((p) => ({ ...p, headCount: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Destination {t("paddock").toLowerCase()}</label><select style={inputStyle} value={moveForm.destination} onChange={(e) => setMoveForm((p) => ({ ...p, destination: e.target.value }))}><option value="">Select destination</option>{destinationOptions.map((opt) => <option key={opt.key} value={opt.key}>{opt.property.name} - {opt.sub.name}</option>)}</select></div>
                </div>
                {destinationWithholdingWarning && <div style={{ fontSize: 12, color: "#B45309", background: "#FFEDD5", border: "1px solid #FDBA74", borderRadius: 8, padding: 8 }}>{destinationWithholdingWarning}</div>}
                {destinationRecentGrazeWarning && <div style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: 8 }}>{destinationRecentGrazeWarning}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button style={buttonSecondary} onClick={() => setShowMoveModal(false)}>Cancel</button><button style={buttonPrimary} onClick={submitMoveMob}>Save movement</button></div>
              </div>
            )}
            {showRainModal && (
              <div style={{ display: "grid", gap: 10 }}>
                <h4 style={{ margin: 0, fontSize: 18 }}>Log Rainfall</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={rainForm.date} onChange={(e) => setRainForm((p) => ({ ...p, date: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Millimetres</label><input type="number" min="0" step="0.1" style={inputStyle} value={rainForm.millimetres} onChange={(e) => setRainForm((p) => ({ ...p, millimetres: e.target.value }))} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={rainForm.notes} onChange={(e) => setRainForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button style={buttonSecondary} onClick={() => setShowRainModal(false)}>Cancel</button><button style={buttonPrimary} onClick={submitRainfall}>Save rainfall</button></div>
              </div>
            )}
            {showPastureModal && (
              <div style={{ display: "grid", gap: 10 }}>
                <h4 style={{ margin: 0, fontSize: 18 }}>{t("paddock")} Assessment</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={pastureForm.date} onChange={(e) => setPastureForm((p) => ({ ...p, date: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Condition (1-5)</label><input type="number" min="1" max="5" style={inputStyle} value={pastureForm.score} onChange={(e) => setPastureForm((p) => ({ ...p, score: e.target.value }))} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={pastureForm.notes} onChange={(e) => setPastureForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button style={buttonSecondary} onClick={() => setShowPastureModal(false)}>Cancel</button><button style={buttonPrimary} onClick={submitPasture}>Save assessment</button></div>
              </div>
            )}
            {showSpellingModal && (
              <div style={{ display: "grid", gap: 10 }}>
                <h4 style={{ margin: 0, fontSize: 18 }}>Spelling Period</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <div><label style={labelStyle}>Start date</label><input type="date" style={inputStyle} value={spellingForm.startDate} onChange={(e) => setSpellingForm((p) => ({ ...p, startDate: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Duration (days)</label><input type="number" min="1" style={inputStyle} value={spellingForm.durationDays} onChange={(e) => setSpellingForm((p) => ({ ...p, durationDays: e.target.value }))} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={spellingForm.notes} onChange={(e) => setSpellingForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button style={buttonSecondary} onClick={() => setShowSpellingModal(false)}>Cancel</button><button style={buttonPrimary} onClick={submitSpelling}>Save spelling</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyDetail({ property, clients, colours, cardStyle, buttonSecondary, buttonPrimary, inputStyle, labelStyle, setActivePage, jobs = [], chemicalRecords = [], paddockEvents = [], savePaddockEvent, archivePaddockEvent, allProperties = [], formatDateAU = (v) => v || "" }) {
  const { t } = useTerminology();
  const client = clients.find(c => String(c.id) === String(property.clientId));
  const subs = (property.subLocations || []).map(normaliseSubLocation);
  const hasCoords = property.gpsLat && property.gpsLng;
  const [selectedPaddockId, setSelectedPaddockId] = useState("");
  const paddocks = subs.filter(isPaddockSubLocation);
  const selectedPaddock = paddocks.find((p) => String(p.id) === String(selectedPaddockId)) || paddocks[0] || null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colours.text }}>{property.name}</h3>
          {property.address && <div style={{ fontSize: 14, color: colours.muted, marginTop: 4 }}>{property.address}</div>}
          {property.propertyType && <span style={{ display: "inline-block", marginTop: 8, padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: colours.lightPurple || "#F3E8FF", color: colours.purple }}>{property.propertyType}</span>}
        </div>
        {client && (
          <div style={{ ...cardStyle, padding: "10px 16px", background: colours.lightTeal || "#F0FDFA" }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: colours.teal }}>Linked contact</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colours.text }}>{client.name}</div>
          </div>
        )}
      </div>

      {hasCoords && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${colours.border}` }}>
          <iframe title={`${t("property")} location`} width="100%" height="300" style={{ border: 0 }} loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(property.gpsLng) - 0.01}%2C${Number(property.gpsLat) - 0.01}%2C${Number(property.gpsLng) + 0.01}%2C${Number(property.gpsLat) + 0.01}&layer=mapnik&marker=${property.gpsLat}%2C${property.gpsLng}`} />
        </div>
      )}

      {property.notes && (
        <div style={{ ...cardStyle, padding: 14, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#92400E", marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 13, color: colours.text, whiteSpace: "pre-wrap" }}>{property.notes}</div>
        </div>
      )}

      <div style={{ ...cardStyle, padding: 14, border: `1px solid ${colours.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: colours.muted, marginBottom: 8 }}>{t("subLocations")} ({subs.length})</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {subs.map((s) => (
            <div key={s.id} style={{ ...cardStyle, padding: 12, background: "#fff", border: `1px solid ${colours.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{s.name || "Unnamed"}</div>
                  {s.description && <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>{s.description}</div>}
                </div>
                {isPaddockSubLocation(s) && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#DCFCE7", color: "#166534" }}>{t("paddock")}</span>}
              </div>
              {isPaddockSubLocation(s) && <button style={{ ...buttonSecondary, marginTop: 10 }} onClick={() => setSelectedPaddockId(String(s.id))}>Open {t("paddock").toLowerCase()} history</button>}
            </div>
          ))}
        </div>
      </div>

      {selectedPaddock && (
        <PaddockPanel
          property={property}
          paddock={selectedPaddock}
          allProperties={allProperties}
          jobs={jobs}
          chemicalRecords={chemicalRecords}
          paddockEvents={paddockEvents}
          savePaddockEvent={savePaddockEvent}
          archivePaddockEvent={archivePaddockEvent}
          colours={colours}
          cardStyle={cardStyle}
          buttonPrimary={buttonPrimary}
          buttonSecondary={buttonSecondary}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          setActivePage={setActivePage}
          formatDateAU={formatDateAU}
        />
      )}
    </div>
  );
}
// ---------------------------------------------------------------------------
// MAP VIEW (OpenStreetMap embeds for all properties with coords)
// ---------------------------------------------------------------------------
function MapView({ properties, colours, cardStyle, onSelect, jobs = [] }) {
  const { t } = useTerminology();
  const withCoords = properties.filter(p => p.gpsLat && p.gpsLng);

  if (withCoords.length === 0) {
    return (
      <div style={{ padding: 30, textAlign: "center", color: colours.muted }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🗺️</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>No {t("properties").toLowerCase()} with GPS coordinates</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Add latitude and longitude to your {t("properties").toLowerCase()} to see them on the map.</div>
      </div>
    );
  }

  // Calculate center and bounds for a single map
  const avgLat = withCoords.reduce((s, p) => s + Number(p.gpsLat), 0) / withCoords.length;
  const avgLng = withCoords.reduce((s, p) => s + Number(p.gpsLng), 0) / withCoords.length;
  const spread = Math.max(
    ...withCoords.map(p => Math.abs(Number(p.gpsLat) - avgLat)),
    ...withCoords.map(p => Math.abs(Number(p.gpsLng) - avgLng)),
    0.05
  ) * 2;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Overview map */}
      <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${colours.border}` }}>
        <iframe
          title={`All ${t("properties").toLowerCase()}`}
          width="100%"
          height="400"
          style={{ border: 0 }}
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${avgLng - spread}%2C${avgLat - spread}%2C${avgLng + spread}%2C${avgLat + spread}&layer=mapnik`}
        />
      </div>

      {/* Property pins as cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {withCoords.map(p => (
          <div
            key={p.id}
            style={{ ...cardStyle, padding: 14, cursor: "pointer", transition: "box-shadow 0.15s", background: colours.bg }}
            onClick={() => onSelect(p)}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ""}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: colours.text }}>📍 {p.name}</div>
                {p.address && <div style={{ fontSize: 12, color: colours.muted, marginTop: 2 }}>{p.address}</div>}
              </div>
              {p.propertyType && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                  background: colours.lightPurple || "#F3E8FF", color: colours.purple,
                }}>{p.propertyType}</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: colours.muted, marginTop: 6 }}>
              {(p.subLocations || []).length} {t("subLocation").toLowerCase()}{(p.subLocations || []).length !== 1 ? "s" : ""}
              <span style={{ margin: "0 6px" }}>•</span>
              {(() => { const cnt = (jobs || []).filter(j => String(j.propertyId) === String(p.id) || String(j.siteId) === String(p.id)).length; return cnt > 0 ? <span style={{ color: colours.teal, fontWeight: 700 }}>{cnt} active {t("job").toLowerCase()}{cnt !== 1 ? "s" : ""}</span> : <span>No active {t("jobs").toLowerCase()}</span>; })()}
              <span style={{ margin: "0 6px" }}>•</span>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${p.gpsLat},${p.gpsLng}`}
                target="_blank" rel="noopener noreferrer"
                style={{ color: colours.purple, fontWeight: 700, textDecoration: "none" }}
                onClick={e => e.stopPropagation()}
              >Directions ↗</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN PROPERTIES PAGE
// ---------------------------------------------------------------------------
export default function PropertiesPage(props) {
  const { t } = useTerminology();
  const {
    properties = [],
    clients = [],
    colours = {},
    cardStyle = {},
    buttonPrimary = {},
    buttonSecondary = {},
    inputStyle = {},
    labelStyle = {},
    currency = v => String(v ?? ""),
    safeNumber = v => Number(v || 0),
    DashboardHero = ({ children }) => <div>{children}</div>,
    InsightChip = () => null,
    MetricCard = () => null,
    SectionCard = ({ title, children, right }) => <section><div style={{ display: "flex", justifyContent: "space-between" }}><h3>{title}</h3>{right}</div>{children}</section>,
    DataTable = ({ columns = [], rows = [], emptyState }) => {
      if (!rows.length && emptyState) return <div style={{ textAlign: "center", padding: 30, color: colours.muted }}>{emptyState.icon} <br />{emptyState.title}<br /><span style={{ fontSize: 13 }}>{emptyState.message}</span></div>;
      return (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{columns.map(c => <th key={c.key || c.label} style={{ textAlign: "left", padding: 8, fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: colours.muted }}>{c.label}</th>)}</tr></thead>
          <tbody>{rows.map((row, idx) => (
            <tr key={row.id ?? idx} style={{ borderBottom: `1px solid ${colours.border}` }}>{columns.map(c => <td key={c.key || c.label} style={{ padding: 10 }}>{c.render ? c.render(row[c.key], row) : row[c.key]}</td>)}</tr>
          ))}</tbody>
        </table>
      );
    },
    EmptyState = ({ icon, title, message }) => <div>{icon} {title} {message}</div>,
    saveProperty = () => {},
    deleteProperty = () => {},
    confirm = null,
    setActivePage = () => {},
    jobs = [],
    chemicalRecords = [],
    paddockEvents = [],
    savePaddockEvent = async () => {},
    archivePaddockEvent = async () => {},
    formatDateAU = (value) => value || "",
  } = props;

  // ---- View states ----
  const [view, setView] = useState("list"); // "list" | "map" | "detail" | "add" | "edit"
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", gpsLat: "", gpsLng: "", propertyType: "", notes: "", clientId: "", subLocations: [] });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const blankForm = { name: "", address: "", gpsLat: "", gpsLng: "", propertyType: "", notes: "", clientId: "", subLocations: [] };

  // ---- Filtered list ----
  const filtered = useMemo(() => {
    let list = properties;
    if (typeFilter !== "all") list = list.filter(p => p.propertyType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q) ||
        (p.subLocations || []).some(s => (s.name || "").toLowerCase().includes(q))
      );
    }
    return list;
  }, [properties, typeFilter, search]);

  // ---- Metrics ----
  const totalSubs = properties.reduce((s, p) => s + (p.subLocations || []).length, 0);
  const withCoords = properties.filter(p => p.gpsLat && p.gpsLng).length;
  const typeCounts = {};
  PROPERTY_TYPES.forEach(t => typeCounts[t] = 0);
  properties.forEach(p => { if (typeCounts[p.propertyType] !== undefined) typeCounts[p.propertyType]++; });
  const livestockWarningsByProperty = useMemo(() => {
    const warningMap = {};
    properties.forEach((property) => {
      const records = (chemicalRecords || []).filter((record) =>
        String(record.propertyId || "") === String(property.id) &&
        String(record.withholdingEndDate || "").trim()
      );
      const conflicts = records.flatMap((record) => (
        (jobs || []).filter((job) => {
          const sameProperty = String(job.propertyId || job.siteId || "") === String(property.id);
          if (!sameProperty) return false;
          const jobDate = String(job.startDate || job.date || "");
          if (!jobDate || jobDate > String(record.withholdingEndDate || "")) return false;
          const context = `${job.title || ""} ${job.name || ""} ${job.notes || ""}`.toLowerCase();
          return context.includes("livestock") || context.includes("graze") || context.includes("stock");
        })
      ));
      warningMap[String(property.id)] = conflicts.length;
    });
    return warningMap;
  }, [chemicalRecords, jobs, properties]);

  // ---- Handlers ----
  const handleSave = () => {
    if (!form.name?.trim()) return;
    saveProperty({ ...form, id: form.id || Date.now(), subLocations: (form.subLocations || []).map(normaliseSubLocation) });
    setForm({ ...blankForm });
    setView("list");
  };

  const handleEdit = (prop) => {
    setForm({ ...prop, subLocations: (prop.subLocations || []).map(normaliseSubLocation) });
    setView("edit");
  };

  const handleViewDetail = (prop) => {
    setSelectedProperty(prop);
    setView("detail");
  };

  const handleDelete = (id) => {
    if (deleteProperty) deleteProperty(id);
  };

  // ---- RENDER ----
  if (view === "detail" && selectedProperty) {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={buttonSecondary} onClick={() => setView("list")}>← Back to list</button>
          <button style={buttonSecondary} onClick={() => handleEdit(selectedProperty)}>Edit</button>
        </div>
        <SectionCard title={`${t("property")} Details`}>
          <PropertyDetail
            property={selectedProperty}
            clients={clients}
            colours={colours} cardStyle={cardStyle}
            buttonSecondary={buttonSecondary}
            buttonPrimary={buttonPrimary}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            setActivePage={setActivePage}
            jobs={jobs}
            chemicalRecords={chemicalRecords}
            paddockEvents={paddockEvents}
            savePaddockEvent={savePaddockEvent}
            archivePaddockEvent={archivePaddockEvent}
            allProperties={properties}
            formatDateAU={formatDateAU}
          />
        </SectionCard>
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <button style={{ ...buttonSecondary, justifySelf: "start" }} onClick={() => { setForm({ ...blankForm }); setView("list"); }}>← Back to list</button>
        <SectionCard title={view === "edit" ? `Edit ${t("property")}` : `Add New ${t("property")}`}>
          <PropertyForm
            form={form} setForm={setForm}
            clients={clients}
            inputStyle={inputStyle} labelStyle={labelStyle} cardStyle={cardStyle}
            buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
            colours={colours}
            onSave={handleSave}
            onCancel={() => { setForm({ ...blankForm }); setView("list"); }}
            isEditing={view === "edit"}
          />
        </SectionCard>
      </div>
    );
  }

  if (view === "map") {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={buttonSecondary} onClick={() => setView("list")}>← List View</button>
          <button style={{ ...buttonPrimary, opacity: 1 }}>🗺️ Map View</button>
        </div>
        <SectionCard title={`${t("properties")} Map`}>
          <MapView
            properties={properties}
            colours={colours} cardStyle={cardStyle}
            onSelect={handleViewDetail}
            jobs={jobs}
          />
        </SectionCard>
      </div>
    );
  }

  // ---- LIST VIEW (default) ----
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero
        title={t("properties")}
        subtitle={`Manage your ${t("properties").toLowerCase()}, ${t("sites").toLowerCase()}, and ${t("subLocations").toLowerCase()}. Link them to contacts and track work history.`}
        highlight={String(properties.length)}
      >
        <InsightChip label={t("subLocations")} value={String(totalSubs)} />
        <InsightChip label="Map pins" value={String(withCoords)} />
      </DashboardHero>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <MetricCard title={`Total ${t("properties").toLowerCase()}`} value={String(properties.length)} subtitle={`All ${t("sites").toLowerCase()} and locations`} accent={colours.purple} />
        <MetricCard title={t("subLocations")} value={String(totalSubs)} subtitle="Areas, paddocks, rooms, zones" accent={colours.teal} />
        <MetricCard title="With GPS" value={String(withCoords)} subtitle={`${t("properties")} with map coordinates`} accent={colours.purple} />
        {PROPERTY_TYPES.map(type => (
          <MetricCard key={type} title={type} value={String(typeCounts[type] || 0)} subtitle={`${type} ${t("properties").toLowerCase()}`} accent={colours.teal} />
        ))}
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...buttonPrimary }} onClick={() => setView("add")}>+ Add {t("property")}</button>
          <button style={buttonSecondary} onClick={() => setView("map")}>🗺️ Map View</button>
        </div>
      </div>

      {/* Property list */}
      <SectionCard title={`${t("property")} List`}>
        {/* Search + filter */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
            placeholder={`Search ${t("properties").toLowerCase()}, addresses, ${t("subLocations").toLowerCase()}…`}
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              style={{ ...buttonSecondary, fontWeight: typeFilter === "all" ? 800 : 600, background: typeFilter === "all" ? colours.lightPurple || "#F3F4F6" : "transparent" }}
              onClick={() => setTypeFilter("all")}
            >All ({properties.length})</button>
            {PROPERTY_TYPES.map(t => (
              <button
                key={t}
                style={{ ...buttonSecondary, fontWeight: typeFilter === t ? 800 : 600, background: typeFilter === t ? colours.lightPurple || "#F3F4F6" : "transparent" }}
                onClick={() => setTypeFilter(t)}
              >{t} ({typeCounts[t] || 0})</button>
            ))}
          </div>
        </div>

        <DataTable
          emptyState={{ icon: "🏠", title: `No ${t("properties").toLowerCase()} yet`, message: `Add your first ${t("property").toLowerCase()} to start tracking ${t("sites").toLowerCase()} and locations.` }}
          columns={[
            { key: "name", label: t("property"), render: (v, row) => (
              <div>
                <div style={{ fontWeight: 700 }}>{row.name}</div>
                {row.address && <div style={{ fontSize: 12, color: colours.muted }}>{row.address}</div>}
              </div>
            )},
            { key: "propertyType", label: "Type", render: (v) => v ? (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: colours.lightPurple || "#F3E8FF", color: colours.purple }}>{v}</span>
            ) : "—" },
            { key: "subLocations", label: t("subLocations"), render: (v, row) => {
              const subs = row.subLocations || [];
              if (!subs.length) return <span style={{ color: colours.muted }}>—</span>;
              return <span style={{ fontSize: 12 }}>{subs.map(s => s.name).filter(Boolean).join(", ") || `${subs.length} ${t("subLocation").toLowerCase()}${subs.length > 1 ? "s" : ""}`}</span>;
            }},
            { key: "clientId", label: "Contact", render: (v, row) => {
              const c = clients.find(cl => String(cl.id) === String(row.clientId));
              return c ? <span style={{ fontWeight: 600 }}>{c.name}</span> : <span style={{ color: colours.muted }}>—</span>;
            }},
            { key: "gpsLat", label: "Map", render: (v, row) => row.gpsLat && row.gpsLng ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${row.gpsLat},${row.gpsLng}`}
                target="_blank" rel="noopener noreferrer"
                style={{ color: colours.purple, fontWeight: 700, textDecoration: "none", fontSize: 12 }}
              >📍 View</a>
            ) : <span style={{ color: colours.muted }}>—</span> },
            { key: "withholding", label: "Withholding", render: (_v, row) => {
              const count = livestockWarningsByProperty[String(row.id)] || 0;
              return count > 0
                ? <span style={{ fontSize: 11, fontWeight: 700, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 999, padding: "2px 8px" }}>{count} livestock conflict{count !== 1 ? "s" : ""}</span>
                : <span style={{ color: colours.muted }}>—</span>;
            }},
            { key: "actions", label: "", render: (_, row) => (
              <div style={{ display: "flex", gap: 6 }}>
                <button style={buttonSecondary} onClick={() => handleViewDetail(row)}>View</button>
                <button style={buttonSecondary} onClick={() => handleEdit(row)}>Edit</button>
                <button style={{ ...buttonSecondary, color: "#DC2626" }} onClick={() => handleDelete(row.id)}>Delete</button>
              </div>
            )},
          ]}
          rows={filtered}
        />
      </SectionCard>
    </div>
  );
}

