const colours = {
  purple: "#6A1B9A",
  teal: "#006D6D",
  navy: "#2B2F6B",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  text: "#14202B",
  muted: "#64748B",
  border: "#E2E8F0",
  lightPurple: "#F5ECFB",
  lightTeal: "#E7F6F5",
  successText: "#166534",
};

const LOGO_DOCUMENT_MAX_HEIGHT = 140;
const LOGO_DOCUMENT_MAX_WIDTH = 440;
const LOGO_PREVIEW_MAX_HEIGHT = 180;
const LOGO_PREVIEW_MAX_WIDTH = 480;

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const collectValidationErrors = (...groups) => groups.flat().filter(Boolean);

const summariseValidationErrors = (title, errors, toastFn) => {
  if (!errors.length) return;
  if (toastFn) {
    errors.forEach((e) => toastFn.error(e, title));
  }
};

const DEFAULT_API_BASE_URL =
  ((typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL)
    ? String(import.meta.env.VITE_API_BASE_URL).trim()
    : "") ||
  (typeof window !== "undefined"
    ? (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      )
        ? "http://localhost:3001"
        : (typeof window !== "undefined" ? window.location.origin : "")
    : (typeof window !== "undefined" ? window.location.origin : ""));

const SUPABASE_FUNCTIONS_BASE_URL =
  ((typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL)
    ? String(import.meta.env.VITE_SUPABASE_URL).trim().replace(/\/$/, "")
    : "");

const SUPABASE_PUBLISHABLE_KEY =
  ((typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY)
    ? String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY).trim()
    : "");

const normaliseApiBaseUrl = (value) => String(value || "").trim().replace(/\/$/, "");

const getApiBaseUrl = (preferredValue = "") => {
  const fallbackUrl = normaliseApiBaseUrl(DEFAULT_API_BASE_URL);
  const rawCandidate = normaliseApiBaseUrl(preferredValue);

  if (!rawCandidate) {
    return fallbackUrl;
  }

  try {
    const parsed = new URL(rawCandidate);

    if (typeof window !== "undefined") {
      const pageIsLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const candidateIsLocal =
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1";

      if (!pageIsLocal && candidateIsLocal) {
        return fallbackUrl;
      }

      if (window.location.protocol === "https:" && parsed.protocol !== "https:") {
        return fallbackUrl;
      }
    }

    return parsed.origin.replace(/\/$/, "");
  } catch (error) {
    console.warn("Invalid API base URL, falling back to default.", {
      preferredValue,
      fallbackUrl,
      error,
    });
    return fallbackUrl;
  }
};

const LOCKED_FEE_RATE_PERCENT = 1;
const DEFAULT_MONTHLY_SUBSCRIPTION = 27;

const SUPABASE_STORAGE_BUCKET = "receipts";

const SUPABASE_TABLES = {
  profile: "sas_profile",
  clients: "sas_clients",
  invoices: "sas_invoices",
  quotes: "sas_quotes",
  expenses: "sas_expenses",
  incomeSources: "sas_income_sources",
  services: "sas_services",
  documents: "sas_documents",
  suppliers: "sas_suppliers",
};

const SUPABASE_SCHEMA_SQL = `-- Run this once in Supabase SQL Editor
create table if not exists sas_profile (
  id bigint primary key,
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists sas_profile_user_id_idx on sas_profile (user_id);

create table if not exists sas_clients (
  id bigint primary key,
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists sas_clients_user_id_idx on sas_clients (user_id);

create table if not exists sas_invoices (
  id bigint primary key,
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists sas_invoices_user_id_idx on sas_invoices (user_id);

create table if not exists sas_quotes (
  id bigint primary key,
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists sas_quotes_user_id_idx on sas_quotes (user_id);

create table if not exists sas_expenses (
  id bigint primary key,
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists sas_expenses_user_id_idx on sas_expenses (user_id);

create table if not exists sas_income_sources (
  id bigint primary key,
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists sas_income_sources_user_id_idx on sas_income_sources (user_id);

create table if not exists sas_services (
  id bigint primary key,
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists sas_services_user_id_idx on sas_services (user_id);

create table if not exists sas_documents (
  id bigint primary key,
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists sas_documents_user_id_idx on sas_documents (user_id);

create table if not exists sas_suppliers (
  id bigint primary key,
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists sas_suppliers_user_id_idx on sas_suppliers (user_id);`;

const GST_TYPE_OPTIONS = [
  { value: "GST on Income (10%)", label: "GST on Income (10%)" },
  { value: "GST Free", label: "GST Free" },
  { value: "Input taxed / No GST", label: "Input taxed / No GST" },
];

const expenseCategories = [
  "Advertising",
  "Bank Fees",
  "Cost of goods sold",
  "Depreciation",
  "Insurance",
  "Motor vehicle expenses",
  "Office Supplies",
  "Printing",
  "Rent",
  "Repairs and maintenance",
  "Software",
  "Stationery",
  "Subscriptions",
  "Telephone and internet",
  "Travel",
  "Utilities",
  "Wages",
  "Other",
];

const incomeTypeOptions = [
  "Casual employment",
  "Salary",
  "Centrelink/Australian government payments",
  "Rental income",
  "Australian interest",
  "Australian dividends",
  "Income earned outside Australia",
  "Cryptocurrency gain/loss",
  "Capital gain/loss from sale of shares",
  "Managed funds distribution",
  "Partnership income",
  "Taxed government pension",
  "Superannuation lump sum payment",
  "Estate or trust income",
  "Capital gain/loss from property sale",
];

const incomeFrequencyOptions = [
  "Weekly",
  "Fortnightly",
  "Monthly",
  "Quarterly",
  "Annually",
  "One-off",
];

const inputStyle = {
  width: "100%",
  border: `1px solid ${colours.border}`,
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  boxSizing: "border-box",
  background: colours.white,
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: colours.text,
  marginBottom: 6,
};

const cardStyle = {
  background: colours.white,
  border: `1px solid ${colours.border}`,
  borderRadius: 18,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const buttonPrimary = {
  background: colours.purple,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const buttonSecondary = {
  background: colours.white,
  color: colours.text,
  border: `1px solid ${colours.border}`,
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const currency = (value) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Only allow genuine base64 image data URLs -- prevents HTML/script injection via logo field
const safeLogoDataUrl = (value) =>
  typeof value === "string" && /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(value.trim())
    ? value.trim()
    : "";

const safeHref = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : "";
  } catch {
    return "";
  }
};

const safeJsonForScript = (value) =>
  JSON.stringify(value ?? null)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const nl2br = (value) => escapeHtml(value).replace(/\n/g, "<br/>");

// Parse YYYY-MM-DD as LOCAL date (not UTC) -- prevents day-shift in AU timezones
const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();
  const parts = String(dateString).slice(0, 10).split("-");
  if (parts.length !== 3) return new Date(dateString);
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
};

