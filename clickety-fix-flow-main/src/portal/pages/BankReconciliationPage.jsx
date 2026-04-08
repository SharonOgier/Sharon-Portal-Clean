import React, { useState, useMemo, useCallback } from "react";

// CSV parser — handles quoted fields, commas inside quotes, etc.
function parseCSV(text) {
  const lines = [];
  let current = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { current.push(field.trim()); field = ""; }
      else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        current.push(field.trim()); field = "";
        if (current.some(c => c)) lines.push(current);
        current = [];
        if (ch === "\r") i++;
      } else field += ch;
    }
  }
  current.push(field.trim());
  if (current.some(c => c)) lines.push(current);
  return lines;
}

function detectColumns(headers) {
  const lower = headers.map(h => h.toLowerCase());
  let dateCol = lower.findIndex(h => h.includes("date"));
  let descCol = lower.findIndex(h => h.includes("desc") || h.includes("narration") || h.includes("memo") || h.includes("particular") || h.includes("reference"));
  let amountCol = lower.findIndex(h => h.includes("amount") && !h.includes("debit") && !h.includes("credit"));
  let debitCol = lower.findIndex(h => h.includes("debit") || h.includes("withdrawal"));
  let creditCol = lower.findIndex(h => h.includes("credit") || h.includes("deposit"));
  if (dateCol < 0) dateCol = 0;
  if (descCol < 0) descCol = Math.min(1, headers.length - 1);
  return { dateCol, descCol, amountCol, debitCol, creditCol };
}

function parseAmount(val) {
  if (!val) return 0;
  const clean = String(val).replace(/[$,\s]/g, "").replace(/[()]/g, m => m === "(" ? "-" : "");
  return parseFloat(clean) || 0;
}

function parseDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  // Try DD/MM/YYYY (AU format)
  const auMatch = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (auMatch) {
    const y = auMatch[3].length === 2 ? "20" + auMatch[3] : auMatch[3];
    return new Date(+y, +auMatch[2] - 1, +auMatch[1]);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function matchScore(txn, record, type) {
  let score = 0;
  const txnAmt = Math.abs(txn.amount);
  const recAmt = Math.abs(record.amount);
  if (Math.abs(txnAmt - recAmt) < 0.01) score += 50;
  else if (Math.abs(txnAmt - recAmt) < 1) score += 30;
  if (txn.date && record.date) {
    const diff = Math.abs(txn.date.getTime() - record.date.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1) score += 30;
    else if (diff <= 3) score += 20;
    else if (diff <= 7) score += 10;
  }
  const descLower = txn.description.toLowerCase();
  const recName = (record.name || record.client || "").toLowerCase();
  if (recName && descLower.includes(recName.split(" ")[0])) score += 20;
  return score;
}

export default function BankReconciliationPage(props) {
  const {
    invoices = [], expenses = [], clients = [],
    colours, cardStyle, buttonPrimary, buttonSecondary, inputStyle, labelStyle,
    currency, formatDateAU, safeNumber, DashboardHero, SectionCard, DataTable, EmptyState,
  } = props;

  const [csvData, setCsvData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [matches, setMatches] = useState({});
  const [reconciledIds, setReconciledIds] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState("all");
  const [step, setStep] = useState("upload");

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const rows = parseCSV(text);
      if (rows.length < 2) return;
      const headers = rows[0];
      const cols = detectColumns(headers);
      const txns = rows.slice(1).map((row, idx) => {
        let amount = 0;
        if (cols.amountCol >= 0) {
          amount = parseAmount(row[cols.amountCol]);
        } else {
          const debit = parseAmount(row[cols.debitCol]);
          const credit = parseAmount(row[cols.creditCol]);
          amount = credit ? credit : debit ? -debit : 0;
        }
        return {
          id: `txn-${idx}`,
          date: parseDate(row[cols.dateCol]),
          description: row[cols.descCol] || "",
          amount,
          raw: row,
        };
      }).filter(t => t.amount !== 0);
      setTransactions(txns);
      autoMatch(txns);
      setStep("review");
    };
    reader.readAsText(file);
  }, [invoices, expenses]);

  const autoMatch = useCallback((txns) => {
    const newMatches = {};
    const paidInvoices = invoices.filter(inv => inv.status === "Paid").map(inv => ({
      id: inv.invoiceNumber || inv.id,
      type: "invoice",
      amount: safeNumber(inv.total),
      date: parseDate(inv.datePaid || inv.dueDate || inv.date),
      name: inv.clientName || "",
      client: inv.clientName || "",
      ref: inv,
    }));
    const paidExpenses = expenses.filter(exp => exp.status === "Paid" || exp.paid).map(exp => ({
      id: exp.id || exp.expenseNumber,
      type: "expense",
      amount: -Math.abs(safeNumber(exp.amount)),
      date: parseDate(exp.date),
      name: exp.supplier || exp.description || "",
      ref: exp,
    }));
    const allRecords = [...paidInvoices, ...paidExpenses];
    const usedRecordIds = new Set();

    txns.forEach(txn => {
      let bestMatch = null;
      let bestScore = 0;
      allRecords.forEach(rec => {
        if (usedRecordIds.has(`${rec.type}-${rec.id}`)) return;
        const score = matchScore(txn, rec, rec.type);
        if (score > bestScore && score >= 50) {
          bestScore = score;
          bestMatch = { ...rec, score };
        }
      });
      if (bestMatch) {
        newMatches[txn.id] = bestMatch;
        usedRecordIds.add(`${bestMatch.type}-${bestMatch.id}`);
      }
    });
    setMatches(newMatches);
  }, [invoices, expenses, safeNumber]);

  const toggleReconciled = useCallback((txnId) => {
    setReconciledIds(prev => {
      const next = new Set(prev);
      if (next.has(txnId)) next.delete(txnId);
      else next.add(txnId);
      return next;
    });
  }, []);

  const reconcileAll = useCallback(() => {
    const matched = transactions.filter(t => matches[t.id]).map(t => t.id);
    setReconciledIds(new Set(matched));
  }, [transactions, matches]);

  const filteredTxns = useMemo(() => {
    return transactions.filter(txn => {
      if (filterStatus === "matched") return !!matches[txn.id] && !reconciledIds.has(txn.id);
      if (filterStatus === "unmatched") return !matches[txn.id] && !reconciledIds.has(txn.id);
      if (filterStatus === "reconciled") return reconciledIds.has(txn.id);
      return true;
    });
  }, [transactions, matches, reconciledIds, filterStatus]);

  const stats = useMemo(() => {
    const total = transactions.length;
    const matched = transactions.filter(t => matches[t.id]).length;
    const reconciled = reconciledIds.size;
    const unmatched = total - matched;
    return { total, matched, reconciled, unmatched };
  }, [transactions, matches, reconciledIds]);

  const fmtDate = (d) => d ? formatDateAU(d.toISOString().slice(0, 10)) : "—";

  if (step === "upload") {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <DashboardHero title="Bank Reconciliation" subtitle="Upload your bank statement CSV to match transactions against your invoices and expenses." />
        <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏦</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Upload Bank Statement</h3>
          <p style={{ color: colours.muted, marginBottom: 20, maxWidth: 480, margin: "0 auto 20px" }}>
            Upload a CSV file from your bank. We'll automatically detect columns and match transactions against your paid invoices and expenses.
          </p>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: colours.muted, marginBottom: 12 }}>Supported formats: CSV files from any Australian bank (CommBank, ANZ, NAB, Westpac, etc.)</p>
          </div>
          <label style={{ ...buttonPrimary, display: "inline-block", cursor: "pointer", padding: "12px 32px" }}>
            📂 Select CSV File
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero title="Bank Reconciliation" subtitle={`${stats.total} transactions loaded • ${stats.matched} matched • ${stats.reconciled} reconciled`}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={buttonSecondary} onClick={() => { setStep("upload"); setTransactions([]); setMatches({}); setReconciledIds(new Set()); }}>↩ New Upload</button>
          {stats.matched > 0 && <button style={buttonPrimary} onClick={reconcileAll}>✓ Reconcile All Matched</button>}
        </div>
      </DashboardHero>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        {[
          { label: "Total", value: stats.total, color: colours.navy },
          { label: "Auto-Matched", value: stats.matched, color: colours.teal },
          { label: "Reconciled", value: stats.reconciled, color: colours.successText },
          { label: "Unmatched", value: stats.unmatched, color: "#DC2626" },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: colours.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[
          { key: "all", label: "All" },
          { key: "matched", label: `Matched (${stats.matched})` },
          { key: "unmatched", label: `Unmatched (${stats.unmatched})` },
          { key: "reconciled", label: `Reconciled (${stats.reconciled})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: `1px solid ${colours.border}`,
              background: filterStatus === f.key ? colours.purple : colours.white,
              color: filterStatus === f.key ? "#fff" : colours.text,
              fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Transactions list */}
      <div style={cardStyle}>
        {filteredTxns.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: colours.muted }}>
            No transactions in this view.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colours.border}`, textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Date</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Description</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Match</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.map(txn => {
                  const match = matches[txn.id];
                  const isReconciled = reconciledIds.has(txn.id);
                  return (
                    <tr key={txn.id} style={{
                      borderBottom: `1px solid ${colours.border}`,
                      background: isReconciled ? "#F0FDF4" : match ? "#FEFCE8" : "transparent",
                    }}>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{fmtDate(txn.date)}</td>
                      <td style={{ padding: "10px 12px", maxWidth: 300 }}>
                        <div style={{ fontWeight: 600 }}>{txn.description.slice(0, 60)}</div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: txn.amount >= 0 ? colours.successText : "#DC2626" }}>
                        {currency(txn.amount)}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {match ? (
                          <div>
                            <span style={{
                              display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                              background: match.type === "invoice" ? colours.lightPurple : colours.lightTeal,
                              color: match.type === "invoice" ? colours.purple : colours.teal,
                            }}>
                              {match.type === "invoice" ? "Invoice" : "Expense"} #{match.id}
                            </span>
                            <div style={{ fontSize: 11, color: colours.muted, marginTop: 2 }}>
                              {match.name} • {match.score}% confidence
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: colours.muted, fontSize: 12 }}>No match found</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        {isReconciled ? (
                          <button onClick={() => toggleReconciled(txn.id)} style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            ✓ Reconciled
                          </button>
                        ) : match ? (
                          <button onClick={() => toggleReconciled(txn.id)} style={{ ...buttonSecondary, padding: "4px 12px", fontSize: 11 }}>
                            Reconcile
                          </button>
                        ) : (
                          <span style={{ color: colours.muted, fontSize: 11 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
