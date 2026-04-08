// ── Mustered Tier Configuration ──────────────────────────────────────────────
// Central source of truth for pricing tiers, Stripe IDs, and feature gating.

export const TIERS = {
  starter: {
    key: "starter",
    label: "Starter",
    price: 39,
    priceId: "price_1TJBrFS5sTpTZ9LTZY7BKrw2",
    productId: "prod_UHlOXftAJc1zrC",
    tag: "Perfect for sole operators",
    maxUsers: 1,
    features: [
      "Jobs & job tracking",
      "Invoicing & quotes",
      "Payments via Stripe",
      "Basic customer records",
      "1 user only",
    ],
    lockedFeatures: [
      "Scheduling & calendar",
      "Properties & sub-locations",
      "Staff & subcontractor management",
      "Financial reports & BAS",
    ],
  },
  pro: {
    key: "pro",
    label: "Pro",
    price: 59,
    priceId: "price_1TJBf8S5sTpTZ9LTGcfjwM2V",
    productId: "prod_UHlBK5yXQxd0Dx",
    tag: "For growing trade and farm businesses",
    maxUsers: 5,
    recommended: true,
    features: [
      "Everything in Starter",
      "Scheduling & calendar",
      "Properties, sites & paddocks",
      "Contacts — customers, staff, subcontractors, suppliers",
      "Subcontractor portal access",
      "Staff management — up to 5 users",
      "Financial reports & BAS",
      "Bank reconciliation",
    ],
    lockedFeatures: [],
  },
  premium: {
    key: "premium",
    label: "Premium",
    price: 99,
    priceId: "price_1TJBrlS5sTpTZ9LTGBltjJMB",
    productId: "prod_UHlOUWF30og1m9",
    tag: "For established businesses with a team",
    maxUsers: Infinity,
    features: [
      "Everything in Pro",
      "Unlimited users",
      "STP payroll (coming soon)",
      "Priority support",
    ],
    lockedFeatures: [],
    comingSoon: ["STP payroll"],
  },
};

export const TIER_ORDER = ["starter", "pro", "premium"];

const OWNER_OVERRIDE_EMAILS = new Set([
  "info@sharonogier.com",
  "sharonlogier@gmail.com",
]);

// Map Stripe product IDs → tier keys
export const PRODUCT_TO_TIER = Object.fromEntries(
  Object.values(TIERS).map((t) => [t.productId, t.key])
);

// ── Feature gating ──────────────────────────────────────────────────────────
// Nav items accessible per tier. Starter users can only access these pages:
const STARTER_ALLOWED_PAGES = new Set([
  "dashboard",
  "invoices",
  "quotes",
  "expenses",
  "clients",
  "documents",
  "chemical records",
  "livestock",
  "machinery",
  "seasonal planner",
  "settings",
]);

// Pro users can access everything except STP payroll (coming soon)
const PRO_ALLOWED_PAGES = null; // null = all pages allowed

// Premium users can access everything
const PREMIUM_ALLOWED_PAGES = null;

/**
 * Check whether a given nav page is accessible for the user's tier.
 * @param {string} page - The nav page key (e.g. "financial insights")
 * @param {string} tier - "starter" | "pro" | "premium" | null
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function isPageAllowed(page, tier) {
  // Default to starter if no tier set (trial users get starter-level access until they choose)
  const effectiveTier = tier || "starter";

  if (effectiveTier === "premium" || effectiveTier === "pro") {
    return { allowed: true };
  }

  // Starter tier
  if (STARTER_ALLOWED_PAGES.has(page)) {
    return { allowed: true };
  }

  return { allowed: false, reason: "upgrade_required" };
}

/**
 * Determine a user's tier from their profile data.
 * Checks subscriptionTier first, falls back to subscriptionProductId mapping.
 */
export function getUserTier(profile) {
  const email = String(profile?.email || "").trim().toLowerCase();
  if (OWNER_OVERRIDE_EMAILS.has(email)) {
    return "pro";
  }
  if (profile?.subscriptionTier) return profile.subscriptionTier;
  if (profile?.subscriptionProductId) {
    return PRODUCT_TO_TIER[profile.subscriptionProductId] || null;
  }
  return null;
}

/**
 * Get upgrade target tier name for a locked feature.
 */
export function getUpgradeTarget(currentTier) {
  if (!currentTier || currentTier === "starter") return "pro";
  if (currentTier === "pro") return "premium";
  return null;
}
