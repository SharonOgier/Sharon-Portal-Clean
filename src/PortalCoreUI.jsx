import React from "react";

const DEFAULT_MONTHLY_SUBSCRIPTION = 45;

// ── Toast notification system ──────────────────────────────
export function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 99999,
      display: "grid", gap: 10, maxWidth: 380,
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "14px 16px",
          borderRadius: 14,
          boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
          background: t.type === "error" ? "#FEE2E2"
            : t.type === "success" ? "#DCFCE7"
            : t.type === "warning" ? "#FEF9C3"
            : "#EFF6FF",
          borderLeft: `4px solid ${
            t.type === "error" ? "#EF4444"
            : t.type === "success" ? "#22C55E"
            : t.type === "warning" ? "#EAB308"
            : "#3B82F6"
          }`,
          fontSize: 14,
          color: "#14202B",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minWidth: 280,
          animation: "toastIn 0.2s ease",
        }}>
          <div style={{ flex: 1, lineHeight: 1.5 }}>
            {t.title && <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.title}</div>}
            <div style={{ fontWeight: t.title ? 400 : 600 }}>{t.message}</div>
          </div>
          <button onClick={() => onRemove(t.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 18, lineHeight: 1, color: "#64748B", padding: 0, marginTop: -1,
          }}>\u00d7</button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = React.useState([]);
  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const add = (message, type = "info", title = "", duration = 4000) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, type, title }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
  };
  const toast = {
    success: (message, title = "")  => add(message, "success", title),
    error:   (message, title = "")  => add(message, "error",   title, 6000),
    warning: (message, title = "")  => add(message, "warning", title),
    info:    (message, title = "")  => add(message, "info",    title),
  };
  return { toasts, toast, removeToast: remove };
}
// ─────────────────────────────────────────────────────────────

// ── Confirm Modal ────────────────────────────────────────────
function ConfirmModal({ isOpen, title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99998, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#14202B", marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "#fff", color: "#14202B", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
          <button onClick={onConfirm} style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [confirmState, setConfirmState] = React.useState(null);
  const confirm = ({ title, message, confirmLabel = "Delete", onConfirm }) => {
    setConfirmState({ title, message, confirmLabel, onConfirm });
  };
  const close = () => setConfirmState(null);
  const modal = confirmState ? (
    <ConfirmModal isOpen title={confirmState.title} message={confirmState.message} confirmLabel={confirmState.confirmLabel}
      onConfirm={() => { close(); confirmState.onConfirm(); }} onCancel={close} />
  ) : null;
  return { confirm, modal };
}
// ─────────────────────────────────────────────────────────────

// ── Subscription helpers ──────────────────────────────────────
const TRIAL_DAYS = 14;

// ── SECURITY FIX: Master/whitelist emails removed from client code ──
// These checks must happen server-side (e.g. Supabase RLS or edge function).
// The client now only checks subscription status — no email-based bypass.

export function getSubscriptionAccess(profile) {
  // SECURITY: No client-side email bypass. Master/whitelist checks belong on the server.
  // The server should set profile.subscriptionStatus = "active" for master/whitelisted accounts.
  const status = profile?.subscriptionStatus || "";
  const trialStarted = profile?.trialStartedAt || profile?.setupCompletedAt || "";
  if (status === "active") return { allowed: true, reason: "active" };
  if (trialStarted) {
    const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - (Date.now() - new Date(trialStarted).getTime()) / (1000 * 60 * 60 * 24)));
    if (daysLeft > 0) return { allowed: true, reason: "trial", daysLeft };
    return { allowed: false, reason: "trial_expired", daysLeft: 0 };
  }
  if (!profile?.setupComplete) return { allowed: true, reason: "setup" };
  if (status === "canceled" || status === "past_due") return { allowed: false, reason: status };
  return { allowed: true, reason: "legacy" };
}

// ── SECURITY FIX: safeErrorMessage prevents internal detail leakage ──
const safeErrorMessage = (err) => {
  const msg = typeof err === "string" ? err : err?.message || "";
  if (/postgres|supabase|pgrst|jwt|token|sql|relation|column|schema|violat/i.test(msg)) {
    return "Something went wrong. Please try again.";
  }
  return msg || "Something went wrong. Please try again.";
};

export function PaywallScreen({ profile, serverBaseUrl, supabase }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const access = getSubscriptionAccess(profile);
  const handleSubscribe = async () => {
    setLoading(true); setError("");
    try {
      // SECURITY FIX: Include auth token in checkout request
      const headers = { "Content-Type": "application/json" };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      }
      const res = await fetch(`${serverBaseUrl}/api/create-subscription-checkout`, {
        method: "POST", headers,
        body: JSON.stringify({ email: profile.email, userId: profile.user_id || profile.id, businessName: profile.businessName, successUrl: window.location.origin + "?subscribed=1", cancelUrl: window.location.origin + "?subscribed=0" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error || "Could not start checkout. Please try again.");
    } catch { setError("Could not reach the server. Please try again."); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#6A1B9A", marginBottom: 8 }}>{profile.businessName || "Your Portal"}</div>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, padding: 32, marginTop: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{access.reason === "trial_expired" ? "\u23f0" : "\ud83d\udd12"}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#14202B", marginBottom: 10 }}>
            {access.reason === "trial_expired" ? "Your free trial has ended" : "Subscription required"}
          </div>
          <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, marginBottom: 24 }}>
            {access.reason === "trial_expired" ? "Subscribe now to keep access to all your invoices, clients, quotes and financial data." : "Reactivate your subscription to regain access."}
          </div>
          <div style={{ background: "#F5ECFB", borderRadius: 14, padding: "20px 24px", marginBottom: 24 }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#6A1B9A" }}>${DEFAULT_MONTHLY_SUBSCRIPTION}</div>
            <div style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>per month \u00b7 cancel anytime</div>
          </div>
          {error && <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>{error}</div>}
          <button onClick={handleSubscribe} disabled={loading} style={{ width: "100%", background: loading ? "#9CA3AF" : "#6A1B9A", color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 16, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Redirecting to checkout..." : "Subscribe now \u2014 $" + DEFAULT_MONTHLY_SUBSCRIPTION + "/month"}
          </button>
          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 14 }}>Secure payment via Stripe \u00b7 Cancel anytime</div>
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 20 }}>
          Already subscribed? <button onClick={() => window.location.reload()} style={{ background: "none", border: "none", color: "#6A1B9A", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Refresh to continue</button>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────
