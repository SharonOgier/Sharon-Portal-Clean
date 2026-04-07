import React, { useMemo } from "react";

// 2025-26 ATO individual tax brackets
const TAX_BRACKETS = [
  { min: 0,       max: 18200,   rate: 0,    base: 0 },
  { min: 18201,   max: 45000,   rate: 0.16, base: 0 },
  { min: 45001,   max: 135000,  rate: 0.30, base: 4288 },
  { min: 135001,  max: 190000,  rate: 0.37, base: 31288 },
  { min: 190001,  max: Infinity,rate: 0.45, base: 51638 },
];

const MEDICARE_RATE = 0.02;

function calcTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    const b = TAX_BRACKETS[i];
    if (taxableIncome >= b.min) {
      return b.base + (taxableIncome - b.min + (i === 0 ? 0 : 1)) * b.rate;
    }
  }
  return 0;
}

function calcTaxFixed(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    const b = TAX_BRACKETS[i];
    if (taxableIncome >= b.min) {
      return b.base + (taxableIncome - (b.min - 1 < 0 ? 0 : b.min - 1)) * b.rate;
    }
  }
  return 0;
}

function getBracketBreakdown(taxableIncome) {
  if (taxableIncome <= 0) return [];
  const rows = [];
  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    const b = TAX_BRACKETS[i];
    if (taxableIncome < b.min) break;
    const upper = Math.min(taxableIncome, b.max);
    const lower = b.min === 0 ? 0 : b.min - 1;
    const taxable = upper - lower;
    const tax = taxable * b.rate;
    rows.push({
      range: b.max === Infinity ? `$${b.min.toLocaleString()}+` : `$${b.min.toLocaleString()} – $${b.max.toLocaleString()}`,
      rate: `${(b.rate * 100).toFixed(0)}%`,
      taxable,
      tax,
    });
  }
  return rows;
}

