import React, { useMemo, useState } from "react";
import PlanSelectionCards from "../components/PlanSelectionCards";
import { getUserTier, TIERS, TIER_ORDER } from "../tierConfig";
// SettingsPage
// All state and handlers come from SharonPortalWebsite via props.
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage(props) {
  const {
    profile,
    setProfile,
    activeSettingsTab,
    setActiveSettingsTab,
    savingClient,
    newPassword,
    setNewPassword,
    newPasswordConfirm,
    setNewPasswordConfirm,
    isResettingPassword,
    setIsResettingPassword,
    colours,
    cardStyle,
    buttonPrimary,
    buttonSecondary,
    inputStyle,
    labelStyle,
    currency,
    safeNumber,
    isValidEmail,
    DEFAULT_MONTHLY_SUBSCRIPTION,
    settingsTabs,
    DashboardHero,
    InsightChip,
    MetricCard,
    SectionCard,
    EmptyState,
    saveProfileToSupabase,
    handleCloseAccount,
    handleSignOut,
    toast = { success: () => {}, error: () => {} },
    confirm = ({ onConfirm }) => typeof onConfirm === "function" && onConfirm(),
    authUserEmail = "",
    teamMembers = [],
    setTeamMembers = () => {},
    teamInvitations = [],
    setTeamInvitations = () => {},
    supplierPriceLists = [],
    saveSupplierPriceList = async () => null,
    deleteSupplierPriceList = async () => null,
    supabase = null,
    authUser = null,
  } = props;
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermission, setInvitePermission] = useState("viewer");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [subcontractorInviteEmail, setSubcontractorInviteEmail] = useState("");
  const [sendingSubcontractorInvite, setSendingSubcontractorInvite] = useState(false);
  const [activePriceListId, setActivePriceListId] = useState("");
  const [priceItemSearch, setPriceItemSearch] = useState("");

  const OWNER_OVERRIDE_EMAILS = ["info@sharonogier.com", "sharonlogier@gmail.com"];
  const isOwner = OWNER_OVERRIDE_EMAILS.includes((authUserEmail || "").toLowerCase().trim());

  const LOGO_PREVIEW_MAX_HEIGHT = 140;
  const LOGO_PREVIEW_MAX_WIDTH = 320;
  const MAX_LOGO_BYTES = 2 * 1024 * 1024;
  const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      if (!file) return reject(new Error("No file selected"));
      if (!ALLOWED_LOGO_TYPES.has(file.type)) {
        return reject(new Error("Please upload a PNG, JPG, WEBP or GIF logo."));
      }
      if (file.size > MAX_LOGO_BYTES) {
        return reject(new Error("Logo must be 2 MB or smaller."));
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read the selected file."));
      reader.readAsDataURL(file);
    });

  const normaliseHttpsUrl = (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "https:" ? parsed.toString() : null;
    } catch {
      return null;
    }
  };

  const persistProfile = async (nextProfile, successMessage) => {
    const savedProfile = await saveProfileToSupabase(nextProfile);
    if (!savedProfile) {
      throw new Error("Failed to save to the database.");
    }
    toast.success(successMessage);
    return savedProfile;
  };

  const buildPortalAuthUrl = (params = {}) => {
    const nextParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        nextParams.set(key, String(value));
      }
    });
    const query = nextParams.toString();
    return `${window.location.origin}/auth${query ? `?${query}` : ""}`;
  };

  const createItemId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `supplier-item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const normalisePriceItems = (items = []) =>
    (Array.isArray(items) ? items : []).map((item) => {
      const buy = Number(item?.buyPrice ?? 0);
      const sell = Number(item?.sellPrice ?? 0);
      return {
        id: item?.id || createItemId(),
        name: String(item?.name || item?.itemName || "").trim(),
        itemCode: String(item?.itemCode || "").trim(),
        unit: String(item?.unit || "each").trim() || "each",
        buyPrice: Number.isFinite(buy) ? buy : 0,
        sellPrice: Number.isFinite(sell) ? sell : 0,
        gstApplicable: Boolean(item?.gstApplicable),
        isActive: item?.isActive !== false,
      };
    });

  const sortedPriceLists = useMemo(
    () => [...(Array.isArray(supplierPriceLists) ? supplierPriceLists : [])].sort((a, b) => String(a?.supplierName || "").localeCompare(String(b?.supplierName || ""))),
    [supplierPriceLists]
  );

  const selectedPriceListId = useMemo(() => {
    if (!sortedPriceLists.length) return "";
    if (sortedPriceLists.some((list) => String(list.id) === String(activePriceListId))) return String(activePriceListId);
    return String(sortedPriceLists[0].id);
  }, [activePriceListId, sortedPriceLists]);

  const selectedPriceList = useMemo(
    () => sortedPriceLists.find((list) => String(list.id) === String(selectedPriceListId)) || null,
    [selectedPriceListId, sortedPriceLists]
  );

  const upsertPriceList = async (nextList, successMessage) => {
    const payload = {
      ...nextList,
      supplierName: String(nextList?.supplierName || "").trim(),
      currency: String(nextList?.currency || "AUD").trim() || "AUD",
      dateLastUpdated: nextList?.dateLastUpdated || new Date().toISOString().slice(0, 10),
      items: normalisePriceItems(nextList?.items || []),
    };
    if (!payload.supplierName) {
      toast.error("Supplier name is required.");
      return null;
    }
    const saved = await saveSupplierPriceList(payload, { silent: !successMessage });
    if (saved) {
      setActivePriceListId(String(saved.id));
      if (successMessage) toast.success(successMessage);
    }
    return saved;
  };

  const createPriceList = async () => {
    const saved = await upsertPriceList({
      supplierName: `Supplier ${sortedPriceLists.length + 1}`,
      currency: "AUD",
      dateLastUpdated: new Date().toISOString().slice(0, 10),
      items: [],
    });
    if (saved) {
      setActivePriceListId(String(saved.id));
    }
  };

  const duplicatePriceList = async (list) => {
    if (!list) return;
    await upsertPriceList({
      supplierName: `${list.supplierName || "Supplier"} (Copy)`,
      currency: list.currency || "AUD",
      dateLastUpdated: new Date().toISOString().slice(0, 10),
      items: normalisePriceItems(list.items || []).map((item) => ({ ...item, id: createItemId() })),
    }, "Price list duplicated");
  };

  const updateSelectedPriceList = async (changes) => {
    if (!selectedPriceList) return;
    await upsertPriceList({ ...selectedPriceList, ...changes });
  };

  const updateSelectedItem = async (itemId, changes) => {
    if (!selectedPriceList) return;
    const items = normalisePriceItems(selectedPriceList.items || []).map((item) =>
      String(item.id) === String(itemId) ? { ...item, ...changes } : item
    );
    await updateSelectedPriceList({ items, dateLastUpdated: new Date().toISOString().slice(0, 10) });
  };

  const addPriceListItem = async () => {
    if (!selectedPriceList) return;
    const items = [...normalisePriceItems(selectedPriceList.items || []), {
      id: createItemId(),
      name: "",
      itemCode: "",
      unit: "each",
      buyPrice: 0,
      sellPrice: 0,
      gstApplicable: true,
      isActive: true,
    }];
    await updateSelectedPriceList({ items, dateLastUpdated: new Date().toISOString().slice(0, 10) });
  };

  const deletePriceListItem = async (itemId) => {
    if (!selectedPriceList) return;
    const items = normalisePriceItems(selectedPriceList.items || []).filter((item) => String(item.id) !== String(itemId));
    await updateSelectedPriceList({ items, dateLastUpdated: new Date().toISOString().slice(0, 10) });
  };

  const downloadPriceListTemplate = () => {
    const template = [
      "item_name,item_code,unit,buy_price,sell_price,gst_applicable,is_active",
      "Annual service kit,ASK-100,each,80.00,120.00,yes,yes",
      "PVC pipe 20mm,PVC20,metre,4.50,7.20,yes,yes",
    ].join("\n");
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "supplier-price-list-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line = "") => {
    const out = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === "\"") {
        if (inQuotes && line[i + 1] === "\"") {
          current += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  };

  const parseBooleanCsvValue = (value, fallback = true) => {
    const lowered = String(value || "").trim().toLowerCase();
    if (!lowered) return fallback;
    if (["y", "yes", "true", "1"].includes(lowered)) return true;
    if (["n", "no", "false", "0"].includes(lowered)) return false;
    return fallback;
  };

  const importPriceListCsv = async (file) => {
    if (!selectedPriceList || !file) return;
    try {
      const csvText = await file.text();
      const rows = csvText.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
      if (!rows.length) {
        toast.error("CSV file is empty.");
        return;
      }
      const headers = parseCsvLine(rows[0]).map((h) => String(h || "").trim().toLowerCase());
      const findValue = (record, aliases, fallback = "") => {
        const idx = aliases.map((alias) => headers.indexOf(alias)).find((v) => v >= 0);
        return idx >= 0 ? record[idx] : fallback;
      };
      const importedItems = rows.slice(1).map((line) => parseCsvLine(line)).map((record) => {
        const buyPrice = Number(findValue(record, ["buy_price", "buy price"], "0"));
        const sellPrice = Number(findValue(record, ["sell_price", "sell price"], "0"));
        return {
          id: createItemId(),
          name: findValue(record, ["item_name", "item name", "name"], ""),
          itemCode: findValue(record, ["item_code", "item code", "code"], ""),
          unit: findValue(record, ["unit"], "each") || "each",
          buyPrice: Number.isFinite(buyPrice) ? buyPrice : 0,
          sellPrice: Number.isFinite(sellPrice) ? sellPrice : 0,
          gstApplicable: parseBooleanCsvValue(findValue(record, ["gst_applicable", "gst applicable", "gst"], "yes"), true),
          isActive: parseBooleanCsvValue(findValue(record, ["is_active", "active"], "yes"), true),
        };
      }).filter((item) => item.name);

      if (!importedItems.length) {
        toast.error("No valid line items found in CSV.");
        return;
      }

      const merged = [...normalisePriceItems(selectedPriceList.items || []), ...importedItems];
      await updateSelectedPriceList({
        items: merged,
        dateLastUpdated: new Date().toISOString().slice(0, 10),
      });
      toast.success(`${importedItems.length} item${importedItems.length === 1 ? "" : "s"} imported`);
    } catch (err) {
      toast.error(err.message || "Failed to import CSV");
    }
  };

  const visiblePriceItems = useMemo(() => {
    const term = String(priceItemSearch || "").trim().toLowerCase();
    const items = normalisePriceItems(selectedPriceList?.items || []);
    if (!term) return items;
    return items.filter((item) =>
      String(item.name || "").toLowerCase().includes(term) ||
      String(item.itemCode || "").toLowerCase().includes(term)
    );
  }, [priceItemSearch, selectedPriceList]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero title="Settings" subtitle="Configure your business profile, financial settings, branding and security. Click Save on each tab to apply changes." highlight={activeSettingsTab}>
        <InsightChip label="Business" value={profile.businessName || "Not set"} />
        <InsightChip label="ABN" value={profile.abn || "Not set"} />
        <InsightChip label="GST" value={profile.gstRegistered ? "Registered" : "Not registered"} />
      </DashboardHero>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <MetricCard title="Tax rate" value={`${profile.taxRate || 30}%`} subtitle="Income tax rate used for reserve estimates." accent={colours.navy} />
        <MetricCard title="Payment terms" value={`${profile.paymentTermsDays || 14} days`} subtitle="Default days until invoice is due." accent={colours.teal} />
        <MetricCard title="Subscription fee" value={currency(safeNumber(profile.monthlySubscription ?? DEFAULT_MONTHLY_SUBSCRIPTION))} subtitle="Monthly portal fee deducted from Safe to Spend." accent={colours.purple} />
        <MetricCard title="Invoice prefix" value={profile.invoicePrefix || "INV"} subtitle="Auto-applied to all new invoice numbers." accent={colours.navy} />
      </div>
      <SectionCard
        title="Settings"
        right={
          <div style={{ minWidth: 220 }}>
            <select
              style={inputStyle}
              value={activeSettingsTab}
              onChange={(e) => setActiveSettingsTab(e.target.value)}
            >
              {settingsTabs.map((tab) => (
                <option key={tab} value={tab}>
                  {tab}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {activeSettingsTab === "Profile" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle}>Business Name</label>
              <input
                style={inputStyle}
                value={profile.businessName}
                onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>ABN</label>
              <input
                style={inputStyle}
                value={profile.abn}
                onChange={(e) => setProfile({ ...profile, abn: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                autoComplete="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>Phone</label>
              <input
                style={inputStyle}
                type="tel"
                autoComplete="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Address</label>
              <input
                style={inputStyle}
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              />
            </div>

            {/* Google Review & Customer Engagement */}
            <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${colours.border || "#E2E8F0"}`, paddingTop: 20, marginTop: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: colours.text, marginBottom: 4 }}>⭐ Customer Reviews</div>
              <p style={{ fontSize: 12, color: colours.muted, marginBottom: 12 }}>When a job is completed, your customer will automatically receive a review request email. Paste your Google Review link below so they can leave a review in one tap.</p>
              <div>
                <label style={labelStyle}>Google Review URL</label>
                <input
                  style={inputStyle}
                  type="url"
                  placeholder="https://g.page/r/YOUR-PLACE-ID/review"
                  value={profile.googleReviewUrl || ""}
                  onChange={(e) => setProfile({ ...profile, googleReviewUrl: e.target.value })}
                />
                <div style={{ fontSize: 11, color: colours.muted, marginTop: 4 }}>Find yours at <a href="https://support.google.com/business/answer/7035772" target="_blank" rel="noopener noreferrer" style={{ color: colours.purple }}>Google Business Profile</a> → Share review link</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                  <input type="checkbox" checked={profile.autoSendReviewRequest !== false} onChange={e => setProfile({ ...profile, autoSendReviewRequest: e.target.checked })} />
                  Automatically email a review request when a job is completed
                </label>
              </div>
            </div>

            {/* Business Type & Industry */}
            <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${colours.border || "#E2E8F0"}`, paddingTop: 20, marginTop: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: colours.text, marginBottom: 12 }}>Business Type</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                {[
                  { key: "tradie", icon: "🪖", label: "Tradie" },
                  { key: "farmer", icon: "🚜", label: "Farmer / Agriculture" },
                  { key: "smallbusiness", icon: "🏪", label: "Small Business" },
                ].map((bt) => {
                  const sel = profile.businessType === bt.key;
                  return (
                    <button
                      key={bt.key}
                      type="button"
                      onClick={() => setProfile({ ...profile, businessType: bt.key })}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "12px 20px", borderRadius: 14, cursor: "pointer",
                        border: `2px solid ${sel ? colours.purple : (colours.border || "#E2E8F0")}`,
                        background: sel ? `${colours.purple}0A` : "#fff",
                        fontWeight: 700, fontSize: 14, transition: "all 0.2s ease",
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{bt.icon}</span>
                      <span style={{ color: sel ? colours.purple : colours.text }}>{bt.label}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: colours.muted, lineHeight: 1.6, marginBottom: 12 }}>
                This changes dashboard layout and labels throughout the app. Your data stays the same.
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button style={buttonPrimary} onClick={async () => {
                try {
                  if (profile.email && typeof isValidEmail === "function" && !isValidEmail(profile.email)) {
                    throw new Error("Please enter a valid email address.");
                  }
                  await persistProfile(profile, "Profile saved!");
                } catch (err) { toast.error(err.message || "Failed to save profile"); }
              }}>Save Profile</button>
            </div>
          </div>
        )}

        {activeSettingsTab === "Financial" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle}>Invoice Prefix</label>
              <input
                style={inputStyle}
                value={profile.invoicePrefix}
                onChange={(e) => setProfile({ ...profile, invoicePrefix: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>Quote Prefix</label>
              <input
                style={inputStyle}
                value={profile.quotePrefix}
                onChange={(e) => setProfile({ ...profile, quotePrefix: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>Payment Terms (days)</label>
              <input
                type="number"
                style={inputStyle}
                value={profile.paymentTermsDays}
                onChange={(e) => setProfile({ ...profile, paymentTermsDays: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>Tax Rate %</label>
              <input
                type="number"
                style={inputStyle}
                value={profile.taxRate}
                onChange={(e) => setProfile({ ...profile, taxRate: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>Portal Subscription Fee ($/mo)</label>
              <input
                type="number"
                style={{ ...inputStyle, ...(isOwner ? {} : { background: "#f3f4f6", color: "#9ca3af", cursor: "not-allowed" }) }}
                value={profile.monthlySubscription ?? DEFAULT_MONTHLY_SUBSCRIPTION}
                onChange={(e) => {
                  if (!isOwner) return;
                  setProfile({ ...profile, monthlySubscription: safeNumber(e.target.value) });
                }}
                readOnly={!isOwner}
                placeholder="45"
                min="0"
                step="1"
              />
              <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>
                {isOwner
                  ? "Fixed monthly subscription cost ($27 default). Deducted from Safe to Spend on the dashboard."
                  : "This fee is set by your account administrator and cannot be changed."}
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={profile.gstRegistered}
                onChange={(e) => setProfile({ ...profile, gstRegistered: e.target.checked })}
              />
              GST Registered
            </label>

            <div>
              <label style={labelStyle}>Bank Name</label>
              <input
                style={inputStyle}
                value={profile.bankName}
                onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>BSB</label>
              <input
                style={inputStyle}
                inputMode="numeric"
                maxLength={7}
                value={profile.bsb}
                onChange={(e) => setProfile({ ...profile, bsb: e.target.value.replace(/[^\d-]/g, "").slice(0, 7) })}
              />
            </div>

            <div>
              <label style={labelStyle}>Account Number</label>
              <input
                style={inputStyle}
                inputMode="numeric"
                maxLength={12}
                value={profile.accountNumber}
                onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 12) })}
              />
            </div>

            <div>
              <label style={labelStyle}>PayID</label>
              <input
                style={inputStyle}
                autoComplete="off"
                value={profile.payId}
                onChange={(e) => setProfile({ ...profile, payId: e.target.value.trimStart() })}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Stripe Payment Link</label>
              <input
                style={inputStyle}
                value={profile.stripePaymentLink || ""}
                onChange={(e) => setProfile({ ...profile, stripePaymentLink: e.target.value })}
                placeholder="https://buy.stripe.com/..."
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>PayPal Business Email</label>
              <input
                style={inputStyle}
                value={profile.paypalBusinessEmail || ""}
                onChange={(e) => setProfile({ ...profile, paypalBusinessEmail: e.target.value.trim() })}
                placeholder="your-paypal-email@example.com"
              />
              <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>
                Used to generate a PayPal checkout link with the invoice amount prefilled. Do not use a PayPal.Me link here.
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Stripe Server URL</label>
              <input
                style={inputStyle}
                value={profile.stripeServerUrl || ""}
                onChange={(e) => setProfile({ ...profile, stripeServerUrl: e.target.value })}
                placeholder="Leave blank for automatic live URL, or enter your backend URL"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button style={buttonPrimary} onClick={async () => {
                try {
                  const stripeServerUrl = normaliseHttpsUrl(profile.stripeServerUrl);
                  if (profile.stripeServerUrl && !stripeServerUrl) {
                    throw new Error("Stripe Server URL must be a valid HTTPS URL.");
                  }
                  if (profile.paypalBusinessEmail && typeof isValidEmail === "function" && !isValidEmail(profile.paypalBusinessEmail)) {
                    throw new Error("Please enter a valid PayPal business email.");
                  }
                  const stripePaymentLink = normaliseHttpsUrl(profile.stripePaymentLink);
                  if (profile.stripePaymentLink && !stripePaymentLink) {
                    throw new Error("Stripe Payment Link must be a valid HTTPS URL.");
                  }
                  const sanitisedProfile = {
                    ...profile,
                    stripeServerUrl,
                    stripePaymentLink,
                    paypalBusinessEmail: String(profile.paypalBusinessEmail || "").trim(),
                  };
                  setProfile(sanitisedProfile);
                  await persistProfile(sanitisedProfile, "Financial settings saved!");
                } catch (err) { toast.error(err.message || "Failed to save settings"); }
              }}>Save Financial Settings</button>
            </div>
          </div>
        )}

        {activeSettingsTab === "Branding" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={labelStyle}>Upload Logo</label>
              <input
                type="file"
                accept="image/*"
                style={inputStyle}
                onChange={async (e) => {
                  try {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const dataUrl = await fileToDataUrl(file);
                    const updated = { ...profile, logoFileName: file.name, logoDataUrl: dataUrl };
                    setProfile(updated);
                    await persistProfile(updated, "Logo saved!");
                  } catch (err) {
                    toast.error(err.message || "Logo uploaded but failed to save.");
                  } finally {
                    e.target.value = "";
                  }
                }}
              />
            </div>

            {profile.logoDataUrl ? (
              <div>
                <img
                  src={profile.logoDataUrl}
                  alt="Logo preview"
                  style={{ maxHeight: LOGO_PREVIEW_MAX_HEIGHT, maxWidth: LOGO_PREVIEW_MAX_WIDTH, objectFit: "contain" }}
                />
              </div>
            ) : <EmptyState icon="📁" title="No documents yet" message="Upload receipts, contracts and generated PDFs here. All documents are stored securely against your account." />}

            <div>
              <label style={labelStyle}>Legal Business Name</label>
              <input
                style={inputStyle}
                value={profile.legalBusinessName}
                onChange={(e) => setProfile({ ...profile, legalBusinessName: e.target.value })}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={profile.hideLegalNameOnDocs}
                onChange={(e) => setProfile({ ...profile, hideLegalNameOnDocs: e.target.checked })}
              />
              Hide legal name on documents
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={profile.hideAddressOnDocs}
                onChange={(e) => setProfile({ ...profile, hideAddressOnDocs: e.target.checked })}
              />
              Hide address on documents
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={profile.hidePhoneOnDocs}
                onChange={(e) => setProfile({ ...profile, hidePhoneOnDocs: e.target.checked })}
              />
              Hide phone on documents
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button style={buttonPrimary} onClick={async () => {
                try {
                  await persistProfile(profile, "Branding saved!");
                } catch (err) { toast.error(err.message || "Failed to save branding"); }
              }}>
                Save Branding
              </button>
            </div>
          </div>
        )}

        {activeSettingsTab === "Plan & Billing" && (() => {
          const userTier = getUserTier(profile);
          const currentTierData = userTier ? TIERS[userTier] : null;
          const [upgradeLoading, setUpgradeLoading] = React.useState(false);
          const [showConfirm, setShowConfirm] = React.useState(null);
          const [showDowngrade, setShowDowngrade] = React.useState(null);
          const [downgradeConfirmText, setDowngradeConfirmText] = React.useState("");

          const handleTierSelect = async (tierKey) => {
            if (tierKey === userTier) return;
            const isUpgrade = !userTier || TIER_ORDER.indexOf(tierKey) > TIER_ORDER.indexOf(userTier);
            if (isUpgrade) {
              setShowConfirm(tierKey);
            } else {
              setShowDowngrade(tierKey);
            }
          };

          const confirmUpgrade = async () => {
            const tierKey = showConfirm;
            setShowConfirm(null);
            setUpgradeLoading(true);
            try {
              const tier = TIERS[tierKey];
              const { data, error } = await supabase.functions.invoke("create-checkout", {
                body: { priceId: tier.priceId },
              });
              if (error) throw error;
              if (data?.url) window.location.href = data.url;
              else throw new Error(data?.error || "Could not start checkout");
            } catch (err) {
              toast.error(err.message || "Failed to start upgrade");
            } finally {
              setUpgradeLoading(false);
            }
          };

          const confirmDowngrade = async () => {
            if (downgradeConfirmText !== "CONFIRM") return;
            setShowDowngrade(null);
            setDowngradeConfirmText("");
            toast.info("Downgrade will take effect at your next billing date. Your current features remain active until then.");
            // Save the target tier — actual Stripe change would be handled server-side
            const updated = { ...profile, pendingDowngradeTier: showDowngrade };
            setProfile(updated);
            await saveProfileToSupabase(updated);
          };

          return (
            <div style={{ display: "grid", gap: 24 }}>
              {/* Current plan info */}
              {currentTierData && (
                <div style={{
                  background: `${colours.purple}08`, border: `2px solid ${colours.purple}22`,
                  borderRadius: 18, padding: 24, display: "grid", gap: 12,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: colours.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Current Plan</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: colours.text }}>{currentTierData.label}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: colours.purple }}>${currentTierData.price}/mo</div>
                      <div style={{ fontSize: 12, color: colours.muted }}>inc. GST</div>
                    </div>
                  </div>
                  {profile.subscriptionEnd && (
                    <div style={{ fontSize: 13, color: colours.muted }}>
                      Next billing date: {new Date(profile.subscriptionEnd).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  )}
                  {profile.subscriptionStatus === "trialing" && (
                    <div style={{
                      background: "#DCFCE7", color: "#166534", borderRadius: 10,
                      padding: "8px 14px", fontSize: 13, fontWeight: 700,
                    }}>
                      🎉 You're on your 14-day free trial
                    </div>
                  )}
                </div>
              )}

              {/* Starter user dashboard banner */}
              {(!userTier || userTier === "starter") && (
                <div style={{
                  background: `linear-gradient(135deg, ${colours.purple}0A, ${colours.teal || "#006D6D"}0A)`,
                  border: `1px solid ${colours.border}`,
                  borderRadius: 14, padding: "16px 20px",
                  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <span style={{ fontSize: 14, color: colours.text, flex: 1 }}>
                    You're on the <strong>Starter</strong> plan. Upgrade to <strong>Pro</strong> to unlock scheduling, properties and your full business toolkit.
                  </span>
                  <button
                    onClick={() => handleTierSelect("pro")}
                    style={{
                      background: colours.purple, color: "#fff", border: "none",
                      borderRadius: 10, padding: "10px 20px", fontWeight: 800,
                      fontSize: 13, cursor: "pointer",
                    }}
                  >
                    Upgrade now →
                  </button>
                </div>
              )}

              <PlanSelectionCards
                currentTier={userTier}
                onSelect={handleTierSelect}
                loading={upgradeLoading}
                mode="settings"
                colours={colours}
              />

              {/* Upgrade confirmation modal */}
              {showConfirm && (
                <div style={{ position: "fixed", inset: 0, zIndex: 99998, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <div style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: colours.text, marginBottom: 12 }}>
                      Upgrade to {TIERS[showConfirm].label}
                    </div>
                    <div style={{ fontSize: 14, color: colours.muted, lineHeight: 1.7, marginBottom: 24 }}>
                      You are upgrading to <strong>{TIERS[showConfirm].label}</strong> at <strong>${TIERS[showConfirm].price}/month</strong>.
                      {profile.subscriptionStatus === "trialing" && " Your 14-day free trial applies if still active. After your trial, your card will be charged."}
                      {" "}No lock-in contracts. Cancel anytime.
                    </div>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                      <button onClick={() => setShowConfirm(null)} style={{ background: "#fff", color: colours.text, border: `1px solid ${colours.border}`, borderRadius: 12, padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
                      <button onClick={confirmUpgrade} style={{ background: colours.purple, color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Confirm upgrade</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Downgrade confirmation modal */}
              {showDowngrade && (
                <div style={{ position: "fixed", inset: 0, zIndex: 99998, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <div style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#EF4444", marginBottom: 12, textAlign: "center" }}>⚠️ Downgrade to {TIERS[showDowngrade].label}</div>
                    <div style={{ fontSize: 14, color: colours.muted, lineHeight: 1.7, marginBottom: 16 }}>
                      You will lose access to the following features at your next billing date:
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", display: "grid", gap: 6 }}>
                      {(TIERS[showDowngrade].lockedFeatures || []).map((f) => (
                        <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#EF4444" }}>
                          <span>✕</span> {f}
                        </li>
                      ))}
                      {userTier === "premium" && showDowngrade === "starter" && (
                        <>
                          <li style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#EF4444" }}>
                            <span>✕</span> Scheduling & calendar
                          </li>
                          <li style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#EF4444" }}>
                            <span>✕</span> Properties & sub-locations
                          </li>
                          <li style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#EF4444" }}>
                            <span>✕</span> Financial reports & BAS
                          </li>
                        </>
                      )}
                    </ul>
                    <div style={{ fontSize: 14, color: colours.text, fontWeight: 700, marginBottom: 8 }}>
                      Type CONFIRM to proceed:
                    </div>
                    <input
                      value={downgradeConfirmText}
                      onChange={(e) => setDowngradeConfirmText(e.target.value)}
                      placeholder="Type CONFIRM"
                      style={{ ...inputStyle, marginBottom: 16 }}
                    />
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                      <button onClick={() => { setShowDowngrade(null); setDowngradeConfirmText(""); }} style={{ background: "#fff", color: colours.text, border: `1px solid ${colours.border}`, borderRadius: 12, padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
                      <button
                        onClick={confirmDowngrade}
                        disabled={downgradeConfirmText !== "CONFIRM"}
                        style={{
                          background: downgradeConfirmText === "CONFIRM" ? "#EF4444" : "#E2E8F0",
                          color: downgradeConfirmText === "CONFIRM" ? "#fff" : "#9CA3AF",
                          border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700,
                          cursor: downgradeConfirmText === "CONFIRM" ? "pointer" : "not-allowed", fontSize: 14,
                        }}
                      >
                        Confirm downgrade
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeSettingsTab === "Team" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: colours.text, marginBottom: 4 }}>Team Members</div>
            <div style={{ fontSize: 13, color: colours.muted, lineHeight: 1.6, marginBottom: 8 }}>
              Invite team members to access your portal. Viewers can see data; Editors can also make changes.
            </div>

            {/* Invite form */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" placeholder="team@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              </div>
              <div style={{ minWidth: 120 }}>
                <label style={labelStyle}>Permission</label>
                <select style={inputStyle} value={invitePermission} onChange={e => setInvitePermission(e.target.value)}>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <button style={{ ...buttonPrimary, padding: "10px 20px", whiteSpace: "nowrap" }} disabled={sendingInvite} onClick={async () => {
                if (!inviteEmail.trim() || !isValidEmail(inviteEmail)) { toast.error("Please enter a valid email."); return; }
                setSendingInvite(true);
                try {
                  const { error } = await supabase.from("sas_team_invitations").insert({ inviter_user_id: authUser.id, email: inviteEmail.trim().toLowerCase(), permission: invitePermission });
                  if (error) throw error;
                  // Send invite email
                  await supabase.functions.invoke("send-document-email", { body: { to: [inviteEmail.trim()], subject: `You've been invited to ${profile.businessName || "a portal"}`, html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;"><h2 style="color:#6A1B9A;">Team Invitation</h2><p>${profile.businessName || "A business"} has invited you to join their accounting portal as a <strong>${invitePermission}</strong>.</p><p>Sign up or log in at <a href="${window.location.origin}/portal">${window.location.host}/portal</a> to get started.</p></div>` } });
                  const { data: updated } = await supabase.from("sas_team_invitations").select("*").eq("inviter_user_id", authUser.id);
                  setTeamInvitations(updated || []);
                  setInviteEmail("");
                  toast.success("Invitation sent!");
                } catch (err) { toast.error(err.message || "Failed to send invitation"); }
                setSendingInvite(false);
              }}>
                {sendingInvite ? "Sending..." : "Send Invite"}
              </button>
            </div>

            {/* Pending invitations */}
            {teamInvitations.filter(i => i.status === "pending").length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colours.text, marginBottom: 8 }}>Pending Invitations</div>
                {teamInvitations.filter(i => i.status === "pending").map(inv => (
                  <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, border: `1px solid ${colours.border}`, marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{inv.email}</span>
                      <span style={{ fontSize: 11, color: colours.muted, marginLeft: 8, background: colours.lightPurple, padding: "2px 8px", borderRadius: 4 }}>{inv.permission}</span>
                    </div>
                    <button style={{ ...buttonSecondary, padding: "4px 12px", fontSize: 11 }} onClick={async () => {
                      await supabase.from("sas_team_invitations").delete().eq("id", inv.id);
                      setTeamInvitations(prev => prev.filter(i => i.id !== inv.id));
                      toast.success("Invitation cancelled");
                    }}>Cancel</button>
                  </div>
                ))}
              </div>
            )}

            {/* Active members */}
            {teamMembers.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colours.text, marginBottom: 8 }}>Active Members</div>
                {teamMembers.map(m => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, border: `1px solid ${colours.border}`, marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{m.member_user_id.slice(0, 8)}...</span>
                      <span style={{ fontSize: 11, color: colours.muted, marginLeft: 8, background: colours.lightTeal, padding: "2px 8px", borderRadius: 4 }}>{m.permission}</span>
                    </div>
                    <button style={{ ...buttonSecondary, padding: "4px 12px", fontSize: 11, color: "#EF4444", borderColor: "#FECACA" }} onClick={async () => {
                      await supabase.from("sas_team_members").delete().eq("id", m.id);
                      setTeamMembers(prev => prev.filter(tm => tm.id !== m.id));
                      toast.success("Member removed");
                    }}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            {/* Subcontractor invitations section */}
            <div style={{ marginTop: 24, borderTop: `1px solid ${colours.border}`, paddingTop: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colours.text, marginBottom: 4 }}>Subcontractors</div>
              <div style={{ fontSize: 13, color: colours.muted, lineHeight: 1.6, marginBottom: 12 }}>
                Subcontractors get a limited portal where they can view assigned jobs and submit their costs (labour, materials, receipts).
                Assign them to specific jobs from the Scheduling → Job Costing panel.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <label style={labelStyle}>Subcontractor Email</label>
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="subcontractor@example.com"
                    value={subcontractorInviteEmail}
                    onChange={(e) => setSubcontractorInviteEmail(e.target.value)}
                  />
                </div>
                <button
                  style={{ ...buttonPrimary, padding: "10px 20px", whiteSpace: "nowrap" }}
                  disabled={sendingSubcontractorInvite}
                  onClick={async () => {
                    const email = String(subcontractorInviteEmail || "").trim().toLowerCase();
                    if (!email || !isValidEmail(email)) {
                      toast.error("Please enter a valid subcontractor email.");
                      return;
                    }
                    if (!supabase) {
                      toast.error("Email service is not available right now.");
                      return;
                    }

                    const inviteUrl = buildPortalAuthUrl({
                      mode: "signup",
                      portal: "subcontractor",
                      role: "subcontractor",
                      email,
                    });

                    setSendingSubcontractorInvite(true);
                    try {
                      const { error } = await supabase.functions.invoke("send-document-email", {
                        body: {
                          to: [email],
                          subject: `Subcontractor portal invite from ${profile.businessName || "your contractor"}`,
                          html: `<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;padding:24px;"><h2 style="color:#6A1B9A;margin-bottom:12px;">Subcontractor Portal Invite</h2><p style="font-size:14px;line-height:1.7;color:#334155;">${profile.businessName || "A business"} has invited you to join their subcontractor portal.</p><p style="font-size:14px;line-height:1.7;color:#334155;">Use the button below to create your subcontractor login with this email address. Once the owner assigns your subcontractor role and jobs, you'll be able to view assigned work and submit receipts and costs.</p><p style="margin:24px 0;"><a href="${inviteUrl}" style="display:inline-block;background:#6A1B9A;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">Create subcontractor account</a></p><p style="font-size:13px;line-height:1.7;color:#64748B;">If the button does not work, copy and paste this link into your browser:<br /><a href="${inviteUrl}">${inviteUrl}</a></p></div>`,
                        },
                      });
                      if (error) throw error;
                      setSubcontractorInviteEmail("");
                      toast.success("Subcontractor invite sent!");
                    } catch (err) {
                      toast.error(err.message || "Failed to send subcontractor invite");
                    } finally {
                      setSendingSubcontractorInvite(false);
                    }
                  }}
                >
                  {sendingSubcontractorInvite ? "Sending..." : "Send Subcontractor Invite"}
                </button>
              </div>
              <div style={{ background: "#F3E5F5", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6A1B9A", marginBottom: 4 }}>How it works</div>
                <ol style={{ fontSize: 12, color: "#4A148C", lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
                  <li>Send them the subcontractor invite email above so they land on the subcontractor sign-up page</li>
                  <li>They create an account using the invited email address</li>
                  <li>You assign the <strong>subcontractor</strong> role to their account (contact admin)</li>
                  <li>Assign them to jobs from the Scheduling page → Job Costing → Subcontractor tab</li>
                  <li>They'll see only their assigned jobs and can submit costs with receipts</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {activeSettingsTab === "Price Lists" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: colours.text }}>Supplier Price Lists</div>
                <div style={{ fontSize: 13, color: colours.muted, marginTop: 4 }}>
                  Create one price list per supplier, import CSVs, and use these items in quotes and jobs.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={buttonSecondary} onClick={downloadPriceListTemplate}>Download CSV Template</button>
                <button style={buttonPrimary} onClick={createPriceList}>+ New Price List</button>
              </div>
            </div>

            {sortedPriceLists.length > 0 ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 0.7fr) minmax(0, 2fr)", gap: 16 }}>
                  <div style={{ ...cardStyle, padding: 12, display: "grid", gap: 8, alignSelf: "start" }}>
                    {sortedPriceLists.map((list) => {
                      const isActive = String(list.id) === String(selectedPriceListId);
                      return (
                        <button
                          key={list.id}
                          onClick={() => setActivePriceListId(String(list.id))}
                          style={{
                            textAlign: "left",
                            border: `1px solid ${isActive ? colours.purple : colours.border}`,
                            background: isActive ? `${colours.purple}10` : colours.white,
                            borderRadius: 10,
                            padding: "10px 12px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: colours.text }}>{list.supplierName || "Unnamed supplier"}</div>
                          <div style={{ fontSize: 11, color: colours.muted, marginTop: 4 }}>
                            {(Array.isArray(list.items) ? list.items.length : 0)} items • {list.currency || "AUD"} • Updated {list.dateLastUpdated || "—"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedPriceList && (
                    <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 14 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.2fr) minmax(140px, 0.6fr) minmax(160px, 0.7fr)", gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Supplier name</label>
                          <input
                            style={inputStyle}
                            value={selectedPriceList.supplierName || ""}
                            onChange={(e) => updateSelectedPriceList({ supplierName: e.target.value })}
                            placeholder="Supplier name"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Currency</label>
                          <input
                            style={inputStyle}
                            value={selectedPriceList.currency || "AUD"}
                            onChange={(e) => updateSelectedPriceList({ currency: e.target.value.toUpperCase() })}
                            placeholder="AUD"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Date last updated</label>
                          <input
                            type="date"
                            style={inputStyle}
                            value={selectedPriceList.dateLastUpdated || ""}
                            onChange={(e) => updateSelectedPriceList({ dateLastUpdated: e.target.value })}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button style={buttonSecondary} onClick={() => duplicatePriceList(selectedPriceList)}>Duplicate List</button>
                          <button
                            style={{ ...buttonSecondary, color: "#EF4444", borderColor: "#FECACA" }}
                            onClick={() => confirm({
                              title: "Delete this price list?",
                              message: "This keeps historical quote/job data but removes this supplier list from future searches.",
                              confirmLabel: "Delete",
                              onConfirm: () => deleteSupplierPriceList(selectedPriceList.id),
                            })}
                          >
                            Delete List
                          </button>
                        </div>
                        <label style={{ ...buttonSecondary, cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                          Import CSV
                          <input
                            type="file"
                            accept=".csv,text/csv"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) importPriceListCsv(file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <input
                          style={{ ...inputStyle, maxWidth: 360 }}
                          value={priceItemSearch}
                          onChange={(e) => setPriceItemSearch(e.target.value)}
                          placeholder="Search item name or code"
                        />
                        <button style={buttonPrimary} onClick={addPriceListItem}>+ Add Item</button>
                      </div>

                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                          <thead>
                            <tr style={{ background: colours.bg }}>
                              {["Item Name", "Item Code", "Unit", "Buy Price", "Sell Price", "GST", "Status", ""].map((header) => (
                                <th key={header} style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: colours.muted, borderBottom: `1px solid ${colours.border}` }}>
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {visiblePriceItems.map((item) => {
                              const sellBelowBuy = Number(item.sellPrice) < Number(item.buyPrice);
                              return (
                                <tr key={item.id} style={{ borderBottom: `1px solid ${colours.border}` }}>
                                  <td style={{ padding: "8px 6px", minWidth: 220 }}>
                                    <input
                                      style={{ ...inputStyle, fontSize: 13 }}
                                      value={item.name || ""}
                                      onChange={(e) => updateSelectedItem(item.id, { name: e.target.value })}
                                      placeholder="Item name"
                                    />
                                  </td>
                                  <td style={{ padding: "8px 6px", minWidth: 120 }}>
                                    <input
                                      style={{ ...inputStyle, fontSize: 13 }}
                                      value={item.itemCode || ""}
                                      onChange={(e) => updateSelectedItem(item.id, { itemCode: e.target.value })}
                                      placeholder="Optional"
                                    />
                                  </td>
                                  <td style={{ padding: "8px 6px", minWidth: 120 }}>
                                    <input
                                      style={{ ...inputStyle, fontSize: 13 }}
                                      value={item.unit || "each"}
                                      onChange={(e) => updateSelectedItem(item.id, { unit: e.target.value })}
                                      placeholder="each"
                                    />
                                  </td>
                                  <td style={{ padding: "8px 6px", minWidth: 140 }}>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      style={{ ...inputStyle, fontSize: 13 }}
                                      value={item.buyPrice ?? 0}
                                      onChange={(e) => updateSelectedItem(item.id, { buyPrice: Number(e.target.value || 0) })}
                                    />
                                  </td>
                                  <td style={{ padding: "8px 6px", minWidth: 180 }}>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      style={{
                                        ...inputStyle,
                                        fontSize: 13,
                                        borderColor: sellBelowBuy ? "#FCA5A5" : inputStyle.borderColor,
                                        background: sellBelowBuy ? "#FEF2F2" : inputStyle.background,
                                      }}
                                      value={item.sellPrice ?? 0}
                                      onChange={(e) => updateSelectedItem(item.id, { sellPrice: Number(e.target.value || 0) })}
                                    />
                                    {sellBelowBuy && (
                                      <div style={{ marginTop: 4, fontSize: 11, color: "#B91C1C", fontWeight: 600 }}>
                                        Warning: sell price is below buy price.
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: "8px 6px", minWidth: 110 }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: colours.text }}>
                                      <input
                                        type="checkbox"
                                        checked={Boolean(item.gstApplicable)}
                                        onChange={(e) => updateSelectedItem(item.id, { gstApplicable: e.target.checked })}
                                      />
                                      GST
                                    </label>
                                  </td>
                                  <td style={{ padding: "8px 6px", minWidth: 120 }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: colours.text }}>
                                      <input
                                        type="checkbox"
                                        checked={item.isActive !== false}
                                        onChange={(e) => updateSelectedItem(item.id, { isActive: e.target.checked })}
                                      />
                                      {item.isActive !== false ? "Active" : "Inactive"}
                                    </label>
                                  </td>
                                  <td style={{ padding: "8px 6px", width: 40 }}>
                                    <button
                                      onClick={() => deletePriceListItem(item.id)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: colours.muted, fontSize: 18, lineHeight: 1 }}
                                    >
                                      x
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {visiblePriceItems.length === 0 && (
                              <tr>
                                <td colSpan={8} style={{ padding: 16, fontSize: 13, color: colours.muted, textAlign: "center" }}>
                                  No items found. Add one manually or import CSV.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ ...cardStyle, padding: 24 }}>
                <EmptyState
                  icon=""
                  title="No supplier price lists yet"
                  message="Create a supplier list to import item buy/sell prices and use them while quoting jobs."
                  action={<button style={buttonPrimary} onClick={createPriceList}>Create your first price list</button>}
                />
              </div>
            )}
          </div>
        )}

        {activeSettingsTab === "Notifications" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: colours.text, marginBottom: 4 }}>Payment Reminders</div>
            <div style={{ fontSize: 13, color: colours.muted, lineHeight: 1.6, marginBottom: 8 }}>
              Automatically send email reminders to clients when their invoices are overdue. Reminders are sent at 7, 14, and 30 days overdue.
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!profile.remindersDisabled}
                onChange={(e) => setProfile({ ...profile, remindersDisabled: !e.target.checked })}
                style={{ width: 20, height: 20, accentColor: colours.purple }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: colours.text }}>
                Enable automated payment reminders
              </span>
            </label>
            <div style={{ background: colours.lightPurple, borderRadius: 10, padding: 16, marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colours.purple, marginBottom: 8 }}>Reminder Schedule</div>
              <div style={{ display: "grid", gap: 6, fontSize: 13, color: colours.text }}>
                <div>📧 <strong>7 days overdue</strong> — Friendly first reminder</div>
                <div>📧 <strong>14 days overdue</strong> — Second reminder</div>
                <div>📧 <strong>30 days overdue</strong> — Final notice</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button style={buttonPrimary} onClick={async () => {
                try {
                  await persistProfile(profile, "Notification settings saved!");
                } catch (err) { toast.error(err.message || "Failed to save settings"); }
              }}>
                Save Notification Settings
              </button>
            </div>
          </div>
        )}

        {activeSettingsTab === "Security" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ borderTop: `1px solid ${colours.border}`, paddingTop: 20, marginTop: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colours.text, marginBottom: 6 }}>Close Account</div>
              <div style={{ fontSize: 13, color: colours.muted, marginBottom: 16, lineHeight: 1.6 }}>
                Closing your account will sign you out and disable access to the portal. Your data will be kept safe and your account can be reactivated at any time by contacting support.
              </div>
              <button
                onClick={() => confirm({
                  title: "Close your account?",
                  message: "You will be signed out and lose access to the portal. Your data is kept safe and your account can be reactivated at any time by contacting us.",
                  confirmLabel: "Close Account",
                  onConfirm: handleCloseAccount,
                })}
                style={{
                  background: "#fff",
                  color: "#EF4444",
                  border: "1px solid #FECACA",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close Account
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );

}
