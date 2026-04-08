import React from "react";
import { TIERS, getUpgradeTarget } from "../tierConfig";

/**
 * UpgradePrompt — Shown when a Starter user clicks a locked nav item.
 * Friendly, encouraging tone — not pushy.
 *
 * Props:
 *   featureName  – human label of the feature they tried to access
 *   featureIcon  – emoji icon for the feature
 *   currentTier  – "starter" | "pro" | "premium" | null
 *   onUpgrade    – () => void — navigates to Settings > Plan & Billing
 *   onViewPlans  – () => void — navigates to plan comparison
 *   colours      – portal colour palette
 */
export default function UpgradePrompt({
  featureName = "This feature",
  featureIcon = "🔒",
  currentTier,
  onUpgrade,
  onViewPlans,
  colours = {},
}) {
  const purple = colours.purple || "#6A1B9A";
  const text = colours.text || "#14202B";
  const muted = colours.muted || "#64748B";

  const targetTier = getUpgradeTarget(currentTier);
  const target = targetTier ? TIERS[targetTier] : TIERS.pro;

  return (
    <div style={{
      minHeight: 400,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    }}>
      <div style={{
        maxWidth: 520,
        width: "100%",
        textAlign: "center",
        background: "#fff",
        borderRadius: 24,
        padding: "48px 36px",
        border: "1px solid #E2E8F0",
        boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{featureIcon}</div>

        <div style={{
          fontSize: 22,
          fontWeight: 900,
          color: text,
          marginBottom: 12,
          fontFamily: '"Playfair Display", serif',
        }}>
          {featureName} is available on Pro and Premium
        </div>

        <div style={{
          fontSize: 15,
          color: muted,
          lineHeight: 1.7,
          marginBottom: 28,
          maxWidth: 400,
          margin: "0 auto 28px",
        }}>
          Upgrade your plan to unlock scheduling, properties, reports and more — everything you need to run your whole business from one place.
        </div>

        <button
          onClick={onUpgrade}
          style={{
            background: purple,
            color: "#fff",
            border: "none",
            borderRadius: 14,
            padding: "16px 32px",
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            width: "100%",
            maxWidth: 320,
            boxShadow: `0 8px 24px ${purple}33`,
            transition: "all 0.2s ease",
          }}
        >
          Upgrade to {target.label} — ${target.price}/month
        </button>

        {onViewPlans && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={onViewPlans}
              style={{
                background: "none",
                border: "none",
                color: purple,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              View all plan features
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
