import React, { useState } from "react";
import PlanSelectionCards from "../components/PlanSelectionCards";

const STEPS = [
  { key: "businessType", label: "Business Type" },
  { key: "plan", label: "Choose Plan" },
  { key: "business", label: "Business Details" },
  { key: "personal", label: "Your Details" },
  { key: "getStarted", label: "Get Started" },
];

const BUSINESS_TYPES = [
  {
    key: "tradie",
    icon: "🪖",
    label: "Tradie",
    desc: "Electricians, plumbers, builders, painters, fencers — anyone who sends workers to customer sites.",
    industries: ["Electrician", "Plumber", "Builder", "HVAC", "Painter", "Fencer", "Landscaper", "Roofer", "Tiler", "Other"],
  },
  {
    key: "farmer",
    icon: "🚜",
    label: "Farmer / Agriculture",
    desc: "Broadacre, livestock, horticulture or mixed farming — manage work across properties and paddocks.",
    industries: ["Broadacre Farming", "Livestock", "Horticulture", "Mixed Farming", "Viticulture", "Dairy", "Cotton", "Other"],
  },
  {
    key: "smallbusiness",
    icon: "🏪",
    label: "Small Business",
    desc: "Retail, hospitality, cleaning, services — manage staff rosters, bookings and day-to-day ops.",
    industries: ["Retail", "Hospitality", "Cleaning", "Professional Services", "Beauty & Wellness", "Automotive", "Other"],
  },
];

const QUICK_START = {
  tradie: [
    { key: "contacts", label: "Add your first customer", icon: "👤" },
    { key: "quote", label: "Create a quote", icon: "📋" },
    { key: "schedule", label: "Schedule a job", icon: "📅" },
    { key: "invoice", label: "Send an invoice", icon: "💰" },
  ],
  farmer: [
    { key: "property", label: "Add a property / paddock", icon: "🏡" },
    { key: "contacts", label: "Add a client or contractor", icon: "👤" },
    { key: "schedule", label: "Plan a task", icon: "📅" },
    { key: "expense", label: "Log an expense", icon: "🧾" },
  ],
  smallbusiness: [
    { key: "contacts", label: "Add your first customer", icon: "👤" },
    { key: "schedule", label: "Create a booking", icon: "📅" },
    { key: "invoice", label: "Send an invoice", icon: "💰" },
    { key: "staff", label: "Add a staff member", icon: "🧑‍💼" },
  ],
};