// Get today in YYYY-MM-DD local time (not UTC)
const todayLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDateAU = (date) => {
  if (!date) return "";
  const d = parseLocalDate(date);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const addDays = (dateString, days) => {
  const base = parseLocalDate(dateString);
  base.setDate(base.getDate() + safeNumber(days));
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// End of month + 30 days: go to last day of the bill's month, then add 30 days
const addDaysEOM = (dateString) => {
  const base = parseLocalDate(dateString);
  const eom = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  eom.setDate(eom.getDate() + 30);
  const y = eom.getFullYear();
  const m = String(eom.getMonth() + 1).padStart(2, "0");
  const d = String(eom.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const nextNumber = (prefix, items, key) => {
  const nums = items
    .map((item) => String(item[key] || ""))
    .map((v) => Number((v.split("-")[1] || "0").replace(/\D/g, "")))
    .filter((v) => Number.isFinite(v));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
};

const makePaymentReference = (invoiceNumber) => `SAS-${invoiceNumber}`;

const currencyCodeFromLabel = (label) => {
  const value = String(label || "").toUpperCase();
  if (value.includes("USD")) return "USD";
  if (value.includes("NZD")) return "NZD";
  if (value.includes("GBP")) return "GBP";
  if (value.includes("EUR")) return "EUR";
  return "AUD";
};

const formatCurrencyByCode = (value, currencyCode = "AUD") =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const getClientCurrencyCode = (client) => currencyCodeFromLabel(client?.defaultCurrency || "AUD $");

const calculateAdjustmentValues = ({ subtotal = 0, total = 0, client, profile }) => {
  const feeAmount = client?.feesDeducted ?
    total * (LOCKED_FEE_RATE_PERCENT / 100) : 0;
  const taxWithheld = client?.deductsTaxPrior ? subtotal * (safeNumber(profile?.taxRate) / 100) : 0;
  const netExpected = total - feeAmount - taxWithheld;
  return {
    feeAmount,
    taxWithheld,
    netExpected,
  };
};

const buildPayPalInvoiceUrl = ({ businessEmail = "", amount = 0, currencyCode = "AUD", invoiceNumber = "" }) => {
  const email = String(businessEmail || "").trim();
  const total = safeNumber(amount);
  if (!email || total <= 0) return "";
  const params = new URLSearchParams({
    cmd: "_xclick",
    business: email,
    amount: total.toFixed(2),
    currency_code: String(currencyCode || "AUD").toUpperCase(),
    item_name: `Invoice ${invoiceNumber || ""}`.trim(),
    invoice: String(invoiceNumber || ""),
    charset: "UTF-8",
  });
  return `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
};


export function buildQuoteHtml(quote, options = {}, ctx = {}) {
  const { profile, clients } = ctx;
  const getClientById = (id) => clients.find((c) => c.id === safeNumber(id));
  const clientIsGstExempt = (id) => Boolean(getClientById(id)?.outsideAustraliaOrGstExempt);
  const gstAppliesToClient = (id) => Boolean(profile.gstRegistered) && !clientIsGstExempt(id);
  const getDocumentBusinessName = () => profile.hideLegalNameOnDocs || !profile.legalBusinessName ? profile.businessName : profile.legalBusinessName;
  const getDocumentAddress = () => profile.hideAddressOnDocs ? "" : profile.address || "";
const { allowEmail = false } = options;
const qClient = getClientById(quote.clientId);
const currencyCode = quote.currencyCode || getClientCurrencyCode(qClient);
const money = (value) => formatCurrencyByCode(value, currencyCode);
const adjustments = calculateAdjustmentValues({
  subtotal: safeNumber(quote.subtotal),
  total: safeNumber(quote.total),
  client: qClient,
  profile,
});
const gstStatus =
  quote.gstStatus ||
  (clientIsGstExempt(quote.clientId)
    ? "GST not applicable"
    : safeNumber(quote.gst) > 0
      ? "GST applies"
      : "GST free");
const businessName = escapeHtml(getDocumentBusinessName());
const businessAddress = escapeHtml(getDocumentAddress());
const clientName = escapeHtml(qClient?.name || "");
const businessEmail = escapeHtml(profile.email || "");
const businessPhone = escapeHtml(profile.phone || "");
const businessAbn = escapeHtml(profile.abn || "");
const clientDetails =
  qClient?.includeAddressDetails && qClient?.addressDetails
    ? `<div style="margin-top:6px; color:#555;">${nl2br(qClient.addressDetails)}</div>`
    : "";

return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Quote Preview</title>
<style>
body { font-family: Arial; padding:40px; color:#14202B; }
.header { display:flex; justify-content:space-between; border-bottom:1px solid #ddd; padding-bottom:20px; }
.title { font-size:32px; font-weight:900; color:#6A1B9A; }
.right { text-align:right; font-size:14px; }
table { width:100%; border-collapse:collapse; margin-top:24px; }
th, td { padding:10px; border-bottom:1px solid #eee; }
th { text-align:left; color:#667085; }
.totals { width:360px; margin-left:auto; margin-top:20px; }
.totals div { display:flex; justify-content:space-between; padding:6px 0; }
.total { font-weight:800; font-size:18px; color:#006D6D; }
.footer { margin-top:30px; display:flex; justify-content:space-between; font-size:12px; color:#666; }
.print-toolbar { margin-bottom: 24px; display:flex !important; justify-content:space-between; align-items:center; gap:16px; }
.toolbar-actions { display:flex; gap:10px; flex-wrap:wrap; }
.preview-status { font-size:13px; color:#64748B; }
.print-button { background:#6A1B9A; color:#fff; border:none; border-radius:10px; padding:10px 16px; font-weight:700; cursor:pointer; text-decoration:none; display:inline-block; }
.email-button { background:#006D6D; color:#fff; border:none; border-radius:10px; padding:10px 16px; font-weight:700; cursor:pointer; }
.paypal-button { background:#003087; color:#fff; border:none; border-radius:10px; padding:10px 16px; font-weight:700; cursor:pointer; }
@media print {
  .print-toolbar { display:none !important; }
  body { padding: 0; }
}
</style>
</head>
<body>

<div class="print-toolbar">
<div id="preview-email-status" class="preview-status"></div>
<div class="toolbar-actions">
  ${allowEmail ? `<button id="preview-email-button" class="email-button" onclick="if(window.opener){try{window.opener.postMessage({type:'sendQuoteFromPreview',quoteId:${JSON.stringify(quote.id)}},window.opener.location.origin)}catch(e){}}">Email Quote</button>` : ""}
  <a href="javascript:void(0)" class="print-button" onclick="window.print()">Print / Download PDF</a>
</div>
</div>

<div class="header">
<div>
  ${safeLogoDataUrl(profile.logoDataUrl)
    ? `<div style="margin-bottom:12px;"><img src="${safeLogoDataUrl(profile.logoDataUrl)}" alt="Logo" style="max-height:${LOGO_DOCUMENT_MAX_HEIGHT}px; max-width:${LOGO_DOCUMENT_MAX_WIDTH}px; object-fit:contain;" /></div>`
    : ""
  }
  <div class="title">QUOTE</div>
  <div style="margin-top:8px; font-weight:700;">${businessName}</div>
  <div style="font-size:13px; color:#555;">${businessAddress || ""}</div>
  <div style="font-size:13px; color:#555;">${businessEmail}${quote.hidePhoneNumber ? "" : ` | ${businessPhone}`}</div>
  <div style="font-size:13px; color:#555;">ABN: ${businessAbn}</div>
</div>

<div class="right">
  <div><strong>Quote ref:</strong> ${quote.quoteNumber || ""}</div>
  <div><strong>Quote date:</strong> ${formatDateAU(quote.quoteDate)}</div>
  <div><strong>Expiry date:</strong> ${formatDateAU(quote.expiryDate)}</div>
</div>
</div>

<div style="margin-top:20px; font-weight:700;">${clientName}</div>
${clientDetails}

<table>
<thead>
  <tr>
    <th>Description</th>
    <th>Qty</th>
    <th style="text-align:right">Unit Price</th>
    <th style="text-align:right">GST</th>
    <th style="text-align:right">Total (excl. GST)</th>
  </tr>
</thead>
<tbody>
  ${(quote.lineItems && quote.lineItems.length > 0
    ? quote.lineItems
    : [{ description: quote.description || "Professional services", quantity: quote.quantity || 1, unitPrice: safeNumber(quote.subtotal) / Math.max(1, safeNumber(quote.quantity || 1)), rowGst: quote.gst, rowTotal: quote.total }]
  ).map((item) => {
    const qty = safeNumber(item.quantity || item.qty || 1);
    const unit = safeNumber(item.unitPrice || item.unit || 0);
    const rowSub = unit * qty;
    const rowGst = safeNumber(item.rowGst != null ? item.rowGst : ((item.gstType || "GST on Income (10%)") === "GST on Income (10%)" ? rowSub * 0.1 : 0));
    return `<tr>
    <td>${escapeHtml(item.description || "Service")}</td>
    <td>${qty}</td>
    <td style="text-align:right">${money(unit)}</td>
    <td style="text-align:right">${money(rowGst)}</td>
    <td style="text-align:right">${money(rowSub)}</td>
  </tr>`;
  }).join("")}
</tbody>
</table>

<div class="totals">
<div><span>Subtotal (excl GST):</span><span>${money(quote.subtotal)}</span></div>
<div><span>Total GST:</span><span>${money(quote.gst)}</span></div>
<div><span>GST status:</span><span>${gstStatus}</span></div>
<div><span>Less fees:</span><span>${money(adjustments.feeAmount)}</span></div>
<div><span>Less tax withheld:</span><span>${money(adjustments.taxWithheld)}</span></div>
<div class="total"><span>Total estimate:</span><span>${money(quote.total)}</span></div>
<div class="total"><span>Net expected:</span><span>${money(adjustments.netExpected)}</span></div>
</div>

<div class="footer">
<div>For any queries relating to this quote please contact ${profile.businessName}</div>
<div>Private & Confidential</div>
</div>

</body>
</html>`;
}

export function buildQuoteEmailHtml(quote, ctx = {}) {
  const { profile, clients } = ctx;
  const getClientById = (id) => clients.find((c) => c.id === safeNumber(id));
  const clientIsGstExempt = (id) => Boolean(getClientById(id)?.outsideAustraliaOrGstExempt);
  const gstAppliesToClient = (id) => Boolean(profile.gstRegistered) && !clientIsGstExempt(id);
  const getDocumentBusinessName = () => profile.hideLegalNameOnDocs || !profile.legalBusinessName ? profile.businessName : profile.legalBusinessName;
  const getDocumentAddress = () => profile.hideAddressOnDocs ? "" : profile.address || "";
const qClient = getClientById(quote.clientId);
const currencyCode = quote.currencyCode || getClientCurrencyCode(qClient);
const money = (value) => formatCurrencyByCode(value, currencyCode);
const businessName = escapeHtml(getDocumentBusinessName());
const businessAddress = escapeHtml(getDocumentAddress());
const clientName = escapeHtml(qClient?.name || "");
const businessEmail = escapeHtml(profile.email || "");
const businessPhone = escapeHtml(profile.phone || "");
const businessAbn = escapeHtml(profile.abn || "");
const clientDetails =
  qClient?.includeAddressDetails && qClient?.addressDetails
    ? `<div style="margin-top:6px; color:#475569;">${nl2br(qClient.addressDetails)}</div>`
    : "";
const notesHtml = quote.comments
  ? `<div style="margin-top:20px; padding:16px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px;">${nl2br(quote.comments)}</div>`
  : "";
const quoteLineItems = (quote.lineItems && quote.lineItems.length > 0)
  ? quote.lineItems
  : [{ description: quote.description || "Professional services", quantity: quote.quantity || 1, unitPrice: safeNumber(quote.subtotal) / Math.max(1, safeNumber(quote.quantity || 1)), rowGst: quote.gst, rowTotal: quote.total }];

return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Quote ${quote.quoteNumber || ""}</title>
</head>
<body style="margin:0; padding:24px; background:#F8FAFC; font-family:Arial, sans-serif; color:#14202B;">
  <div style="max-width:760px; margin:0 auto; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:18px; padding:28px;">
    ${safeLogoDataUrl(profile.logoDataUrl)
      ? `<div style="margin-bottom:16px;"><img src="${safeLogoDataUrl(profile.logoDataUrl)}" alt="Logo" style="max-height:${LOGO_PREVIEW_MAX_HEIGHT}px; max-width:${LOGO_PREVIEW_MAX_WIDTH}px; object-fit:contain;" /></div>`
      : ""
    }
    <div style="display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; border-bottom:1px solid #E2E8F0; padding-bottom:18px;">
      <div>
        <div style="font-size:30px; font-weight:900; color:#6A1B9A;">QUOTE</div>
        <div style="margin-top:8px; font-weight:700;">${businessName}</div>
        <div style="font-size:13px; color:#475569; margin-top:4px;">${businessAddress || ""}</div>
        <div style="font-size:13px; color:#475569; margin-top:4px;">${businessEmail}${quote.hidePhoneNumber ? "" : ` | ${businessPhone}`}</div>
        <div style="font-size:13px; color:#475569; margin-top:4px;">ABN: ${businessAbn}</div>
      </div>
      <div style="text-align:right; font-size:14px; color:#14202B;">
        <div><strong>Quote ref:</strong> ${quote.quoteNumber || ""}</div>
        <div style="margin-top:6px;"><strong>Quote date:</strong> ${formatDateAU(quote.quoteDate)}</div>
        <div style="margin-top:6px;"><strong>Expiry date:</strong> ${formatDateAU(quote.expiryDate)}</div>
      </div>
    </div>

    <div style="margin-top:20px;">
      <div style="font-weight:700;">${clientName}</div>
      ${clientDetails}
    </div>

    <table style="width:100%; border-collapse:collapse; margin-top:24px;">
      <thead>
        <tr>
          <th style="text-align:left; padding:10px; border-bottom:1px solid #E2E8F0; color:#64748B;">Description</th>
          <th style="text-align:left; padding:10px; border-bottom:1px solid #E2E8F0; color:#64748B;">Qty</th>
          <th style="text-align:right; padding:10px; border-bottom:1px solid #E2E8F0; color:#64748B;">Unit Price</th>
          <th style="text-align:right; padding:10px; border-bottom:1px solid #E2E8F0; color:#64748B;">GST</th>
          <th style="text-align:right; padding:10px; border-bottom:1px solid #E2E8F0; color:#64748B;">Total (excl. GST)</th>
        </tr>
      </thead>
      <tbody>
        ${quoteLineItems.map((item) => {
          const qty = safeNumber(item.quantity || item.qty || 1);
          const unit = safeNumber(item.unitPrice || item.unit || 0);
          const rowSub = unit * qty;
          const rowGst = safeNumber(item.rowGst != null ? item.rowGst : ((item.gstType || "GST on Income (10%)") === "GST on Income (10%)" ? rowSub * 0.1 : 0));
          return `<tr>
          <td style="padding:10px; border-bottom:1px solid #E2E8F0;">${escapeHtml(item.description || "Professional services")}</td>
          <td style="padding:10px; border-bottom:1px solid #E2E8F0;">${qty}</td>
          <td style="padding:10px; border-bottom:1px solid #E2E8F0; text-align:right;">${money(unit)}</td>
          <td style="padding:10px; border-bottom:1px solid #E2E8F0; text-align:right;">${money(rowGst)}</td>
          <td style="padding:10px; border-bottom:1px solid #E2E8F0; text-align:right;">${money(rowSub)}</td>
        </tr>`;
        }).join("")}
      </tbody>
    </table>

    <div style="max-width:360px; margin:24px 0 0 auto;">
      <div style="display:flex; justify-content:space-between; padding:6px 0;"><span>Subtotal (excl GST):</span><span>${money(quote.subtotal)}</span></div>
      <div style="display:flex; justify-content:space-between; padding:6px 0;"><span>Total GST:</span><span>${money(quote.gst)}</span></div>
      <div style="display:flex; justify-content:space-between; padding:6px 0; font-weight:800; color:#006D6D;"><span>Total estimate:</span><span>${money(quote.total)}</span></div>
    </div>

    ${notesHtml}

    <div style="margin-top:24px; font-size:12px; color:#64748B; line-height:1.6;">
      This is a quote only and not a tax invoice.
    </div>
  </div>
</body>
</html>`;
}

export function buildInvoiceHtml(invoice, stripeCheckoutUrl = "", options = {}, ctx = {}) {
  const { profile, clients, serverBaseUrl = "" } = ctx;
  const safeServerBaseUrl = getApiBaseUrl(serverBaseUrl);
  const getClientById = (id) => clients.find((c) => c.id === safeNumber(id));
  const clientIsGstExempt = (id) => Boolean(getClientById(id)?.outsideAustraliaOrGstExempt);
  const gstAppliesToClient = (id) => Boolean(profile.gstRegistered) && !clientIsGstExempt(id);
  const getDocumentBusinessName = () => profile.hideLegalNameOnDocs || !profile.legalBusinessName ? profile.businessName : profile.legalBusinessName;
  const getDocumentAddress = () => profile.hideAddressOnDocs ? "" : profile.address || "";
const { allowEmail = false } = options;
const previewClient = getClientById(invoice.clientId);
const currencyCode = invoice.currencyCode || getClientCurrencyCode(previewClient);
const money = (value) => formatCurrencyByCode(value, currencyCode);
const feeAmount =
  invoice.feeAmount != null
    ? safeNumber(invoice.feeAmount)
    : calculateAdjustmentValues({
      subtotal: safeNumber(invoice.subtotal),
      total: safeNumber(invoice.total),
      client: previewClient,
      profile,
    }).feeAmount;
const taxWithheld =
  invoice.taxWithheld != null
    ? safeNumber(invoice.taxWithheld)
    : calculateAdjustmentValues({
      subtotal: safeNumber(invoice.subtotal),
      total: safeNumber(invoice.total),
      client: previewClient,
      profile,
    }).taxWithheld;
const netExpected =
  invoice.netExpected != null
    ? safeNumber(invoice.netExpected)
    : calculateAdjustmentValues({
      subtotal: safeNumber(invoice.subtotal),
      total: safeNumber(invoice.total),
      client: previewClient,
      profile,
    }).netExpected;
const gstStatus =
  invoice.gstStatus ||
  (clientIsGstExempt(invoice.clientId)
    ? "GST not applicable"
    : safeNumber(invoice.gst) > 0
      ? "GST applies"
      : "GST free");
const purchaseOrderReference = escapeHtml(invoice.purchaseOrderReference || "");
const purchaseOrderBlock =
  previewClient?.hasPurchaseOrder && purchaseOrderReference
    ? `<div style="margin-top:10px; font-size:14px; color:#555;"><strong>PO / Reference:</strong> ${purchaseOrderReference}</div>`
    : "";
const businessName = escapeHtml(getDocumentBusinessName());
const businessAddress = escapeHtml(getDocumentAddress());
const clientName = escapeHtml(previewClient?.name || "");
const clientEmail = escapeHtml(previewClient?.email || "");
const businessEmail = escapeHtml(profile.email || "");
const businessPhone = escapeHtml(profile.phone || "");
const businessAbn = escapeHtml(profile.abn || "");
const paymentReference = escapeHtml(invoice.paymentReference || invoice.invoiceNumber || "");
const paypalCheckoutUrl = buildPayPalInvoiceUrl({
  businessEmail: profile.paypalBusinessEmail,
  amount: invoice.total,
  currencyCode,
  invoiceNumber: invoice.invoiceNumber || paymentReference,
});
const cardPaymentUrl = safeHref(stripeCheckoutUrl || invoice?.stripeCheckoutUrl || profile.stripePaymentLink);
const documentOrigin =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "";
const cardCheckoutFunctionUrl = safeHref(
  SUPABASE_FUNCTIONS_BASE_URL
    ? `${SUPABASE_FUNCTIONS_BASE_URL}/functions/v1/create-invoice-checkout`
    : ""
);
const canCreateCardCheckout = !cardPaymentUrl && !!cardCheckoutFunctionUrl && safeNumber(invoice.total) > 0;
const hasOnlinePaymentOption = Boolean(cardPaymentUrl || paypalCheckoutUrl);
const cardCheckoutPayload = {
  invoiceId: invoice?.id || "",
  invoiceNumber: invoice?.invoiceNumber || paymentReference,
  clientId: invoice?.clientId || "",
  customerName: previewClient?.name || previewClient?.businessName || "",
  customerEmail: previewClient?.email || "",
  description:
    invoice?.description ||
    `Invoice ${invoice?.invoiceNumber || invoice?.id || ""}`,
  currency: String(currencyCode || "AUD").toLowerCase(),
  amount: Number(safeNumber(invoice.total).toFixed(2)),
  total: Number(safeNumber(invoice.total).toFixed(2)),
  successUrl: `${documentOrigin}?stripe=success&invoice=${encodeURIComponent(invoice?.invoiceNumber || "")}&invoiceId=${encodeURIComponent(String(invoice?.id || ""))}`,
  cancelUrl: `${documentOrigin}?stripe=cancel&invoice=${encodeURIComponent(invoice?.invoiceNumber || "")}&invoiceId=${encodeURIComponent(String(invoice?.id || ""))}`,
};

const clientDetails =
  previewClient?.includeAddressDetails && previewClient?.addressDetails
    ? `<div style="margin-top:6px; color:#555;">
          ${nl2br(previewClient.addressDetails)}
        </div>`
    : "";
return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice Preview</title>
<style>
body { font-family: Arial, sans-serif; padding: 40px; color: #14202B; }
.header { display:flex; justify-content:space-between; border-bottom:2px solid #eee; padding-bottom:20px; }
.title { font-size:34px; font-weight:900; color:#6A1B9A; }
.right { text-align:right; }
.section { margin-top:24px; }
table { width:100%; border-collapse: collapse; margin-top:20px; }
th, td { padding:12px; border-bottom:1px solid #ddd; font-size:14px; }
th { text-align:left; color:#64748B; }
.totals { margin-top:20px; width:360px; margin-left:auto; }
.totals div { display:flex; justify-content:space-between; padding:6px 0; }
.total { font-size:20px; font-weight:800; color:#006D6D; }
.payment { margin-top:30px; padding-top:20px; border-top:1px solid #ddd; }
.footer { margin-top:40px; font-size:12px; color:#666; display:flex; justify-content:space-between; }
.print-toolbar { margin-bottom: 24px; display:flex !important; justify-content:space-between; align-items:center; gap:16px; }
.toolbar-actions { display:flex; gap:10px; flex-wrap:wrap; }
.preview-status { font-size:13px; color:#64748B; }
.print-button { background:#6A1B9A; color:#fff; border:none; border-radius:10px; padding:10px 16px; font-weight:700; cursor:pointer; text-decoration:none; display:inline-block; }
.email-button { background:#006D6D; color:#fff; border:none; border-radius:10px; padding:10px 16px; font-weight:700; cursor:pointer; }
.paypal-button { background:#003087; color:#fff; border:none; border-radius:10px; padding:10px 16px; font-weight:700; cursor:pointer; }
@media print {
  .print-toolbar { display:none !important; }
  body { padding: 0; }
}
</style>
</head>
<body>

<div class="print-toolbar">
<div id="preview-email-status" class="preview-status"></div>
<div class="toolbar-actions">
  ${allowEmail ? `<button id="preview-email-button" class="email-button" onclick="if(window.opener){try{window.opener.postMessage({type:'sendInvoiceFromPreview',invoiceId:${JSON.stringify(invoice.id)}},window.opener.location.origin)}catch(e){}}">Email Invoice</button>` : ""}
  <a href="javascript:void(0)" class="print-button" onclick="window.print()">Print / Download PDF</a>
</div>
</div>

<div class="header">
<div>
  ${safeLogoDataUrl(profile.logoDataUrl)
    ? `<div style="margin-bottom:12px;"><img src="${safeLogoDataUrl(profile.logoDataUrl)}" alt="Logo" style="max-height:${LOGO_DOCUMENT_MAX_HEIGHT}px; max-width:${LOGO_DOCUMENT_MAX_WIDTH}px; object-fit:contain;" /></div>`
    : ""
  }
  <div class="title">TAX INVOICE</div>
  <div style="margin-top:10px; font-weight:700;">${businessName}</div>
  <div style="font-size:14px; color:#555;">${businessAddress || ""}</div>
  <div style="font-size:14px; color:#555;">${businessEmail}${invoice.hidePhoneNumber ? "" : ` | ${businessPhone}`}</div>
  <div style="font-size:14px; color:#555;">ABN: ${businessAbn}</div>
</div>

<div class="right">
  <div><strong>Invoice #:</strong> ${escapeHtml(invoice.invoiceNumber || "")}</div>
  <div><strong>Date:</strong> ${escapeHtml(formatDateAU(invoice.invoiceDate))}</div>
  <div><strong>Due:</strong> ${escapeHtml(formatDateAU(invoice.dueDate))}</div>
</div>
</div>

<div class="section">
<strong>Billed To:</strong><br/>
${clientName}<br/>
${clientEmail}
${clientDetails}
${purchaseOrderBlock}
</div>

<table>
<thead>
  <tr>
    <th>Description</th>
    <th>Qty</th>
    <th class="right">Unit Price</th>
    <th class="right">GST</th>
    <th class="right">Total</th>
  </tr>
</thead>
<tbody>
  ${(invoice.lineItems && invoice.lineItems.length > 0
    ? invoice.lineItems
    : [{ description: invoice.description || "Professional services", quantity: invoice.quantity || 1, unitPrice: safeNumber(invoice.subtotal) / Math.max(1, safeNumber(invoice.quantity || 1)), rowGst: invoice.gst, rowTotal: invoice.total }]
  ).map((item) => {
    const qty = safeNumber(item.quantity || item.qty || 1);
    const unit = safeNumber(item.unitPrice || item.unit || 0);
    const rowSub = unit * qty;
    const rowGst = safeNumber(item.rowGst != null ? item.rowGst : ((item.gstType || "GST on Income (10%)") === "GST on Income (10%)" ? rowSub * 0.1 : 0));
    const rowTotal = rowSub + rowGst;
    return `<tr>
    <td>${escapeHtml(item.description || "Service")}</td>
    <td>${qty}</td>
    <td class="right">${money(unit)}</td>
    <td class="right">${money(rowGst)}</td>
    <td class="right">${money(rowTotal)}</td>
  </tr>`;
  }).join("")}
</tbody>
</table>

<div class="totals">
<div><span>Subtotal (ex GST)</span><span>${money(invoice.subtotal)}</span></div>
<div><span>GST</span><span>${money(invoice.gst)}</span></div>
<div><span>GST status</span><span>${gstStatus}</span></div>
<div><span>Less fees</span><span>${money(feeAmount)}</span></div>
<div><span>Less tax withheld</span><span>${money(taxWithheld)}</span></div>
<div class="total"><span>Amount Due</span><span>${money(invoice.total)}</span></div>
<div class="total"><span>Net expected</span><span>${money(netExpected)}</span></div>
</div>

<div class="payment">
<strong>Please make payment to:</strong>
<div style="margin-top:10px; font-size:14px;">
  ${profile.bankName ? `<div><strong>Account Name:</strong> ${escapeHtml(profile.bankName)}</div>` : ""}
  ${profile.bsb ? `<div><strong>BSB:</strong> ${escapeHtml(profile.bsb)}</div>` : ""}
  ${profile.accountNumber ? `<div><strong>Account Number:</strong> ${escapeHtml(profile.accountNumber)}</div>` : ""}
  ${profile.payId ? `<div><strong>PayID:</strong> ${escapeHtml(profile.payId)}</div>` : ""}
</div>
<div style="margin-top:10px; font-size:13px; color:#555;">
  Please use reference: ${paymentReference}
</div>
${hasOnlinePaymentOption ? `<div style="margin-top:16px; padding:14px; border:1px solid #E2E8F0; border-radius:12px; background:#F7F6F5;">
  <div style="font-weight:700; color:#14202B; margin-bottom:8px;">Pay Online</div>
  <div style="font-size:13px; color:#555; margin-bottom:10px;">Choose your preferred payment method below.</div>
  ${cardPaymentUrl
    ? `<a href="${cardPaymentUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-right:10px; background:#6A1B9A; color:#FFFFFF; text-decoration:none; padding:10px 16px; border-radius:10px; font-weight:700;">Pay with Card</a>`
    : ""
  }
  ${paypalCheckoutUrl
    ? `<button id="paypal-pay-btn"
    style="display:inline-block; background:#003087; color:#FFFFFF; border:none; padding:10px 16px; border-radius:10px; font-weight:700; cursor:pointer;">Pay with PayPal</button>
  <span id="paypal-status" style="font-size:13px; color:#555; margin-left:10px;"></span>`
    : ""
  }
  <script>
    (function() {
      var stripeBtn = document.getElementById('stripe-pay-btn');
      if (!stripeBtn) return;
      var status = document.getElementById('stripe-status');
      var checkoutUrl = ${safeJsonForScript(cardPaymentUrl)};
      var checkoutEndpoint = ${safeJsonForScript(cardCheckoutFunctionUrl)};
      var publishableKey = ${safeJsonForScript(SUPABASE_PUBLISHABLE_KEY)};
      var payload = ${safeJsonForScript(cardCheckoutPayload)};

      var openCheckout = function(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      };

      stripeBtn.addEventListener('click', async function() {
        if (checkoutUrl) {
          openCheckout(checkoutUrl);
          return;
        }

        if (!checkoutEndpoint) {
          if (status) {
            status.textContent = 'Card payment is not available yet.';
            status.style.color = '#991B1B';
          }
          return;
        }

        // Open window synchronously to avoid popup blocker
        var popupWin = window.open('about:blank', '_blank');

        stripeBtn.disabled = true;
        stripeBtn.textContent = 'Opening...';
        if (status) { status.textContent = ''; }

        try {
          var headers = { 'Content-Type': 'application/json' };
          if (publishableKey) { headers.apikey = publishableKey; }

          var res = await fetch(checkoutEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
          });
          var data = await res.json().catch(function() { return {}; });

          if (res.ok && data && data.url) {
            checkoutUrl = data.url;
            if (popupWin && !popupWin.closed) {
              popupWin.location.href = checkoutUrl;
            } else {
              window.location.href = checkoutUrl;
            }
            if (status) { status.textContent = 'Card checkout opened.'; status.style.color = '#166534'; }
          } else {
            if (popupWin && !popupWin.closed) popupWin.close();
            if (status) { status.textContent = (data && data.error) || 'Card payment failed. Please try again.'; status.style.color = '#991B1B'; }
          }
        } catch (e) {
          if (popupWin && !popupWin.closed) popupWin.close();
          if (status) { status.textContent = 'Could not connect to card payment.'; status.style.color = '#991B1B'; }
        }

        stripeBtn.disabled = false;
        stripeBtn.textContent = 'Pay with Card';
      });
    })();

    (function() {
      var paypalBtn = document.getElementById('paypal-pay-btn');
      if (!paypalBtn) return;
      var paypalUrl = ${safeJsonForScript(paypalCheckoutUrl)};
      var paypalStatus = document.getElementById('paypal-status');
      paypalBtn.addEventListener('click', function() {
        if (paypalUrl) {
          window.open(paypalUrl, '_blank', 'noopener,noreferrer');
          if (paypalStatus) { paypalStatus.textContent = 'PayPal checkout opened.'; paypalStatus.style.color = '#166534'; }
        } else {
          if (paypalStatus) { paypalStatus.textContent = 'PayPal is not configured. Add your PayPal email in Settings → Financial.'; paypalStatus.style.color = '#991B1B'; }
        }
      });
    })();
  </script>
</div>` : ""}
</div>

<div class="footer">
<div>For any queries please contact ${profile.businessName || "Your business"}</div>
<div>Private & Confidential</div>
</div>

<script>
  document.getElementById('print-btn') && document.getElementById('print-btn').addEventListener('click', function() { window.print(); });
</script>
</body>
</html>`;
}

export function openBlobUrlInWindow(w, blob) {
const url = URL.createObjectURL(blob);
try {
  if (w.location.origin === "null") {
    try {
      URL.revokeObjectURL(w.location.href);
    } catch (error) {
      console.warn("Could not revoke previous preview URL", error);
    }
  }
} catch (error) {
  console.warn("Could not inspect previous preview URL", error);
}
w.location.href = url;
const revoke = () => {
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn("Could not revoke preview URL", error);
  }
};
try {
  w.addEventListener("beforeunload", revoke, { once: true });
} catch (error) {
  console.warn("Preview cleanup listener failed", error);
}
setTimeout(revoke, 60000);
try {
  w.focus();
} catch (error) {
  console.warn("Preview window focus failed", error);
}
}

export function writeInvoicePreviewToWindow(w, invoice, stripeCheckoutUrl = "", options = {}, ctx = {}) {
const html = buildInvoiceHtml(invoice, stripeCheckoutUrl, options, ctx);
const blob = new Blob([html], { type: "text/html" });
openBlobUrlInWindow(w, blob);
}

// ── Job Sheet / Run Sheet Builder ─────────────────────────────────────────
export function buildJobSheetHtml(job, ctx = {}) {
  const { profile = {}, clients = [], properties = [] } = ctx;
  const getClientById = (id) => clients.find((c) => String(c.id) === String(id) || c.id === safeNumber(id));
  const getPropertyById = (id) => properties.find((p) => String(p.id) === String(id) || p.id === safeNumber(id));
  const getDocumentBusinessName = () => profile.hideLegalNameOnDocs || !profile.legalBusinessName ? profile.businessName : profile.legalBusinessName;
  const getDocumentAddress = () => profile.hideAddressOnDocs ? "" : profile.address || "";

  const client = getClientById(job.clientId);
  const property = getPropertyById(job.propertyId);
  const subLocation = job.subLocationId && property?.subLocations
    ? (property.subLocations || []).find((s) => String(s.id) === String(job.subLocationId))
    : null;

  const businessName = escapeHtml(getDocumentBusinessName() || "");
  const businessAddress = escapeHtml(getDocumentAddress());
  const businessEmail = escapeHtml(profile.email || "");
  const businessPhone = escapeHtml(profile.phone || "");
  const businessAbn = escapeHtml(profile.abn || "");
  const clientName = escapeHtml(client?.name || "");
  const clientPhone = escapeHtml(client?.phone || "");
  const clientEmail = escapeHtml(client?.email || "");
  const clientAddress = escapeHtml(client?.address || client?.addressDetails || "");
  const propertyName = escapeHtml(property?.name || "");
  const propertyAddress = escapeHtml(property?.address || "");
  const subLocName = escapeHtml(subLocation?.name || "");

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const p = iso.split("-");
    return `${p[2]}/${p[1]}/${p[0]}`;
  };
  const fmtTime = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hh = +h;
    return `${hh > 12 ? hh - 12 : hh || 12}:${m} ${hh >= 12 ? "pm" : "am"}`;
  };

  // Gather materials from job costs
  const materials = (job.costs?.materials || []).filter((m) => m.description || m.item);
  const hasMaterials = materials.length > 0;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Job Sheet — ${escapeHtml(job.title || "")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 32px 40px; color: #14202B; margin: 0; }
  .print-toolbar { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .print-button { background: #6A1B9A; color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; }
  .email-button { background: #006D6D; color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-weight: 700; cursor: pointer; font-size: 14px; }
  @media print {
    .print-toolbar { display: none !important; }
    body { padding: 16px; }
  }

  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6A1B9A; padding-bottom: 16px; margin-bottom: 20px; }
  .header-left .logo img { max-height: 50px; max-width: 180px; object-fit: contain; margin-bottom: 8px; }
  .header-left h1 { font-size: 26px; font-weight: 900; color: #6A1B9A; margin: 0; }
  .header-left .biz-info { font-size: 12px; color: #475569; margin-top: 4px; }
  .header-right { text-align: right; font-size: 13px; }
  .header-right div { margin-bottom: 4px; }

  .section { margin-bottom: 20px; }
  .section-title { font-size: 14px; font-weight: 800; color: #6A1B9A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; }
  .info-grid .label { font-weight: 700; color: #64748B; }
  .info-grid .value { color: #14202B; }

  .description-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; font-size: 14px; line-height: 1.6; min-height: 60px; white-space: pre-wrap; }

  table.materials { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.materials th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #E2E8F0; color: #64748B; font-size: 12px; font-weight: 700; }
  table.materials td { padding: 8px 10px; border-bottom: 1px solid #F1F5F9; font-size: 13px; }

  .notes-box { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px; font-size: 13px; line-height: 1.5; min-height: 40px; white-space: pre-wrap; }

  .checklist { list-style: none; padding: 0; margin: 0; }
  .checklist li { padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 13px; display: flex; align-items: center; gap: 10px; }
  .checklist li .checkbox { width: 18px; height: 18px; border: 2px solid #CBD5E1; border-radius: 4px; flex-shrink: 0; }

  .signature-area { margin-top: 40px; border-top: 2px solid #E2E8F0; padding-top: 24px; }
  .sig-row { display: flex; gap: 40px; margin-top: 20px; }
  .sig-block { flex: 1; }
  .sig-line { border-bottom: 1px solid #14202B; height: 50px; margin-bottom: 6px; }
  .sig-label { font-size: 12px; color: #64748B; font-weight: 600; }

  .footer { margin-top: 30px; font-size: 11px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 12px; }
</style>
</head>
<body>

<div class="print-toolbar">
  <div style="font-size: 13px; color: #64748B;">Job Sheet — ${escapeHtml(job.title || "")}</div>
  <div style="display: flex; gap: 10px;">
    <a href="javascript:void(0)" class="print-button" onclick="window.print()">Print / Download PDF</a>
  </div>
</div>

<div class="header">
  <div class="header-left">
    ${safeLogoDataUrl(profile.logoDataUrl) ? `<div class="logo"><img src="${safeLogoDataUrl(profile.logoDataUrl)}" alt="Logo" /></div>` : ""}
    <h1>JOB SHEET</h1>
    <div class="biz-info">${businessName}</div>
    ${businessAddress ? `<div class="biz-info">${businessAddress}</div>` : ""}
    <div class="biz-info">${businessEmail}${businessPhone ? ` | ${businessPhone}` : ""}</div>
    ${businessAbn ? `<div class="biz-info">ABN: ${businessAbn}</div>` : ""}
  </div>
  <div class="header-right">
    <div><strong>Job ref:</strong> #${escapeHtml(String(job.id || ""))}</div>
    <div><strong>Status:</strong> ${escapeHtml(job.status || "Scheduled")}</div>
    <div><strong>Priority:</strong> ${escapeHtml(job.priority || "Medium")}</div>
    <div><strong>Date:</strong> ${fmtDate(job.startDate)}${job.endDate && job.endDate !== job.startDate ? ` – ${fmtDate(job.endDate)}` : ""}</div>
    <div><strong>Time:</strong> ${fmtTime(job.startTime)} – ${fmtTime(job.endTime)}</div>
  </div>
</div>

<!-- Customer / Contact Details -->
<div class="section">
  <div class="section-title">Customer Details</div>
  <div class="info-grid">
    <div><span class="label">Name:</span></div><div class="value">${clientName || "—"}</div>
    <div><span class="label">Phone:</span></div><div class="value">${clientPhone || "—"}</div>
    <div><span class="label">Email:</span></div><div class="value">${clientEmail || "—"}</div>
    <div><span class="label">Address:</span></div><div class="value">${clientAddress || "—"}</div>
  </div>
</div>

${property ? `
<!-- Property / Site Details -->
<div class="section">
  <div class="section-title">Property / Site</div>
  <div class="info-grid">
    <div><span class="label">Property:</span></div><div class="value">${propertyName}</div>
    <div><span class="label">Address:</span></div><div class="value">${propertyAddress || "—"}</div>
    ${subLocName ? `<div><span class="label">Area:</span></div><div class="value">${subLocName}</div>` : ""}
  </div>
</div>
` : ""}

<!-- Job Description -->
<div class="section">
  <div class="section-title">Job Description</div>
  <div class="description-box">${escapeHtml(job.title || "")}\n${escapeHtml(job.description || "No description provided.")}</div>
</div>

${hasMaterials ? `
<!-- Materials Needed -->
<div class="section">
  <div class="section-title">Materials Required</div>
  <table class="materials">
    <thead>
      <tr>
        <th>Item / Description</th>
        <th style="text-align:right; width:80px;">Qty</th>
        <th style="text-align:right; width:120px;">Cost</th>
      </tr>
    </thead>
    <tbody>
      ${materials.map((m) => `
        <tr>
          <td>${escapeHtml(m.description || m.item || "")}</td>
          <td style="text-align:right">${m.quantity || m.qty || "—"}</td>
          <td style="text-align:right">${m.amount ? formatCurrencyByCode(safeNumber(m.amount), "AUD") : "—"}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</div>
` : `
<div class="section">
  <div class="section-title">Materials Required</div>
  <div class="description-box" style="color:#64748B;">No materials listed yet. Add materials to the Job Costing panel.</div>
</div>
`}

<!-- Notes -->
${job.notes ? `
<div class="section">
  <div class="section-title">Internal Notes</div>
  <div class="notes-box">${escapeHtml(job.notes)}</div>
</div>
` : ""}

${job.assignedTo ? `
<div class="section">
  <div class="section-title">Assigned To</div>
  <div style="font-size:14px; font-weight:700;">${escapeHtml(job.assignedTo)}</div>
</div>
` : ""}

${(() => {
  const photos = job.photos || { before: [], after: [] };
  const hasBefore = (photos.before || []).length > 0;
  const hasAfter = (photos.after || []).length > 0;
  if (!hasBefore && !hasAfter) return "";
  const photoGrid = (items) => items.map((p) => `
    <div style="border-radius:8px; overflow:hidden; border:1px solid #E2E8F0;">
      <img src="${escapeHtml(p.url || "")}" alt="Job photo" style="width:100%; height:180px; object-fit:cover; display:block;" />
    </div>
  `).join("");
  return `
  <div class="section" style="page-break-before: auto;">
    <div class="section-title">Site Photos</div>
    ${hasBefore ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px; font-weight:700; color:#64748B; margin-bottom:8px;">📷 Before</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:10px;">
          ${photoGrid(photos.before)}
        </div>
      </div>
    ` : ""}
    ${hasAfter ? `
      <div>
        <div style="font-size:13px; font-weight:700; color:#64748B; margin-bottom:8px;">✅ After</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:10px;">
          ${photoGrid(photos.after)}
        </div>
      </div>
    ` : ""}
  </div>`;
})()}

<!-- On-site Checklist (blank lines for manual use) -->
<div class="section">
  <div class="section-title">On-Site Checklist</div>
  <ul class="checklist">
    <li><div class="checkbox"></div> Site inspection completed</li>
    <li><div class="checkbox"></div> Safety hazards identified</li>
    <li><div class="checkbox"></div> Materials on site</li>
    <li><div class="checkbox"></div> Work completed to standard</li>
    <li><div class="checkbox"></div> Site cleaned up</li>
    <li><div class="checkbox"></div> Customer walkthrough done</li>
  </ul>
</div>

<!-- Customer Signature -->
<div class="signature-area">
  <div class="section-title">Customer Acceptance</div>
  <p style="font-size: 13px; color: #475569; margin: 0 0 8px;">
    I confirm the work described above has been completed to my satisfaction.
  </p>
  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Customer Signature</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Print Name</div>
    </div>
    <div class="sig-block" style="max-width: 160px;">
      <div class="sig-line"></div>
      <div class="sig-label">Date</div>
    </div>
  </div>
</div>

<div class="footer">
  ${businessName} ${businessAbn ? `| ABN: ${businessAbn}` : ""} | Generated by Mustered
</div>

</body>
</html>`;
}

export function writeJobSheetPreviewToWindow(w, job, ctx = {}) {
  const html = buildJobSheetHtml(job, ctx);
  const blob = new Blob([html], { type: "text/html" });
  openBlobUrlInWindow(w, blob);
}

// ── Certificate of Completion Builder ─────────────────────────────────────
export function buildCertificateHtml(job, ctx = {}) {
  const { profile = {}, clients = [], properties = [] } = ctx;
  const getClientById = (id) => clients.find((c) => String(c.id) === String(id) || c.id === safeNumber(id));
  const getPropertyById = (id) => properties.find((p) => String(p.id) === String(id) || p.id === safeNumber(id));
  const getDocumentBusinessName = () => profile.hideLegalNameOnDocs || !profile.legalBusinessName ? profile.businessName : profile.legalBusinessName;
  const getDocumentAddress = () => profile.hideAddressOnDocs ? "" : profile.address || "";

  const client = getClientById(job.clientId);
  const property = getPropertyById(job.propertyId);
  const subLocation = job.subLocationId && property?.subLocations
    ? (property.subLocations || []).find((s) => String(s.id) === String(job.subLocationId))
    : null;

  const businessName = escapeHtml(getDocumentBusinessName() || "");
  const businessAddress = escapeHtml(getDocumentAddress());
  const businessEmail = escapeHtml(profile.email || "");
  const businessPhone = escapeHtml(profile.phone || "");
  const businessAbn = escapeHtml(profile.abn || "");
  const logoSrc = safeLogoDataUrl(profile.logo || "");
  const clientName = escapeHtml(client?.name || "");
  const propertyName = escapeHtml(property?.name || "");
  const propertyAddress = escapeHtml(property?.address || "");
  const subLocName = escapeHtml(subLocation?.name || "");

  const fmtDate = (iso) => { if (!iso) return "—"; const p = iso.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; };

  const completionDate = job.certificate?.completionDate || job.endDate || job.startDate || "";
  const signatureDataUrl = job.certificate?.signatureDataUrl || "";
  const signedByName = escapeHtml(job.certificate?.signedByName || clientName || "");
  const signedDate = job.certificate?.signedDate || "";
  const certNotes = escapeHtml(job.certificate?.notes || "");
  const certNumber = escapeHtml(job.certificate?.certNumber || `COC-${String(job.id).slice(-6)}`);

  // Photos
  const photos = job.photos || { before: [], after: [] };
  const hasBefore = (photos.before || []).length > 0;
  const hasAfter = (photos.after || []).length > 0;

  const photoGrid = (items) => items.slice(0, 4).map((p) => `
    <div style="border-radius:8px; overflow:hidden; border:1px solid #E2E8F0;">
      <img src="${escapeHtml(p.url || "")}" alt="Photo" style="width:100%; height:140px; object-fit:cover; display:block;" />
    </div>
  `).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Certificate of Completion - ${escapeHtml(job.title || "")}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 40px; color: #14202B; max-width: 800px; margin: 0 auto; }
  .cert-border { border: 3px solid #6A1B9A; border-radius: 16px; padding: 36px; position: relative; }
  .cert-border::before { content: ""; position: absolute; inset: 6px; border: 1px solid #D1C4E9; border-radius: 12px; pointer-events: none; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .logo-area { max-width: 200px; }
  .logo-area img { max-height: 80px; max-width: 200px; }
  .cert-title { text-align: center; margin-bottom: 28px; }
  .cert-title h1 { font-size: 26px; font-weight: 900; color: #6A1B9A; margin: 0 0 4px; letter-spacing: 1px; text-transform: uppercase; }
  .cert-title .cert-num { font-size: 12px; color: #64748B; font-weight: 600; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; }
  .info-label { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .info-value { font-size: 14px; font-weight: 600; color: #14202B; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 14px; font-weight: 800; color: #6A1B9A; margin-bottom: 10px; border-bottom: 2px solid #F3E5F5; padding-bottom: 4px; }
  .work-desc { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; font-size: 14px; line-height: 1.6; }
  .declaration { background: #F3E5F5; border-radius: 10px; padding: 16px; margin: 24px 0; font-size: 13px; line-height: 1.6; color: #4A148C; }
  .sig-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }
  .sig-block { border-top: 2px solid #14202B; padding-top: 8px; }
  .sig-block.customer { border-top-color: #6A1B9A; }
  .sig-label { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 2px; }
  .sig-name { font-size: 14px; font-weight: 700; }
  .sig-date { font-size: 12px; color: #64748B; margin-top: 2px; }
  .sig-image { max-height: 60px; margin-bottom: 4px; }
  .footer { text-align: center; font-size: 11px; color: #94A3B8; margin-top: 28px; padding-top: 12px; border-top: 1px solid #E2E8F0; }
  .photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 8px; }
  .print-toolbar { margin-bottom: 24px; display: flex !important; gap: 10px; }
  .print-button { background: #6A1B9A; color: #fff; border: none; border-radius: 10px; padding: 10px 16px; font-weight: 700; cursor: pointer; }
  .download-button { background: #006D6D; color: #fff; border: none; border-radius: 10px; padding: 10px 16px; font-weight: 700; cursor: pointer; }
  @media print { .print-toolbar { display: none !important; } body { padding: 0; } }
</style>
</head>
<body>

<div class="print-toolbar">
  <button class="print-button" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>

<div class="cert-border">

  <div class="header">
    ${logoSrc ? `<div class="logo-area"><img src="${logoSrc}" alt="Logo" /></div>` : `<div class="logo-area"><div style="font-size:18px; font-weight:900; color:#6A1B9A;">${businessName}</div></div>`}
    <div style="text-align:right; font-size:12px; color:#64748B;">
      ${businessAddress ? `<div>${businessAddress}</div>` : ""}
      ${businessPhone ? `<div>${businessPhone}</div>` : ""}
      ${businessEmail ? `<div>${businessEmail}</div>` : ""}
      ${businessAbn ? `<div>ABN: ${businessAbn}</div>` : ""}
    </div>
  </div>

  <div class="cert-title">
    <h1>Certificate of Completion</h1>
    <div class="cert-num">Certificate No: ${certNumber}</div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Job Title</div>
      <div class="info-value">${escapeHtml(job.title || "")}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Date Completed</div>
      <div class="info-value">${fmtDate(completionDate)}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Customer</div>
      <div class="info-value">${clientName || "—"}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Property / Location</div>
      <div class="info-value">${propertyName || propertyAddress || "—"}${subLocName ? ` › ${subLocName}` : ""}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Work Performed</div>
    <div class="work-desc">${escapeHtml(job.description || job.title || "Work completed as per agreement.")}</div>
  </div>

  ${certNotes ? `
  <div class="section">
    <div class="section-title">Additional Notes</div>
    <div class="work-desc">${certNotes}</div>
  </div>
  ` : ""}

  ${(hasBefore || hasAfter) ? `
  <div class="section">
    <div class="section-title">Site Photos</div>
    ${hasBefore ? `<div style="margin-bottom:12px;"><div style="font-size:12px; font-weight:700; color:#64748B; margin-bottom:4px;">Before</div><div class="photos-grid">${photoGrid(photos.before)}</div></div>` : ""}
    ${hasAfter ? `<div><div style="font-size:12px; font-weight:700; color:#64748B; margin-bottom:4px;">After</div><div class="photos-grid">${photoGrid(photos.after)}</div></div>` : ""}
  </div>
  ` : ""}

  <div class="declaration">
    <strong>Declaration:</strong> I, the undersigned customer, hereby acknowledge and confirm that the work described above has been completed to my satisfaction. 
    I accept the work as complete and release ${businessName || "the contractor"} from further obligations regarding this specific scope of work, 
    subject to any applicable statutory warranties and guarantees under Australian Consumer Law.
  </div>

  <div class="sig-section">
    <div>
      <div class="sig-label">Contractor</div>
      <div style="height:60px; display:flex; align-items:flex-end;">
        <div class="sig-name">${businessName}</div>
      </div>
      <div class="sig-block">
        <div class="sig-label">Authorised Representative</div>
        <div class="sig-date">${fmtDate(completionDate)}</div>
      </div>
    </div>
    <div>
      <div class="sig-label">Customer</div>
      <div style="height:60px; display:flex; align-items:flex-end;">
        ${signatureDataUrl ? `<img class="sig-image" src="${signatureDataUrl}" alt="Customer Signature" />` : `<div style="color:#94A3B8; font-style:italic; font-size:13px;">Awaiting signature</div>`}
      </div>
      <div class="sig-block customer">
        <div class="sig-name">${signedByName}</div>
        <div class="sig-date">${signedDate ? fmtDate(signedDate) : "Not yet signed"}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    This certificate was generated by ${businessName} using Mustered. ${businessAbn ? `ABN: ${businessAbn}` : ""}
    <br/>Certificate No: ${certNumber} | This document may be used as evidence of work completion.
  </div>

</div>

</body>
</html>`;
}

export function writeCertificatePreviewToWindow(w, job, ctx = {}) {
  const html = buildCertificateHtml(job, ctx);
  const blob = new Blob([html], { type: "text/html" });
  openBlobUrlInWindow(w, blob);
}
