import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

// -----------------------------------------------------------------------------
// FinancialInsightsPage
// All state and handlers come from SharonPortalWebsite via props.
// -----------------------------------------------------------------------------

export default function FinancialInsightsPage(props) {
  const {
    profile = {},
    totals = {},
    invoiceAllocations = [],
    monthlyFinance = [],
    clientRevenueRows = [],
    expenseCategoryRows = [],
    financialInsights = {},
    setActivePage = () => {},
    cardStyle = {},
    colours = {},
    currency = (value) => String(value ?? ""),
    formatDateAU = (value) => String(value ?? ""),
    safeNumber = (value) => Number(value || 0),
    todayLocal = () => new Date().toISOString().slice(0, 10),
    DashboardHero = ({ children }) => <div>{children}</div>,
    InsightChip = () => null,
    MetricCard = () => null,
    TrendBarsCard = () => null,
    WaterfallCard = () => null,
    SectionCard = ({ title, children, right }) => (
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>{title}</h2>
          {right}
        </div>
        {children}
      </section>
    ),
    ActionHubCard = () => null,
    DataTable = ({ columns = [], rows = [], emptyState = null }) => {
      if (!rows.length) {
        return emptyState ? <div>{emptyState.title || "No data available."}</div> : null;
      }
      return (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key || column.label} style={{ textAlign: "left", padding: 8 }}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id ?? index}>
                {columns.map((column) => (
                  <td key={column.key || column.label} style={{ padding: 8, verticalAlign: "top" }}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    },
  } = props;

  const resolvedColours = {
    purple: colours.purple || "#6A1B9A",
    teal: colours.teal || "#006D6D",
    navy: colours.navy || "#2B2F6B",
    bg: colours.bg || "#F8FAFC",
    white: colours.white || "#FFFFFF",
    text: colours.text || "#14202B",
    muted: colours.muted || "#64748B",
    border: colours.border || "#E2E8F0",
    lightPurple: colours.lightPurple || "#F5ECFB",
    lightTeal: colours.lightTeal || "#E7F6F5",
  };

  const baseCardStyle = {
    background: resolvedColours.white,
    border: `1px solid ${resolvedColours.border}`,
    borderRadius: 18,
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
    ...(cardStyle || {}),
  };

  const resolvedFinancialInsights = {
    healthScore: safeNumber(financialInsights?.healthScore),
    healthLabel: financialInsights?.healthLabel || "No rating yet",
    topThreeClientShare: safeNumber(financialInsights?.topThreeClientShare),
    topClientShare: safeNumber(financialInsights?.topClientShare),
    usableCashRatio: safeNumber(financialInsights?.usableCashRatio),
    averageMonthlyRevenue: safeNumber(financialInsights?.averageMonthlyRevenue),
    revenueChangePct: safeNumber(financialInsights?.revenueChangePct),
    expenseRatio: safeNumber(financialInsights?.expenseRatio),
    averageVolatility: safeNumber(financialInsights?.averageVolatility),
    expenseChangePct: safeNumber(financialInsights?.expenseChangePct),
    averageInvoiceValue: safeNumber(financialInsights?.averageInvoiceValue),
    bestMonth: financialInsights?.bestMonth || null,
    worstMonth: financialInsights?.worstMonth || null,
    largestExpenseCategory: financialInsights?.largestExpenseCategory || null,
    alerts: Array.isArray(financialInsights?.alerts) ? financialInsights.alerts : [],
  };

  const paidIncome = safeNumber(totals?.paidIncome);
  const totalIncome = safeNumber(totals?.totalIncome);
  const totalExpenses = safeNumber(totals?.totalExpenses);
  const gstCollected = safeNumber(totals?.gstCollected);
  const gstOnExpenses = safeNumber(totals?.gstOnExpenses);
  const gstPayable = safeNumber(totals?.gstPayable);
  const estimatedTax = safeNumber(totals?.estimatedTax);
  const totalFees = safeNumber(totals?.totalFees);
  const totalTaxWithheld = safeNumber(totals?.totalTaxWithheld);
  const monthlySubscriptionCost = safeNumber(totals?.monthlySubscriptionCost);
  const safeToSpend = safeNumber(totals?.safeToSpend);

  // -- Chart data --
  const monthlyChartData = (monthlyFinance || []).map((month) => ({
    name: month?.label || month?.monthKey || "-",
    Revenue: safeNumber(month?.revenue),
    Expenses: safeNumber(month?.expenses),
    Net: safeNumber(month?.net),
  }));

  const PIE_COLORS = [resolvedColours.teal, resolvedColours.purple, resolvedColours.navy, "#F59E0B", "#EC4899", "#10B981", "#6366F1", "#F97316"];
  const expensePieData = (expenseCategoryRows || []).filter(r => safeNumber(r?.value) > 0).map((r) => ({
    name: r?.label || r?.name || "-",
    value: safeNumber(r?.value),
  }));

  const revenueSummaryRows = (monthlyFinance || []).map((month) => ({
    period: month?.label || month?.monthKey || "-",
    revenue: safeNumber(month?.revenue),
    expenses: safeNumber(month?.expenses),
    net: safeNumber(month?.net),
  }));

  const allocationRows = (invoiceAllocations || []).map((item) => ({
    id: item?.id,
    invoiceNumber: item?.invoiceNumber || "-",
    date: item?.invoiceDate || item?.paidAt || todayLocal(),
    gross: safeNumber(item?.gross ?? item?.total),
    gst: safeNumber(item?.gst),
    incomeExGst: safeNumber(item?.incomeExGst),
    estimatedTax: safeNumber(item?.estimatedTax),
    fee: safeNumber(item?.fee),
    taxWithheld: safeNumber(item?.taxWithheld),
    netAvailable: safeNumber(item?.netAvailable),
  }));

  const customTooltipStyle = {
    background: resolvedColours.white,
    border: `1px solid ${resolvedColours.border}`,
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero
        title="Financial Insights"
        subtitle="Visual overview of your farm's financial performance. Revenue trends, expense breakdowns, client concentration and seasonal patterns — all in one place."
        highlight={currency(safeToSpend)}
      >
        <InsightChip label="Safe to spend" value={currency(safeToSpend)} />
        <InsightChip label="GST payable" value={currency(gstPayable)} />
        <InsightChip label="Net result" value={currency(totalIncome - totalExpenses - monthlySubscriptionCost)} />
      </DashboardHero>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <MetricCard title="Total income" value={currency(totalIncome)} subtitle="All invoice income recorded." accent={resolvedColours.purple} />
        <MetricCard title="Paid income" value={currency(paidIncome)} subtitle="Cash received from paid invoices." accent={resolvedColours.teal} />
        <MetricCard title="Total expenses" value={currency(totalExpenses)} subtitle="All expenses currently recorded." accent={resolvedColours.purple} />
        <MetricCard title="Safe to spend" value={currency(safeToSpend)} subtitle="After tax, GST, fees, expenses & subscription." accent={resolvedColours.teal} />
      </div>

      {/* ── Monthly Revenue vs Expenses Chart ── */}
      <SectionCard title="Monthly Revenue vs Expenses" right={<div style={{ fontSize: 12, color: resolvedColours.muted }}>Track seasonal patterns 🌾</div>}>
        {monthlyChartData.length > 0 ? (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={resolvedColours.border} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: resolvedColours.muted }} />
                <YAxis tick={{ fontSize: 12, fill: resolvedColours.muted }} tickFormatter={(v) => `$${(v / 1000).toFixed(v >= 1000 ? 0 : 1)}k`} />
                <Tooltip contentStyle={customTooltipStyle} formatter={(value) => currency(value)} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="Revenue" fill={resolvedColours.teal} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Expenses" fill={resolvedColours.purple} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Net" fill={resolvedColours.navy} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: resolvedColours.muted, fontSize: 14 }}>
            Add paid invoices and expenses to see your seasonal revenue trends here.
          </div>
        )}
      </SectionCard>

      {/* ── Expense Breakdown Pie Chart ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        <SectionCard title="Where Your Money Goes" right={<div style={{ fontSize: 12, color: resolvedColours.muted }}>Expense breakdown 🚜</div>}>
          {expensePieData.length > 0 ? (
            <div style={{ width: "100%", height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: resolvedColours.muted, strokeWidth: 1 }}
                  >
                    {expensePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} formatter={(value) => currency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: "center", color: resolvedColours.muted, fontSize: 14 }}>
              Record some expenses to see your spending breakdown here.
            </div>
          )}
        </SectionCard>

        <SectionCard title="Revenue Summary" right={<div style={{ fontSize: 12, color: resolvedColours.muted }}>Month-by-month</div>}>
          <DataTable
            columns={[
              { key: "period", label: "Period" },
              { key: "revenue", label: "Revenue", render: (value) => currency(value) },
              { key: "expenses", label: "Expenses", render: (value) => currency(value) },
              { key: "net", label: "Net", render: (value) => currency(value) },
            ]}
            rows={revenueSummaryRows}
            emptyState={{ title: "No monthly revenue data yet." }}
          />
        </SectionCard>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        <SectionCard title="Client risk" right={<div style={{ fontSize: 12, color: resolvedColours.muted }}>Concentration view</div>}>
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
              }}
            >
              <div style={{ ...baseCardStyle, padding: 14, background: resolvedColours.bg }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: resolvedColours.muted }}>Top client share</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: resolvedColours.text, marginTop: 6 }}>{resolvedFinancialInsights.topClientShare.toFixed(1)}%</div>
              </div>
              <div style={{ ...baseCardStyle, padding: 14, background: resolvedColours.bg }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: resolvedColours.muted }}>Top 3 clients</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: resolvedColours.text, marginTop: 6 }}>{resolvedFinancialInsights.topThreeClientShare.toFixed(1)}%</div>
              </div>
            </div>
            <TrendBarsCard
              title="Top clients"
              subtitle="Highest paid revenue contributors"
              data={(clientRevenueRows || []).slice(0, 4)}
              valueKey="value"
              formatValue={(value) => currency(value)}
              accent={resolvedColours.teal}
              emptyText="No paid client revenue yet."
            />
          </div>
        </SectionCard>

        <SectionCard title="Expense behaviour" right={<div style={{ fontSize: 12, color: resolvedColours.muted }}>Largest categories and recent change</div>}>
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
              }}
            >
              <div style={{ ...baseCardStyle, padding: 14, background: resolvedColours.bg }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: resolvedColours.muted }}>Latest expense move</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: resolvedColours.text, marginTop: 6 }}>{`${resolvedFinancialInsights.expenseChangePct >= 0 ? "+" : ""}${resolvedFinancialInsights.expenseChangePct.toFixed(1)}%`}</div>
              </div>
              <div style={{ ...baseCardStyle, padding: 14, background: resolvedColours.bg }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: resolvedColours.muted }}>Largest category</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: resolvedColours.text, marginTop: 6 }}>{resolvedFinancialInsights.largestExpenseCategory?.label || "-"}</div>
                <div style={{ fontSize: 13, color: resolvedColours.muted, marginTop: 6 }}>{currency(resolvedFinancialInsights.largestExpenseCategory?.value || 0)}</div>
              </div>
            </div>
            <TrendBarsCard
              title="Expense categories"
              subtitle="Largest recorded categories"
              data={(expenseCategoryRows || []).slice(0, 5)}
              valueKey="value"
              formatValue={(value) => currency(value)}
              accent={resolvedColours.purple}
              emptyText="No expenses recorded yet."
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Paid Invoice Allocation Detail" right={<div style={{ fontSize: 12, color: resolvedColours.muted }}>Supporting detail behind cash figures</div>}>
        <DataTable
          columns={[
            { key: "invoiceNumber", label: "Invoice" },
            { key: "date", label: "Date", render: (value) => formatDateAU(value) },
            { key: "gross", label: "Gross", render: (value) => currency(value) },
            { key: "gst", label: "GST", render: (value) => currency(value) },
            { key: "incomeExGst", label: "Ex GST", render: (value) => currency(value) },
            { key: "estimatedTax", label: "Tax reserve", render: (value) => currency(value) },
            { key: "fee", label: "Fees", render: (value) => currency(value) },
            { key: "taxWithheld", label: "Tax withheld", render: (value) => currency(value) },
            { key: "netAvailable", label: "Net available", render: (value) => currency(value) },
          ]}
          rows={allocationRows}
          emptyState={{ title: "No paid invoice allocation data yet." }}
        />
      </SectionCard>

      <SectionCard title="Simple alerts" right={<div style={{ fontSize: 12, color: resolvedColours.muted }}>Automatic observations</div>}>
        <div style={{ display: "grid", gap: 12 }}>
          {(resolvedFinancialInsights.alerts || []).length ? (
            resolvedFinancialInsights.alerts.map((alert, index) => (
              <div
                key={index}
                style={{
                  ...baseCardStyle,
                  padding: 14,
                  background: resolvedColours.bg,
                  borderLeft: `4px solid ${index === 0 && String(alert).includes("No immediate") ? resolvedColours.teal : resolvedColours.purple}`,
                }}
              >
                <div style={{ fontSize: 14, color: resolvedColours.text, lineHeight: 1.6 }}>{alert}</div>
              </div>
            ))
          ) : (
            <div style={{ ...baseCardStyle, padding: 14, background: resolvedColours.bg }}>
              <div style={{ fontSize: 14, color: resolvedColours.text, lineHeight: 1.6 }}>No automatic alerts yet.</div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
