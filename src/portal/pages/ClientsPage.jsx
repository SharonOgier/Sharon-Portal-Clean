import React, { useState, useMemo } from "react";
import { useTerminology } from "../TerminologyContext";
import { exportToCSV } from "../PortalHelpers";
import EntityLink from "../EntityLink";

// ---------------------------------------------------------------------------
// ROLE DEFINITIONS
// ---------------------------------------------------------------------------
const getRoles = (t) => [
  { key: "customer",      label: t("customer"),      color: "#2563EB", bg: "#DBEAFE" },
  { key: "staff",          label: "Staff",          color: "#16A34A", bg: "#DCFCE7" },
  { key: "subcontractor",  label: t("subcontractor"),  color: "#EA580C", bg: "#FED7AA" },
  { key: "supplier",       label: "Supplier",       color: "#7C3AED", bg: "#EDE9FE" },
];

// ---------------------------------------------------------------------------
// ROLE-SPECIFIC FIELDS (unlocked when role selected)
// ---------------------------------------------------------------------------
const ROLE_FIELDS = {
  subcontractor: [
    { key: "abn",            label: "ABN",                type: "text" },
    { key: "tradeType",      label: "Trade type",         type: "text" },
    { key: "insuranceExpiry", label: "Insurance expiry",   type: "date" },
    { key: "licenceNumber",  label: "Licence number",     type: "text" },
  ],
  supplier: [
    { key: "productCategories", label: "Product categories", type: "text" },
    { key: "accountNumber",     label: "Account number",     type: "text" },
    { key: "paymentTerms",      label: "Payment terms",      type: "text" },
  ],
  staff: [
    { key: "position",         label: "Position / Title",    type: "text" },
    { key: "startDate",        label: "Start date",          type: "date" },
    { key: "hourlyRate",       label: "Hourly rate ($)",     type: "number" },
    { key: "emergencyContact", label: "Emergency contact",   type: "text" },
  ],
  customer: [
    { key: "billingAddress",       label: "Billing address",         type: "text" },
    { key: "preferredContactMethod", label: "Preferred contact method", type: "select", options: ["Phone", "Email", "SMS", "In person"] },
  ],
};