export default function TaxEstimatorPage(props) {
  const {
    profile = {},
    invoices = [],
    expenses = [],
    assets = [],
    incomeSources = [],
    colours,
    cardStyle,
    buttonPrimary,
    buttonSecondary,
    inputStyle,
    labelStyle,
    currency,
    formatDateAU,
    safeNumber,
    DashboardHero,
    InsightChip,
    MetricCard,
    SectionCard,
    setActivePage,
  } = props;

  // ---------- Gross income ----------
  const paidInvoices = invoices.filter(i => (i.status || "").toLowerCase() === "paid");
  const grossInvoiceIncome = paidInvoices.reduce((s, i) => s + safeNumber(i.total) - safeNumber(i.gst), 0);

  const grossIncomeSourceAmt = incomeSources.reduce((s, src) => s + safeNumber(src.gross || src.amount), 0);
  const totalGrossIncome = grossInvoiceIncome + grossIncomeSourceAmt;

  // ---------- Deductions ----------
  const paidExpenses = expenses.filter(e => (e.status || "").toLowerCase() === "paid");
  const totalExpenseDeductions = paidExpenses.reduce((s, e) => {
    const amt = safeNumber(e.amount);
    const hasGst = (e.gstIncluded || "").toLowerCase() === "yes";
    return s + (hasGst ? amt - amt / 11 : amt);
  }, 0);

  // Asset depreciation
  const calcAssetDep = (a) => {
    const price = safeNumber(a.purchasePrice);
    const life = safeNumber(a.effectiveLife);
    const method = (a.depreciationMethod || "").toLowerCase();
    if (method.includes("instant") || method.includes("write")) return price;
    if (method.includes("prime") || method.includes("straight")) return life > 0 ? price / life : 0;
    if (method.includes("diminish")) return life > 0 ? price * (2 / life) : 0;
    return 0;
  };
  const totalDepreciation = assets.reduce((s, a) => s + calcAssetDep(a), 0);
  const totalDeductions = totalExpenseDeductions + totalDepreciation;

  // ---------- Tax withheld ----------
  const totalWithheld = incomeSources.reduce((s, src) => s + safeNumber(src.taxWithheld), 0);

  // ---------- Taxable income ----------
  const taxableIncome = Math.max(0, totalGrossIncome - totalDeductions);

  // ---------- Tax & Medicare ----------
  const incomeTax = calcTaxFixed(taxableIncome);
  const medicareLevy = taxableIncome * MEDICARE_RATE;
  const totalTaxLiability = incomeTax + medicareLevy;
  const netAfterTax = totalGrossIncome - totalTaxLiability;
  const effectiveRate = totalGrossIncome > 0 ? (totalTaxLiability / totalGrossIncome) * 100 : 0;
  const refundOwing = totalWithheld - totalTaxLiability;

  // ---------- Bracket breakdown ----------
  const brackets = useMemo(() => getBracketBreakdown(taxableIncome), [taxableIncome]);

  // ---------- Quarterly projections ----------
  const quarterlyTax = totalTaxLiability / 4;
  const quarterlyIncome = totalGrossIncome / 4;
  const quarterlyNet = netAfterTax / 4;
  const quarters = [
    { label: "Q1 (Jul–Sep)", income: quarterlyIncome, tax: quarterlyTax, net: quarterlyNet },
    { label: "Q2 (Oct–Dec)", income: quarterlyIncome, tax: quarterlyTax, net: quarterlyNet },
    { label: "Q3 (Jan–Mar)", income: quarterlyIncome, tax: quarterlyTax, net: quarterlyNet },
    { label: "Q4 (Apr–Jun)", income: quarterlyIncome, tax: quarterlyTax, net: quarterlyNet },
  ];

  // ---------- Visual bar for brackets ----------
  const maxTaxable = taxableIncome || 1;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero
        title="Tax Estimator"
        subtitle="Real-time estimate of your annual income tax liability based on current ATO 2025–26 tax brackets."
        highlight={currency(totalTaxLiability)}
      >
        <InsightChip label="Taxable income" value={currency(taxableIncome)} />
        <InsightChip label="Effective rate" value={`${effectiveRate.toFixed(1)}%`} />
        <InsightChip label={refundOwing >= 0 ? "Refund estimate" : "Owing estimate"} value={currency(Math.abs(refundOwing))} />
      </DashboardHero>

      {/* Key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <MetricCard title="Gross income" value={currency(totalGrossIncome)} subtitle="Paid invoices + income sources (ex-GST)." accent={colours.teal} />
        <MetricCard title="Total deductions" value={currency(totalDeductions)} subtitle={`Expenses $${totalExpenseDeductions.toFixed(0)} + Depreciation $${totalDepreciation.toFixed(0)}`} accent={colours.purple} />
        <MetricCard title="Taxable income" value={currency(taxableIncome)} subtitle="Gross income less deductions." accent={colours.teal} />
        <MetricCard title="Income tax" value={currency(incomeTax)} subtitle="ATO 2025-26 individual rates." accent={colours.purple} />
        <MetricCard title="Medicare levy" value={currency(medicareLevy)} subtitle={`${(MEDICARE_RATE * 100).toFixed(0)}% of taxable income.`} accent={colours.teal} />
        <MetricCard title="Total tax liability" value={currency(totalTaxLiability)} subtitle="Income tax + Medicare levy." accent={colours.purple} />
      </div>

      {/* Tax bracket breakdown */}
      <SectionCard title="Tax Bracket Breakdown — 2025–26">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colours.border}` }}>
                {["Bracket", "Rate", "Taxable portion", "Tax on bracket"].map(h => (
                  <th key={h} style={{ textAlign: h === "Bracket" ? "left" : "right", padding: "10px 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: colours.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brackets.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: colours.muted }}>No taxable income to break down.</td></tr>
              )}
              {brackets.map((b, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colours.border}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: colours.text }}>{b.range}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: colours.muted }}>{b.rate}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: colours.text }}>{currency(b.taxable)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: colours.purple }}>{currency(b.tax)}</td>
                </tr>
              ))}
              {brackets.length > 0 && (
                <tr style={{ borderTop: `2px solid ${colours.purple}` }}>
                  <td colSpan={3} style={{ padding: "10px 12px", fontWeight: 800, color: colours.text }}>Total income tax</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: 16, color: colours.purple }}>{currency(incomeTax)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Visual bracket bars */}
        {brackets.length > 0 && (
          <div style={{ marginTop: 20, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: colours.muted, marginBottom: 4 }}>Visual breakdown</div>
            {brackets.map((b, i) => {
              const pct = Math.max(2, (b.taxable / maxTaxable) * 100);
              const barColors = [colours.teal, colours.purple, "#6366F1", "#F59E0B", "#EF4444"];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 100, fontSize: 11, fontWeight: 700, color: colours.muted, flexShrink: 0 }}>{b.rate}</div>
                  <div style={{ flex: 1, height: 24, background: `${colours.border}44`, borderRadius: 6, overflow: "hidden", position: "relative" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: barColors[i % barColors.length], borderRadius: 6, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ width: 100, fontSize: 12, fontWeight: 700, color: colours.text, textAlign: "right" }}>{currency(b.tax)}</div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* PAYG / Refund summary */}
      <SectionCard title="PAYG Withholding & Refund Estimate">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div style={{ ...cardStyle, padding: 16, background: colours.bg }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: colours.muted, marginBottom: 6 }}>Tax withheld (PAYG)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: colours.text }}>{currency(totalWithheld)}</div>
            <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>From income sources entered in the ATO Tax Form.</div>
          </div>
          <div style={{ ...cardStyle, padding: 16, background: colours.bg }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: colours.muted, marginBottom: 6 }}>Total tax liability</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: colours.text }}>{currency(totalTaxLiability)}</div>
            <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>Income tax + Medicare levy for 2025-26.</div>
          </div>
          <div style={{
            ...cardStyle, padding: 16,
            background: refundOwing >= 0 ? "#F0FDF4" : "#FEF2F2",
            border: `1px solid ${refundOwing >= 0 ? "#BBF7D0" : "#FECACA"}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: refundOwing >= 0 ? "#166534" : "#991B1B", marginBottom: 6 }}>
              {refundOwing >= 0 ? "Estimated refund" : "Estimated amount owing"}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: refundOwing >= 0 ? "#166534" : "#991B1B" }}>{currency(Math.abs(refundOwing))}</div>
            <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>
              {refundOwing >= 0 ? "You may receive a refund from the ATO." : "You may owe additional tax to the ATO."}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Quarterly projections */}
      <SectionCard title="Quarterly Projections">
        <div style={{ fontSize: 13, color: colours.muted, marginBottom: 16 }}>
          Estimated quarterly breakdown assuming even distribution of income across the financial year.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colours.border}` }}>
                {["Quarter", "Gross income", "Tax payable", "Net after tax"].map(h => (
                  <th key={h} style={{ textAlign: h === "Quarter" ? "left" : "right", padding: "10px 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: colours.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quarters.map((q, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colours.border}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: colours.text }}>{q.label}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: colours.text }}>{currency(q.income)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: colours.purple, fontWeight: 600 }}>{currency(q.tax)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: colours.teal }}>{currency(q.net)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: `2px solid ${colours.purple}` }}>
                <td style={{ padding: "10px 12px", fontWeight: 800, color: colours.text }}>Annual total</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: colours.text }}>{currency(totalGrossIncome)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: colours.purple }}>{currency(totalTaxLiability)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: colours.teal }}>{currency(netAfterTax)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Income composition */}
      <SectionCard title="Income Composition">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div style={{ ...cardStyle, padding: 16, background: colours.bg }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: colours.teal, marginBottom: 6 }}>Invoiced income</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colours.text }}>{currency(grossInvoiceIncome)}</div>
            <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>{paidInvoices.length} paid invoice{paidInvoices.length !== 1 ? "s" : ""} (ex-GST)</div>
          </div>
          <div style={{ ...cardStyle, padding: 16, background: colours.bg }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: colours.purple, marginBottom: 6 }}>Other income</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colours.text }}>{currency(grossIncomeSourceAmt)}</div>
            <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>{incomeSources.length} income source{incomeSources.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ ...cardStyle, padding: 16, background: colours.bg }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: colours.muted, marginBottom: 6 }}>Effective tax rate</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colours.text }}>{effectiveRate.toFixed(1)}%</div>
            <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>Total tax ÷ gross income</div>
          </div>
        </div>
      </SectionCard>

      <div style={{ fontSize: 12, color: colours.muted, padding: "8px 0", lineHeight: 1.6, opacity: 0.7 }}>
        ⚠ This is an indicative estimate only, based on ATO 2025–26 individual tax rates. It does not account for offsets, rebates, private health insurance, HECS/HELP, or other adjustments. Consult a registered tax agent for accurate advice.
      </div>
    </div>
  );
}
