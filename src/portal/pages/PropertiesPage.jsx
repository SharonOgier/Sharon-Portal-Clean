import React, { useState, useMemo } from "react";

// ---------------------------------------------------------------------------
// PROPERTY TYPES
// ---------------------------------------------------------------------------
const PROPERTY_TYPES = ["Residential", "Commercial", "Farm / Rural"];

// ---------------------------------------------------------------------------
// SUB-LOCATION EDITOR (inline)
// ---------------------------------------------------------------------------
function SubLocationEditor({ subLocations = [], onChange, inputStyle, labelStyle, buttonPrimary, buttonSecondary, colours }) {
  const add = () => onChange([...subLocations, { id: Date.now(), name: "", description: "" }]);
  const update = (id, field, value) => onChange(subLocations.map(s => s.id === id ? { ...s, [field]: value } : s));
  const remove = (id) => onChange(subLocations.filter(s => s.id !== id));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={{ ...labelStyle, margin: 0, fontWeight: 800, fontSize: 13 }}>Sub-Locations</label>
        <button style={{ ...buttonSecondary, fontSize: 12, padding: "6px 14px" }} onClick={add}>+ Add Sub-Location</button>
      </div>
      {subLocations.length === 0 && (
        <div style={{ fontSize: 13, color: colours.muted, padding: "10px 0" }}>
          No sub-locations yet. Add areas like paddocks, sheds, rooms, or zones.
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {subLocations.map((s, i) => (
          <div key={s.id} style={{
            display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, alignItems: "start",
            padding: 12, borderRadius: 10, border: `1px solid ${colours.border}`, background: "#FAFAFA",
          }}>
            <div>
              <label style={{ ...labelStyle, fontSize: 11 }}>Name</label>
              <input style={inputStyle} value={s.name || ""} onChange={e => update(s.id, "name", e.target.value)} placeholder="e.g. Paddock 4" />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 11 }}>Description</label>
              <input style={inputStyle} value={s.description || ""} onChange={e => update(s.id, "description", e.target.value)} placeholder="Optional description" />
            </div>
            <button style={{ ...buttonSecondary, color: "#DC2626", fontSize: 11, padding: "6px 10px", marginTop: 22 }} onClick={() => remove(s.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PROPERTY FORM
// ---------------------------------------------------------------------------
function PropertyForm({ form, setForm, clients = [], inputStyle, labelStyle, cardStyle, buttonPrimary, buttonSecondary, colours, onSave, onCancel, isEditing }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Core fields */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div>
          <label style={labelStyle}>Property name *</label>
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
          <label style={labelStyle}>Property type</label>
          <select style={inputStyle} value={form.propertyType || ""} onChange={e => setForm(p => ({ ...p, propertyType: e.target.value }))}>
            <option value="">Select…</option>
            {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
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
          subLocations={form.subLocations || []}
          onChange={subs => setForm(p => ({ ...p, subLocations: subs }))}
          inputStyle={inputStyle} labelStyle={labelStyle}
          buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
          colours={colours}
        />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
        <button style={buttonSecondary} onClick={onCancel}>Cancel</button>
        <button style={buttonPrimary} onClick={onSave}>{isEditing ? "Save Changes" : "Save Property"}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PROPERTY DETAIL VIEW
// ---------------------------------------------------------------------------
function PropertyDetail({ property, clients, colours, cardStyle, buttonSecondary, setActivePage, jobs = [] }) {
  const client = clients.find(c => String(c.id) === String(property.clientId));
  const subs = property.subLocations || [];
  const hasCoords = property.gpsLat && property.gpsLng;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colours.text }}>{property.name}</h3>
          {property.address && <div style={{ fontSize: 14, color: colours.muted, marginTop: 4 }}>{property.address}</div>}
          {property.propertyType && (
            <span style={{
              display: "inline-block", marginTop: 8, padding: "3px 12px", borderRadius: 999,
              fontSize: 11, fontWeight: 700, background: colours.lightPurple || "#F3E8FF", color: colours.purple,
            }}>{property.propertyType}</span>
          )}
        </div>
        {client && (
          <div style={{ ...cardStyle, padding: "10px 16px", background: colours.lightTeal || "#F0FDFA" }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: colours.teal }}>Linked Contact</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colours.text }}>{client.name}</div>
          </div>
        )}
      </div>

      {/* Map embed */}
      {hasCoords && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${colours.border}` }}>
          <iframe
            title="Property location"
            width="100%"
            height="300"
            style={{ border: 0 }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(property.gpsLng) - 0.01}%2C${Number(property.gpsLat) - 0.01}%2C${Number(property.gpsLng) + 0.01}%2C${Number(property.gpsLat) + 0.01}&layer=mapnik&marker=${property.gpsLat}%2C${property.gpsLng}`}
          />
          <div style={{ padding: "6px 12px", fontSize: 12, color: colours.muted, background: "#F8FAFC" }}>
            📍 {property.gpsLat}, {property.gpsLng}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${property.gpsLat},${property.gpsLng}`}
              target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: 12, color: colours.purple, fontWeight: 700, textDecoration: "none" }}
            >Open in Google Maps ↗</a>
          </div>
        </div>
      )}

      {/* Notes */}
      {property.notes && (
        <div style={{ ...cardStyle, padding: 14, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#92400E", marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 13, color: colours.text, whiteSpace: "pre-wrap" }}>{property.notes}</div>
        </div>
      )}

      {/* Sub-locations */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: colours.muted, marginBottom: 10 }}>
          Sub-Locations ({subs.length})
        </div>
        {subs.length === 0 ? (
          <div style={{ fontSize: 13, color: colours.muted }}>No sub-locations defined for this property.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {subs.map(s => (
              <div key={s.id} style={{ ...cardStyle, padding: 14, background: colours.bg }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: colours.text }}>{s.name || "Unnamed"}</div>
                {s.description && <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>{s.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Jobs */}
      {(() => {
        const propertyJobs = (jobs || []).filter(j => String(j.propertyId) === String(property.id) || String(j.siteId) === String(property.id));
        return (
          <div style={{ ...cardStyle, padding: 16, background: "#FAFAFA", border: `1px solid ${colours.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: colours.muted, marginBottom: 8 }}>Job History ({propertyJobs.length})</div>
            {propertyJobs.length === 0 ? (
              <div style={{ fontSize: 13, color: colours.muted }}>No jobs linked to <strong>{property.name}</strong> yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {propertyJobs.map((job, i) => (
                  <div key={job.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 10, background: "#fff", border: `1px solid ${colours.border}` }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: colours.text }}>{job.title || job.name || `Job #${job.id}`}</div>
                      <div style={{ fontSize: 12, color: colours.muted }}>{job.status || "—"}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                      background: job.status === "Completed" ? "#DCFCE7" : job.status === "In Progress" ? "#FEF3C7" : "#DBEAFE",
                      color: job.status === "Completed" ? "#166534" : job.status === "In Progress" ? "#92400E" : "#1E40AF",
                    }}>{job.status || "Unscheduled"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAP VIEW (OpenStreetMap embeds for all properties with coords)
// ---------------------------------------------------------------------------
function MapView({ properties, colours, cardStyle, onSelect, jobs = [] }) {
  const withCoords = properties.filter(p => p.gpsLat && p.gpsLng);

  if (withCoords.length === 0) {
    return (
      <div style={{ padding: 30, textAlign: "center", color: colours.muted }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🗺️</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>No properties with GPS coordinates</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Add latitude and longitude to your properties to see them on the map.</div>
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
          title="All properties"
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
              {(p.subLocations || []).length} sub-location{(p.subLocations || []).length !== 1 ? "s" : ""}
              <span style={{ margin: "0 6px" }}>•</span>
              {(() => { const cnt = (jobs || []).filter(j => String(j.propertyId) === String(p.id) || String(j.siteId) === String(p.id)).length; return cnt > 0 ? <span style={{ color: colours.teal, fontWeight: 700 }}>{cnt} active job{cnt !== 1 ? "s" : ""}</span> : <span>No active jobs</span>; })()}
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

  // ---- Handlers ----
  const handleSave = () => {
    if (!form.name?.trim()) return;
    saveProperty({ ...form, id: form.id || Date.now() });
    setForm({ ...blankForm });
    setView("list");
  };

  const handleEdit = (prop) => {
    setForm({ ...prop });
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
        <SectionCard title="Property Details">
          <PropertyDetail
            property={selectedProperty}
            clients={clients}
            colours={colours} cardStyle={cardStyle}
            buttonSecondary={buttonSecondary}
            setActivePage={setActivePage}
            jobs={jobs}
          />
        </SectionCard>
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <button style={{ ...buttonSecondary, justifySelf: "start" }} onClick={() => { setForm({ ...blankForm }); setView("list"); }}>← Back to list</button>
        <SectionCard title={view === "edit" ? "Edit Property" : "Add New Property"}>
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
        <SectionCard title="Properties Map">
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
        title="Properties"
        subtitle="Manage your properties, sites, and sub-locations. Link them to contacts and track work history."
        highlight={String(properties.length)}
      >
        <InsightChip label="Sub-locations" value={String(totalSubs)} />
        <InsightChip label="Map pins" value={String(withCoords)} />
      </DashboardHero>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <MetricCard title="Total properties" value={String(properties.length)} subtitle="All sites and locations" accent={colours.purple} />
        <MetricCard title="Sub-locations" value={String(totalSubs)} subtitle="Areas, paddocks, rooms, zones" accent={colours.teal} />
        <MetricCard title="With GPS" value={String(withCoords)} subtitle="Properties with map coordinates" accent={colours.purple} />
        {PROPERTY_TYPES.map(t => (
          <MetricCard key={t} title={t} value={String(typeCounts[t] || 0)} subtitle={`${t} properties`} accent={colours.teal} />
        ))}
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...buttonPrimary }} onClick={() => setView("add")}>+ Add Property</button>
          <button style={buttonSecondary} onClick={() => setView("map")}>🗺️ Map View</button>
        </div>
      </div>

      {/* Property list */}
      <SectionCard title="Property List">
        {/* Search + filter */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
            placeholder="Search properties, addresses, sub-locations…"
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
          emptyState={{ icon: "🏠", title: "No properties yet", message: "Add your first property to start tracking sites and locations." }}
          columns={[
            { key: "name", label: "Property", render: (v, row) => (
              <div>
                <div style={{ fontWeight: 700 }}>{row.name}</div>
                {row.address && <div style={{ fontSize: 12, color: colours.muted }}>{row.address}</div>}
              </div>
            )},
            { key: "propertyType", label: "Type", render: (v) => v ? (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: colours.lightPurple || "#F3E8FF", color: colours.purple }}>{v}</span>
            ) : "—" },
            { key: "subLocations", label: "Sub-Locations", render: (v, row) => {
              const subs = row.subLocations || [];
              if (!subs.length) return <span style={{ color: colours.muted }}>—</span>;
              return <span style={{ fontSize: 12 }}>{subs.map(s => s.name).filter(Boolean).join(", ") || `${subs.length} area${subs.length > 1 ? "s" : ""}`}</span>;
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