// ---------------------------------------------------------------------------
// ROLE BADGE COMPONENT
// ---------------------------------------------------------------------------
function RoleBadge({ roleKey, small, t }) {
  const role = getRoles(t).find(r => r.key === roleKey);
  if (!role) return null;
  return (
    <span style={{
      display: "inline-block",
      padding: small ? "2px 8px" : "3px 12px",
      borderRadius: 999,
      fontSize: small ? 10 : 11,
      fontWeight: 700,
      color: role.color,
      background: role.bg,
      letterSpacing: 0.3,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>{role.label}</span>
  );
}

// ---------------------------------------------------------------------------
// CONTACT FORM COMPONENT
// ---------------------------------------------------------------------------
function ContactForm({ form, setForm, colours, inputStyle, labelStyle, cardStyle, buttonPrimary, buttonSecondary, onSave, onCancel, isEditing, t }) {
  const roles = form.roles || [];
  const toggleRole = (key) => {
    setForm(prev => {
      const current = prev.roles || [];
      return { ...prev, roles: current.includes(key) ? current.filter(r => r !== key) : [...current, key] };
    });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Core fields */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <div>
          <label style={labelStyle}>Contact name *</label>
          <input style={inputStyle} value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name or business name" />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input style={inputStyle} value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Business name</label>
          <input style={inputStyle} value={form.businessName || ""} onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Contact person</label>
          <input style={inputStyle} value={form.contactPerson || ""} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Address</label>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.address || form.addressDetails || ""} onChange={e => setForm(p => ({ ...p, address: e.target.value, addressDetails: e.target.value }))} />
        </div>
      </div>

      {/* Role selection (checkboxes) */}
      <div>
        <label style={{ ...labelStyle, marginBottom: 8, display: "block" }}>Roles</label>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {getRoles(t).map(r => (
            <label key={r.key} style={{
              display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600,
              padding: "8px 16px", borderRadius: 10, cursor: "pointer",
              border: `2px solid ${roles.includes(r.key) ? r.color : colours.border}`,
              background: roles.includes(r.key) ? r.bg : "transparent",
              transition: "all 0.15s",
            }}>
              <input type="checkbox" checked={roles.includes(r.key)} onChange={() => toggleRole(r.key)} style={{ width: 18, height: 18 }} />
              <span style={{ color: roles.includes(r.key) ? r.color : colours.text }}>{r.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Role-specific fields */}
      {roles.map(roleKey => {
        const fields = ROLE_FIELDS[roleKey];
        if (!fields) return null;
        const roleInfo = getRoles(t).find(r => r.key === roleKey);
        return (
          <div key={roleKey} style={{ ...cardStyle, padding: 16, border: `1px solid ${roleInfo.bg}`, background: `${roleInfo.bg}33` }}>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: roleInfo.color, marginBottom: 12 }}>{roleInfo.label} details</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {fields.map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  {f.type === "select" ? (
                    <select style={inputStyle} value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                      <option value="">Select…</option>
                      {f.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input style={inputStyle} type={f.type || "text"} value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Existing accounting options (collapsed) */}
      <details style={{ ...cardStyle, padding: 18, background: "#FAFAFA" }}>
        <summary style={{ fontWeight: 800, cursor: "pointer" }}>Invoice & billing options</summary>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {[
            ["sendToClient", "Send invoices to this contact"],
            ["sendToMe", "Send a copy to me"],
            ["autoReminders", "Auto-send reminders when invoices are overdue"],
            ["sendReceipts", "Send receipts for card payments"],
            ["outsideAustraliaOrGstExempt", "Outside Australia or GST exempt"],
            ["feesDeducted", "Payments will have fees deducted"],
            ["deductsTaxPrior", "Deducts tax prior to payment"],
          ].map(([key, text]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <input type="checkbox" checked={Boolean(form[key])} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} />
              {text}
            </label>
          ))}
          <div style={{ maxWidth: 220 }}>
            <label style={labelStyle}>Default currency</label>
            <select style={inputStyle} value={form.defaultCurrency || "AUD $"} onChange={e => setForm(p => ({ ...p, defaultCurrency: e.target.value }))}>
              <option>AUD $</option><option>USD $</option><option>NZD $</option><option>GBP</option><option>EUR</option>
            </select>
          </div>
        </div>
      </details>

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
        <button style={buttonSecondary} onClick={onCancel}>Cancel</button>
        <button style={buttonPrimary} onClick={onSave}>{isEditing ? "Save Changes" : "Save Contact"}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RELATED JOBS SECTION
// ---------------------------------------------------------------------------
function RelatedJobsSection({ contact, jobs = [], invoices = [], quotes = [], expenses = [], colours, cardStyle, currency, safeNumber, setActivePage, formatDateAU, t }) {
  const contactId = String(contact.id);
  const contactName = (contact.name || "").toLowerCase();
  const linked = (jobs || []).filter(j => {
    if (String(j.clientId) === contactId || String(j.contactId) === contactId) return true;
    if (j.assignedTo && String(j.assignedTo) === contactId) return true;
    if (j.clientName && j.clientName.toLowerCase() === contactName) return true;
    return false;
  });
  const linkedInvoices = (invoices || []).filter(inv => String(inv.clientId) === contactId);
  const linkedQuotes = (quotes || []).filter(q => String(q.clientId) === contactId);
  const linkedExpenses = (expenses || []).filter(e => String(e.contactId) === contactId);

  const sectionStyle = { ...cardStyle, padding: 16, marginTop: 16, background: "#FAFAFA", border: `1px solid ${colours.border}` };
  const headerStyle = { fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: colours.muted, marginBottom: 8 };
  const itemStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 10, background: "#fff", border: `1px solid ${colours.border}`, cursor: "pointer" };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Related Jobs */}
      <div style={sectionStyle}>
        <div style={headerStyle}>Related {t("jobs")} ({linked.length})</div>
        {linked.length === 0 ? (
          <div style={{ fontSize: 13, color: colours.muted }}>No {t("jobs").toLowerCase()} linked to <strong>{contact.name}</strong> yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {linked.map((job, i) => (
              <div key={job.id || i} style={itemStyle} onClick={() => setActivePage("scheduling")}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colours.purple }}>{job.title || job.name || `Job #${job.id}`}</div>
                  <div style={{ fontSize: 12, color: colours.muted }}>{job.status || "—"} · {job.scheduledDate || ""}</div>
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

      {/* Related Invoices */}
      <div style={sectionStyle}>
        <div style={headerStyle}>Related Invoices ({linkedInvoices.length})</div>
        {linkedInvoices.length === 0 ? (
          <div style={{ fontSize: 13, color: colours.muted }}>No invoices for this {t("customer").toLowerCase()}.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {linkedInvoices.slice(0, 10).map((inv, i) => (
              <div key={inv.id || i} style={itemStyle} onClick={() => setActivePage("invoices")}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colours.purple }}>{inv.invoiceNumber || `INV #${inv.id}`}</div>
                  <div style={{ fontSize: 12, color: colours.muted }}>{formatDateAU ? formatDateAU(inv.invoiceDate) : inv.invoiceDate} · {currency ? currency(safeNumber(inv.total)) : inv.total}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                  background: inv.status === "Paid" ? "#DCFCE7" : inv.status === "Overdue" ? "#FFEBEE" : "#F1F5F9",
                  color: inv.status === "Paid" ? "#166534" : inv.status === "Overdue" ? "#C62828" : "#64748B",
                }}>{inv.status || "Draft"}</span>
              </div>
            ))}
            {linkedInvoices.length > 10 && <div style={{ fontSize: 12, color: colours.muted, textAlign: "center" }}>+ {linkedInvoices.length - 10} more</div>}
          </div>
        )}
      </div>

      {/* Related Quotes */}
      <div style={sectionStyle}>
        <div style={headerStyle}>Related Quotes ({linkedQuotes.length})</div>
        {linkedQuotes.length === 0 ? (
          <div style={{ fontSize: 13, color: colours.muted }}>No quotes for this {t("customer").toLowerCase()}.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {linkedQuotes.slice(0, 10).map((q, i) => (
              <div key={q.id || i} style={itemStyle} onClick={() => setActivePage("quotes")}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colours.purple }}>{q.quoteNumber || `QTE #${q.id}`}</div>
                  <div style={{ fontSize: 12, color: colours.muted }}>{formatDateAU ? formatDateAU(q.quoteDate) : q.quoteDate} · {currency ? currency(safeNumber(q.total)) : q.total}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                  background: q.status === "Accepted" ? "#DCFCE7" : q.status === "Declined" ? "#FFEBEE" : "#F1F5F9",
                  color: q.status === "Accepted" ? "#166534" : q.status === "Declined" ? "#C62828" : "#64748B",
                }}>{q.status || "Draft"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Expenses */}
      {linkedExpenses.length > 0 && (
        <div style={sectionStyle}>
          <div style={headerStyle}>Related Expenses ({linkedExpenses.length})</div>
          <div style={{ display: "grid", gap: 8 }}>
            {linkedExpenses.slice(0, 10).map((exp, i) => (
              <div key={exp.id || i} style={itemStyle} onClick={() => setActivePage("expenses")}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colours.purple }}>{exp.supplier || exp.description || `Expense #${exp.id}`}</div>
                  <div style={{ fontSize: 12, color: colours.muted }}>{formatDateAU ? formatDateAU(exp.date) : exp.date} · {currency ? currency(safeNumber(exp.amount)) : exp.amount}</div>
                </div>
                <span style={{ fontSize: 12, color: colours.muted }}>{exp.category || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN CONTACTS PAGE
// ---------------------------------------------------------------------------
export default function ClientsPage(props) {
  const { t } = useTerminology();
  const {
    clients = [],
    invoices = [],
    colours = {},
    currency = v => String(v ?? ""),
    safeNumber = v => Number(v || 0),
    cardStyle = {},
    buttonPrimary = {},
    buttonSecondary = {},
    inputStyle = {},
    labelStyle = {},
    DashboardHero = ({ children }) => <div>{children}</div>,
    InsightChip = () => null,
    MetricCard = () => null,
    SectionCard = ({ title, children, right }) => <section><div style={{ display: "flex", justifyContent: "space-between" }}><h3>{title}</h3>{right}</div>{children}</section>,
    DataTable = ({ columns = [], rows = [], emptyState }) => {
      if (!rows.length && emptyState) return <div>{emptyState.title || "No data"}</div>;
      return (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{columns.map(c => <th key={c.key || c.label} style={{ textAlign: "left", padding: 8 }}>{c.label}</th>)}</tr></thead>
          <tbody>{rows.map((row, idx) => (
            <tr key={row.id ?? idx}>{columns.map(c => <td key={c.key || c.label} style={{ padding: 8 }}>{c.render ? c.render(row[c.key], row) : row[c.key]}</td>)}</tr>
          ))}</tbody>
        </table>
      );
    },
    EmptyState = ({ icon, title, message }) => <div>{icon} {title} {message}</div>,
    blankClient = {},
    clientForm: extClientForm,
    setClientForm: extSetClientForm,
    saveClient: extSaveClient,
    deleteClient = () => {},
    openClientEditor: extOpenClientEditor,
    clientEditorOpen: extClientEditorOpen,
    clientEditorForm: extClientEditorForm,
    setClientEditorForm: extSetClientEditorForm,
    closeClientEditor: extCloseClientEditor,
    saveClientEdits: extSaveClientEdits,
    todayLocal: extTodayLocal,
    saveClientFromModal = () => {},
    showImportModal,
    setShowImportModal = () => {},
    importType,
    setImportType = () => {},
    importRows,
    setImportRows = () => {},
    importError,
    setImportError = () => {},
    confirmImport = () => {},
    downloadTemplate = () => {},
    parseImportCSV = () => ({ rows: [], error: "" }),
    setActivePage = () => {},
    confirm = null,
    profile = {},
    invClientSearch,
    setInvClientSearch = () => {},
    showClientModal,
    setShowClientModal = () => {},
    editingClientId,
    setEditingClientId = () => {},
    clientModalForm,
     setClientModalForm = () => {},
     jobs = [],
  } = props;

  // ---- Local fallbacks ----
  const resolvedBlank = {
    name: "", email: "", phone: "", address: "", contactPerson: "", businessName: "",
    workType: "Financial / Management Accountant", addressDetails: "",
    roles: [], defaultCurrency: "AUD $",
    sendToClient: true, sendToMe: true, autoReminders: true, sendReceipts: true,
    outsideAustraliaOrGstExempt: false, feesDeducted: false, deductsTaxPrior: false,
    ...(blankClient || {}),
  };

  const [localForm, localSetForm] = useState({ ...resolvedBlank });
  const clientForm = extClientForm ?? localForm;
  const setClientForm = extSetClientForm ?? localSetForm;

  const [localEditorOpen, localSetEditorOpen] = useState(false);
  const [localEditorForm, localSetEditorForm] = useState(null);
  const clientEditorOpen = typeof extClientEditorOpen === "boolean" ? extClientEditorOpen : localEditorOpen;
  const clientEditorForm = extClientEditorForm ?? localEditorForm;
  const setClientEditorForm = extSetClientEditorForm ?? localSetEditorForm;
  const closeClientEditor = extCloseClientEditor ?? (() => { localSetEditorOpen(false); localSetEditorForm(null); });
  const openClientEditor = extOpenClientEditor ?? ((row) => { localSetEditorForm({ ...row }); localSetEditorOpen(true); });
  const saveClientEdits = extSaveClientEdits ?? (() => closeClientEditor());
  const saveClient = extSaveClient ?? (() => { if (saveClientFromModal) saveClientFromModal(); });
  const todayLocal = extTodayLocal ?? (() => new Date().toISOString().slice(0, 10));

  // ---- Portal link generation ----
  const [portalCopied, setPortalCopied] = useState(false);
  const handlePortalLink = (contact) => {
    let token = contact.portalToken;
    if (!token) {
      token = crypto.randomUUID() + "-" + crypto.randomUUID().slice(0, 8);
      // Save the token to the contact
      const updated = { ...contact, portalToken: token };
      openClientEditor(updated);
      // Auto-save if saveClientEdits is available
      if (extSetClientEditorForm) extSetClientEditorForm(updated);
      setTimeout(() => { if (extSaveClientEdits) extSaveClientEdits(); }, 100);
    }
    const portalUrl = `${window.location.origin}/client-portal?token=${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(portalUrl).then(() => {
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 3000);
    });
  };

  // ---- Search & filter state ----
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // ---- Filtered contacts ----
  const filteredContacts = useMemo(() => {
    let list = clients;

    // Role filter
    if (roleFilter !== "all") {
      list = list.filter(c => (c.roles || []).includes(roleFilter));
    }

    // Search across name, email, phone, ABN, trade type
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.abn || "").toLowerCase().includes(q) ||
        (c.tradeType || "").toLowerCase().includes(q) ||
        (c.businessName || "").toLowerCase().includes(q) ||
        (c.contactPerson || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [clients, roleFilter, search]);

  // ---- Metrics ----
  const roleCounts = useMemo(() => {
    const counts = {};
    getRoles(t).forEach(r => { counts[r.key] = 0; });
    clients.forEach(c => (c.roles || []).forEach(r => { if (counts[r] !== undefined) counts[r]++; }));
    return counts;
  }, [clients, t]);

  const totalRevenue = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + safeNumber(i.total), 0);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero
        title="Contacts"
        subtitle={`Manage all your contacts — ${t("customers").toLowerCase()}, staff, ${t("subcontractors").toLowerCase()}, and suppliers — in one place.`}
        highlight={String(clients.length)}
      >
        <InsightChip label={t("customers")} value={String(roleCounts.customer)} />
        <InsightChip label="Staff" value={String(roleCounts.staff)} />
        <InsightChip label={t("subcontractors")} value={String(roleCounts.subcontractor)} />
        <InsightChip label="Suppliers" value={String(roleCounts.supplier)} />
      </DashboardHero>

      {/* Role metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {getRoles(t).map(r => (
          <MetricCard key={r.key} title={r.label + "s"} value={String(roleCounts[r.key])} subtitle={`Contacts tagged as ${r.label}`} accent={r.color} />
        ))}
        <MetricCard title="Total revenue" value={currency(totalRevenue)} subtitle="From all paid invoices" accent={colours.teal} />
      </div>

      {/* Add / Edit contact form */}
      <SectionCard title={clientEditorOpen ? "Edit Contact" : "Add New Contact"}>
        {clientEditorOpen && clientEditorForm ? (
          <>
            <ContactForm
              form={clientEditorForm}
              setForm={setClientEditorForm}
              colours={colours} inputStyle={inputStyle} labelStyle={labelStyle} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              onSave={saveClientEdits} onCancel={closeClientEditor} isEditing
              t={t}
            />
            <RelatedJobsSection contact={clientEditorForm} jobs={jobs} invoices={invoices} quotes={props.quotes || []} expenses={props.expenses || []} colours={colours} cardStyle={cardStyle} currency={currency} safeNumber={safeNumber} setActivePage={setActivePage} formatDateAU={props.formatDateAU} t={t} />
            {/* Customer Portal Link */}
            {(clientEditorForm.roles || []).includes("customer") && (
              <div style={{ ...cardStyle, padding: 18, marginTop: 16, background: "#F5ECFB", border: `1px solid ${colours.purple}22` }}>
                <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: colours.purple, marginBottom: 8 }}>🔗 Customer Portal</div>
                <p style={{ fontSize: 13, color: colours.muted, marginBottom: 12 }}>Share this link with your customer so they can view their jobs, pay invoices, and request new work.</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={{ ...buttonPrimary, fontSize: 13 }} onClick={() => handlePortalLink(clientEditorForm)}>
                    {portalCopied ? "✅ Link Copied!" : "📋 Copy Portal Link"}
                  </button>
                  {clientEditorForm.portalToken && (
                    <button style={{ ...buttonSecondary, fontSize: 13 }} onClick={() => {
                      const url = `${window.location.origin}/client-portal?token=${encodeURIComponent(clientEditorForm.portalToken)}`;
                      window.open(url, "_blank");
                    }}>👁️ Preview Portal</button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <ContactForm
            form={clientForm}
            setForm={setClientForm}
            colours={colours} inputStyle={inputStyle} labelStyle={labelStyle} cardStyle={cardStyle}
            buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
            onSave={saveClient} onCancel={() => setClientForm({ ...resolvedBlank })} isEditing={false}
            t={t}
          />
        )}
      </SectionCard>

      {/* Contact list with search & filter */}
      <SectionCard title="Contact List" right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={buttonSecondary} onClick={() => exportToCSV(clients, [
            { key: "name", label: "Contact" },
            { key: "roles", label: "Roles", render: v => (v || []).join(", ") },
            { key: "contactPerson", label: "Contact Person" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "abn", label: "ABN" },
            { key: "tradeType", label: "Trade Type" },
          ], "contacts.csv")}>Export CSV</button>
          <button style={buttonSecondary} onClick={() => { setImportType("clients"); setImportRows([]); setImportError(""); setShowImportModal(true); }}>Import CSV</button>
        </div>
      }>
        {/* Search bar + role filter */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
            placeholder="Search name, email, phone, ABN, trade type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              style={{
                ...buttonSecondary,
                fontWeight: roleFilter === "all" ? 800 : 600,
                background: roleFilter === "all" ? colours.lightPurple || "#F3F4F6" : "transparent",
              }}
              onClick={() => setRoleFilter("all")}
            >All ({clients.length})</button>
            {getRoles(t).map(r => (
              <button
                key={r.key}
                style={{
                  ...buttonSecondary,
                  fontWeight: roleFilter === r.key ? 800 : 600,
                  background: roleFilter === r.key ? r.bg : "transparent",
                  color: roleFilter === r.key ? r.color : undefined,
                  border: roleFilter === r.key ? `1px solid ${r.color}` : undefined,
                }}
                onClick={() => setRoleFilter(r.key)}
              >{r.label} ({roleCounts[r.key]})</button>
            ))}
          </div>
        </div>

        <DataTable
          emptyState={{ icon: "👥", title: "No contacts yet", message: "Add your first contact above to get started." }}
          columns={[
            { key: "name", label: "Contact", render: (v, row) => (
              <div>
                <div style={{ fontWeight: 700 }}>{row.name}</div>
                {row.businessName && <div style={{ fontSize: 12, color: colours.muted }}>{row.businessName}</div>}
              </div>
            )},
            { key: "roles", label: "Roles", render: (v, row) => (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(row.roles || []).map(r => <RoleBadge key={r} roleKey={r} small t={t} />)}
                {!(row.roles || []).length && <span style={{ fontSize: 12, color: colours.muted }}>—</span>}
              </div>
            )},
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "tradeType", label: "Trade / Industry", render: (v, row) => row.tradeType || row.workType || "—" },
            {
              key: "actions", label: "",
              render: (_, row) => (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={buttonSecondary} onClick={() => openClientEditor(row)}>View / Edit</button>
                  {(row.roles || []).includes("customer") && (
                    <button style={{ ...buttonSecondary, color: "#6A1B9A" }} onClick={(e) => {
                      e.stopPropagation();
                      handlePortalLink(row);
                    }}>🔗 Portal Link</button>
                  )}
                  <button style={{ ...buttonSecondary, color: "#DC2626" }} onClick={() => deleteClient(row.id)}>Delete</button>
                </div>
              ),
            },
          ]}
          rows={filteredContacts}
        />
      </SectionCard>
    </div>
  );
}
