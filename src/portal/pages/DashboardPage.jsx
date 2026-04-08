import React, { useState, useMemo } from "react";
import { useTerminology } from "../TerminologyContext";
import { getUserTier } from "../tierConfig";


// -----------------------------------------------------------------------------
// DashboardPage
// All state and handlers come from SharonPortalWebsite via props.
// -----------------------------------------------------------------------------

export default function DashboardPage(props) {
  const {
    profile = {},
    clients = [],
    invoices = [],
    quotes = [],
    expenses = [],
    documents = [],
    services = [],
    totals = {},
    invoiceAllocations = [],
    monthlyFinance = [],
    clientRevenueRows = [],
    expenseCategoryRows = [],
    invoiceStatusRows = [],
    recentActivityRows = [],
    dashboardInsights = { collectionRate: 0 },
    financialInsights = {},
    setActivePage = () => {},
    setActiveSettingsTab = () => {},
    cardStyle = {},
    colours = {},
    currency = (v) => v,
    formatDateAU = (v) => v,
    safeNumber = (v) => Number(v || 0),
    DEFAULT_MONTHLY_SUBSCRIPTION = 27,
    buttonPrimary = {},
    buttonSecondary = {},
    inputStyle = {},
    labelStyle = {},
    DashboardHero = () => null,
    InsightChip = () => null,
    MetricCard = () => null,
    ActionHubCard = () => null,
    TrendBarsCard = () => null,
    WaterfallCard = () => null,
    ActivityListCard = () => null,
    SectionCard = () => null,
    DataTable = () => null,
    exportToATOForm = () => {},
    restorePortalStateFromSupabase = () => {},
    saveAllCurrentStateToSupabase = () => {},
    supabaseSyncStatus = "",
    getClientName = () => "",
    chemicalRecords = [],
    livestockRecords = [],
    todayLocal = () => new Date().toISOString().slice(0, 10),
  } = props;

  const { businessType, t } = useTerminology();

  const [showPL, setShowPL] = useState(false);
  const [showGST, setShowGST] = useState(false);
  const [showCashMovement, setShowCashMovement] = useState(false);
  const [showCashEfficiency, setShowCashEfficiency] = useState(false);
  const resolvedDashboardInsights = dashboardInsights || { collectionRate: 0 };
  const resolvedMonthlyFinance = Array.isArray(monthlyFinance) ? monthlyFinance : [];
  const resolvedClientRevenueRows = Array.isArray(clientRevenueRows) ? clientRevenueRows : [];
  const resolvedExpenseCategoryRows = Array.isArray(expenseCategoryRows) ? expenseCategoryRows : [];
  const resolvedInvoiceStatusRows = Array.isArray(invoiceStatusRows) ? invoiceStatusRows : [];
  const resolvedRecentActivityRows = Array.isArray(recentActivityRows) ? recentActivityRows : [];
  const resolvedButtonPrimary = buttonPrimary || {};
  const resolvedButtonSecondary = buttonSecondary || {};
  const resolvedExportToATOForm = typeof exportToATOForm === "function" ? exportToATOForm : () => {};
  const resolvedRestorePortalStateFromSupabase = typeof restorePortalStateFromSupabase === "function" ? restorePortalStateFromSupabase : () => {};
  const resolvedSaveAllCurrentStateToSupabase = typeof saveAllCurrentStateToSupabase === "function" ? saveAllCurrentStateToSupabase : () => {};
  const resolvedSupabaseSyncStatus = supabaseSyncStatus || "";
  const resolvedGetClientName = typeof getClientName === "function" ? getClientName : () => "";

      // -- Onboarding checklist --------------------------------------
      const onboardingSteps = [
        { label: "Add your business name", done: Boolean(profile.businessName), action: () => { setActivePage("settings"); setActiveSettingsTab("Profile"); } },
        { label: "Add your ABN", done: Boolean(profile.abn), action: () => { setActivePage("settings"); setActiveSettingsTab("Profile"); } },
        { label: "Set your GST registration status", done: Boolean(profile.gstRegistered !== undefined && profile.gstRegistered !== null), action: () => { setActivePage("settings"); setActiveSettingsTab("Financial"); } },
        { label: "Upload your logo", done: Boolean(profile.logoDataUrl), action: () => { setActivePage("settings"); setActiveSettingsTab("Branding"); } },
        { label: "Add your first client", done: clients.length > 0, action: () => setActivePage("invoices") },
        { label: "Create your first invoice", done: invoices.length > 0, action: () => setActivePage("invoices") },
      ];
      const doneCount = onboardingSteps.filter((s) => s.done).length;
      const allDone = doneCount === onboardingSteps.length;
      const pct = Math.round((doneCount / onboardingSteps.length) * 100);

      return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Starter tier upgrade banner */}
      {(!getUserTier(profile) || getUserTier(profile) === "starter") && profile.setupComplete && (
        <div style={{
          background: "linear-gradient(135deg, #F5ECFB 0%, #E7F6F5 100%)",
          border: `1px solid ${colours.border || "#E2E8F0"}`,
          borderRadius: 16, padding: "16px 22px",
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <span style={{ fontSize: 14, color: colours.text, flex: 1, lineHeight: 1.6 }}>
            You're on the <strong>Starter</strong> plan. Upgrade to <strong>Pro</strong> to unlock scheduling, properties and your full business toolkit.
          </span>
          <button
            onClick={() => { setActivePage("settings"); setActiveSettingsTab("Plan & Billing"); }}
            style={{
              background: colours.purple || "#6A1B9A", color: "#fff", border: "none",
              borderRadius: 10, padding: "10px 20px", fontWeight: 800,
              fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Upgrade now →
          </button>
        </div>
      )}
      {!allDone && (
        <div style={{ ...cardStyle, padding: 24, background: "linear-gradient(135deg, #F5ECFB 0%, #EDE9FE 100%)", border: "1px solid #E9D5FF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: colours.purple, marginBottom: 4 }}> Get started -- {doneCount} of {onboardingSteps.length} complete</div>
              <div style={{ fontSize: 13, color: colours.muted }}>Complete these steps to get the most out of your portal</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: colours.purple }}>{pct}%</div>
              <div style={{ fontSize: 11, color: colours.muted }}>set up</div>
            </div>
          </div>
          <div style={{ background: "#E9D5FF", borderRadius: 99, height: 8, marginBottom: 20 }}>
            <div style={{ background: colours.purple, borderRadius: 99, height: 8, width: pct + "%", transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            {onboardingSteps.map((step, i) => (
              <div key={i} onClick={step.done ? undefined : step.action}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
                  background: step.done ? "#F0FDF4" : "#fff",
                  border: "1px solid " + (step.done ? "#BBF7D0" : "#E9D5FF"),
                  cursor: step.done ? "default" : "pointer",
                  opacity: step.done ? 0.8 : 1 }}>
                <div style={{ fontSize: 18, flexShrink: 0 }}>{step.done ? "✅" : ""}</div>
                <div style={{ fontSize: 13, fontWeight: step.done ? 400 : 600, color: step.done ? "#166534" : colours.text,
                  textDecoration: step.done ? "line-through" : "none" }}>{step.label}</div>
                {!step.done && <div style={{ marginLeft: "auto", fontSize: 11, color: colours.purple, fontWeight: 700, flexShrink: 0 }}>Go</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {allDone && (
        <div style={{ ...cardStyle, padding: 18, background: "#F0FDF4", border: "1px solid #BBF7D0", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 28 }}></div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#166534" }}>You're all set up!</div>
            <div style={{ fontSize: 13, color: "#166534", marginTop: 2 }}>Your portal is fully configured and ready to use.</div>
          </div>
        </div>
      )}

      {/* ── Business-type adapted quick view ─────────────────── */}
      {businessType === "tradie" && (
        <SectionCard title="🪖 Today's Dispatch" right={<button style={{ fontSize: 12, color: colours.purple, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }} onClick={() => setActivePage("scheduling")}>View {t("schedule")} →</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            <ActionHubCard icon="📅" title={`Today's ${t("jobs")}`} description={`${invoices.filter(i => i.invoiceDate === new Date().toISOString().slice(0, 10)).length} scheduled`} buttonLabel={`View ${t("schedule")}`} onClick={() => setActivePage("scheduling")} tone={colours.purple} />
            <ActionHubCard icon="⚠️" title={`Unscheduled ${t("jobs")}`} description="Don't let anything slip" buttonLabel="Check now" onClick={() => setActivePage("scheduling")} tone="#EA580C" />
            <ActionHubCard icon="👥" title="Who's where" description={`${clients.filter(c => (c.roles || []).includes("staff")).length} staff, ${clients.filter(c => (c.roles || []).includes("subcontractor")).length} ${t("subcontractors").toLowerCase()}`} buttonLabel="View contacts" onClick={() => setActivePage("clients")} tone={colours.teal} />
          </div>
        </SectionCard>
      )}

      {businessType === "farmer" && (
        <SectionCard title="🚜 Property Overview" right={<button style={{ fontSize: 12, color: colours.purple, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }} onClick={() => setActivePage("properties")}>View {t("properties")} →</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            <ActionHubCard icon="🏡" title={t("properties")} description={`${(props.properties || []).length || 0} registered`} buttonLabel={`View ${t("properties").toLowerCase()}`} onClick={() => setActivePage("properties")} tone={colours.teal} />
            <ActionHubCard icon="📋" title={`Active ${t("jobs")}`} description="Seasonal tasks and ongoing work" buttonLabel={`View ${t("workPlanner")}`} onClick={() => setActivePage("scheduling")} tone={colours.purple} />
            <ActionHubCard icon="🛡️" title="Compliance" description={`${chemicalRecords.filter(r => !r.archived && r.withholdingEndDate >= new Date().toISOString().slice(0, 10)).length} active WHP`} buttonLabel="View dashboard" onClick={() => setActivePage("compliance")} tone="#EA580C" />
          </div>
        </SectionCard>
      )}

      {businessType === "smallbusiness" && (
        <SectionCard title="🏪 Today's Overview" right={<button style={{ fontSize: 12, color: colours.purple, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }} onClick={() => setActivePage("scheduling")}>View {t("schedule")} →</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            <ActionHubCard icon="📅" title={`Today's ${t("bookings")}`} description="Check your schedule" buttonLabel={`View ${t("schedule").toLowerCase()}`} onClick={() => setActivePage("scheduling")} tone={colours.purple} />
            <ActionHubCard icon="👥" title="Staff roster" description={`${clients.filter(c => (c.roles || []).includes("staff")).length} team members`} buttonLabel="View roster" onClick={() => setActivePage("clients")} tone={colours.teal} />
            <ActionHubCard icon="💰" title="Outstanding invoices" description={`${invoices.filter(i => i.status !== "Paid").length} unpaid`} buttonLabel="View invoices" onClick={() => setActivePage("invoices")} tone="#EA580C" />
          </div>
        </SectionCard>
      )}

      <DashboardHero
        title={profile.businessName || "My Portal"}
        subtitle="Your financial overview — invoices, quotes, expenses and performance in one place."
        highlight={currency(totals.safeToSpend)}
      >
        <InsightChip label="Collection rate" value={`${resolvedDashboardInsights.collectionRate.toFixed(1)}%`} />
        <InsightChip label="Subscription/mo" value={currency(totals.monthlySubscriptionCost)} />
        <InsightChip label="Safe to spend" value={currency(totals.safeToSpend)} />
      </DashboardHero>

      <SectionCard title="Action hub" right={<div style={{ fontSize: 12, color: colours.muted }}>Most-used tasks first</div>}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <ActionHubCard
            icon="🧾"
            title="Create invoice"
            description="Generate a new invoice quickly and move straight into the invoice workspace."
            buttonLabel="Open invoices"
            onClick={() => setActivePage("invoices")}
            tone={colours.purple}
          />
          <ActionHubCard
            icon="💬"
            title="Create quote"
            description="Prepare a quote for a client and convert it later when work is approved."
            buttonLabel="Open quotes"
            onClick={() => setActivePage("quotes")}
            tone={colours.teal}
          />
          <ActionHubCard
            icon="💸"
            title="Add expense"
            description="Capture a business expense, upload the receipt and keep your records current."
            buttonLabel="Open expenses"
            onClick={() => setActivePage("expenses")}
            tone={colours.navy}
          />
          <ActionHubCard
            icon="📊"
            title="View insights"
            description="Review cash flow, margins, tax reserves and other performance signals."
            buttonLabel="Open insights"
            onClick={() => setActivePage("financial insights")}
            tone={colours.purple}
          />
        </div>
      </SectionCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
        }}
      >
        <MetricCard title="Gross invoiced" value={currency(totals.totalIncome)} subtitle="All invoice values currently stored in the portal." accent={colours.navy} />
        <MetricCard title="Gross paid" value={currency(totals.paidIncome)} subtitle="Cash received from invoices marked Paid." accent={colours.teal} />
        <MetricCard title="GST payable" value={currency(totals.gstPayable)} subtitle={`Sales GST ${currency(totals.gstCollected)} less expense credits ${currency(totals.gstOnExpenses)}.`} accent={colours.purple} />
        <MetricCard title="Estimated tax reserve" value={currency(totals.estimatedTax)} subtitle="Set aside based on paid income excluding GST." accent={colours.navy} />
        <MetricCard title="Portal subscription" value={currency(totals.monthlySubscriptionCost)} subtitle={`$${safeNumber(profile.monthlySubscription ?? DEFAULT_MONTHLY_SUBSCRIPTION)}/mo -- set in Settings -> Financial.`} accent={colours.purple} />
        <MetricCard title="Safe to spend" value={currency(totals.safeToSpend)} subtitle={`After GST, tax, fees, expenses & $${safeNumber(profile.monthlySubscription ?? DEFAULT_MONTHLY_SUBSCRIPTION)}/mo subscription.`} accent={colours.teal} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        <SectionCard title="Monthly financial momentum" right={<div style={{ fontSize: 12, color: colours.muted }}>Latest 6 months</div>}>
          {resolvedMonthlyFinance.length ? (
            <div style={{ display: "grid", gap: 16 }}>
              {resolvedMonthlyFinance.map((month) => {
                const maxValue = Math.max(...resolvedMonthlyFinance.map((item) => Math.max(item.revenue, item.expenses, Math.abs(item.net))), 0);
                const revenueWidth = maxValue > 0 ? (month.revenue / maxValue) * 100 : 0;
                const expenseWidth = maxValue > 0 ? (month.expenses / maxValue) * 100 : 0;
                const netWidth = maxValue > 0 ? (Math.abs(month.net) / maxValue) * 100 : 0;
                return (
                  <div key={month.monthKey} style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: colours.text }}>{month.label}</div>
                      <div style={{ fontSize: 12, color: colours.muted }}>Net {currency(month.net)}</div>
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: colours.muted, marginBottom: 6 }}><span>Revenue</span><span>{currency(month.revenue)}</span></div>
                        <div style={{ height: 12, borderRadius: 999, background: colours.bg }}><div style={{ width: `${Math.max(revenueWidth, month.revenue ? 8 : 0)}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${colours.teal} 0%, ${colours.navy} 100%)` }} /></div>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: colours.muted, marginBottom: 6 }}><span>Expenses</span><span>{currency(month.expenses)}</span></div>
                        <div style={{ height: 12, borderRadius: 999, background: colours.bg }}><div style={{ width: `${Math.max(expenseWidth, month.expenses ? 8 : 0)}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${colours.purple} 0%, #C084FC 100%)` }} /></div>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: colours.muted, marginBottom: 6 }}><span>Net position</span><span>{currency(month.net)}</span></div>
                        <div style={{ height: 12, borderRadius: 999, background: colours.bg }}><div style={{ width: `${Math.max(netWidth, month.net ? 8 : 0)}%`, height: "100%", borderRadius: 999, background: month.net >= 0 ? `linear-gradient(90deg, ${colours.teal} 0%, ${colours.purple} 100%)` : `linear-gradient(90deg, #F59E0B 0%, ${colours.purple} 100%)` }} /></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: colours.muted }}>Add paid invoices and expenses to unlock the monthly trend view.</div>
          )}
        </SectionCard>

        <WaterfallCard
          title="Cash movement"
          rows={[
            { label: "Paid income", value: totals.paidIncome },
            { label: "Less GST payable", value: -totals.gstPayable },
            { label: "Less estimated tax", value: -totals.estimatedTax },
            { label: "Less platform fees", value: -totals.totalFees },
            { label: "Less expenses", value: -totals.totalExpenses },
            { label: `Less subscription (${currency(totals.monthlySubscriptionCost)}/mo)`, value: -totals.monthlySubscriptionCost },
            { label: "Safe to spend", value: totals.safeToSpend },
          ]}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        <TrendBarsCard title="Top clients by paid revenue" subtitle="Based on invoices marked Paid" data={resolvedClientRevenueRows} valueKey="value" formatValue={(value) => currency(value)} accent={colours.teal} emptyText="No paid invoices yet." />
        <TrendBarsCard title="Expense categories" subtitle="Largest categories from recorded expenses" data={resolvedExpenseCategoryRows} valueKey="value" formatValue={(value) => currency(value)} accent={colours.purple} emptyText="No expenses recorded yet." />
        <TrendBarsCard title="Invoice status mix" subtitle="A quick collections snapshot" data={resolvedInvoiceStatusRows} valueKey="value" formatValue={(value) => `${value} item${value === 1 ? "" : "s"}`} accent={colours.navy} emptyText="No invoices yet." />
      </div>

      {businessType === "farmer" && (
        <SectionCard title="🛡️ Compliance Status" right={<button style={{ fontSize: 12, color: colours.purple, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }} onClick={() => setActivePage("compliance")}>View dashboard →</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <MetricCard
              title="Chemical WHP"
              value={chemicalRecords.filter(r => !r.archived && r.withholdingEndDate >= todayLocal()).length > 0 ? "❌ Restricted" : "✔ Clear"}
              subtitle="Paddock withholding status"
              accent={chemicalRecords.filter(r => !r.archived && r.withholdingEndDate >= todayLocal()).length > 0 ? "#DC2626" : colours.teal}
            />
            <MetricCard
              title="Livestock WHP/ESI"
              value={livestockRecords.filter(r => !r.archived && r.kind === "treatment" && r.withholdingEndDate >= todayLocal()).length > 0 ? "❌ Restricted" : "✔ Clear"}
              subtitle="Mob withholding status"
              accent={livestockRecords.filter(r => !r.archived && r.kind === "treatment" && r.withholdingEndDate >= todayLocal()).length > 0 ? "#DC2626" : colours.teal}
            />
            <MetricCard
              title="NLIS Sale Status"
              value={livestockRecords.filter(r => !r.archived && r.kind === "treatment" && r.withholdingEndDate >= todayLocal()).length > 0 ? "❌ Mob cannot be sold" : "✔ Ready"}
              subtitle="Sale/Slaughter clearance"
              accent={livestockRecords.filter(r => !r.archived && r.kind === "treatment" && r.withholdingEndDate >= todayLocal()).length > 0 ? "#DC2626" : colours.teal}
            />
          </div>
        </SectionCard>
      )}

      <SectionCard title="Financial reports" right={<div style={{ fontSize: 12, color: colours.muted }}>Click to expand</div>}>
        <div style={{ display: "grid", gap: 12 }}>
          {/* P&L Dropdown */}
          <div>
            <button
              onClick={() => setShowPL(!showPL)}
              style={{
                ...resolvedButtonSecondary,
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 700,
                background: colours.bg || "#F8FAFC",
                border: `1px solid ${colours.border || "#E2E8F0"}`,
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              <span>📈 Profit & Loss</span>
              <span style={{ fontSize: 12, color: colours.muted }}>{showPL ? "▲" : "▼"}</span>
            </button>
            {showPL && (
              <div style={{ marginTop: 8, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
                  <thead>
                    <tr style={{ background: colours.bg || "#F8FAFC" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, fontSize: 13, color: colours.muted }}>Line item</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: 13, color: colours.muted }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { line: "Sales / invoice income", amount: safeNumber(totals.totalIncome) },
                      { line: "Less operating expenses", amount: -safeNumber(totals.totalExpenses) },
                      { line: "Operating result", amount: safeNumber(totals.totalIncome) - safeNumber(totals.totalExpenses) },
                      { line: "Less subscription", amount: -safeNumber(totals.monthlySubscriptionCost) },
                      { line: "Net result after subscription", amount: safeNumber(totals.totalIncome) - safeNumber(totals.totalExpenses) - safeNumber(totals.monthlySubscriptionCost) },
                    ].map((row) => (
                      <tr key={row.line}>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${colours.border || "#E2E8F0"}`, fontSize: 14, fontWeight: 600 }}>{row.line}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${colours.border || "#E2E8F0"}`, fontSize: 14, fontWeight: 700, textAlign: "right" }}>{currency(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* GST Position Dropdown */}
          <div>
            <button
              onClick={() => setShowGST(!showGST)}
              style={{
                ...resolvedButtonSecondary,
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 700,
                background: colours.bg || "#F8FAFC",
                border: `1px solid ${colours.border || "#E2E8F0"}`,
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              <span>🧾 GST Position</span>
              <span style={{ fontSize: 12, color: colours.muted }}>{showGST ? "▲" : "▼"}</span>
            </button>
            {showGST && (
              <div style={{ marginTop: 8, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
                  <thead>
                    <tr style={{ background: colours.bg || "#F8FAFC" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, fontSize: 13, color: colours.muted }}>Line item</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: 13, color: colours.muted }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { line: "GST collected on income", amount: safeNumber(totals.gstCollected) },
                      { line: "GST credits on expenses", amount: -safeNumber(totals.gstOnExpenses) },
                      { line: "Net GST position", amount: safeNumber(totals.gstPayable) },
                    ].map((row) => (
                      <tr key={row.line}>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${colours.border || "#E2E8F0"}`, fontSize: 14, fontWeight: 600 }}>{row.line}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${colours.border || "#E2E8F0"}`, fontSize: 14, fontWeight: 700, textAlign: "right" }}>{currency(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cash Movement Dropdown */}
          <div>
            <button
              onClick={() => setShowCashMovement(!showCashMovement)}
              style={{
                ...resolvedButtonSecondary,
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 700,
                background: colours.bg || "#F8FAFC",
                border: `1px solid ${colours.border || "#E2E8F0"}`,
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              <span>💧 Cash Movement</span>
              <span style={{ fontSize: 12, color: colours.muted }}>{showCashMovement ? "▲" : "▼"}</span>
            </button>
            {showCashMovement && (
              <div style={{ marginTop: 8, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
                  <thead>
                    <tr style={{ background: colours.bg || "#F8FAFC" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, fontSize: 13, color: colours.muted }}>Line item</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: 13, color: colours.muted }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { line: "Paid income received", amount: safeNumber(totals.paidIncome) },
                      { line: "Less GST payable", amount: -safeNumber(totals.gstPayable) },
                      { line: "Less estimated tax reserve", amount: -safeNumber(totals.estimatedTax) },
                      { line: "Less fees", amount: -safeNumber(totals.totalFees) },
                      { line: "Less tax withheld", amount: -safeNumber(totals.totalTaxWithheld) },
                      { line: "Less operating expenses", amount: -safeNumber(totals.totalExpenses) },
                      { line: "Less subscription", amount: -safeNumber(totals.monthlySubscriptionCost) },
                      { line: "Safe to spend", amount: safeNumber(totals.safeToSpend) },
                    ].map((row) => (
                      <tr key={row.line}>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${colours.border || "#E2E8F0"}`, fontSize: 14, fontWeight: 600 }}>{row.line}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${colours.border || "#E2E8F0"}`, fontSize: 14, fontWeight: 700, textAlign: "right" }}>{currency(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cash Efficiency Dropdown */}
          <div>
            <button
              onClick={() => setShowCashEfficiency(!showCashEfficiency)}
              style={{
                ...resolvedButtonSecondary,
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 700,
                background: colours.bg || "#F8FAFC",
                border: `1px solid ${colours.border || "#E2E8F0"}`,
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              <span>⚡ Cash Efficiency</span>
              <span style={{ fontSize: 12, color: colours.muted }}>{showCashEfficiency ? "▲" : "▼"}</span>
            </button>
            {showCashEfficiency && (() => {
              const paidIncome = safeNumber(totals.paidIncome);
              const efficiencyRows = [
                { line: "Paid income", amount: paidIncome },
                { line: "Less GST payable", amount: -safeNumber(totals.gstPayable) },
                { line: "Less tax reserve", amount: -safeNumber(totals.estimatedTax) },
                { line: "Less expenses", amount: -safeNumber(totals.totalExpenses) },
                { line: "Less subscription", amount: -safeNumber(totals.monthlySubscriptionCost) },
                { line: "Safe to spend", amount: safeNumber(totals.safeToSpend) },
              ];
              const efficiencyPct = paidIncome > 0 ? ((safeNumber(totals.safeToSpend) / paidIncome) * 100).toFixed(1) : "0.0";
              return (
                <div style={{ marginTop: 8 }}>
                  <div style={{ padding: "10px 12px", background: colours.bg || "#F8FAFC", borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colours.muted }}>Cash efficiency ratio</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: colours.teal || "#006D6D" }}>{efficiencyPct}%</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
                      <thead>
                        <tr style={{ background: colours.bg || "#F8FAFC" }}>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, fontSize: 13, color: colours.muted }}>Line item</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: 13, color: colours.muted }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {efficiencyRows.map((row) => (
                          <tr key={row.line}>
                            <td style={{ padding: "10px 12px", borderBottom: `1px solid ${colours.border || "#E2E8F0"}`, fontSize: 14, fontWeight: 600 }}>{row.line}</td>
                            <td style={{ padding: "10px 12px", borderBottom: `1px solid ${colours.border || "#E2E8F0"}`, fontSize: 14, fontWeight: 700, textAlign: "right" }}>{currency(row.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
          {/* Link to full insights */}
          <button
            onClick={() => setActivePage("financial insights")}
            style={{
              ...resolvedButtonPrimary,
              width: "100%",
              marginTop: 4,
            }}
          >
            View full Financial Insights →
          </button>
        </div>
      </SectionCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        <SectionCard title="Reporting actions" right={<div style={{ fontSize: 12, color: colours.muted }}>Use the same SaaS data everywhere</div>}>
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              <div style={{ ...cardStyle, padding: 16, background: colours.bg }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: colours.muted }}>ATO export</div>
                <div style={{ fontSize: 14, color: colours.text, lineHeight: 1.6, marginTop: 8 }}>Send paid invoice and expense data straight into the tax form page with the current portal records.</div>
                <button style={{ ...resolvedButtonPrimary, marginTop: 14 }} onClick={resolvedExportToATOForm}>Export to ATO Tax Form</button>
              </div>
              <div style={{ ...cardStyle, padding: 16, background: colours.bg }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: colours.muted }}>Supabase sync</div>
                <div style={{ fontSize: 14, color: colours.text, lineHeight: 1.6, marginTop: 8 }}>Your dashboard reflects the same SaaS entities already saved in Supabase: invoices, expenses, clients, services, income sources, and documents.</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                  <button style={resolvedButtonSecondary} onClick={resolvedRestorePortalStateFromSupabase}>Load from Supabase DB</button>
                  <button style={resolvedButtonPrimary} onClick={() => resolvedSaveAllCurrentStateToSupabase()}>Save to Supabase DB</button>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: colours.muted, lineHeight: 1.6 }}>
              Status: {resolvedSupabaseSyncStatus}
            </div>
          </div>
        </SectionCard>

        <ActivityListCard title="Recent activity" rows={resolvedRecentActivityRows} />
      </div>

      <SectionCard title="Paid invoice allocation detail" right={<div style={{ fontSize: 12, color: colours.muted }}>Live from invoices marked Paid</div>}>
        <DataTable
          columns={[
            { key: "invoiceNumber", label: "Invoice" },
            { key: "clientId", label: "Client", render: (_, row) => resolvedGetClientName(row.clientId) },
            { key: "gross", label: "Paid", render: (v) => currency(v) },
            { key: "gst", label: "GST", render: (v) => currency(v) },
            { key: "estimatedTax", label: "Tax", render: (v) => currency(v) },
            { key: "fee", label: "Fee", render: (v) => currency(v) },
            { key: "netAvailable", label: "Net", render: (v) => currency(v) },
          ]}
          rows={invoiceAllocations}
        />
      </SectionCard>
    </div>
      );

}
