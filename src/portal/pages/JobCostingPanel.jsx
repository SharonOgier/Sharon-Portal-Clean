import React, { useMemo, useState } from "react";
import { supabase } from "../client";

const COST_TABS = ["Labour", "Materials", "Subcontractor", "Misc"];
const SUB_PAY_STATUS = ["Unpaid", "Partial", "Paid"];

const blankLabour = () => ({ id: Date.now(), name: "", hours: "", rate: "", total: 0 });
const blankMaterial = () => ({ id: Date.now(), name: "", qty: 1, unitCost: "", total: 0, itemCode: "", unit: "each", buyPrice: "", sellPrice: "", gstApplicable: true });
const blankSubcontractor = () => ({ id: Date.now(), name: "", amount: "", invoiceRef: "", paymentStatus: "Unpaid", paidAmount: "", pending: false });
const blankMisc = () => ({ id: Date.now(), description: "", amount: "" });

const safe = (v) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

export function computeJobFinancials(job) {
  const costs = job?.costs || {};
  const labour = (costs.labour || []).reduce((s, l) => s + safe(l.hours) * safe(l.rate), 0);
  const materials = (costs.materials || []).reduce((s, m) => s + safe(m.qty) * safe(m.unitCost), 0);
  const subcontractor = (costs.subcontractor || []).reduce((s, sc) => s + safe(sc.amount), 0);
  const misc = (costs.misc || []).reduce((s, m) => s + safe(m.amount), 0);
  const totalCost = labour + materials + subcontractor + misc;
  const quotedTotal = safe(job?.quotedTotal);
  const grossMargin = quotedTotal - totalCost;
  const grossMarginPct = quotedTotal > 0 ? (grossMargin / quotedTotal) * 100 : 0;
  const subUnpaid = (costs.subcontractor || []).filter((s) => s.paymentStatus !== "Paid").reduce((s, sc) => s + safe(sc.amount) - safe(sc.paidAmount), 0);
  const subPaid = (costs.subcontractor || []).filter((s) => s.paymentStatus === "Paid").reduce((s, sc) => s + safe(sc.amount), 0);
  return { labour, materials, subcontractor, misc, totalCost, quotedTotal, grossMargin, grossMarginPct, subUnpaid, subPaid };
}

