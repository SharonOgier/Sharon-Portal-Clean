import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

export default function ProfitDashboardPage(props) {
  const {
    profile = {},
    livestockRecords = [],
    mobCosts = [],
    paddockCosts = [],
    properties = [],
    colours = {},
    cardStyle = {},
    buttonPrimary = {},
    buttonSecondary = {},
    inputStyle = {},
    labelStyle = {},
    currency = (v) => v,
    safeNumber = (v) => Number(v || 0),
    DashboardHero = () => null,
    InsightChip = () => null,
    MetricCard = () => null,
    SectionCard = () => null,
    DataTable = () => null,
    formatDateAU = (v) => v,
  } = props;

  const n = safeNumber;

  // -- Data Processing --
  const paddocks = useMemo(() => {
    const list = [];
    (properties || []).forEach((p) => (p.subLocations || []).forEach((s) => {
      const isPaddock = s?.isPaddock || String(s?.type || "").toLowerCase() === "paddock" || String(s?.name || "").toLowerCase().includes("paddock");
      if (isPaddock) list.push({ id: s.id, name: s.name, propertyName: p.name, size: n(s.sizeHectares) });
    }));
    return list;
  }, [properties]);

  const activeRecords = useMemo(() => livestockRecords.filter(r => !r.archived), [livestockRecords]);

  const mobProfitData = useMemo(() => {
    const mobs = {};
    activeRecords.forEach(r => {
      const mid = r.mobId || r.id;
      if (!mobs[mid]) mobs[mid] = { id: mid, name: r.mobName || "Mob", revenue: 0, costs: 0 };
      if (r.kind === "sale") mobs[mid].revenue += n(r.totalValue);
      if (r.kind === "purchase") mobs[mid].costs += n(r.totalCost);
    });
    mobCosts.forEach(c => {
      if (mobs[c.mobId]) mobs[c.mobId].costs += n(c.amount);
    });
    return Object.values(mobs).map(m => ({ ...m, profit: m.revenue - m.costs }));
  }, [activeRecords, mobCosts]);

  const paddockProfitData = useMemo(() => {
    const paddockStats = {};
    paddocks.forEach(p => {
      paddockStats[p.id] = { ...p, revenue: 0, costs: 0 };
    });

    activeRecords.forEach(r => {
      if (r.kind === "sale" && r.paddockId && paddockStats[r.paddockId]) {
        paddockStats[r.paddockId].revenue += n(r.totalValue);
      }
    });

    paddockCosts.forEach(c => {
      if (paddockStats[c.paddockId]) {
        paddockStats[c.paddockId].costs += n(c.amount);
      }
    });

    return Object.values(paddockStats).map(p => ({
      ...p,
      profit: p.revenue - p.costs,
      profitPerHa: p.size > 0 ? (p.revenue - p.costs) / p.size : 0
    }));
  }, [paddocks, activeRecords, paddockCosts]);

  const costBreakdown = useMemo(() => {
    const catMap = {};
    paddockCosts.forEach(c => {
      const cat = c.category || "other";
      catMap[cat] = (catMap[cat] || 0) + n(c.amount);
    });
    mobCosts.forEach(c => {
      const cat = c.category || "other";
      catMap[cat] = (catMap[cat] || 0) + n(c.amount);
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [paddockCosts, mobCosts]);

  const totalRevenue = mobProfitData.reduce((s, m) => s + m.revenue, 0);
  const livestockPurchaseCosts = activeRecords.reduce((s, r) => s + (r.kind === "purchase" ? n(r.totalCost) : 0), 0);
  const totalCosts = mobCosts.reduce((s, c) => s + n(c.amount), 0) + paddockCosts.reduce((s, c) => s + n(c.amount), 0) + livestockPurchaseCosts;
  const totalProfit = totalRevenue - totalCosts;

  const PIE_COLORS = [colours.teal, colours.purple, colours.navy, "#F59E0B", "#EC4899", "#10B981"];

  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #14202B; }
            h1 { color: #6A1B9A; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #E2E8F0; padding: 12px; text-align: left; }
            th { background: #F8FAFC; }
            .metric { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Farm Profitability Report</h1>
          <div class="metric">Total Profit: ${currency(totalProfit)}</div>

          <h2>Mob Profitability</h2>
          <table>
            <thead>
              <tr><th>Mob</th><th>Revenue</th><th>Costs</th><th>Profit</th></tr>
            </thead>
            <tbody>
              ${mobProfitData.map(m => `
                <tr>
                  <td>${m.name}</td>
                  <td>${currency(m.revenue)}</td>
                  <td>${currency(m.costs)}</td>
                  <td>${currency(m.profit)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <h2>Paddock Profitability</h2>
          <table>
            <thead>
              <tr><th>Paddock</th><th>Size (ha)</th><th>Revenue</th><th>Costs</th><th>Profit</th><th>Profit/ha</th></tr>
            </thead>
            <tbody>
              ${paddockProfitData.map(p => `
                <tr>
                  <td>${p.name}</td>
                  <td>${p.size}</td>
                  <td>${currency(p.revenue)}</td>
                  <td>${currency(p.costs)}</td>
                  <td>${currency(p.profit)}</td>
                  <td>${currency(p.profitPerHa)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero
        title="Profit Dashboard"
        subtitle="Track profitability per mob and paddock. Analysis based on recorded sales and associated costs."
        highlight={currency(totalProfit)}
      >
        <InsightChip label="Total Revenue" value={currency(totalRevenue)} />
        <InsightChip label="Total Costs" value={currency(totalCosts)} />
        <InsightChip label="Net Profit" value={currency(totalProfit)} />
      </DashboardHero>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <MetricCard title="Total Revenue" value={currency(totalRevenue)} accent={colours.teal} />
        <MetricCard title="Total Costs" value={currency(totalCosts)} accent={colours.purple} />
        <MetricCard title="Net Profit" value={currency(totalProfit)} accent={colours.navy} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 }}>
        <SectionCard title="Cost Breakdown">
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={costBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => entry.name}
                >
                  {costBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => currency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Profit Summary" right={<button style={buttonSecondary} onClick={exportPdf}>Export PDF</button>}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...cardStyle, padding: 16, background: colours.bg }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Average Profit per Ha</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: colours.teal }}>
                {currency(paddockProfitData.reduce((s, p) => s + p.profitPerHa, 0) / (paddockProfitData.length || 1))}
              </div>
            </div>
            <div style={{ ...cardStyle, padding: 16, background: colours.bg }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Most Profitable Mob</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                {mobProfitData.sort((a, b) => b.profit - a.profit)[0]?.name || "N/A"}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Profit per Mob">
        <DataTable
          columns={[
            { key: "name", label: "Mob" },
            { key: "revenue", label: "Revenue", render: (v) => currency(v) },
            { key: "costs", label: "Costs", render: (v) => currency(v) },
            { key: "profit", label: "Profit", render: (v) => <span style={{ fontWeight: 800, color: v >= 0 ? colours.teal : "#B91C1C" }}>{currency(v)}</span> },
          ]}
          rows={mobProfitData}
          emptyState={{ icon: "🐄", title: "No mob data", message: "Record sales and costs to see mob profitability." }}
        />
      </SectionCard>

      <SectionCard title="Profit per Paddock">
        <DataTable
          columns={[
            { key: "name", label: "Paddock" },
            { key: "size", label: "Size (ha)" },
            { key: "revenue", label: "Revenue", render: (v) => currency(v) },
            { key: "costs", label: "Costs", render: (v) => currency(v) },
            { key: "profit", label: "Profit", render: (v) => currency(v) },
            { key: "profitPerHa", label: "Profit/ha", render: (v) => <span style={{ fontWeight: 800, color: v >= 0 ? colours.teal : "#B91C1C" }}>{currency(v)}</span> },
          ]}
          rows={paddockProfitData}
          emptyState={{ icon: "🌱", title: "No paddock data", message: "Record sales (linked to paddocks) and paddock costs." }}
        />
      </SectionCard>
    </div>
  );
}
