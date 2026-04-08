import React from "react";
import { TIERS, TIER_ORDER } from "../tierConfig";

/**
 * PlanSelectionCards — Shows three pricing tier cards.
 * Used in both the setup wizard and the Settings > Plan & Billing tab.
 *
 * Props:
 *   currentTier   – "starter" | "pro" | "premium" | null
 *   onSelect      – (tierKey) => void
 *   loading       – boolean
 *   mode          – "signup" | "settings" (changes button labels)
 */
export default function PlanSelectionCards({ currentTier, onSelect, loading = false, mode = "signup", colours = {} }) {
  const purple = colours.purple || "#6A1B9A";
  const teal = colours.teal || "#006D6D";
  const border = colours.border || "#E2E8F0";
  const text = colours.text || "#14202B";
  const muted = colours.muted || "#64748B";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 20,
      maxWidth: 960,
      margin: "0 auto",
    }}>
      {TIER_ORDER.map((key) => {
        const tier = TIERS[key];
        const isCurrent = currentTier === key;
        const isRecommended = tier.recommended;
        const isHigher = currentTier && TIER_ORDER.indexOf(key) > TIER_ORDER.indexOf(currentTier);
        const isLower = currentTier && TIER_ORDER.indexOf(key) < TIER_ORDER.indexOf(currentTier);

        let buttonLabel = "Start free trial";
        let buttonStyle = {};
        if (mode === "settings") {
          if (isCurrent) {
            buttonLabel = "Current plan";
            buttonStyle = { background: "#E2E8F0", color: muted, cursor: "default" };
          } else if (isHigher) {
            buttonLabel = `Upgrade to ${tier.label}`;
            buttonStyle = { background: purple, color: "#fff" };
          } else if (isLower) {
            buttonLabel = "Downgrade";
            buttonStyle = { background: "#fff", color: "#EF4444", border: "2px solid #EF4444" };
          }
        } else {
          buttonStyle = { background: purple, color: "#fff" };
        }

        return (
          <div
            key={key}
            style={{
              background: "#fff",
              borderRadius: 20,
              border: isRecommended ? `2px solid ${purple}` : `1px solid ${border}`,
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              boxShadow: isRecommended
                ? `0 0 30px ${purple}22, 0 8px 32px rgba(0,0,0,0.08)`
                : "0 2px 12px rgba(0,0,0,0.04)",
              transform: isRecommended ? "scale(1.03)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            {isRecommended && (
              <div style={{
                position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                background: purple, color: "#fff", fontSize: 11, fontWeight: 800,
                padding: "5px 18px", borderRadius: 20, letterSpacing: 0.5, textTransform: "uppercase",
              }}>
                Most popular
              </div>
            )}

            <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 4 }}>
              {tier.label}
            </div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 16 }}>{tier.tag}</div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
              <span style={{ fontSize: 42, fontWeight: 900, color: purple }}>${tier.price}</span>
              <span style={{ fontSize: 14, color: muted }}>/month inc. GST</span>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Included:
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", display: "grid", gap: 8 }}>
              {tier.features.map((f) => {
                const isComingSoon = tier.comingSoon?.some((c) => f.toLowerCase().includes(c.toLowerCase()));
                return (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: text, lineHeight: 1.5 }}>
                    <span style={{ color: teal, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span>
                      {f}
                      {isComingSoon && (
                        <span style={{
                          display: "inline-block", marginLeft: 6,
                          background: "#E2E8F0", color: muted,
                          fontSize: 10, fontWeight: 700, padding: "2px 8px",
                          borderRadius: 10,
                        }}>
                          Coming Soon
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            {tier.lockedFeatures && tier.lockedFeatures.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Not included:
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", display: "grid", gap: 6 }}>
                  {tier.lockedFeatures.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9CA3AF", lineHeight: 1.5 }}>
                      <span style={{ fontSize: 12 }}>🔒</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div style={{ marginTop: "auto" }}>
              <button
                onClick={() => !isCurrent && onSelect(key)}
                disabled={loading || (mode === "settings" && isCurrent)}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: isCurrent ? "default" : "pointer",
                  transition: "all 0.2s ease",
                  ...buttonStyle,
                  ...(loading ? { opacity: 0.6, cursor: "not-allowed" } : {}),
                }}
              >
                {loading ? "Processing..." : buttonLabel}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