export default function SetupWizardPage(props) {
  const {
    wizardForm = {},
    setWizardForm = () => {},
    wizardSaving = false,
    colours = {},
    cardStyle = {},
    buttonPrimary = {},
    buttonSecondary = {},
    inputStyle = {},
    labelStyle = {},
    completeSetupWizard = () => {},
    authUser = {},
  } = props;

  const [step, setStep] = useState(0);
  const [quickStartChecked, setQuickStartChecked] = useState([]);

  const update = (field, value) => setWizardForm((f) => ({ ...f, [field]: value }));

  const selectedType = BUSINESS_TYPES.find((b) => b.key === wizardForm.businessType);
  const canProceedFromType = Boolean(wizardForm.businessType);
  const canProceedFromPlan = Boolean(wizardForm.selectedTier);
  const canProceedFromBusiness = (wizardForm.businessName || "").trim().length > 0;
  const canProceedFromPersonal = (wizardForm.firstName || "").trim().length > 0;

  const purple = colours.purple || "#6A1B9A";
  const teal = colours.teal || "#00897B";
  const navy = colours.navy || "#14202B";

  const progressBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {STEPS.map((s, i) => {
        const active = step === i;
        const done = step > i;
        return (
          <React.Fragment key={s.key}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                  background: done ? teal : active ? purple : (colours.border || "#E2E8F0"),
                  color: done || active ? "#fff" : (colours.muted || "#64748B"),
                  transition: "all 0.3s ease",
                  boxShadow: active ? `0 4px 16px ${purple}44` : "none",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 11, fontWeight: active ? 800 : 600,
                color: active ? purple : done ? teal : (colours.muted || "#64748B"),
                fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.2,
              }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 3, borderRadius: 3,
                background: step > i ? teal : (colours.border || "#E2E8F0"),
                transition: "background 0.3s ease", marginTop: -18,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const fieldGroup = (label, field, placeholder, type = "text", extra) => (
    <div style={{ display: "grid", gap: 4 }}>
      <label style={{ ...labelStyle, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>
      <input
        style={{ ...inputStyle, fontFamily: "'DM Sans', sans-serif" }}
        type={type}
        value={wizardForm[field] || ""}
        onChange={(e) => update(field, e.target.value)}
        placeholder={placeholder}
      />
      {extra && <span style={{ fontSize: 12, color: colours.muted || "#64748B", lineHeight: 1.5 }}>{extra}</span>}
    </div>
  );

  const stepContent = () => {
    switch (step) {
      /* ── Step 0: Business Type ────────────────────────────────── */
      case 0:
        return (
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 4 }}>🚀</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: navy, margin: "0 0 8px" }}>
                What best describes your business?
              </h2>
              <p style={{ fontSize: 14, color: colours.muted || "#64748B", lineHeight: 1.7, margin: 0 }}>
                This helps us set up the right labels, dashboard and features for you. You can change this later in Settings.
              </p>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {BUSINESS_TYPES.map((bt) => {
                const selected = wizardForm.businessType === bt.key;
                return (
                  <button
                    key={bt.key}
                    type="button"
                    onClick={() => update("businessType", bt.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 18,
                      padding: "22px 24px", borderRadius: 18, cursor: "pointer",
                      border: `2.5px solid ${selected ? purple : (colours.border || "#E2E8F0")}`,
                      background: selected ? `${purple}0A` : "#fff",
                      boxShadow: selected ? `0 4px 20px ${purple}18` : "0 2px 8px rgba(0,0,0,0.04)",
                      transition: "all 0.2s ease", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 42, lineHeight: 1 }}>{bt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 17, color: selected ? purple : navy, marginBottom: 4 }}>
                        {bt.label}
                      </div>
                      <div style={{ fontSize: 13, color: colours.muted || "#64748B", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
                        {bt.desc}
                      </div>
                    </div>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      border: `2px solid ${selected ? purple : "#CBD5E1"}`,
                      background: selected ? purple : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s ease", flexShrink: 0,
                    }}>
                      {selected && <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      /* ── Step 1: Choose Plan ──────────────────────────────────── */
      case 1:
        return (
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: navy, margin: "0 0 8px" }}>
                Choose your plan
              </h2>
              <p style={{ fontSize: 14, color: colours.muted || "#64748B", lineHeight: 1.7, margin: 0 }}>
                Start free for 14 days. No credit card required. Cancel anytime.
              </p>
            </div>
            <PlanSelectionCards
              currentTier={wizardForm.selectedTier || null}
              onSelect={(tierKey) => update("selectedTier", tierKey)}
              mode="signup"
              colours={colours}
            />
            <div style={{ textAlign: "center", fontSize: 13, color: colours.muted || "#64748B", marginTop: 8 }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { if (props.onSwitchToLogin) props.onSwitchToLogin(); }}
                style={{ background: "none", border: "none", color: purple, cursor: "pointer", fontWeight: 700, fontSize: 13, textDecoration: "underline" }}
              >
                Log in here
              </button>
            </div>
          </div>
        );

      /* ── Step 2: Business Details ─────────────────────────────── */
      case 2:
        return (
          <div style={{ display: "grid", gap: 20 }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, color: navy, margin: "0 0 6px" }}>
                Business Details
              </h3>
              <p style={{ fontSize: 14, color: colours.muted || "#64748B", lineHeight: 1.7, margin: 0 }}>
                This info appears on your invoices, quotes and documents.
              </p>
            </div>
            {fieldGroup("Business Name *", "businessName", "e.g. Smith Electrical")}
            {fieldGroup("Legal Business Name", "legalBusinessName", "e.g. Smith Electrical Pty Ltd", "text", "Leave blank if same as business name")}
            {fieldGroup("ABN", "abn", "e.g. 12 345 678 901", "text", "Your Australian Business Number")}
            {fieldGroup("Business Address", "address", "e.g. 123 Main St, Wagga Wagga NSW 2650")}
            {selectedType && (
              <div style={{ display: "grid", gap: 4 }}>
                <label style={{ ...labelStyle, fontFamily: "'DM Sans', sans-serif" }}>
                  {selectedType.key === "farmer" ? "Primary farming type" : selectedType.key === "smallbusiness" ? "Industry" : "Primary trade"}
                </label>
                <select
                  style={{ ...inputStyle, fontFamily: "'DM Sans', sans-serif" }}
                  value={wizardForm.industry || ""}
                  onChange={(e) => update("industry", e.target.value)}
                >
                  <option value="">Select…</option>
                  {selectedType.industries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ ...labelStyle, fontFamily: "'DM Sans', sans-serif" }}>GST Registered?</label>
              <div style={{ display: "flex", gap: 12 }}>
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => update("gstRegistered", val)}
                    style={{
                      padding: "10px 24px", borderRadius: 10,
                      border: `2px solid ${wizardForm.gstRegistered === val ? purple : (colours.border || "#E2E8F0")}`,
                      background: wizardForm.gstRegistered === val ? `${purple}12` : "#fff",
                      color: wizardForm.gstRegistered === val ? purple : (colours.muted || "#64748B"),
                      fontWeight: 700, fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                      cursor: "pointer", transition: "all 0.2s ease",
                    }}
                  >
                    {val ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      /* ── Step 3: Personal Details ─────────────────────────────── */
      case 3:
        return (
          <div style={{ display: "grid", gap: 20 }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, color: navy, margin: "0 0 6px" }}>
                Your Details
              </h3>
              <p style={{ fontSize: 14, color: colours.muted || "#64748B", lineHeight: 1.7, margin: 0 }}>
                Tell us a bit about yourself so we can personalise things.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {fieldGroup("First Name *", "firstName", "First name")}
              {fieldGroup("Last Name", "lastName", "Last name")}
            </div>
            {fieldGroup("Preferred Name", "preferredName", "What should we call you?", "text", "We'll use this in greetings")}
            {fieldGroup("Email", "email", authUser?.email || "you@example.com", "email")}
            {fieldGroup("Phone", "phone", "e.g. 0412 345 678")}
          </div>
        );

      /* ── Step 4: Quick Start ──────────────────────────────────── */
      case 4: {
        const items = QUICK_START[wizardForm.businessType] || QUICK_START.tradie;
        return (
          <div style={{ display: "grid", gap: 20 }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, color: navy, margin: "0 0 6px" }}>
                What do you want to set up first?
              </h3>
              <p style={{ fontSize: 14, color: colours.muted || "#64748B", lineHeight: 1.7, margin: 0 }}>
                Pick what matters most — you can do the rest later.
              </p>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((item) => {
                const checked = quickStartChecked.includes(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setQuickStartChecked((prev) => checked ? prev.filter((k) => k !== item.key) : [...prev, item.key])}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "16px 20px", borderRadius: 14, cursor: "pointer",
                      border: `2px solid ${checked ? teal : (colours.border || "#E2E8F0")}`,
                      background: checked ? `${teal}0A` : "#fff",
                      transition: "all 0.2s ease", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{item.icon}</span>
                    <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: navy }}>
                      {item.label}
                    </span>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      border: `2px solid ${checked ? teal : "#CBD5E1"}`,
                      background: checked ? teal : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {checked && <span style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Summary */}
            <div style={{
              background: `${purple}06`, border: `1px solid ${purple}14`,
              borderRadius: 16, padding: 20, display: "grid", gap: 12,
            }}>
              {[
                ["Business Type", selectedType?.label || "—"],
                ["Business", wizardForm.businessName || "—"],
                ["ABN", wizardForm.abn || "—"],
                ["Industry", wizardForm.industry || "—"],
                ["Name", [wizardForm.firstName, wizardForm.lastName].filter(Boolean).join(" ") || "—"],
                ["GST Registered", wizardForm.gstRegistered ? "Yes" : "No"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: colours.muted || "#64748B" }}>{label}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: navy, textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: `${teal}10`, border: `1px solid ${teal}22`,
              borderRadius: 14, padding: 16, display: "flex", gap: 12, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 22 }}>💡</span>
              <span style={{ fontSize: 13, color: colours.muted || "#64748B", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
                You can change any of this later from <strong>Settings → Business Profile</strong>.
              </span>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const canProceed = () => {
    if (step === 0) return canProceedFromType;
    if (step === 1) return canProceedFromPlan;
    if (step === 2) return canProceedFromBusiness;
    if (step === 3) return canProceedFromPersonal;
    return true;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${colours.bg || "#F8FAFC"} 0%, #EEF4FF 60%, ${purple}08 100%)`,
        padding: 24,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900,
            color: purple, marginBottom: 4,
          }}>
            {wizardForm.businessName || "Mustered"}
          </div>
          <div style={{ fontSize: 13, color: colours.muted || "#64748B" }}>Account Setup</div>
        </div>

        {progressBar}

        <div style={{
          ...cardStyle, padding: 32, borderRadius: 24,
          boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
        }}>
          {stepContent()}

          <div style={{
            display: "flex",
            justifyContent: step === 0 ? "flex-end" : "space-between",
            alignItems: "center", marginTop: 28, gap: 12,
          }}>
            {step > 0 && (
              <button
                type="button"
                style={{ ...buttonSecondary, fontFamily: "'DM Sans', sans-serif" }}
                onClick={() => setStep((s) => s - 1)}
              >
                ← Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                style={{
                  ...buttonPrimary, fontFamily: "'DM Sans', sans-serif",
                  opacity: canProceed() ? 1 : 0.5,
                }}
                disabled={!canProceed()}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                style={{
                  ...buttonPrimary, fontFamily: "'DM Sans', sans-serif",
                  opacity: wizardSaving ? 0.6 : 1,
                }}
                disabled={wizardSaving}
                onClick={() => {
                  update("quickStart", quickStartChecked);
                  completeSetupWizard();
                }}
              >
                {wizardSaving ? "Setting up..." : "🚀 Let's go!"}
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: colours.muted || "#94A3B8" }}>
          Need help? We're here for you — plain English, no jargon.
        </div>
      </div>
    </div>
  );
}
