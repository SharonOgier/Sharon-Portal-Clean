import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  completedDate: string;
  propertyAddress: string;
}

interface Invoice {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  total: number;
  gst: number;
  subtotal: number;
  status: string;
  currencyCode: string;
  description: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; rowTotal: number }>;
  paymentUrl: string;
  stripePaymentUrl: string;
  paypalPaymentUrl: string;
}

interface Quote {
  quoteNumber: string;
  quoteDate: string;
  expiryDate: string;
  total: number;
  status: string;
  description: string;
}

interface Business {
  name: string;
  legalName: string;
  address: string;
  email: string;
  phone: string;
  abn: string;
  logoDataUrl: string;
  hideLegalName: boolean;
}

interface ClientInfo {
  name: string;
  businessName: string;
  email: string;
}

type Tab = "jobs" | "invoices" | "quotes" | "request";

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Completed: { bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" },
  "In Progress": { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" },
  Scheduled: { bg: "#F5F3FF", color: "#5B21B6", border: "#DDD6FE" },
  Requested: { bg: "#FFF7ED", color: "#9A3412", border: "#FED7AA" },
  Pending: { bg: "#FFF7ED", color: "#9A3412", border: "#FED7AA" },
  Paid: { bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" },
  Sent: { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" },
  Overdue: { bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" },
  Viewed: { bg: "#F5F3FF", color: "#5B21B6", border: "#DDD6FE" },
  Accepted: { bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" },
  Declined: { bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" },
  Draft: { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" },
};

const getStatusStyle = (status: string) =>
  STATUS_COLORS[status] || { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" };

export default function ClientPortalPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("jobs");
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  // Job request form
  const [requestForm, setRequestForm] = useState({ title: "", description: "", preferredDate: "", preferredTime: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    if (!token) { setError("Invalid portal link."); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/client-portal?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok || !json.ok) { setError(json.error || "Portal not found."); return; }
        setClient(json.client);
        setBusiness(json.business);
        setJobs(json.jobs || []);
        setInvoices(json.invoices || []);
        setQuotes(json.quotes || []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load portal.";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleRequestJob = async () => {
    if (!requestForm.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/client-portal?token=${encodeURIComponent(token!)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestForm),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) { setError(json.error || "Failed to submit."); return; }
      setSubmitSuccess(json.message);
      setRequestForm({ title: "", description: "", preferredDate: "", preferredTime: "", address: "" });
      setActiveTab("jobs");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to submit.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  const formatMoney = (v: number, currency = "AUD") =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(v || 0);

  const displayName = business ? (business.hideLegalName || !business.legalName ? business.name : business.legalName) : "";

  if (loading) return (
    <div style={s.page}>
      <div style={s.loadingCard}>
        <div style={s.spinner} />
        <p style={{ color: "#64748B", marginTop: 16, fontSize: 15 }}>Loading your portal...</p>
      </div>
    </div>
  );

  if (error && !client) return (
    <div style={s.page}>
      <div style={s.loadingCard}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: "#991B1B", marginBottom: 8 }}>Access Denied</h2>
        <p style={{ color: "#64748B", maxWidth: 400, margin: "0 auto" }}>{error}</p>
      </div>
    </div>
  );

  if (!client || !business) return null;

  const tabs: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: "jobs", label: "Job History", icon: "🔧", count: jobs.length },
    { key: "invoices", label: "Invoices", icon: "📄", count: invoices.length },
    { key: "quotes", label: "Quotes", icon: "📋", count: quotes.length },
    { key: "request", label: "Request a Job", icon: "✨" },
  ];

  const unpaidInvoices = invoices.filter(i => i.status !== "Paid" && i.status !== "Draft");
  const totalOwing = unpaidInvoices.reduce((sum, i) => sum + i.total, 0);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {business.logoDataUrl && (
              <img src={business.logoDataUrl} alt="Logo" style={{ height: 48, maxWidth: 160, objectFit: "contain" as const, borderRadius: 8 }} />
            )}
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF" }}>{displayName}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>Customer Portal</div>
            </div>
          </div>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>Welcome, {client.name}</div>
            {client.email && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{client.email}</div>}
          </div>
        </div>
      </div>

      <div style={s.container}>
        {/* Success message */}
        {submitSuccess && (
          <div style={s.successBanner}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <span>{submitSuccess}</span>
            <button onClick={() => setSubmitSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#065F46" }}>✕</button>
          </div>
        )}

        {/* Summary cards */}
        <div style={s.summaryGrid}>
          <div style={s.summaryCard}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Total Jobs</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#14202B", marginTop: 4 }}>{jobs.length}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{jobs.filter(j => j.status === "Completed").length} completed</div>
          </div>
          <div style={s.summaryCard}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Open Invoices</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: totalOwing > 0 ? "#DC2626" : "#065F46", marginTop: 4 }}>{unpaidInvoices.length}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{totalOwing > 0 ? formatMoney(totalOwing) + " owing" : "All clear!"}</div>
          </div>
          <div style={s.summaryCard}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Active Quotes</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#14202B", marginTop: 4 }}>{quotes.filter(q => q.status === "Sent" || q.status === "Viewed").length}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>awaiting response</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabBar}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              ...s.tab,
              ...(activeTab === tab.key ? s.tabActive : {}),
            }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && <span style={s.tabBadge}>{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={s.content}>
          {activeTab === "jobs" && (
            <div>
              {jobs.length === 0 ? (
                <div style={s.empty}>
                  <div style={{ fontSize: 48 }}>🔧</div>
                  <p style={{ color: "#64748B", marginTop: 12 }}>No jobs yet. Request your first job!</p>
                  <button onClick={() => setActiveTab("request")} style={s.primaryBtn}>✨ Request a Job</button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {jobs.sort((a, b) => (b.scheduledDate || "").localeCompare(a.scheduledDate || "")).map((job, i) => {
                    const st = getStatusStyle(job.status);
                    return (
                      <div key={i} style={s.listCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" as const }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "#14202B" }}>{job.title}</div>
                            {job.description && <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{job.description}</div>}
                            {job.propertyAddress && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>📍 {job.propertyAddress}</div>}
                          </div>
                          <div style={{ textAlign: "right" as const }}>
                            <span style={{ ...s.statusBadge, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{job.status}</span>
                            {job.scheduledDate && <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>📅 {formatDate(job.scheduledDate)}{job.scheduledTime ? ` at ${job.scheduledTime}` : ""}</div>}
                            {job.completedDate && <div style={{ fontSize: 12, color: "#065F46", marginTop: 2 }}>✅ Completed {formatDate(job.completedDate)}</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "invoices" && (
            <div>
              {invoices.length === 0 ? (
                <div style={s.empty}>
                  <div style={{ fontSize: 48 }}>📄</div>
                  <p style={{ color: "#64748B", marginTop: 12 }}>No invoices yet.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {invoices.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((inv, i) => {
                    const st = getStatusStyle(inv.status);
                    const isExpanded = expandedInvoice === inv.invoiceNumber;
                    const payUrl = inv.stripePaymentUrl || inv.paypalPaymentUrl || inv.paymentUrl;
                    const canPay = inv.status !== "Paid" && inv.status !== "Draft" && payUrl;
                    return (
                      <div key={i} style={s.listCard}>
                        <div style={{ cursor: "pointer" }} onClick={() => setExpandedInvoice(isExpanded ? null : inv.invoiceNumber)}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 15, color: "#14202B" }}>Invoice #{inv.invoiceNumber}</div>
                              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{formatDate(inv.date)}{inv.dueDate ? ` • Due ${formatDate(inv.dueDate)}` : ""}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ ...s.statusBadge, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{inv.status}</span>
                              <span style={{ fontWeight: 800, fontSize: 18, color: "#14202B" }}>{formatMoney(inv.total, inv.currencyCode)}</span>
                              <span style={{ fontSize: 12, color: "#94A3B8" }}>{isExpanded ? "▲" : "▼"}</span>
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: 16, borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                            {inv.lineItems.length > 0 && (
                              <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
                                <thead>
                                  <tr>
                                    <th style={s.th}>Description</th>
                                    <th style={{ ...s.th, textAlign: "center" as const }}>Qty</th>
                                    <th style={{ ...s.th, textAlign: "right" as const }}>Price</th>
                                    <th style={{ ...s.th, textAlign: "right" as const }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.lineItems.map((li, j) => (
                                    <tr key={j}>
                                      <td style={s.td}>{li.description}</td>
                                      <td style={{ ...s.td, textAlign: "center" as const }}>{li.quantity}</td>
                                      <td style={{ ...s.td, textAlign: "right" as const }}>{formatMoney(li.unitPrice, inv.currencyCode)}</td>
                                      <td style={{ ...s.td, textAlign: "right" as const, fontWeight: 600 }}>{formatMoney(li.rowTotal, inv.currencyCode)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                              <div style={{ minWidth: 200 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                                  <span>Subtotal</span><span>{formatMoney(inv.subtotal, inv.currencyCode)}</span>
                                </div>
                                {inv.gst > 0 && (
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                                    <span>GST</span><span>{formatMoney(inv.gst, inv.currencyCode)}</span>
                                  </div>
                                )}
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, borderTop: "2px solid #E2E8F0", paddingTop: 8, marginTop: 4, color: "#006D6D" }}>
                                  <span>Total</span><span>{formatMoney(inv.total, inv.currencyCode)}</span>
                                </div>
                              </div>
                            </div>
                            {canPay && (
                              <div style={{ marginTop: 16, textAlign: "center" as const }}>
                                <a href={payUrl} target="_blank" rel="noopener noreferrer" style={s.payBtn}>
                                  💳 Pay Now — {formatMoney(inv.total, inv.currencyCode)}
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "quotes" && (
            <div>
              {quotes.length === 0 ? (
                <div style={s.empty}>
                  <div style={{ fontSize: 48 }}>📋</div>
                  <p style={{ color: "#64748B", marginTop: 12 }}>No quotes yet.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {quotes.sort((a, b) => (b.quoteDate || "").localeCompare(a.quoteDate || "")).map((q, i) => {
                    const st = getStatusStyle(q.status);
                    return (
                      <div key={i} style={s.listCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "#14202B" }}>Quote #{q.quoteNumber}</div>
                            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{formatDate(q.quoteDate)}{q.expiryDate ? ` • Expires ${formatDate(q.expiryDate)}` : ""}</div>
                            {q.description && <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{q.description}</div>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ ...s.statusBadge, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{q.status}</span>
                            <span style={{ fontWeight: 800, fontSize: 18, color: "#14202B" }}>{formatMoney(q.total)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "request" && (
            <div style={s.requestCard}>
              <div style={{ textAlign: "center" as const, marginBottom: 24 }}>
                <div style={{ fontSize: 40 }}>✨</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#14202B", marginTop: 8 }}>Request a New Job</h2>
                <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>Tell us what you need and we'll get back to you promptly.</p>
              </div>
              <div style={{ display: "grid", gap: 16, maxWidth: 500, margin: "0 auto" }}>
                <div>
                  <label style={s.label}>What do you need done? *</label>
                  <input style={s.input} value={requestForm.title} onChange={e => setRequestForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Fix leaking tap, Lawn mowing, Electrical inspection..." />
                </div>
                <div>
                  <label style={s.label}>Details (optional)</label>
                  <textarea style={{ ...s.input, minHeight: 100, resize: "vertical" as const }} value={requestForm.description} onChange={e => setRequestForm(f => ({ ...f, description: e.target.value }))} placeholder="Any additional details, photos needed, access instructions..." />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={s.label}>Preferred Date</label>
                    <input type="date" style={s.input} value={requestForm.preferredDate} onChange={e => setRequestForm(f => ({ ...f, preferredDate: e.target.value }))} />
                  </div>
                  <div>
                    <label style={s.label}>Preferred Time</label>
                    <input type="time" style={s.input} value={requestForm.preferredTime} onChange={e => setRequestForm(f => ({ ...f, preferredTime: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={s.label}>Site Address (optional)</label>
                  <input style={s.input} value={requestForm.address} onChange={e => setRequestForm(f => ({ ...f, address: e.target.value }))} placeholder="Where should the work be done?" />
                </div>
                <button onClick={handleRequestJob} disabled={submitting || !requestForm.title.trim()} style={{ ...s.primaryBtn, width: "100%", opacity: submitting || !requestForm.title.trim() ? 0.6 : 1 }}>
                  {submitting ? "Submitting..." : "📨 Submit Job Request"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <div style={{ fontSize: 13, color: "#94A3B8" }}>
            {business.email && <span>{business.email}</span>}
            {business.phone && <span> • {business.phone}</span>}
          </div>
          <div style={{ fontSize: 12, color: "#CBD5E1", marginTop: 4 }}>Powered by <strong style={{ color: "#6A1B9A" }}>Mustered</strong></div>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#F1F5F9",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  loadingCard: {
    textAlign: "center" as const,
    padding: 60,
    maxWidth: 500,
    margin: "80px auto",
    background: "#FFFFFF",
    borderRadius: 20,
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #E2E8F0",
    borderTopColor: "#6A1B9A",
    borderRadius: "50%",
    margin: "0 auto",
    animation: "spin 1s linear infinite",
  },
  header: {
    background: "linear-gradient(135deg, #6A1B9A 0%, #4A148C 50%, #006D6D 100%)",
    padding: "20px 24px",
    boxShadow: "0 4px 20px rgba(106, 27, 154, 0.3)",
  },
  headerInner: {
    maxWidth: 960,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: 16,
  },
  container: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "24px 16px 40px",
  },
  successBanner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 20px",
    background: "#ECFDF5",
    border: "1px solid #A7F3D0",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    color: "#065F46",
    marginBottom: 20,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    background: "#FFFFFF",
    borderRadius: 16,
    padding: "20px 24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    border: "1px solid #E2E8F0",
  },
  tabBar: {
    display: "flex",
    gap: 4,
    background: "#FFFFFF",
    borderRadius: 16,
    padding: 6,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    border: "1px solid #E2E8F0",
    marginBottom: 20,
    overflowX: "auto" as const,
  },
  tab: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 16px",
    border: "none",
    borderRadius: 12,
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: "#64748B",
    transition: "all 0.2s",
    whiteSpace: "nowrap" as const,
  },
  tabActive: {
    background: "linear-gradient(135deg, #6A1B9A, #006D6D)",
    color: "#FFFFFF",
    boxShadow: "0 2px 8px rgba(106, 27, 154, 0.3)",
  },
  tabBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    background: "rgba(255,255,255,0.25)",
    fontSize: 11,
    fontWeight: 700,
  },
  content: {
    minHeight: 300,
  },
  empty: {
    textAlign: "center" as const,
    padding: "60px 20px",
    background: "#FFFFFF",
    borderRadius: 16,
    border: "1px solid #E2E8F0",
  },
  listCard: {
    background: "#FFFFFF",
    borderRadius: 14,
    padding: "16px 20px",
    border: "1px solid #E2E8F0",
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
    transition: "box-shadow 0.2s",
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  th: {
    textAlign: "left" as const,
    padding: "8px 12px",
    borderBottom: "2px solid #E2E8F0",
    fontWeight: 700,
    color: "#475569",
    fontSize: 12,
    textTransform: "uppercase" as const,
  },
  td: {
    padding: "8px 12px",
    borderBottom: "1px solid #F1F5F9",
    color: "#14202B",
  },
  payBtn: {
    display: "inline-block",
    padding: "14px 36px",
    background: "linear-gradient(135deg, #059669, #047857)",
    color: "#FFFFFF",
    fontWeight: 800,
    fontSize: 16,
    borderRadius: 12,
    textDecoration: "none",
    boxShadow: "0 4px 14px rgba(5, 150, 105, 0.3)",
    transition: "transform 0.2s",
  },
  requestCard: {
    background: "#FFFFFF",
    borderRadius: 16,
    padding: "32px 24px",
    border: "1px solid #E2E8F0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #CBD5E1",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box" as const,
  },
  primaryBtn: {
    padding: "12px 28px",
    background: "linear-gradient(135deg, #6A1B9A, #006D6D)",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 15,
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(106, 27, 154, 0.25)",
  },
  footer: {
    textAlign: "center" as const,
    marginTop: 40,
    paddingTop: 20,
    borderTop: "1px solid #E2E8F0",
  },
};