export default function JobCostingPanel({
  job,
  onUpdate,
  colours,
  cardStyle,
  inputStyle,
  labelStyle,
  buttonPrimary,
  buttonSecondary,
  currency,
  quotes = [],
  invoices = [],
  supplierPriceLists = [],
  authUser,
}) {
  const [tab, setTab] = useState("Labour");
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const costs = job?.costs || { labour: [], materials: [], subcontractor: [], misc: [] };

  const updateCosts = (key, items) => {
    onUpdate({ ...job, costs: { ...costs, [key]: items } });
  };

  const fin = useMemo(() => computeJobFinancials(job), [job]);
  const marginColor = fin.grossMarginPct >= 30 ? "#2E7D32" : fin.grossMarginPct >= 15 ? "#E65100" : "#C62828";

  const searchableSupplierItems = useMemo(() => {
    const flattened = (Array.isArray(supplierPriceLists) ? supplierPriceLists : []).flatMap((list) =>
      (Array.isArray(list?.items) ? list.items : [])
        .filter((item) => item?.isActive !== false)
        .map((item) => ({
          supplierName: list?.supplierName || "",
          name: String(item?.name || item?.itemName || "").trim(),
          itemCode: String(item?.itemCode || "").trim(),
          unit: String(item?.unit || "each").trim() || "each",
          buyPrice: Number(item?.buyPrice ?? 0) || 0,
          sellPrice: Number(item?.sellPrice ?? 0) || 0,
          gstApplicable: Boolean(item?.gstApplicable),
        }))
    ).filter((item) => item.name);

    const term = String(itemSearchTerm || "").toLowerCase().trim();
    if (!term) return flattened.slice(0, 100);

    return flattened
      .filter((item) =>
        item.name.toLowerCase().includes(term) ||
        item.itemCode.toLowerCase().includes(term) ||
        item.supplierName.toLowerCase().includes(term)
      )
      .slice(0, 100);
  }, [supplierPriceLists, itemSearchTerm]);

  const addMaterialFromSupplierItem = (item) => {
    const nextMaterials = [
      ...(costs.materials || []),
      {
        id: Date.now() + Math.random(),
        name: item.name,
        itemCode: item.itemCode || "",
        unit: item.unit || "each",
        qty: 1,
        buyPrice: item.buyPrice ?? 0,
        sellPrice: item.sellPrice ?? 0,
        gstApplicable: Boolean(item.gstApplicable),
        unitCost: item.buyPrice ?? 0,
      },
    ];
    updateCosts("materials", nextMaterials);
    setShowItemSearch(false);
    setItemSearchTerm("");
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ ...cardStyle, padding: 16, background: "#F8FAFC" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: colours.muted, textTransform: "uppercase", marginBottom: 12 }}>Job Financial Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 700, color: colours.muted }}>Quoted</div><div style={{ fontSize: 20, fontWeight: 900, color: colours.purple }}>{currency(fin.quotedTotal)}</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 700, color: colours.muted }}>Total Cost</div><div style={{ fontSize: 20, fontWeight: 900, color: "#1565C0" }}>{currency(fin.totalCost)}</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 700, color: colours.muted }}>Margin $</div><div style={{ fontSize: 20, fontWeight: 900, color: marginColor }}>{currency(fin.grossMargin)}</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 700, color: colours.muted }}>Margin %</div><div style={{ fontSize: 20, fontWeight: 900, color: marginColor }}>{fin.grossMarginPct.toFixed(1)}%</div></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Linked Quote</label>
          <select style={inputStyle} value={job?.quoteId || ""} onChange={(e) => {
            const q = quotes.find((x) => String(x.id) === e.target.value);
            onUpdate({ ...job, quoteId: e.target.value, quotedTotal: q ? safe(q.total) : job.quotedTotal || 0 });
          }}>
            <option value="">- none -</option>
            {quotes.map((q) => <option key={q.id} value={q.id}>#{q.quoteNumber || q.id} - {currency(safe(q.total))}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Quoted Total (manual)</label>
          <input type="number" step="0.01" style={inputStyle} value={job?.quotedTotal || ""} onChange={(e) => onUpdate({ ...job, quotedTotal: e.target.value })} placeholder="Or enter manually" />
        </div>
      </div>

      <div>
        <div style={{ display: "flex", gap: 2, background: "#F1F5F9", borderRadius: 10, padding: 3, marginBottom: 12 }}>
          {COST_TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: tab === t ? colours.purple : "transparent", color: tab === t ? "#fff" : colours.muted }}>{t}</button>
          ))}
        </div>

        {tab === "Labour" && (
          <div style={{ display: "grid", gap: 8 }}>
            {(costs.labour || []).map((item, idx) => (
              <div key={item.id} style={{ ...cardStyle, padding: 12, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 30px", gap: 8, alignItems: "end" }}>
                <div><label style={{ ...labelStyle, fontSize: 10 }}>Staff/Role</label><input style={{ ...inputStyle, fontSize: 12 }} value={item.name} onChange={(e) => { const arr = [...costs.labour]; arr[idx] = { ...item, name: e.target.value }; updateCosts("labour", arr); }} placeholder="e.g. John - Labourer" /></div>
                <div><label style={{ ...labelStyle, fontSize: 10 }}>Hours</label><input type="number" min="0" step="0.5" style={{ ...inputStyle, fontSize: 12 }} value={item.hours} onChange={(e) => { const arr = [...costs.labour]; arr[idx] = { ...item, hours: e.target.value }; updateCosts("labour", arr); }} /></div>
                <div><label style={{ ...labelStyle, fontSize: 10 }}>Rate $/hr</label><input type="number" min="0" step="0.01" style={{ ...inputStyle, fontSize: 12 }} value={item.rate} onChange={(e) => { const arr = [...costs.labour]; arr[idx] = { ...item, rate: e.target.value }; updateCosts("labour", arr); }} /></div>
                <div style={{ fontWeight: 700, fontSize: 13, color: colours.text, paddingBottom: 8 }}>{currency(safe(item.hours) * safe(item.rate))}</div>
                <button onClick={() => updateCosts("labour", costs.labour.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: "#C62828", fontSize: 16 }}>x</button>
              </div>
            ))}
            <button style={{ ...buttonSecondary, fontSize: 12 }} onClick={() => updateCosts("labour", [...(costs.labour || []), blankLabour()])}>+ Add Labour</button>
          </div>
        )}

        {tab === "Materials" && (
          <div style={{ display: "grid", gap: 8 }}>
            {showItemSearch && (
              <div style={{ ...cardStyle, padding: 12, background: "#E0F2F1", display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: colours.teal }}>Search Supplier Items</div>
                  <button style={{ ...buttonSecondary, fontSize: 11, padding: "6px 10px" }} onClick={() => setShowItemSearch(false)}>Close</button>
                </div>
                <input style={{ ...inputStyle, fontSize: 12 }} value={itemSearchTerm} onChange={(e) => setItemSearchTerm(e.target.value)} placeholder="Type item name, code, or supplier" />
                <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #CFE8E8", borderRadius: 8, background: "#fff" }}>
                  {searchableSupplierItems.map((item, idx) => (
                    <button key={`${item.supplierName}-${item.itemCode || item.name}-${idx}`} onClick={() => addMaterialFromSupplierItem(item)} style={{ width: "100%", border: "none", borderBottom: "1px solid #E2E8F0", background: "transparent", cursor: "pointer", padding: "10px 12px", textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: colours.text }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: colours.muted, marginTop: 4 }}>
                        {item.itemCode ? `${item.itemCode} | ` : ""}{item.supplierName} | {item.unit || "each"} | Buy {currency(item.buyPrice)} | Sell {currency(item.sellPrice)} | {item.gstApplicable ? "GST" : "GST Free"}
                      </div>
                    </button>
                  ))}
                  {searchableSupplierItems.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12, color: colours.muted }}>No active supplier items match your search.</div>}
                </div>
              </div>
            )}

            {(costs.materials || []).map((item, idx) => (
              <div key={item.id} style={{ ...cardStyle, padding: 12, display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 30px", gap: 8, alignItems: "end" }}>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Name/Part</label><input style={{ ...inputStyle, fontSize: 12 }} value={item.name} onChange={(e) => { const arr = [...costs.materials]; arr[idx] = { ...item, name: e.target.value }; updateCosts("materials", arr); }} placeholder="e.g. Fence post" /></div>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Qty</label><input type="number" min="1" style={{ ...inputStyle, fontSize: 12 }} value={item.qty} onChange={(e) => { const arr = [...costs.materials]; arr[idx] = { ...item, qty: e.target.value }; updateCosts("materials", arr); }} /></div>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Unit Cost $</label><input type="number" min="0" step="0.01" style={{ ...inputStyle, fontSize: 12 }} value={item.unitCost} onChange={(e) => { const arr = [...costs.materials]; arr[idx] = { ...item, unitCost: e.target.value }; updateCosts("materials", arr); }} /></div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: colours.text, paddingBottom: 8 }}>{currency(safe(item.qty) * safe(item.unitCost))}</div>
                  <button onClick={() => updateCosts("materials", costs.materials.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: "#C62828", fontSize: 16 }}>x</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Code</label><input style={{ ...inputStyle, fontSize: 12 }} value={item.itemCode || ""} onChange={(e) => { const arr = [...costs.materials]; arr[idx] = { ...item, itemCode: e.target.value }; updateCosts("materials", arr); }} placeholder="Optional" /></div>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Unit</label><input style={{ ...inputStyle, fontSize: 12 }} value={item.unit || "each"} onChange={(e) => { const arr = [...costs.materials]; arr[idx] = { ...item, unit: e.target.value }; updateCosts("materials", arr); }} placeholder="each" /></div>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Buy $</label><input type="number" min="0" step="0.01" style={{ ...inputStyle, fontSize: 12 }} value={item.buyPrice ?? item.unitCost ?? ""} onChange={(e) => { const arr = [...costs.materials]; arr[idx] = { ...item, buyPrice: e.target.value, unitCost: e.target.value }; updateCosts("materials", arr); }} /></div>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Sell $</label><input type="number" min="0" step="0.01" style={{ ...inputStyle, fontSize: 12, borderColor: safe(item.sellPrice) < safe(item.buyPrice ?? item.unitCost) ? "#FCA5A5" : inputStyle.borderColor }} value={item.sellPrice ?? ""} onChange={(e) => { const arr = [...costs.materials]; arr[idx] = { ...item, sellPrice: e.target.value }; updateCosts("materials", arr); }} /></div>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: colours.text, paddingBottom: 6 }}>
                    <input type="checkbox" checked={item.gstApplicable !== false} onChange={(e) => { const arr = [...costs.materials]; arr[idx] = { ...item, gstApplicable: e.target.checked }; updateCosts("materials", arr); }} />
                    GST
                  </label>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={{ ...buttonSecondary, fontSize: 12 }} onClick={() => updateCosts("materials", [...(costs.materials || []), blankMaterial()])}>+ Add Material</button>
              <button style={{ ...buttonSecondary, fontSize: 12 }} onClick={() => setShowItemSearch((prev) => !prev)}>Search Items</button>
            </div>
          </div>
        )}

        {tab === "Subcontractor" && (
          <div style={{ display: "grid", gap: 8 }}>
            {(costs.subcontractor || []).map((item, idx) => (
              <div key={item.id} style={{ ...cardStyle, padding: 12, display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 30px", gap: 8, alignItems: "end" }}>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Subcontractor</label><input style={{ ...inputStyle, fontSize: 12 }} value={item.name} onChange={(e) => { const arr = [...costs.subcontractor]; arr[idx] = { ...item, name: e.target.value }; updateCosts("subcontractor", arr); }} placeholder="e.g. Bob's Plumbing" /></div>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Invoice Amount $</label><input type="number" min="0" step="0.01" style={{ ...inputStyle, fontSize: 12 }} value={item.amount} onChange={(e) => { const arr = [...costs.subcontractor]; arr[idx] = { ...item, amount: e.target.value }; updateCosts("subcontractor", arr); }} /></div>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Invoice Ref</label><input style={{ ...inputStyle, fontSize: 12 }} value={item.invoiceRef} onChange={(e) => { const arr = [...costs.subcontractor]; arr[idx] = { ...item, invoiceRef: e.target.value }; updateCosts("subcontractor", arr); }} placeholder="INV-001" /></div>
                  <button onClick={() => updateCosts("subcontractor", costs.subcontractor.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: "#C62828", fontSize: 16 }}>x</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 10 }}>Payment Status</label>
                    <select style={{ ...inputStyle, fontSize: 12 }} value={item.paymentStatus} onChange={(e) => { const arr = [...costs.subcontractor]; arr[idx] = { ...item, paymentStatus: e.target.value }; updateCosts("subcontractor", arr); }}>
                      {SUB_PAY_STATUS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  {item.paymentStatus === "Partial" && (
                    <div>
                      <label style={{ ...labelStyle, fontSize: 10 }}>Amount Paid $</label>
                      <input type="number" min="0" step="0.01" style={{ ...inputStyle, fontSize: 12 }} value={item.paidAmount} onChange={(e) => { const arr = [...costs.subcontractor]; arr[idx] = { ...item, paidAmount: e.target.value }; updateCosts("subcontractor", arr); }} />
                    </div>
                  )}
                </div>
                {item.pending && <span style={{ fontSize: 11, fontWeight: 700, color: "#E65100", background: "#FFF3E0", padding: "2px 8px", borderRadius: 6, justifySelf: "start" }}>Pending approval</span>}
              </div>
            ))}
            <button style={{ ...buttonSecondary, fontSize: 12 }} onClick={() => updateCosts("subcontractor", [...(costs.subcontractor || []), blankSubcontractor()])}>+ Add Subcontractor</button>

            {authUser?.id && job?.id && (
              <div style={{ marginTop: 12, padding: 14, background: "#F3E5F5", borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#6A1B9A", marginBottom: 8 }}>Invite Subcontractor to Portal</div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <input type="email" placeholder="subcontractor@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={{ ...inputStyle, fontSize: 12, flex: 1 }} />
                  <button disabled={inviting} onClick={async () => {
                    if (!inviteEmail.trim()) return;
                    setInviting(true);
                    setInviteMsg("");
                    try {
                      await supabase.from("sas_subcontractor_assignments").insert({
                        subcontractor_user_id: "00000000-0000-0000-0000-000000000000",
                        job_owner_user_id: authUser.id,
                        job_id: String(job.id),
                        status: "pending_signup",
                      });

                      await supabase.functions.invoke("send-document-email", {
                        body: {
                          to: [inviteEmail.trim()],
                          subject: "You've been invited as a subcontractor",
                          html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;"><h2 style="color:#6A1B9A;">Subcontractor Portal Invitation</h2><p>You've been invited to submit costs for job <strong>${job.title || job.name || job.id}</strong>.</p><p>Sign up at <a href="${window.location.origin}/portal?mode=signup">${window.location.origin}/portal</a> to access your subcontractor portal.</p></div>`,
                        },
                      });

                      setInviteMsg("Invitation sent!");
                      setInviteEmail("");
                    } catch (err) {
                      setInviteMsg(`Error: ${err.message || "Failed"}`);
                    }
                    setInviting(false);
                  }} style={{ ...buttonPrimary, fontSize: 11, padding: "8px 14px", whiteSpace: "nowrap" }}>
                    {inviting ? "Sending..." : "Invite"}
                  </button>
                </div>
                {inviteMsg && <div style={{ fontSize: 11, marginTop: 6, fontWeight: 600, color: inviteMsg.startsWith("Invitation") ? "#2E7D32" : "#C62828" }}>{inviteMsg}</div>}
              </div>
            )}
          </div>
        )}

        {tab === "Misc" && (
          <div style={{ display: "grid", gap: 8 }}>
            {(costs.misc || []).map((item, idx) => (
              <div key={item.id} style={{ ...cardStyle, padding: 12, display: "grid", gridTemplateColumns: "3fr 1fr 30px", gap: 8, alignItems: "end" }}>
                <div><label style={{ ...labelStyle, fontSize: 10 }}>Description</label><input style={{ ...inputStyle, fontSize: 12 }} value={item.description} onChange={(e) => { const arr = [...costs.misc]; arr[idx] = { ...item, description: e.target.value }; updateCosts("misc", arr); }} placeholder="e.g. Travel, permits" /></div>
                <div><label style={{ ...labelStyle, fontSize: 10 }}>Amount $</label><input type="number" min="0" step="0.01" style={{ ...inputStyle, fontSize: 12 }} value={item.amount} onChange={(e) => { const arr = [...costs.misc]; arr[idx] = { ...item, amount: e.target.value }; updateCosts("misc", arr); }} /></div>
                <button onClick={() => updateCosts("misc", costs.misc.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: "#C62828", fontSize: 16 }}>x</button>
              </div>
            ))}
            <button style={{ ...buttonSecondary, fontSize: 12 }} onClick={() => updateCosts("misc", [...(costs.misc || []), blankMisc()])}>+ Add Miscellaneous</button>
          </div>
        )}
      </div>
    </div>
  );
}