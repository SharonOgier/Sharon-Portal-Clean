import React, { useMemo, useState } from "react";
import { computeJobFinancials } from "./JobCostingPanel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const safe = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

/* ─── Subcontractor Payments Tab ─── */
function SubcontractorPaymentsTab({
  jobs, colours, cardStyle, inputStyle, labelStyle, buttonPrimary, buttonSecondary,
  currency, formatDateAU, DashboardHero, InsightChip, MetricCard, SectionCard, DataTable, EmptyState,
  onUpdateJob,
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Flatten all subcontractor entries across all jobs
  const allSubs = useMemo(() => {
    const entries = [];
    jobs.forEach(job => {
      const subs = job?.costs?.subcontractor || [];
      subs.forEach((sub, idx) => {
        entries.push({
          jobId: job.id,
          jobTitle: job.title || "Untitled Job",
          subIdx: idx,
          name: sub.name || "—",
          amount: safe(sub.amount),
          paidAmount: safe(sub.paidAmount),
          invoiceRef: sub.invoiceRef || "",
          paymentStatus: sub.paymentStatus || "Unpaid",
          pending: !!sub.pending,
          jobStartDate: job.startDate || "",
          job,
          sub,
        });
      });
    });
    return entries;
  }, [jobs]);

  const filtered = useMemo(() => {
    let list = allSubs;
    if (statusFilter !== "All") list = list.filter(s => s.paymentStatus === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.jobTitle.toLowerCase().includes(q) || s.invoiceRef.toLowerCase().includes(q));
    }
    return list;
  }, [allSubs, statusFilter, search]);

  const totals = useMemo(() => {
    const totalOwed = allSubs.reduce((s, e) => s + e.amount, 0);
    const totalPaid = allSubs.filter(e => e.paymentStatus === "Paid").reduce((s, e) => s + e.amount, 0);
    const totalPartial = allSubs.filter(e => e.paymentStatus === "Partial").reduce((s, e) => s + safe(e.paidAmount), 0);
    const totalUnpaid = totalOwed - totalPaid - totalPartial;
    const unpaidCount = allSubs.filter(e => e.paymentStatus === "Unpaid").length;
    const partialCount = allSubs.filter(e => e.paymentStatus === "Partial").length;
    const paidCount = allSubs.filter(e => e.paymentStatus === "Paid").length;
    return { totalOwed, totalPaid, totalPartial, totalUnpaid, unpaidCount, partialCount, paidCount };
  }, [allSubs]);

  const handleStatusChange = (entry, newStatus) => {
    const job = entry.job;
    const subs = [...(job.costs?.subcontractor || [])];
    subs[entry.subIdx] = {
      ...subs[entry.subIdx],
      paymentStatus: newStatus,
      paidAmount: newStatus === "Paid" ? String(entry.amount) : newStatus === "Unpaid" ? "" : subs[entry.subIdx].paidAmount,
    };
    onUpdateJob({ ...job, costs: { ...job.costs, subcontractor: subs } });
  };

  const handlePaidAmountChange = (entry, val) => {
    const job = entry.job;
    const subs = [...(job.costs?.subcontractor || [])];
    subs[entry.subIdx] = { ...subs[entry.subIdx], paidAmount: val };
    onUpdateJob({ ...job, costs: { ...job.costs, subcontractor: subs } });
  };

  const statusBadge = (status) => {
    const map = {
      Unpaid: { bg: "#FFEBEE", color: "#C62828" },
      Partial: { bg: "#FFF3E0", color: "#E65100" },
      Paid: { bg: "#E8F5E9", color: "#2E7D32" },
    };
    const s = map[status] || map.Unpaid;
    return { padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: "none" };
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero title="Subcontractor Payments" subtitle="Track and manage all subcontractor payments across your jobs.">
        <InsightChip label="Total Owed" value={currency(totals.totalOwed)} />
        <InsightChip label="Unpaid" value={currency(totals.totalUnpaid)} />
        <InsightChip label="Paid" value={currency(totals.totalPaid + totals.totalPartial)} />
      </DashboardHero>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 }}>
        <MetricCard label="TOTAL OWED" value={currency(totals.totalOwed)} sub={`${allSubs.length} subcontractor entries`} colour={colours.purple} />
        <MetricCard label="UNPAID" value={currency(totals.totalUnpaid)} sub={`${totals.unpaidCount} outstanding`} colour="#C62828" />
        <MetricCard label="PARTIALLY PAID" value={currency(totals.totalPartial)} sub={`${totals.partialCount} in progress`} colour="#E65100" />
        <MetricCard label="FULLY PAID" value={currency(totals.totalPaid)} sub={`${totals.paidCount} settled`} colour="#2E7D32" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option>All</option><option>Unpaid</option><option>Partial</option><option>Paid</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Search</label>
          <input style={inputStyle} value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, job, ref..." />
        </div>
        {(statusFilter !== "All" || search) && (
          <button style={{ ...buttonSecondary, fontSize: 12 }} onClick={() => { setStatusFilter("All"); setSearch(""); }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <SectionCard title={`Subcontractor Entries (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState icon="🔧" title="No subcontractor payments" subtitle={allSubs.length === 0 ? "Add subcontractor costs to your jobs first" : "No entries match your filter"} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colours.border || "#E2E8F0"}` }}>
                  {["Subcontractor", "Job", "Invoice Ref", "Amount", "Paid", "Owing", "Status", "Action"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 8px", fontSize: 11, fontWeight: 700, color: colours.muted, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const owing = entry.paymentStatus === "Paid" ? 0 : entry.amount - (entry.paymentStatus === "Partial" ? entry.paidAmount : 0);
                  return (
                    <tr key={`${entry.jobId}-${entry.subIdx}`} style={{ borderBottom: `1px solid ${colours.border || "#F1F5F9"}`, background: i % 2 === 0 ? "#FAFBFC" : "#fff" }}>
                      <td style={{ padding: "10px 8px", fontWeight: 600 }}>
                        {entry.name}
                        {entry.pending && <span style={{ marginLeft: 6, fontSize: 10, background: "#FFF3E0", color: "#E65100", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>⏳ Pending</span>}
                      </td>
                      <td style={{ padding: "10px 8px", color: colours.muted }}>{entry.jobTitle}</td>
                      <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: 12 }}>{entry.invoiceRef || "—"}</td>
                      <td style={{ padding: "10px 8px", fontWeight: 700 }}>{currency(entry.amount)}</td>
                      <td style={{ padding: "10px 8px", fontWeight: 600, color: "#2E7D32" }}>
                        {entry.paymentStatus === "Paid" ? currency(entry.amount) : entry.paymentStatus === "Partial" ? currency(entry.paidAmount) : "—"}
                      </td>
                      <td style={{ padding: "10px 8px", fontWeight: 700, color: owing > 0 ? "#C62828" : "#2E7D32" }}>
                        {owing > 0 ? currency(owing) : "✓"}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span style={statusBadge(entry.paymentStatus)}>{entry.paymentStatus}</span>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <select
                            style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", width: 90 }}
                            value={entry.paymentStatus}
                            onChange={e => handleStatusChange(entry, e.target.value)}
                          >
                            <option>Unpaid</option><option>Partial</option><option>Paid</option>
                          </select>
                          {entry.paymentStatus === "Partial" && (
                            <input
                              type="number" min="0" step="0.01"
                              style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", width: 80 }}
                              value={entry.sub.paidAmount || ""}
                              onChange={e => handlePaidAmountChange(entry, e.target.value)}
                              placeholder="$ paid"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${colours.border || "#E2E8F0"}`, fontWeight: 800 }}>
                  <td colSpan={3} style={{ padding: "10px 8px" }}>TOTALS</td>
                  <td style={{ padding: "10px 8px" }}>{currency(filtered.reduce((s, e) => s + e.amount, 0))}</td>
                  <td style={{ padding: "10px 8px", color: "#2E7D32" }}>
                    {currency(filtered.reduce((s, e) => s + (e.paymentStatus === "Paid" ? e.amount : e.paymentStatus === "Partial" ? e.paidAmount : 0), 0))}
                  </td>
                  <td style={{ padding: "10px 8px", color: "#C62828" }}>
                    {currency(filtered.reduce((s, e) => {
                      const owing = e.paymentStatus === "Paid" ? 0 : e.amount - (e.paymentStatus === "Partial" ? e.paidAmount : 0);
                      return s + owing;
                    }, 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ─── Main Jobs Report Page with Tabs ─── */
export default function JobsReportPage({
  jobs = [], invoices = [], quotes = [], clients = [],
  colours, cardStyle, buttonPrimary, buttonSecondary, inputStyle, labelStyle,
  currency, formatDateAU, safeNumber,
  DashboardHero, InsightChip, MetricCard, SectionCard, DataTable, EmptyState,
  setActivePage, onUpdateJob,
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportTab, setReportTab] = useState("overview");

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [String(c.id), c])), [clients]);
  const getClientName = (id) => clientMap[String(id)]?.name || "—";

  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (dateFrom) list = list.filter(j => (j.startDate || "") >= dateFrom);
    if (dateTo) list = list.filter(j => (j.startDate || "") <= dateTo);
    return list;
  }, [jobs, dateFrom, dateTo]);

  const report = useMemo(() => {
    let totalRevenue = 0, totalCost = 0, totalSubUnpaid = 0, totalSubPaid = 0;
    const rows = filteredJobs.map(job => {
      const fin = computeJobFinancials(job);
      const linkedInv = invoices.find(inv => String(inv.jobId) === String(job.id) || String(inv.id) === String(job.invoiceId));
      const invoiceTotal = linkedInv ? safe(linkedInv.total) : 0;
      const invoiceStatus = linkedInv?.status || "No Invoice";
      const revenue = invoiceTotal || fin.quotedTotal;
      totalRevenue += revenue;
      totalCost += fin.totalCost;
      totalSubUnpaid += fin.subUnpaid;
      totalSubPaid += fin.subPaid;
      return { ...job, fin, revenue, invoiceTotal, invoiceStatus, linkedInv };
    });
    const totalMargin = totalRevenue - totalCost;
    const totalMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    return { rows, totalRevenue, totalCost, totalMargin, totalMarginPct, totalSubUnpaid, totalSubPaid };
  }, [filteredJobs, invoices]);

  const PIE_COLORS = [colours.teal || "#006D6D", colours.purple || "#6A1B9A", "#E65100", "#1E88E5", "#64748B"];

  const costBreakdown = useMemo(() => {
    let labour = 0, materials = 0, subcontractor = 0, misc = 0;
    report.rows.forEach(r => { labour += r.fin.labour; materials += r.fin.materials; subcontractor += r.fin.subcontractor; misc += r.fin.misc; });
    return [
      { name: "Labour", value: labour },
      { name: "Materials", value: materials },
      { name: "Subcontractor", value: subcontractor },
      { name: "Misc", value: misc },
    ].filter(x => x.value > 0);
  }, [report]);

  const jobMarginData = useMemo(() =>
    report.rows.filter(r => r.revenue > 0 || r.fin.totalCost > 0).slice(0, 20).map(r => ({
      name: (r.title || "").substring(0, 15),
      Revenue: r.revenue,
      Cost: r.fin.totalCost,
      Margin: r.revenue - r.fin.totalCost,
    }))
  , [report]);

  const tooltipStyle = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 13 };

  // Count unpaid subs for badge
  const unpaidSubCount = useMemo(() => {
    let count = 0;
    jobs.forEach(job => {
      (job?.costs?.subcontractor || []).forEach(s => { if (s.paymentStatus !== "Paid") count++; });
    });
    return count;
  }, [jobs]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 3, background: "#F1F5F9", borderRadius: 12, padding: 4, width: "fit-content" }}>
        <button onClick={() => setReportTab("overview")}
          style={{ padding: "8px 20px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
            background: reportTab === "overview" ? colours.purple : "transparent", color: reportTab === "overview" ? "#fff" : colours.muted }}>
          📊 Jobs Overview
        </button>
        <button onClick={() => setReportTab("subpayments")}
          style={{ padding: "8px 20px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
            background: reportTab === "subpayments" ? colours.purple : "transparent", color: reportTab === "subpayments" ? "#fff" : colours.muted,
            display: "flex", alignItems: "center", gap: 6 }}>
          🔧 Subcontractor Payments
          {unpaidSubCount > 0 && (
            <span style={{ background: "#C62828", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 99, minWidth: 18, textAlign: "center" }}>{unpaidSubCount}</span>
          )}
        </button>
      </div>

      {reportTab === "subpayments" ? (
        <SubcontractorPaymentsTab
          jobs={jobs} colours={colours} cardStyle={cardStyle} inputStyle={inputStyle} labelStyle={labelStyle}
          buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary} currency={currency} formatDateAU={formatDateAU}
          DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard} SectionCard={SectionCard}
          DataTable={DataTable} EmptyState={EmptyState} onUpdateJob={onUpdateJob}
        />
      ) : (
        <>
          <DashboardHero title="Jobs Financial Report" subtitle="Revenue, costs, margins, and outstanding payments across all jobs.">
            <InsightChip label="Revenue" value={currency(report.totalRevenue)} />
            <InsightChip label="Margin" value={`${report.totalMarginPct.toFixed(1)}%`} />
            <InsightChip label="Sub Unpaid" value={currency(report.totalSubUnpaid)} />
          </DashboardHero>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <MetricCard label="TOTAL REVENUE" value={currency(report.totalRevenue)} sub="From invoiced/quoted amounts" colour={colours.teal} />
            <MetricCard label="TOTAL COSTS" value={currency(report.totalCost)} sub="Labour + Materials + Subs + Misc" colour="#1E88E5" />
            <MetricCard label="GROSS MARGIN" value={currency(report.totalMargin)} sub={`${report.totalMarginPct.toFixed(1)}% margin`} colour={report.totalMarginPct >= 20 ? "#2E7D32" : "#E65100"} />
            <MetricCard label="SUB UNPAID" value={currency(report.totalSubUnpaid)} sub="Subcontractor invoices owing" colour="#C62828" />
            <MetricCard label="SUB PAID" value={currency(report.totalSubPaid)} sub="Subcontractor invoices settled" colour="#2E7D32" />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
            <div><label style={labelStyle}>From</label><input type="date" style={inputStyle} value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
            <div><label style={labelStyle}>To</label><input type="date" style={inputStyle} value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
            {(dateFrom || dateTo) && <button style={{ ...buttonSecondary, fontSize: 12 }} onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</button>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {jobMarginData.length > 0 && (
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: colours.text, marginBottom: 12 }}>Revenue vs Cost by Job</div>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobMarginData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: colours.muted }} />
                      <YAxis tick={{ fontSize: 11, fill: colours.muted }} tickFormatter={v => currency(v)} />
                      <Tooltip contentStyle={tooltipStyle} formatter={v => currency(v)} />
                      <Bar dataKey="Revenue" fill={colours.teal} radius={[4,4,0,0]} />
                      <Bar dataKey="Cost" fill={colours.purple} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {costBreakdown.length > 0 && (
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: colours.text, marginBottom: 12 }}>Cost Breakdown</div>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                        labelLine={{ stroke: colours.muted, strokeWidth: 1 }}>
                        {costBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={v => currency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <SectionCard title="Job-by-Job Breakdown">
            {report.rows.length === 0 ? <EmptyState icon="📊" title="No jobs found" subtitle="Create jobs with costs to see the report" /> : (
              <DataTable
                columns={[
                  { key: "title", label: "Job" },
                  { key: "clientId", label: "Client", render: (_v, r) => getClientName(r.clientId) },
                  { key: "startDate", label: "Date", render: (_v, r) => formatDateAU ? formatDateAU(r.startDate) : r.startDate },
                  { key: "revenue", label: "Revenue", render: (_v, r) => currency(r.revenue) },
                  { key: "totalCost", label: "Cost", render: (_v, r) => currency(r.fin.totalCost) },
                  { key: "margin", label: "Margin", render: (_v, r) => {
                    const m = r.revenue - r.fin.totalCost;
                    const pct = r.revenue > 0 ? ((m / r.revenue) * 100).toFixed(0) : "0";
                    return <span style={{ color: m >= 0 ? "#2E7D32" : "#C62828", fontWeight: 700 }}>{currency(m)} ({pct}%)</span>;
                  }},
                  { key: "invoiceStatus", label: "Invoice", render: (_v, r) => {
                    const statusMap = { Paid: { bg: "#E8F5E9", color: "#2E7D32" }, Sent: { bg: "#E3F2FD", color: "#1565C0" }, Overdue: { bg: "#FFEBEE", color: "#C62828" }, Draft: { bg: "#F1F5F9", color: "#64748B" } };
                    const s = statusMap[r.invoiceStatus] || { bg: "#F1F5F9", color: "#64748B" };
                    return <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{r.invoiceStatus}</span>;
                  }},
                  { key: "subStatus", label: "Sub Payments", render: (_v, r) => {
                    const unpaid = r.fin.subUnpaid;
                    if ((r.costs?.subcontractor || []).length === 0) return <span style={{ color: "#64748B", fontSize: 11 }}>—</span>;
                    return unpaid > 0
                      ? <span style={{ color: "#C62828", fontWeight: 700, fontSize: 12 }}>Owing: {currency(unpaid)}</span>
                      : <span style={{ color: "#2E7D32", fontWeight: 700, fontSize: 12 }}>✓ Paid</span>;
                  }},
                ]}
                rows={report.rows}
              />
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}