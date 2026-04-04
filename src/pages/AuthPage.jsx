import React from "react";

export default function AuthPage(props) {
  const {
    authMode,
    setAuthMode,
    authForm,
    setAuthForm,
    authLoading,
    showResetSentModal,
    setShowResetSentModal,
    handleAuthSubmit,
    handlePasswordReset,
  } = props;

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAuthSubmit();
  };

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      {showResetSentModal && (
        <div style={{ position: "fixed", inset: 0 }}>
          <div>
            <div>Check your email</div>
            <div>{authForm.email}</div>
            <button onClick={() => setShowResetSentModal(false)}>OK</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <h2>{authMode === "signup" ? "Create Account" : "Login"}</h2>

        <input
          type="email"
          value={authForm.email}
          onChange={(e) =>
            setAuthForm((prev) => ({ ...prev, email: e.target.value }))
          }
          onKeyDown={handleKeyDown}
        />

        <input
          type="password"
          value={authForm.password}
          onChange={(e) =>
            setAuthForm((prev) => ({ ...prev, password: e.target.value }))
          }
          onKeyDown={handleKeyDown}
        />

        <button onClick={handleAuthSubmit} disabled={authLoading}>
          {authLoading ? "Loading..." : "Submit"}
        </button>

        <button
          onClick={() =>
            setAuthMode((prev) => (prev === "signup" ? "signin" : "signup"))
          }
        >
          Switch Mode
        </button>

        <button onClick={handlePasswordReset}>Reset Password</button>
      </div>
    </div>
  );
}
