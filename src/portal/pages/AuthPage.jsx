import React from "react";

export default function AuthPage(props) {
  const {
    profile = {},
    authMode,
    setAuthMode,
    authPortalType = "standard",
    authForm,
    setAuthForm,
    authLoading,
    showResetSentModal,
    setShowResetSentModal,
    colours,
    cardStyle,
    buttonPrimary,
    buttonSecondary,
    inputStyle,
    labelStyle,
    handleAuthSubmit,
    handlePasswordReset,
  } = props;

  const isSubcontractorInvite = authPortalType === "subcontractor";
  const heroFeatures = isSubcontractorInvite
    ? [
        ["Assigned jobs only", "See only the jobs the owner has assigned to you in the subcontractor portal."],
        ["Submit costs fast", "Upload receipts and log labour or materials directly against your assigned work."],
        ["Separate secure login", "Create your own subcontractor account without exposing the full business portal."],
      ]
    : [
        ["Invoices & quotes", "Create, send and review client billing documents."],
        ["Financial reporting", "View live insights, receivables, cash flow and BAS support."],
        ["Guided setup wizard", "New accounts are walked through a step-by-step wizard to configure your business profile."],
      ];

  const authCardTitle = authMode === "signup"
    ? (isSubcontractorInvite ? "Create your subcontractor account" : "Create your Mustered account")
    : (isSubcontractorInvite ? "Subcontractor Login" : "Mustered Login");
  const authCardCopy = authMode === "signup"
    ? (isSubcontractorInvite
      ? "Create your subcontractor account using the invited email address. Once the owner assigns your subcontractor role, you will land in the subcontractor-only portal."
      : "Create your account and our setup wizard will guide you through configuring your business profile, branding, and preferences in a few easy steps.")
    : (isSubcontractorInvite
      ? "Log in with the subcontractor email address that was invited so you can access assigned jobs and submit costs."
      : "Log in to access your invoices, quotes, expenses, reports and client records.");
  const authPrimaryLabel = authLoading
    ? "Working..."
    : authMode === "signup"
      ? (isSubcontractorInvite ? "Create Subcontractor Account" : "Create Account")
      : (isSubcontractorInvite ? "Subcontractor Login" : "Mustered Login");

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAuthSubmit();
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${colours.bg} 0%, #EEF4FF 100%)`, padding: 24 }}>
      {showResetSentModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 36, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center", fontFamily: "sans-serif" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>Email</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#14202B", marginBottom: 12 }}>Check your email</div>
            <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, marginBottom: 8 }}>A password reset link has been sent to</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#6A1B9A", marginBottom: 20 }}>{authForm.email}</div>
            <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, marginBottom: 28 }}>
              Click the link in the email to set a new password. Check your spam folder if it does not arrive within a few minutes.
            </div>
            <button
              onClick={() => setShowResetSentModal(false)}
              style={{ background: "#6A1B9A", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: colours.purple }}>
            {profile.businessName || "My Business"}
          </div>
          <a
            href="#portal-login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: colours.purple,
              color: "#fff",
              textDecoration: "none",
              borderRadius: 12,
              padding: "12px 20px",
              fontWeight: 800,
              fontSize: 14,
              boxShadow: "0 10px 24px rgba(106,27,154,0.18)",
            }}
          >
            {isSubcontractorInvite ? "Subcontractor Access" : "Mustered Login"}
          </a>
        </div>

        <div
          className="sas-auth-landing"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 460px)",
            gap: 24,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${colours.navy} 0%, ${colours.purple} 58%, ${colours.teal} 100%)`,
              borderRadius: 28,
              padding: 32,
              color: "#fff",
              boxShadow: "0 24px 60px rgba(43,47,107,0.18)",
              display: "grid",
              gap: 20,
              alignContent: "space-between",
              minHeight: 520,
            }}
          >
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.14)", padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, letterSpacing: 0.3, width: "fit-content" }}>
                {isSubcontractorInvite ? "Subcontractor portal access" : "Client portal access"}
              </div>
              <div style={{ fontSize: 44, lineHeight: 1.05, fontWeight: 900, maxWidth: 560 }}>
                {isSubcontractorInvite ? "Join the subcontractor portal and manage assigned work" : "Login to your portal from the landing page"}
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.7, opacity: 0.92, maxWidth: 620 }}>
                {isSubcontractorInvite
                  ? "Create your subcontractor login to view assigned jobs, upload receipts, and submit labour or materials costs without seeing the rest of the business portal."
                  : "View invoices, quotes, expenses, documents and financial reports from one secure portal. This page gives you a proper landing section with a visible login call-to-action so you can check how it looks on desktop and mobile."}
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {heroFeatures.map(([title, copy]) => (
                <div key={title} style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 18, padding: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.9, marginTop: 4 }}>{copy}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            id="portal-login"
            style={{
              ...cardStyle,
              padding: 28,
              borderRadius: 28,
              boxShadow: "0 24px 60px rgba(15,23,42,0.10)",
              display: "grid",
              gap: 18,
              alignContent: "start",
            }}
          >
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: colours.text, marginBottom: 8 }}>
                {authCardTitle}
              </div>
              <div style={{ fontSize: 14, color: colours.muted, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
                {authCardCopy}
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  style={inputStyle}
                  type="email"
                  onKeyDown={handleKeyDown}
                  autoComplete="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  onKeyDown={handleKeyDown}
                  autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                  style={inputStyle}
                  value={authForm.password}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={authMode === "signup" ? "Minimum 8 characters, upper/lowercase and a number" : "Enter your password"}
                />
              </div>
              {authMode === "signup" ? (
                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <input
                    type="password"
                    onKeyDown={handleKeyDown}
                    style={inputStyle}
                    value={authForm.confirmPassword}
                    onChange={(e) => setAuthForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Repeat your password"
                  />
                </div>
              ) : null}
            </div>

            {authMode === "signup" ? (
              <div style={{ fontSize: 12, color: colours.muted, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
                {isSubcontractorInvite
                  ? "Use the invited email address when you sign up. The business owner can then assign your subcontractor role and job access."
                  : <>Use at least 8 characters with upper-case, lower-case and a number. After signing up, our <strong style={{ color: colours.purple }}>setup wizard</strong> will walk you through everything.</>}
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 10 }}>
              <button type="button" style={{ ...buttonPrimary, width: "100%", justifyContent: "center" }} onClick={handleAuthSubmit} disabled={authLoading}>
                {authPrimaryLabel}
              </button>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={{ ...buttonSecondary, flex: 1, minWidth: 150 }}
                  onClick={() => setAuthMode((prev) => (prev === "signup" ? "signin" : "signup"))}
                >
                  {authMode === "signup" ? "Use Login" : "Create Account"}
                </button>
                <button type="button" style={{ ...buttonSecondary, flex: 1, minWidth: 150 }} onClick={handlePasswordReset}>
                  Reset Password
                </button>
              </div>
            </div>

            <div style={{ background: colours.bg, borderRadius: 16, padding: 16, fontSize: 13, color: colours.muted, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
              <strong style={{ color: colours.text }}>New here?</strong>{" "}
              {isSubcontractorInvite
                ? "Use the invited email address to create your subcontractor login. If you can sign in but do not see jobs yet, the owner may still need to assign your subcontractor role and jobs."
                : "Create an account and our guided setup wizard will help you configure your business name, ABN, contact details, and preferences in just a few minutes."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
