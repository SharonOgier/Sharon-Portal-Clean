import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./client";
import { TerminologyProvider } from "./TerminologyContext";
import MobileWizard from "./MobileWizard";
import { isPageAllowed, getUserTier, TIERS, PRODUCT_TO_TIER, TIER_ORDER } from "./tierConfig";
import UpgradePrompt from "./components/UpgradePrompt";
import {
  ToastContainer,
  useToast,
  useConfirm,
  PaywallScreen,
  SectionCard,
  SummaryBox,
  DashboardHero,
  InsightChip,
  MetricCard,
  ActionHubCard,
  MiniBarChart,
  TrendBarsCard,
  WaterfallCard,
  ActivityListCard,
  EmptyState,
  DataTable,
  ExpenseTypeModal,
  IncomeSourceModal,
} from "./PortalComponents";
import {
  colours,
  navSections,
  navLabels,
  settingsTabs,
  getNavSections,
  getNavLabels,
  isValidEmail,
  collectValidationErrors,
  summariseValidationErrors,
  DEFAULT_API_BASE_URL,
  getApiBaseUrl,
  DEFAULT_MONTHLY_SUBSCRIPTION,
  SUPABASE_STORAGE_BUCKET,
  SUPABASE_TABLES,
  GST_TYPE_OPTIONS,
  expenseCategories,
  incomeTypeOptions,
  incomeFrequencyOptions,
  inputStyle,
  labelStyle,
  cardStyle,
  buttonPrimary,
  buttonSecondary,
  buttonDanger,
  currency,
  safeNumber,
  parseLocalDate,
  todayLocal,
  formatDateAU,
  addDays,
  addDaysEOM,
  nextNumber,
  makePaymentReference,
  formatCurrencyByCode,
  getClientCurrencyCode,
  calculateAdjustmentValues,
  fileToDataUrl,
  blankClient,
  initialProfile,
  initialClients,
  initialInvoices,
  initialQuotes,
  initialExpenses,
  initialIncomeSources,
  initialDocuments,
  formatMonthKey,
  formatMonthLabel,
  getSubscriptionAccess,
  LOCKED_FEE_RATE_PERCENT,
} from "./PortalHelpers";
import {
  buildQuoteHtml,
  buildQuoteEmailHtml,
  buildInvoiceHtml,
  openBlobUrlInWindow,
  writeInvoicePreviewToWindow,
} from "./PortalDocumentBuilders";


// --- Page components ----------------------------------------------------------
import DashboardPage        from "./pages/DashboardPage";
import FinancialInsightsPage from "./pages/FinancialInsightsPage";
import ClientsPage          from "./pages/ClientsPage";
import InvoicesPage         from "./pages/InvoicesPage";
import QuotesPage           from "./pages/QuotesPage";
import ServicesPage         from "./pages/ServicesPage";
import BillsPage            from "./pages/BillsPage";
import ExpensesPage         from "./pages/ExpensesPage";
import AssetsPage           from "./pages/AssetsPage";
import PropertiesPage       from "./pages/PropertiesPage";
import SchedulingPage       from "./pages/SchedulingPage";
import JobsReportPage       from "./pages/JobsReportPage";
import IncomeSourcesPage    from "./pages/IncomeSourcesPage";
import DocumentsPage        from "./pages/DocumentsPage";
import SetupWizardPage      from "./pages/SetupWizardPage";
import AuthPage             from "./pages/AuthPage";
import BASReportPage        from "./pages/BASReportPage";
import TaxEstimatorPage     from "./pages/TaxEstimatorPage";
import SettingsPage         from "./pages/SettingsPage";
import ATOTaxFormPage       from "./ATOTaxFormPage";
import BankReconciliationPage from "./pages/BankReconciliationPage";
import SubcontractorPortal from "./pages/SubcontractorPortal";
import TimesheetsPage from "./pages/TimesheetsPage";
// -----------------------------------------------------------------------------


export default function AccountingPortalPrototype() {
  const { toasts, toast, removeToast } = useToast();
  const { confirm, modal: confirmModal } = useConfirm();

  const MAX_RECEIPT_FILE_BYTES = 10 * 1024 * 1024;
  const MAX_DOCUMENT_FILE_BYTES = 15 * 1024 * 1024;
  const ALLOWED_RECEIPT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  const ALLOWED_DOCUMENT_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const getMimeTypeFromFile = (file) => {
    const explicitType = String(file?.type || "").trim().toLowerCase();
    if (explicitType) return explicitType;
    const name = String(file?.name || "").toLowerCase();
    if (name.endsWith(".pdf")) return "application/pdf";
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
    if (name.endsWith(".png")) return "image/png";
    if (name.endsWith(".webp")) return "image/webp";
    if (name.endsWith(".csv")) return "text/csv";
    if (name.endsWith(".xls")) return "application/vnd.ms-excel";
    if (name.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (name.endsWith(".doc")) return "application/msword";
    if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return "";
  };

  const validateSelectedFile = (file, { allowedTypes, maxBytes, label }) => {
    if (!file) throw new Error(`Please select a ${label.toLowerCase()} file first.`);
    const mimeType = getMimeTypeFromFile(file);
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`${label} file type is not allowed.`);
    }
    if (safeNumber(file.size) <= 0) {
      throw new Error(`${label} file appears to be empty.`);
    }
    if (safeNumber(file.size) > maxBytes) {
      throw new Error(`${label} file is too large.`);
    }
    return mimeType;
  };
  const [savingClient, setSavingClient] = useState(false);
  const [savingClientEdits, setSavingClientEdits] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingInvoiceEdits, setSavingInvoiceEdits] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [savingQuoteEdits, setSavingQuoteEdits] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingBill, setSavingBill] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [savingIncomeSource, setSavingIncomeSource] = useState(false);
  const [savingDocumentEdits, setSavingDocumentEdits] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [billWizardStep, setBillWizardStep] = useState(1);
  const [invoiceWizardStep, setInvoiceWizardStep] = useState(1);
  const [showARCreditNoteModal, setShowARCreditNoteModal] = useState(false);
  const [showAPCreditNoteModal, setShowAPCreditNoteModal] = useState(false);
  const [creditNoteSource, setCreditNoteSource] = useState(null);
  const [creditNoteForm, setCreditNoteForm] = useState({ amount: "", reason: "", date: todayLocal() });
  const [knownSuppliers, setKnownSuppliers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [properties, setProperties] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [recurringReminders, setRecurringReminders] = useState([]);
  const [subcontractorCosts, setSubcontractorCosts] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [basQuarter, setBasQuarter] = useState("0");
  const [basNotes, setBasNotes] = useState({ lodgedDate: "", referenceNumber: "", notes: "" });
  const [importType, setImportType] = useState("clients");
  const [importRows, setImportRows] = useState([]);
  const [importError, setImportError] = useState("");
  const [editingClientId, setEditingClientId] = useState(null);
  const [clientModalForm, setClientModalForm] = useState({ name: "", businessName: "", email: "", phone: "", address: "", abn: "", defaultCurrency: "AUD $", workType: "" });
  const [invClientSearch, setInvClientSearch] = useState("");
  const [quoteClientSearch, setQuoteClientSearch] = useState("");
  const [supplierForm, setSupplierForm] = useState({ name: "", email: "", phone: "", address: "", abn: "", contactPerson: "", notes: "" });
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [invoiceAlerts, setInvoiceAlerts] = useState([]);
  const [showInvoiceAlerts, setShowInvoiceAlerts] = useState(false);
  const invoiceAlertsShownRef = useRef(false);
  const [recurringDue, setRecurringDue] = useState([]);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringSelected, setRecurringSelected] = useState([]);
  const recurringShownRef = useRef(false);
  const [recurringJobsDue, setRecurringJobsDue] = useState([]);
  const [showRecurringJobsModal, setShowRecurringJobsModal] = useState(false);
  const [recurringJobsSelected, setRecurringJobsSelected] = useState([]);
  const recurringJobsShownRef = useRef(false);
  const [quoteWizardStep, setQuoteWizardStep] = useState(1);
  const [activePage, setActivePageRaw] = useState("dashboard");
  const isPopstateRef = useRef(false);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);
  const [showMobileWizard, setShowMobileWizard] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 768 : false));
  const [activeSettingsTab, setActiveSettingsTab] = useState("Profile");
  const [authUser, setAuthUser] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  // Multi-user state
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubcontractor, setIsSubcontractor] = useState(false);
  const [viewingAsUserId, setViewingAsUserId] = useState(null);
  const [allPortalUsers, setAllPortalUsers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamInvitations, setTeamInvitations] = useState([]);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showResetSentModal, setShowResetSentModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authPortalType, setAuthPortalType] = useState("standard");
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const activePortalUserId = viewingAsUserId || authUser?.id || null;
  const [setupComplete, setSetupComplete] = useState(false);
  const [wizardSaving, setWizardSaving] = useState(false);
  const [hasLoadedUserProfile, setHasLoadedUserProfile] = useState(false);
  const [wizardForm, setWizardForm] = useState({
    firstName: "",
    lastName: "",
    preferredName: "",
    businessName: "",
    legalBusinessName: "",
    email: "",
    phone: "",
    address: "",
    abn: "",
    workType: "Financial / Management Accountant",
    gstRegistered: true,
  });
  const hasHydratedSupabaseState = useRef(false);
  const lastSavedProfileRef = useRef(null);
  const isSigningOut = useRef(false);
  const [isSupabaseRestoring, setIsSupabaseRestoring] = useState(false);
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState(
    supabase ? "Ready to sync to database" : "Supabase not connected"
  );
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [realtimePulse, setRealtimePulse] = useState(null); // table name that just updated
  const [realtimeStatusByKey, setRealtimeStatusByKey] = useState({});
  const realtimeChannelRef = useRef(null);
  const [profile, setProfile] = useState(initialProfile);
  const [clients, setClients] = useState(initialClients);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [incomeSources, setIncomeSources] = useState(initialIncomeSources);
  const [documents, setDocuments] = useState(initialDocuments);
  const [documentFile, setDocumentFile] = useState(null);
  const [services, setServices] = useState([]);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    gstType: "GST on Income (10%)",
    price: "",
    gst: "0.00",
    total: "0.00",
  });
  const [showIncomeSourceModal, setShowIncomeSourceModal] = useState(false);
  const [incomeSourceForm, setIncomeSourceForm] = useState({
    name: "",
    incomeType: "Casual employment",
    beforeTax: "",
    frequency: "",
    startedAfterDate: false,
    hasEndDate: false,
  });
  const [clientForm, setClientForm] = useState(blankClient);

  const blankLineItem = () => ({ id: Date.now() + Math.random(), description: "", quantity: 1, unitPrice: "", gstType: "GST on Income (10%)" });

  const [invoiceForm, setInvoiceForm] = useState({
    clientId: "",
    invoiceDate: todayLocal(),
    dueDate: addDays(todayLocal(), initialProfile.paymentTermsDays),
    startDate: "",
    endDate: "",
    sendDate: "",
    sendTime: "",
    recurs: "Never",
    lineItems: [blankLineItem()],
    gstType: "GST on Income (10%)",
    manualGst: false,
    currencyCode: "AUD",
    description: "",
    subtotal: "",
    comments: "",
    purchaseOrderReference: "",
    includesUntaxedPortion: false,
    hidePhoneNumber: initialProfile.hidePhoneOnDocs,
    quantity: 1,
    gstOverride: "",
    savedRecordId: null,
    invoiceNumber: "",
  });

  const buildInvoiceEditorForm = (invoice) => {
    const quantity = Math.max(1, safeNumber(invoice?.quantity || 1));
    const unitPrice = quantity ? safeNumber(invoice?.subtotal) / quantity : safeNumber(invoice?.subtotal);
    const selectedClient = getClientById(invoice?.clientId) || clients[0];
    const gstExempt = Boolean(selectedClient?.outsideAustraliaOrGstExempt);
    return {
      id: invoice?.id || null,
      invoiceNumber: invoice?.invoiceNumber || "",
      clientId: invoice?.clientId || clients[0]?.id || "",
      invoiceDate: invoice?.invoiceDate || todayLocal(),
      dueDate: invoice?.dueDate || addDays(invoice?.invoiceDate || todayLocal(), (safeNumber(profile.paymentTermsDays) || 14)),
      startDate: invoice?.startDate || "",
      endDate: invoice?.endDate || "",
      sendDate: invoice?.sendDate || "",
      sendTime: invoice?.sendTime || "",
      recurs: invoice?.recurs || "Never",
      lineItems: (invoice?.lineItems && invoice.lineItems.length > 0)
        ? invoice.lineItems
        : [{ id: Date.now(), description: invoice?.description || "", quantity: invoice?.quantity || 1, unitPrice: invoice?.subtotal ? (safeNumber(invoice.subtotal) / Math.max(1, safeNumber(invoice.quantity || 1))).toFixed(2) : "", gstType: gstExempt ? "GST Free" : invoice?.gstType || "GST on Income (10%)" }],
      gstType: gstExempt ? "GST Free" : invoice?.gstType || "GST on Income (10%)",
      manualGst: false,
      currencyCode: invoice?.currencyCode || getClientCurrencyCode(selectedClient),
      description: invoice?.description || "",
      subtotal: unitPrice ? unitPrice.toFixed(2) : "",
      comments: invoice?.comments || "",
      purchaseOrderReference: invoice?.purchaseOrderReference || "",
      includesUntaxedPortion: Boolean(invoice?.includesUntaxedPortion),
      hidePhoneNumber: invoice?.hidePhoneNumber == null ? profile.hidePhoneOnDocs : Boolean(invoice?.hidePhoneNumber),
      quantity,
      gstOverride: "",
      status: invoice?.status || "Draft",
      paymentReference: invoice?.paymentReference || makePaymentReference(invoice?.invoiceNumber || ""),
      stripeCheckoutUrl: invoice?.stripeCheckoutUrl || "",
      jobId: invoice?.jobId || "",
      jobSearch: "",
    };
  };

  const [invoiceEditorOpen, setInvoiceEditorOpen] = useState(false);
  const [invoiceEditorForm, setInvoiceEditorForm] = useState(null);
  const [quoteForm, setQuoteForm] = useState({
    clientId: "",
    quoteDate: todayLocal(),
    expiryDate: addDays(todayLocal(), 31),
    lineItems: [{ id: Date.now() + Math.random(), description: "", quantity: 1, unitPrice: "", gstType: "GST on Income (10%)" }],
    gstType: "GST on Income (10%)",
    manualGst: false,
    currencyCode: "AUD",
    description: "",
    quantity: 1,
    subtotal: "",
    gstOverride: "",
    comments: "",
    hidePhoneNumber: initialProfile.hidePhoneOnDocs,
    savedRecordId: null,
    quoteNumber: "",
  });

  const buildQuoteEditorForm = (quote) => {
    const quantity = Math.max(1, safeNumber(quote?.quantity || 1));
    const unitPrice = quantity ? safeNumber(quote?.subtotal) / quantity : safeNumber(quote?.subtotal);
    const selectedClient = getClientById(quote?.clientId) || clients[0];
    const gstExempt = Boolean(selectedClient?.outsideAustraliaOrGstExempt);
    return {
      id: quote?.id || null,
      quoteNumber: quote?.quoteNumber || "",
      clientId: quote?.clientId || clients[0]?.id || "",
      quoteDate: quote?.quoteDate || todayLocal(),
      expiryDate: quote?.expiryDate || addDays(quote?.quoteDate || todayLocal(), 31),
      lineItems: (quote?.lineItems && quote.lineItems.length > 0)
        ? quote.lineItems
        : [{ id: Date.now(), description: quote?.description || "", quantity: quote?.quantity || 1, unitPrice: unitPrice ? unitPrice.toFixed(2) : "", gstType: gstExempt ? "GST Free" : quote?.gstType || "GST on Income (10%)" }],
      gstType: gstExempt ? "GST Free" : quote?.gstType || "GST on Income (10%)",
      manualGst: false,
      currencyCode: quote?.currencyCode || getClientCurrencyCode(selectedClient),
      description: quote?.description || "",
      quantity,
      subtotal: unitPrice ? unitPrice.toFixed(2) : "",
      gstOverride: "",
      comments: quote?.comments || "",
      hidePhoneNumber: quote?.hidePhoneNumber == null ? profile.hidePhoneOnDocs : Boolean(quote?.hidePhoneNumber),
      status: quote?.status || "Draft",
    };
  };

  const [quoteEditorOpen, setQuoteEditorOpen] = useState(false);
  const [quoteEditorForm, setQuoteEditorForm] = useState(null);

  const syncSingleLineEditorToLineItems = (form) => {
    const baseLines = Array.isArray(form?.lineItems) && form.lineItems.length > 0
      ? [...form.lineItems]
      : [{ id: Date.now(), description: "", quantity: 1, unitPrice: "", gstType: form?.gstType || "GST on Income (10%)" }];
    const firstLine = baseLines[0] || {};
    baseLines[0] = {
      ...firstLine,
      description: form?.description || firstLine.description || "",
      quantity: form?.quantity || firstLine.quantity || 1,
      unitPrice: form?.subtotal || firstLine.unitPrice || "",
      gstType: clientIsGstExempt(form?.clientId) ? "GST Free" : (form?.gstType || firstLine.gstType || "GST on Income (10%)"),
    };
    return baseLines;
  };

  const [clientEditorOpen, setClientEditorOpen] = useState(false);
  const [clientEditorForm, setClientEditorForm] = useState(null);
  const [expenseEditorOpen, setExpenseEditorOpen] = useState(false);
  const [expenseEditorForm, setExpenseEditorForm] = useState(null);
  const [incomeSourceEditorOpen, setIncomeSourceEditorOpen] = useState(false);
  const [incomeSourceEditorForm, setIncomeSourceEditorForm] = useState(null);
  const [documentEditorOpen, setDocumentEditorOpen] = useState(false);
  const [documentEditorForm, setDocumentEditorForm] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    date: todayLocal(),
    dueDate: addDaysEOM(todayLocal()),
    supplier: "",
    category: "",
    description: "",
    amount: "",
    expenseType: "",
    workType: profile.workType,
    receiptFileName: "",
    receiptUrl: "",
  });
  const blankBillLine = () => ({ id: Date.now() + Math.random(), description: "", category: "", amount: "", gstIncl: "yes" });
  const [billLineItems, setBillLineItems] = useState([blankBillLine()]);
  const [receiptFile, setReceiptFile] = useState(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseTypeStep, setExpenseTypeStep] = useState(1);
  const [expenseTypeSelection, setExpenseTypeSelection] = useState("");
  const [expenseWorkType, setExpenseWorkType] = useState(profile.workType);
  const [expenseWorkTypes, setExpenseWorkTypes] = useState([
    "Financial / Management Accountant",
    "Bookkeeping",
    "Payroll",
    "Business Advisory",
  ]);
  const [expenseCategorySelection, setExpenseCategorySelection] = useState("");
  const [searchExpenseCategory, setSearchExpenseCategory] = useState("");

  const clearPortalForFreshSetup = () => {
    setProfile(initialProfile);
    setClients([]);
    setInvoices([]);
    setQuotes([]);
    setExpenses([]);
    setIncomeSources([]);
    setServices([]);
    setDocuments([]);
    setRecurringReminders([]);
    setSuppliers([]);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem("sas_profile");
      window.localStorage.removeItem("sas_clients");
      window.localStorage.removeItem("sas_invoices");
      window.localStorage.removeItem("sas_quotes");
      window.localStorage.removeItem("sas_expenses");
      window.localStorage.removeItem("sas_incomeSources");
      window.localStorage.removeItem("sas_services");
      window.localStorage.removeItem("sas_documents");
    }
  };

  const buildWizardProfile = () => {
    const businessName = String(wizardForm.businessName || "").trim();
    const email = String(wizardForm.email || authUser?.email || "").trim();
    const firstName = String(wizardForm.firstName || "").trim();
    const preferredName = String(wizardForm.preferredName || "").trim();
    const address = String(wizardForm.address || "").trim();

    return { ...initialProfile,
      firstName,
      lastName: String(wizardForm.lastName || "").trim(),
      preferredName: preferredName || firstName,
      businessName,
      legalBusinessName: String(wizardForm.legalBusinessName || "").trim(),
      email,
      phone: String(wizardForm.phone || "").trim(),
      address,
      personalAddress: address,
      abn: String(wizardForm.abn || "").trim(),
      workType: wizardForm.workType || "",
      gstRegistered: Boolean(wizardForm.gstRegistered),
      businessType: wizardForm.businessType || "tradie",
      industry: wizardForm.industry || "",
    };
  };

  const completeSetupWizard = async () => {
    const nextProfile = { ...buildWizardProfile(),
      setupComplete: true,
      setupCompletedAt: new Date().toISOString(),
      trialStartedAt: new Date().toISOString(),
      subscriptionStatus: "trialing",
      subscriptionTier: wizardForm.selectedTier || "pro",
    };
    const wizardErrors = collectValidationErrors(
      !nextProfile.businessName && "Please enter your business name.",
      !nextProfile.email && "Please enter your email address.",
      nextProfile.email && !isValidEmail(nextProfile.email) && "Please enter a valid email address."
    );
    if (wizardErrors.length) {
      summariseValidationErrors("Setup wizard", wizardErrors, toast);
      return;
    }

    setWizardSaving(true);
    try {
      if (supabase && authUser) {
        const savedProfile = await saveProfileToSupabase(nextProfile);
        if (!savedProfile) {
          throw new Error("Your business profile could not be saved. Please try again.");
        }
        await supabase.auth.updateUser({
          data: {
            ...authUser.user_metadata,
            needs_setup: false,
            needsSetup: false,
          },
        });
      }

      clearPortalForFreshSetup();
      setProfile({
        ...nextProfile,
        setupComplete: true,
        setupCompletedAt: nextProfile.setupCompletedAt,
      });
      setWizardForm((prev) => ({ ...prev,
        businessName: nextProfile.businessName,
        legalBusinessName: nextProfile.legalBusinessName,
        email: nextProfile.email,
        firstName: nextProfile.firstName,
        lastName: nextProfile.lastName,
        preferredName: nextProfile.preferredName,
        phone: nextProfile.phone,
        address: nextProfile.address,
        abn: nextProfile.abn,
        workType: nextProfile.workType,
        gstRegistered: nextProfile.gstRegistered,
      }));
      setSetupComplete(true);
      setHasLoadedUserProfile(true);
      setActivePage("dashboard");
      toast.success("Business profile saved!");
    } catch (error) {
      console.error("SETUP WIZARD SAVE ERROR:", error);
      toast.error(error?.message || "Your business profile could not be saved.");
    } finally {
      setWizardSaving(false);
    }
  };

  useEffect(() => {
    if (!authUser?.email) return;
    setWizardForm((prev) => ({ ...prev,
      email: prev.email || authUser.email || "",
    }));
  }, [authUser]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => setIsMobileViewport(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Wrap setActivePage to push browser history
  const setActivePage = React.useCallback((page) => {
    setActivePageRaw((prev) => {
      if (page !== prev && !isPopstateRef.current) {
        window.history.pushState({ portalPage: page }, "", window.location.pathname + window.location.search);
      }
      isPopstateRef.current = false;
      return page;
    });
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const onPopState = (e) => {
      if (e.state && e.state.portalPage) {
        isPopstateRef.current = true;
        setActivePage(e.state.portalPage);
      }
    };
    // Set initial state
    window.history.replaceState({ portalPage: activePage }, "", window.location.pathname + window.location.search);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setShowQuickAddMenu(false);
  }, [activePage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathName = String(window.location.pathname || "").toLowerCase();
      const search = new URLSearchParams(window.location.search || "");
      const hashParams = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
      const requestedMode =
        search.get("mode") ||
        search.get("auth") ||
        hashParams.get("mode") ||
        hashParams.get("auth") ||
        "";
      const requestedPortalType =
        search.get("portal") ||
        search.get("role") ||
        hashParams.get("portal") ||
        hashParams.get("role") ||
        "";
      const requestedEmail =
        search.get("email") ||
        hashParams.get("email") ||
        "";

      if (
        pathName.includes("signup") ||
        requestedMode === "signup" ||
        requestedMode === "create-account" ||
        search.get("signup") === "1"
      ) {
        setAuthMode("signup");
      } else if (
        pathName.includes("login") ||
        requestedMode === "signin" ||
        requestedMode === "login"
      ) {
        setAuthMode("signin");
      }

      setAuthPortalType(requestedPortalType === "subcontractor" ? "subcontractor" : "standard");
      if (requestedEmail) {
        setAuthForm((prev) => ({ ...prev, email: requestedEmail }));
      }

      const recoveryRequested =
        pathName.includes("reset-password") ||
        pathName.includes("update-password") ||
        search.get("reset") === "1" ||
        search.get("type") === "recovery" ||
        hashParams.get("type") === "recovery" ||
        Boolean(search.get("access_token") && search.get("refresh_token")) ||
        Boolean(hashParams.get("access_token") && hashParams.get("refresh_token"));

      if (recoveryRequested) {
        setIsResettingPassword(true);
      }
    }

    if (!supabase?.auth) {
      setHasLoadedUserProfile(true);
      setAuthReady(true);
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error("SUPABASE AUTH SESSION ERROR:", error);
        return;
      }
      setAuthUser(data?.session?.user || null);
      setAuthReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { setAuthUser(null); setAuthReady(true); return; }
      if (event === "PASSWORD_RECOVERY") { setIsResettingPassword(true); setAuthReady(true); return; }
      if (isSigningOut.current) return;
      setAuthUser(session?.user || null);
      setAuthReady(true);
    });

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    setProfile((prev) => {
      const nextFeeRate = LOCKED_FEE_RATE_PERCENT;
      const nextStripeServerUrl = DEFAULT_API_BASE_URL;
      if (
        safeNumber(prev?.feeRate) === nextFeeRate &&
        String(prev?.stripeServerUrl || "").trim() === nextStripeServerUrl
      ) {
        return prev;
      }
      return {
        ...prev,
        feeRate: nextFeeRate,
        stripeServerUrl: nextStripeServerUrl,
      };
    });
  }, []);

  useEffect(() => {
    if (!hasLoadedUserProfile || invoiceAlertsShownRef.current || expenses.length === 0) return;
    const today = parseLocalDate(todayLocal());
    const alerts = [];
    expenses.forEach((bill) => {
      if (bill.isPaid || bill.status === "Paid") return;
      const dueDate = bill.dueDate || bill.date;
      if (!dueDate) return;
      const due = parseLocalDate(dueDate);
      const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
      const supplier = bill.supplier || bill.description || `Bill ${bill.id}`;
      const amount = bill.amount ? ` ($${parseFloat(bill.amount).toFixed(2)})` : "";
      if (diff < 0) {
        alerts.push({ id: bill.id, type: "overdue", days: Math.abs(diff), label: `${supplier}${amount} is overdue by ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? "s" : ""}` });
      } else if (diff === 0) {
        alerts.push({ id: bill.id, type: "today", days: 0, label: `${supplier}${amount} is due today` });
      } else if (diff <= 2) {
        alerts.push({ id: bill.id, type: "soon", days: diff, label: `${supplier}${amount} is due in ${diff} day${diff !== 1 ? "s" : ""}` });
      }
    });
    if (alerts.length > 0) {
      alerts.sort((a, b) => a.type === "overdue" ? -1 : b.type === "overdue" ? 1 : a.days - b.days);
      setInvoiceAlerts(alerts);
      setShowInvoiceAlerts(true);
      invoiceAlertsShownRef.current = true;
    }
  }, [hasLoadedUserProfile, expenses]);

  useEffect(() => {
    if (!hasLoadedUserProfile || recurringShownRef.current || invoices.length === 0) return;
    const today = todayLocal();
    const calcNext = (fromDate, freq) => {
      const d = parseLocalDate(fromDate);
      if (freq === "Weekly") d.setDate(d.getDate() + 7);
      else if (freq === "Fortnightly") d.setDate(d.getDate() + 14);
      else if (freq === "Monthly") d.setMonth(d.getMonth() + 1);
      else if (freq === "Quarterly") d.setMonth(d.getMonth() + 3);
      else if (freq === "Annually") d.setFullYear(d.getFullYear() + 1);
      else return null;
      return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    };
    const due = invoices
      .filter((inv) => inv.recurs && inv.recurs !== "Never" && inv.type !== "credit_note")
      .filter((inv) => {
        const check = inv.nextRecurDate || calcNext(inv.invoiceDate, inv.recurs);
        return check && check <= today;
      })
      .map((inv) => ({
        ...inv,
        clientName: (clients.find((c) => String(c.id) === String(inv.clientId)) || {}).name || "Unknown client",
        dueRecurDate: inv.nextRecurDate || calcNext(inv.invoiceDate, inv.recurs),
      }));
    if (due.length > 0) {
      setRecurringDue(due);
      setRecurringSelected(due.map((inv) => inv.id));
      setShowRecurringModal(true);
      recurringShownRef.current = true;
    }
  }, [hasLoadedUserProfile, invoices, clients]);

  useEffect(() => {
    const fromBills = expenses.map((e) => e.supplier).filter(Boolean);
    const fromDirectory = suppliers.map((s) => s.name).filter(Boolean);
    const combined = [...new Set([...fromDirectory, ...fromBills])].sort();
    setKnownSuppliers(combined);
  }, [expenses, suppliers]);

  // Note: incomeSources, services, and documents are persisted in Supabase only.
  // localStorage writes were removed to avoid a stale shadow copy with no reader.

  useEffect(() => {
    window.simulateInvoicePayment = simulateInvoicePayment;
    return () => {
      delete window.simulateInvoicePayment;
    };
  }, [invoices]);

  useEffect(() => {
    window.sendInvoiceFromPreview = sendInvoiceFromPreview;
    window.sendQuoteFromPreview = sendQuoteFromPreview;
    return () => {
      delete window.sendInvoiceFromPreview;
      delete window.sendQuoteFromPreview;
    };
  }, [invoices, quotes, profile, clients]);

  // Check admin role and load optional team/admin tables only when needed.
  useEffect(() => {
      if (!authUser || !supabase) return;
      (async () => {
        try {
          const { data: roles, error: rolesError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", authUser.id);
          if (rolesError && !["42501", "42P01"].includes(rolesError.code || "")) throw rolesError;
          const adminRole = (roles || []).some(r => r.role === "admin");
          const subRole = (roles || []).some(r => r.role === "subcontractor");
          setIsAdmin(adminRole);
          setIsSubcontractor(subRole);
          if (adminRole && activePage === "settings") {
            const { data: profiles } = await supabase.from("sas_profile").select("id, data, user_id");
            setAllPortalUsers((profiles || []).map(p => ({
              userId: p.user_id,
              businessName: p.data?.businessName || p.data?.name || "Unknown",
              email: p.data?.email || "",
            })));
          }

          if (activePage !== "settings") {
            return;
          }

          // Load team members and invitations only in Settings where they are used.
          const { data: members, error: membersError } = await supabase
            .from("sas_team_members")
            .select("*")
            .eq("owner_user_id", authUser.id);
          if (membersError && !["42501", "42P01"].includes(membersError.code || "")) throw membersError;
          setTeamMembers(members || []);
          const { data: invites, error: invitesError } = await supabase
            .from("sas_team_invitations")
            .select("*")
            .eq("inviter_user_id", authUser.id);
          if (invitesError && !["42501", "42P01"].includes(invitesError.code || "")) throw invitesError;
          setTeamInvitations(invites || []);
          // Check for pending invitations for this user and auto-accept
          const { data: pendingInvites, error: pendingInvitesError } = await supabase
            .from("sas_team_invitations")
            .select("*")
            .eq("email", authUser.email)
            .eq("status", "pending");
          if (pendingInvitesError && !["42501", "42P01"].includes(pendingInvitesError.code || "")) throw pendingInvitesError;
          if (pendingInvites?.length) {
            for (const inv of pendingInvites) {
              await supabase.from("sas_team_members").insert({ owner_user_id: inv.inviter_user_id, member_user_id: authUser.id, permission: inv.permission }).select();
              await supabase.from("sas_team_invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", inv.id);
            }
          const { data: updatedMembers } = await supabase.from("sas_team_members").select("*").eq("owner_user_id", authUser.id);
          setTeamMembers(updatedMembers || []);
        }
        } catch (err) { console.warn("Multi-user check failed:", err); }
    })();
  }, [authUser, activePage]);

  const switchToUser = async (targetUserId) => {
    if (!supabase || !authUser) return;
    setViewingAsUserId(targetUserId === authUser.id ? null : targetUserId);
    // Re-fetch all data for the target user
    setIsSupabaseRestoring(true);
    try {
      const uid = targetUserId;
      const safeF = (table) => fetchCollectionFromDatabase(table, uid).catch(() => []);
      const [rProfile, rClients, rInvoices, rQuotes, rExpenses, rIncome, rServices, rDocs, rSuppliers, rAssets, rProperties, rJobs, rRecurringReminders] = await Promise.all([
        safeF(SUPABASE_TABLES.profile), safeF(SUPABASE_TABLES.clients), safeF(SUPABASE_TABLES.invoices),
        safeF(SUPABASE_TABLES.quotes), safeF(SUPABASE_TABLES.expenses), safeF(SUPABASE_TABLES.incomeSources),
        safeF(SUPABASE_TABLES.services), safeF(SUPABASE_TABLES.documents), safeF(SUPABASE_TABLES.suppliers),
        safeF(SUPABASE_TABLES.assets), safeF(SUPABASE_TABLES.properties), safeF(SUPABASE_TABLES.jobs),
        safeF(SUPABASE_TABLES.recurringReminders),
      ]);
      const remoteProfile = Array.isArray(rProfile) && rProfile.length
        ? [...rProfile].reverse().find(r => Boolean(r?.setupComplete ?? r?.data?.setupComplete)) || rProfile[rProfile.length - 1]
        : null;
      const nextProfile = remoteProfile?.data ? { ...initialProfile, ...remoteProfile.data, id: remoteProfile.id } : remoteProfile ? { ...initialProfile, ...remoteProfile } : initialProfile;
      setProfile(nextProfile);
      setClients(Array.isArray(rClients) ? rClients : []);
      setInvoices(Array.isArray(rInvoices) ? rInvoices : []);
      setQuotes(Array.isArray(rQuotes) ? rQuotes : []);
      setExpenses(Array.isArray(rExpenses) ? rExpenses : []);
      setIncomeSources(Array.isArray(rIncome) ? rIncome : []);
      setServices(Array.isArray(rServices) ? rServices : []);
      setDocuments(Array.isArray(rDocs) ? rDocs : []);
      setSuppliers(Array.isArray(rSuppliers) ? rSuppliers : []);
      setAssets(Array.isArray(rAssets) ? rAssets : []);
      setProperties(Array.isArray(rProperties) ? rProperties : []);
      setJobs(Array.isArray(rJobs) ? rJobs : []);
      setRecurringReminders(Array.isArray(rRecurringReminders) ? rRecurringReminders : []);
      setActivePage("dashboard");
    } catch (err) { console.error("Switch user failed:", err); }
    setIsSupabaseRestoring(false);
  };

  useEffect(() => {
    if (authUser) {
      restorePortalStateFromSupabase();
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !hasLoadedUserProfile) return;
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get("stripe");
    const invoiceId = params.get("invoiceId");

    if (stripeStatus === "success") {
      if (invoiceId) {
        setActivePage("invoices");
        const invoice = invoices.find((inv) => String(inv.id) === String(invoiceId));
        if (invoice && invoice.status !== "Paid") {
          const updatedInvoice = { ...invoice, status: "Paid", paidAt: new Date().toISOString(), paidVia: "Stripe" };
          (async () => {
            try {
              const savedInvoice = await upsertRecordInDatabase(SUPABASE_TABLES.invoices, updatedInvoice);
              setInvoices((prev) => prev.map((inv) => String(inv.id) === String(invoiceId) ? savedInvoice : inv));
              // Clear the query string so a refresh doesn't re-trigger this
              window.history.replaceState({}, "", window.location.pathname);
            } catch (e) {
              console.error("Failed to mark invoice paid on stripe success:", e);
            }
          })();
        }
      }
    }
  }, [authUser, hasLoadedUserProfile, invoices]);

  // Check Stripe subscription status on load and after checkout return
  useEffect(() => {
    if (!authUser || !hasLoadedUserProfile || !supabase) return;
    const checkSub = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        if (error) { console.error("check-subscription error:", error); return; }
        if (data?.subscribed) {
          const tierKey = data.product_id ? (PRODUCT_TO_TIER[data.product_id] || null) : null;
          setProfile((prev) => {
            const updated = {
              ...prev,
              subscriptionStatus: data.subscription_status === "trialing" ? "trialing" : "active",
              subscriptionProductId: data.product_id || prev.subscriptionProductId,
              subscriptionTier: tierKey || prev.subscriptionTier,
              subscriptionEnd: data.subscription_end || prev.subscriptionEnd,
              subscriptionId: data.subscription_id || prev.subscriptionId,
            };
            // Persist tier change to database so it survives reloads
            const tierChanged = updated.subscriptionTier !== prev.subscriptionTier ||
              updated.subscriptionProductId !== prev.subscriptionProductId ||
              updated.subscriptionStatus !== prev.subscriptionStatus;
            if (tierChanged) {
              saveProfileToSupabase(updated).catch((e) => console.error("Auto-save tier error:", e));
            }
            return updated;
          });
        } else {
          // User has no active subscription — clear tier if it was previously set from Stripe
          setProfile((prev) => {
            if (prev.subscriptionStatus && prev.subscriptionStatus !== "trialing") {
              const updated = {
                ...prev,
                subscriptionStatus: "",
                subscriptionTier: "",
                subscriptionProductId: "",
                subscriptionEnd: "",
                subscriptionId: "",
              };
              saveProfileToSupabase(updated).catch((e) => console.error("Auto-save tier clear error:", e));
              return updated;
            }
            return prev;
          });
        }
      } catch (e) { console.error("check-subscription fetch error:", e); }
    };
    checkSub();
    // Also handle ?subscribed=1 return from Stripe checkout
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribed") === "1") {
      window.history.replaceState({}, "", window.location.pathname);
      checkSub();
    }
    // Poll every 60 seconds so tier changes auto-update
    const interval = setInterval(checkSub, 60000);
    return () => clearInterval(interval);
  }, [authUser, hasLoadedUserProfile]);

  useEffect(() => {
    if (!authUser) return;
    if (profile?.setupComplete) {
      setSetupComplete(true);
    }
  }, [authUser, profile?.setupComplete]);

  // ── Recurring Jobs detection on login ──
  useEffect(() => {
    if (!hasLoadedUserProfile || recurringJobsShownRef.current || jobs.length === 0) return;
    const todayStr = todayLocal();
    const calcNextJobDate = (fromDate, freq) => {
      const d = parseLocalDate(fromDate);
      if (freq === "Weekly") d.setDate(d.getDate() + 7);
      else if (freq === "Fortnightly") d.setDate(d.getDate() + 14);
      else if (freq === "Monthly") d.setMonth(d.getMonth() + 1);
      else return null;
      return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    };
    const due = jobs
      .filter(j => j.recurs && j.recurs !== "Never" && j.status === "Completed" && !j.nextRecurringCreated)
      .filter(j => {
        const next = calcNextJobDate(j.startDate, j.recurs);
        return next && next <= todayStr;
      })
      .map(j => ({
        ...j,
        clientName: (clients.find(c => String(c.id) === String(j.clientId)) || {}).name || "—",
        nextDate: calcNextJobDate(j.startDate, j.recurs),
      }));
    if (due.length > 0) {
      setRecurringJobsDue(due);
      setRecurringJobsSelected(due.map(j => j.id));
      setShowRecurringJobsModal(true);
      recurringJobsShownRef.current = true;
    }
  }, [hasLoadedUserProfile, jobs, clients]);


  const uploadReceiptToSupabase = async (file) => {
    if (!supabase) {
      throw new Error("Supabase client not provided");
    }

    validateSelectedFile(file, {
      allowedTypes: ALLOWED_RECEIPT_TYPES,
      maxBytes: MAX_RECEIPT_FILE_BYTES,
      label: "Receipt",
    });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const today = todayLocal();
    const businessSlug = String(profile?.businessName || "portal").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40);
    const folderPath = `${businessSlug}/${activePortalUserId || authUser.id}/expenses/${today}`;
    const filePath = `${folderPath}/receipt-${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(filePath, file, { upsert: false });
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(filePath);
    return {
      fileName: file.name,
      filePath,
      receiptUrl: publicUrlData.publicUrl,
    };
  };

  const uploadDocumentToSupabase = async (file) => {
    if (!supabase) {
      throw new Error("Supabase client not provided");
    }

    validateSelectedFile(file, {
      allowedTypes: ALLOWED_DOCUMENT_TYPES,
      maxBytes: MAX_DOCUMENT_FILE_BYTES,
      label: "Document",
    });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const today = todayLocal();
    const businessSlug = String(profile?.businessName || "portal").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40);
    const folderPath = `${businessSlug}/${activePortalUserId || authUser.id}/documents/${today}`;
    const filePath = `${folderPath}/document-${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(filePath, file, { upsert: false });
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(filePath);
    return {
      fileName: file.name,
      filePath,
      url: publicUrlData.publicUrl,
    };
  };

  const sanitiseForSupabase = (value) =>
    JSON.parse(
      JSON.stringify(value, (_, nestedValue) =>
        nestedValue === undefined ? null : nestedValue
      )
    );

  const isValidDbId = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  };

  const mergeRecordById = (records, savedRecord) => {
    if (!savedRecord?.id) return Array.isArray(records) ? records : [];
    const current = Array.isArray(records) ? records : [];
    const exists = current.some((record) => String(record?.id) === String(savedRecord.id));
    if (exists) {
      return current.map((record) =>
        String(record?.id) === String(savedRecord.id) ? savedRecord : record
      );
    }
    return [...current, savedRecord];
  };

  const buildSupabaseRow = (item) => {
    if (!authUser?.id) {
      throw new Error("Please sign in first.");
    }
    if (!activePortalUserId) {
      throw new Error("No active portal user selected.");
    }

    const row = {
      user_id: activePortalUserId,
      data: sanitiseForSupabase({ ...(item || {}) }),
      updated_at: new Date().toISOString(),
    };
    // Only include id if the record already has a valid DB-assigned id
    if (isValidDbId(item?.id)) {
      row.id = Number(item.id);
      // Also keep the id inside the data blob for consistency
      row.data.id = Number(item.id);
    }
    return row;
  };

  const fetchCollectionFromDatabase = async (tableName, overrideUserId = null) => {
    if (!supabase || !authUser?.id) return [];
    const targetUserId = overrideUserId || activePortalUserId || authUser.id;

    const { data, error } = await supabase
      .from(tableName)
      .select("id, data, user_id, updated_at")
      .eq("user_id", targetUserId)
      .order("updated_at", { ascending: true });

    if (error) throw error;

    return Array.isArray(data)
      ? data.map((row) => ({
          ...((row?.data && typeof row.data === "object" && !Array.isArray(row.data)) ? row.data : {}),
          id: row.id,
          user_id: row.user_id,
          updated_at: row.updated_at,
        }))
      : [];
  };

  const upsertRecordInDatabase = async (tableName, record) => {
    if (!authUser?.id) throw new Error("Please sign in first.");
    const row = buildSupabaseRow(record);

    if (row.id) {
      // Existing record — update by id
      const { data, error } = await supabase
        .from(tableName)
        .update({ data: row.data, updated_at: row.updated_at })
        .eq("id", row.id)
        .eq("user_id", row.user_id)
        .select("id, data, user_id")
        .maybeSingle();
      if (error) throw error;
      if (data) return { ...(data.data || {}), id: data.id, user_id: data.user_id };
      // If update matched nothing, fall through to insert
    }

    // New record — insert without id, let DB generate it
    const { user_id, data: rowData, updated_at } = row;
    const { data, error } = await supabase
      .from(tableName)
      .insert({ user_id, data: rowData, updated_at })
      .select("id, data, user_id")
      .single();
    if (error) throw error;
    return { ...(data.data || {}), id: data.id, user_id: data.user_id };
  };

  const deleteRecordFromDatabase = async (tableName, id) => {
    if (!authUser?.id) throw new Error("Please sign in first.");
    if (!activePortalUserId) throw new Error("No active portal user selected.");
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", safeNumber(id))
      .eq("user_id", activePortalUserId);
    if (error) throw error;
  };

  const saveJob = async (payload, opts = {}) => {
    try {
      const saved = await upsertRecordInDatabase(SUPABASE_TABLES.jobs, payload);
      setJobs((prev) => {
        const exists = prev.find((j) => j.id === payload.id);
        return exists ? prev.map((j) => j.id === payload.id ? saved : j) : [...prev, saved];
      });
      if (!opts.silent) {
        toast.success(payload.id && jobs.find(j => j.id === payload.id) ? "Job updated!" : "Job created!");
      }
      return saved;
    } catch (err) {
      toast.error(err.message || "Failed to save job");
      return null;
    }
  };

  const createInvoiceFromJob = async (job) => {
    const client = clients.find(c => String(c.id) === String(job.clientId));
    if (!client) return;
    const linkedQuote = quotes.find(q => String(q.jobId) === String(job.id));
    const lineItems = linkedQuote?.lineItems?.length
      ? linkedQuote.lineItems
      : [{ id: Date.now(), description: job.title || "Job completed", quantity: 1, unitPrice: "", gstType: profile.gstType || "GST on Income (10%)" }];
    const subtotal = lineItems.reduce((s, li) => s + (parseFloat(li.unitPrice) || 0) * (parseFloat(li.quantity) || 1), 0);
    const gstRate = (profile.gstType || "").includes("10") ? 0.1 : 0;
    const gst = subtotal * gstRate;
    const inv = {
      id: Date.now() + Math.random(),
      clientId: String(client.id),
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: addDays(new Date().toISOString().slice(0, 10), safeNumber(profile.paymentTermsDays) || 14),
      lineItems,
      subtotal: subtotal.toFixed(2),
      gst: gst.toFixed(2),
      total: (subtotal + gst).toFixed(2),
      status: "Draft",
      jobId: String(job.id),
      recurs: job.recurs && job.recurs !== "Never" ? job.recurs : "Never",
      currencyCode: profile.currencyCode || "AUD",
      gstType: profile.gstType || "GST on Income (10%)",
    };
    const saved = await upsertRecordInDatabase(SUPABASE_TABLES.invoices, inv);
    setInvoices(prev => [...prev, saved]);
    toast.success(`📄 Draft invoice created for ${client.name}`);
    return saved;
  };

  const deleteJob = async (id) => {
    try {
      await deleteRecordFromDatabase(SUPABASE_TABLES.jobs, id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast.success("Job deleted");
    } catch (err) { toast.error(err.message || "Failed to delete job"); }
  };

  const saveRecurringReminder = async (payload, opts = {}) => {
    try {
      const saved = await upsertRecordInDatabase(SUPABASE_TABLES.recurringReminders, payload);
      setRecurringReminders((prev) => {
        const exists = prev.find((r) => String(r.id) === String(saved.id));
        return exists
          ? prev.map((r) => (String(r.id) === String(saved.id) ? saved : r))
          : [...prev, saved];
      });
      if (!opts.silent) {
        toast.success(payload?.id ? "Recurring reminder updated!" : "Recurring reminder created!");
      }
      return saved;
    } catch (err) {
      toast.error(err.message || "Failed to save recurring reminder");
      return null;
    }
  };

  const deleteRecurringReminder = async (id) => {
    try {
      await deleteRecordFromDatabase(SUPABASE_TABLES.recurringReminders, id);
      setRecurringReminders((prev) => prev.filter((r) => String(r.id) !== String(id)));
      toast.success("Recurring reminder deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete recurring reminder");
    }
  };

  const sendRecurringReminderNow = async (reminderId) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-recurring-reminders", {
        body: { action: "send_now", reminderId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || data?.outcome?.message || "Send now failed");
      toast.success("Reminder sent");
      return true;
    } catch (err) {
      toast.error(err.message || "Failed to send reminder");
      return false;
    }
  };

  const validateClientPayload = (payload) =>
    collectValidationErrors(
      !String(payload?.name || "").trim() && "Client name is required.",
      payload?.email && !isValidEmail(payload.email) && "Client email is invalid."
    );

  const validateInvoicePayload = (payload) =>
    collectValidationErrors(
      !payload?.clientId && "Invoice client is required.",
      !String(payload?.description || "").trim() && "Invoice description is required.",
      safeNumber(payload?.quantity) <= 0 && "Invoice quantity must be greater than zero.",
      safeNumber(payload?.subtotal) < 0 && "Invoice amount cannot be negative.",
      payload?.invoiceDate && payload?.dueDate && parseLocalDate(payload.dueDate) < parseLocalDate(payload.invoiceDate) && "Invoice due date cannot be before invoice date."
    );

  const validateQuotePayload = (payload) =>
    collectValidationErrors(
      !payload?.clientId && "Quote client is required.",
      !String(payload?.description || "").trim() && "Quote description is required.",
      safeNumber(payload?.quantity) <= 0 && "Quote quantity must be greater than zero.",
      safeNumber(payload?.subtotal) < 0 && "Quote amount cannot be negative.",
      payload?.quoteDate && payload?.expiryDate && parseLocalDate(payload.expiryDate) < parseLocalDate(payload.quoteDate) && "Quote expiry date cannot be before quote date."
    );

  const validateExpensePayload = (payload) =>
    collectValidationErrors(
      !String(payload?.supplier || "").trim() && "Expense supplier is required.",
      !String(payload?.category || "").trim() && "Expense category is required.",
      safeNumber(payload?.amount) <= 0 && "Expense amount must be greater than zero."
    );

  const validateIncomeSourcePayload = (payload) =>
    collectValidationErrors(
      !String(payload?.name || "").trim() && "Income source name is required.",
      !String(payload?.incomeType || "").trim() && "Income source type is required.",
      safeNumber(payload?.beforeTax) <= 0 && "Income source amount must be greater than zero.",
      !String(payload?.frequency || "").trim() && "Income frequency is required."
    );

  const handleAuthSubmit = async () => {
    if (!supabase?.auth) {
      toast.error("Supabase Auth is not configured in client.js");
      return;
    }

    const email = String(authForm.email || "").trim();
    const password = String(authForm.password || "");
    const confirmPassword = String(authForm.confirmPassword || "");

    const errors = collectValidationErrors(
      !isValidEmail(email) && "Enter a valid email address.",
      password.length < 6 && "Password must be at least 6 characters.",
      authMode === "signup" && password !== confirmPassword && "Passwords do not match."
    );
    if (errors.length) {
      summariseValidationErrors("Authentication", errors, toast);
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              needs_setup: true,
              needsSetup: true,
            },
          },
        });
        if (error) throw error;
        // If email confirmation is off, user is signed in immediately
        if (signUpData?.session) {
          toast.success("Account created! Welcome to the portal.");
        } else {
          // Email confirmation is on -- ask them to confirm
          toast.success("Account created! Check your email to confirm, then sign in.");
          setAuthMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      console.error("SUPABASE AUTH ERROR:", error);
      toast.error(error.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!supabase?.auth) {
      toast.error("Supabase Auth is not configured in client.js");
      return;
    }

    const email = String(authForm.email || "").trim();
    if (!isValidEmail(email)) {
      toast.warning("Enter your email first, then click Reset password.");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?reset=1`,
      });
      if (error) throw error;
      setShowResetSentModal(true);
    } catch (error) {
      console.error("SUPABASE PASSWORD RESET ERROR:", error);
      toast.error(error.message || "Password reset failed");
    }
  };

  const handleSignOut = async () => {
    if (!supabase?.auth) return;
    try {
      isSigningOut.current = true;
      await supabase.auth.signOut();
      if (typeof window !== "undefined" && window.localStorage) { Object.keys(window.localStorage).forEach((key) => { if (key.startsWith("sb-")) window.localStorage.removeItem(key); }); }
      hasHydratedSupabaseState.current = false;
      setIsSupabaseRestoring(false);
      setAuthUser(null);
      setProfile(initialProfile);
      setClients([]);
      setInvoices([]);
      setQuotes([]);
      setExpenses([]);
      setIncomeSources([]);
      setServices([]);
      setDocuments([]);
      setRecurringReminders([]);
      setSetupComplete(false);
      setHasLoadedUserProfile(false);
      setWizardForm({
        firstName: "",
        lastName: "",
        preferredName: "",
        businessName: "",
        legalBusinessName: "",
        email: "",
        phone: "",
        address: "",
        abn: "",
        workType: "Financial / Management Accountant",
        gstRegistered: true,
      });
      setActivePage("settings");
      setActiveSettingsTab("Profile");
    } catch (error) {
      console.error("SUPABASE SIGN OUT ERROR:", error);
    } finally {
      isSigningOut.current = false;
    }
  };

  const handleCloseAccount = async () => {
    if (!supabase || !authUser?.id) return;
    try {
      const closedProfile = { ...profile, accountStatus: "closed" };
      await saveProfileToSupabase(closedProfile);
      await handleSignOut();
    } catch (error) {
      console.error("CLOSE ACCOUNT ERROR:", error);
      toast.error("Could not close account. Please try again.");
    }
  };

  const saveARCreditNote = async () => {
    if (!creditNoteSource) return;
    const amt = safeNumber(creditNoteForm.amount);
    if (amt <= 0) { toast.warning("Enter a credit note amount"); return; }
    try {
      const cn = {
        clientId: creditNoteSource.clientId,
        invoiceDate: creditNoteForm.date,
        dueDate: creditNoteForm.date,
        invoiceNumber: `CN-${creditNoteSource.invoiceNumber || creditNoteSource.id}`,
        total: -Math.abs(amt),
        subtotal: -Math.abs(amt),
        status: "Credit Note",
        type: "credit_note",
        linkedInvoiceId: creditNoteSource.id,
        comments: creditNoteForm.reason || "Credit note",
        lineItems: [{ id: Date.now(), description: creditNoteForm.reason || "Credit note", quantity: 1, unitPrice: -Math.abs(amt), gstType: "GST Free" }],
        currencyCode: creditNoteSource.currencyCode || "AUD",
      };
      const saved = await upsertRecordInDatabase(SUPABASE_TABLES.invoices, cn);
      setInvoices((prev) => [...prev, saved]);
      toast.success("AR credit note saved!");
      setShowARCreditNoteModal(false);
      setCreditNoteForm({ amount: "", reason: "", date: todayLocal() });
    } catch (err) { toast.error(err.message || "Failed to save credit note"); }
  };

  const saveAPCreditNote = async () => {
    if (!creditNoteSource) return;
    const amt = safeNumber(creditNoteForm.amount);
    if (amt <= 0) { toast.warning("Enter a credit note amount"); return; }
    try {
      const cn = {
        ...creditNoteSource,
        date: creditNoteForm.date,
        amount: -Math.abs(amt),
        gst: -(Math.abs(amt) / 11),
        description: creditNoteForm.reason || "Credit note",
        type: "credit_note",
        linkedBillId: creditNoteSource.id,
        isPaid: false,
        status: "Credit Note",
        expenseType: "Credit Note",
      };
      const saved = await upsertRecordInDatabase(SUPABASE_TABLES.expenses, cn);
      setExpenses((prev) => [...prev, saved]);
      toast.success("AP credit note saved!");
      setShowAPCreditNoteModal(false);
      setCreditNoteForm({ amount: "", reason: "", date: todayLocal() });
    } catch (err) { toast.error(err.message || "Failed to save credit note"); }
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) { toast.warning("Supplier name is required"); return; }
    try {
      const payload = { ...supplierForm, id: editingSupplierId || Date.now() };
      const saved = await upsertRecordInDatabase(SUPABASE_TABLES.suppliers, payload);
      setSuppliers((prev) => editingSupplierId
        ? prev.map((s) => s.id === editingSupplierId ? saved : s)
        : [...prev, saved]);
      toast.success(editingSupplierId ? "Supplier updated!" : "Supplier saved!");
      setShowSupplierModal(false);
      setSupplierForm({ name: "", email: "", phone: "", address: "", abn: "", contactPerson: "", notes: "" });
      setEditingSupplierId(null);
    } catch (err) { toast.error(err.message || "Failed to save supplier"); }
  };

  const deleteSupplier = (id) => {
    confirm({
      title: "Delete supplier?",
      message: "This supplier will be removed from your directory. Existing bills will not be affected.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteRecordFromDatabase(SUPABASE_TABLES.suppliers, id);
          setSuppliers((prev) => prev.filter((s) => s.id !== id));
          toast.success("Supplier deleted");
        } catch (err) { toast.error(err.message || "Failed to delete supplier"); }
      },
    });
  };

  const saveAsset = async (payload) => {
    try {
      const saved = await upsertRecordInDatabase(SUPABASE_TABLES.assets, payload);
      setAssets((prev) => {
        const exists = prev.find((a) => a.id === payload.id);
        return exists ? prev.map((a) => a.id === payload.id ? saved : a) : [...prev, saved];
      });
      toast.success(payload.id && assets.find(a => a.id === payload.id) ? "Asset updated!" : "Asset saved!");
    } catch (err) { toast.error(err.message || "Failed to save asset"); }
  };

  const deleteAsset = (id) => {
    confirm({
      title: "Delete Asset",
      message: "Are you sure you want to delete this asset?",
      onConfirm: async () => {
        try {
          await deleteRecordFromDatabase(SUPABASE_TABLES.assets, id);
          setAssets((prev) => prev.filter((a) => a.id !== id));
          toast.success("Asset deleted");
        } catch (err) { toast.error(err.message || "Failed to delete asset"); }
      },
    });
  };
  const saveProperty = async (payload) => {
    try {
      const saved = await upsertRecordInDatabase(SUPABASE_TABLES.properties, payload);
      setProperties((prev) => {
        const exists = prev.find((p) => p.id === payload.id);
        return exists ? prev.map((p) => p.id === payload.id ? saved : p) : [...prev, saved];
      });
      toast.success(payload.id && properties.find(p => p.id === payload.id) ? "Property updated!" : "Property saved!");
    } catch (err) { toast.error(err.message || "Failed to save property"); }
  };

  const deleteProperty = (id) => {
    confirm({
      title: "Delete Property",
      message: "Are you sure you want to delete this property and all its sub-locations?",
      onConfirm: async () => {
        try {
          await deleteRecordFromDatabase(SUPABASE_TABLES.properties, id);
          setProperties((prev) => prev.filter((p) => p.id !== id));
          toast.success("Property deleted");
        } catch (err) { toast.error(err.message || "Failed to delete property"); }
      },
    });
  };

  const saveClientFromModal = async () => {
    if (!clientModalForm.name.trim()) { toast.warning("Client name is required"); return; }
    try {
      const payload = { ...clientModalForm, id: editingClientId || Date.now() };
      const saved = await upsertRecordInDatabase(SUPABASE_TABLES.clients, payload);
      setClients((prev) => editingClientId
        ? prev.map((c) => c.id === editingClientId ? saved : c)
        : [...prev, saved]);
      toast.success(editingClientId ? "Client updated!" : "Client saved!");
      setShowClientModal(false);
      setClientModalForm({ name: "", businessName: "", email: "", phone: "", address: "", abn: "", defaultCurrency: "AUD $", workType: "" });
      setEditingClientId(null);
    } catch (err) { toast.error(err.message || "Failed to save client"); }
  };

  const downloadTemplate = (type) => {
    const clientHeaders = "Name,Business Name,Email,Phone,Address,ABN,Currency,Work Type";
    const clientExample = "John Smith,Smith Farms Pty Ltd,john@smithfarms.com.au,0412 345 678,123 Farm Rd Dubbo NSW 2830,12 345 678 901,AUD $,Primary production";
    const supplierHeaders = "Name,Contact Person,Email,Phone,Address,ABN,Notes";
    const supplierExample = "AGL Energy,Jane Brown,accounts@agl.com.au,1800 123 456,72 Yeo St Neutral Bay NSW 2089,74 115 061 375,Monthly billing";
    const invoiceHeaders = "Invoice Number,Client Name,Date,Due Date,Description,Subtotal,GST,Total,Status";
    const invoiceExample = "INV-001,Smith Farms Pty Ltd,2025-03-15,2025-04-15,Fencing repair and materials,1000.00,100.00,1100.00,Draft";
    const expenseHeaders = "Supplier,Date,Due Date,Category,Description,Amount,GST,Is Paid";
    const expenseExample = "AGL Energy,2025-03-10,2025-04-10,Utilities,Electricity - March quarter,450.00,45.00,No";
    const incomeHeaders = "Name,Income Type,Before Tax,Frequency,Started After Jul 2025,Has End Date";
    const incomeExample = "Smith Farms Employment,Casual employment,1200.00,Weekly,No,No";
    const assetHeaders = "Asset Name,Asset Type,Serial/Rego,Location,Purchase Date,Purchase Price,Depreciation Method,Effective Life (years),Salvage Value,Status,Previous Owners,Notes";
    const assetExample = "John Deere 6120M,Tractor,ABC123,North paddock shed,2022-06-15,185000,diminishing,15,20000,Active,Purchased from Smith Family Farm (2018),Annual service due March";
    let csv, filename;
    if (type === "clients") { csv = `${clientHeaders}\n${clientExample}\n`; filename = "clients_template.csv"; }
    else if (type === "suppliers") { csv = `${supplierHeaders}\n${supplierExample}\n`; filename = "suppliers_template.csv"; }
    else if (type === "invoices") { csv = `${invoiceHeaders}\n${invoiceExample}\n`; filename = "invoices_template.csv"; }
    else if (type === "income") { csv = `${incomeHeaders}\n${incomeExample}\n`; filename = "income_sources_template.csv"; }
    else if (type === "assets") { csv = `${assetHeaders}\n${assetExample}\n`; filename = "assets_template.csv"; }
    else { csv = `${expenseHeaders}\n${expenseExample}\n`; filename = "expenses_template.csv"; }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseImportCSV = (text, type) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return { rows: [], error: "File must have a header row and at least one data row." };
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
      if (type === "clients") {
        rows.push({ name: row["name"] || row["clientname"] || "", businessName: row["businessname"] || "", email: row["email"] || "", phone: row["phone"] || "", address: row["address"] || "", abn: row["abn"] || "", defaultCurrency: row["currency"] || "AUD $", workType: row["worktype"] || "" });
      } else if (type === "suppliers") {
        rows.push({ name: row["name"] || row["suppliername"] || "", contactPerson: row["contactperson"] || "", email: row["email"] || "", phone: row["phone"] || "", address: row["address"] || "", abn: row["abn"] || "", notes: row["notes"] || "" });
      } else if (type === "invoices") {
        const subtotal = Number(row["subtotal"] || row["amount"] || 0);
        const gst = Number(row["gst"] || 0);
        const total = Number(row["total"] || (subtotal + gst) || 0);
        rows.push({
          invoiceNumber: row["invoicenumber"] || row["invoice"] || "",
          clientName: row["clientname"] || row["client"] || "",
          invoiceDate: row["date"] || row["invoicedate"] || "",
          dueDate: row["duedate"] || "",
          description: row["description"] || row["notes"] || "",
          subtotal, gst, total,
          status: row["status"] || "Draft",
        });
      } else if (type === "expenses") {
        const amount = Number(row["amount"] || row["total"] || 0);
        const gst = Number(row["gst"] || 0);
        const isPaidRaw = (row["ispaid"] || row["paid"] || "").toLowerCase();
        rows.push({
          supplier: row["supplier"] || row["suppliername"] || row["name"] || "",
          date: row["date"] || "",
          dueDate: row["duedate"] || "",
          category: row["category"] || "",
          description: row["description"] || row["notes"] || "",
          amount, gst,
          isPaid: isPaidRaw === "yes" || isPaidRaw === "true" || isPaidRaw === "1",
        });
      } else if (type === "income") {
        const startedRaw = (row["startedafterjul2025"] || row["startedafter"] || "").toLowerCase();
        const endRaw = (row["hasenddate"] || row["enddate"] || "").toLowerCase();
        rows.push({
          name: row["name"] || row["source"] || "",
          incomeType: row["incometype"] || row["type"] || "Casual employment",
          beforeTax: row["beforetax"] || row["amount"] || "",
          frequency: row["frequency"] || "",
          startedAfterDate: startedRaw === "yes" || startedRaw === "true" || startedRaw === "1",
          hasEndDate: endRaw === "yes" || endRaw === "true" || endRaw === "1",
        });
      } else if (type === "assets") {
        const methodRaw = (row["depreciationmethod"] || row["method"] || "prime_cost").toLowerCase().replace(/\s+/g, "_");
        const validMethods = ["instant", "prime_cost", "diminishing", "none"];
        rows.push({
          name: row["assetname"] || row["name"] || "",
          assetType: row["assettype"] || row["type"] || "Other",
          serialNumber: row["serial/rego"] || row["serialrego"] || row["serial"] || row["rego"] || "",
          location: row["location"] || "",
          purchaseDate: row["purchasedate"] || row["date"] || "",
          purchasePrice: row["purchaseprice"] || row["price"] || row["cost"] || "",
          depreciationMethod: validMethods.includes(methodRaw) ? methodRaw : "prime_cost",
          effectiveLife: row["effectivelife(years)"] || row["effectivelife"] || row["life"] || "",
          salvageValue: row["salvagevalue"] || row["residual"] || "0",
          status: row["status"] || "Active",
          previousOwners: row["previousowners"] || row["ownership"] || "",
          notes: row["notes"] || "",
        });
      }
    }
    const valid = type === "invoices"
      ? rows.filter((r) => r.invoiceNumber || r.clientName || r.total)
      : type === "expenses"
      ? rows.filter((r) => r.supplier || r.amount)
      : type === "assets"
      ? rows.filter((r) => r.name?.trim())
      : rows.filter((r) => r.name?.trim());
    if (!valid.length) return { rows: [], error: "No valid rows found. Check required columns are filled in." };
    return { rows: valid, error: "" };
  };

  const confirmImport = async () => {
    if (!importRows.length) return;
    try {
      if (importType === "clients" || importType === "suppliers") {
        const table = importType === "clients" ? SUPABASE_TABLES.clients : SUPABASE_TABLES.suppliers;
        const existing = importType === "clients" ? clients : suppliers;
        const existingNames = new Set(existing.map((r) => r.name.toLowerCase().trim()));
        const newRows = importRows.filter((r) => !existingNames.has(r.name.toLowerCase().trim()));
        const saved = await Promise.all(newRows.map((r) => upsertRecordInDatabase(table, { ...r })));
        if (importType === "clients") setClients((prev) => [...prev, ...saved]);
        else setSuppliers((prev) => [...prev, ...saved]);
        toast.success(`Imported ${saved.length} ${importType}${newRows.length < importRows.length ? ` (${importRows.length - newRows.length} duplicates skipped)` : ""}!`);
      } else if (importType === "invoices") {
        const saved = await Promise.all(importRows.map((r) => {
          const clientMatch = clients.find(c => c.name?.toLowerCase() === r.clientName?.toLowerCase() || c.businessName?.toLowerCase() === r.clientName?.toLowerCase());
          const inv = {
            invoiceNumber: r.invoiceNumber || `IMP-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
            clientId: clientMatch?.id || "",
            invoiceDate: r.invoiceDate || todayLocal(),
            dueDate: r.dueDate || addDays(r.invoiceDate || todayLocal(), safeNumber(profile.paymentTermsDays) || 14),
            lineItems: [{ id: crypto.randomUUID?.() || String(Date.now()), description: r.description || "Imported item", quantity: 1, unitPrice: String(r.subtotal || r.total || 0), gstType: r.gst > 0 ? "GST on Income (10%)" : "GST Free" }],
            subtotal: r.subtotal || r.total || 0,
            gst: r.gst || 0,
            total: r.total || 0,
            status: r.status || "Draft",
          };
          return upsertRecordInDatabase(SUPABASE_TABLES.invoices, inv);
        }));
        setInvoices((prev) => [...prev, ...saved]);
        toast.success(`Imported ${saved.length} invoice${saved.length !== 1 ? "s" : ""}!`);
      } else if (importType === "expenses") {
        const saved = await Promise.all(importRows.map((r) => {
          const exp = {
            supplier: r.supplier || "",
            date: r.date || todayLocal(),
            dueDate: r.dueDate || "",
            category: r.category || "Other",
            description: r.description || "Imported expense",
            amount: r.amount || 0,
            gst: r.gst || 0,
            isPaid: r.isPaid || false,
          };
          return upsertRecordInDatabase(SUPABASE_TABLES.expenses, exp);
        }));
        setExpenses((prev) => [...prev, ...saved]);
        toast.success(`Imported ${saved.length} expense${saved.length !== 1 ? "s" : ""}!`);
      } else if (importType === "income") {
        const existing = incomeSources;
        const existingNames = new Set(existing.map((r) => (r.name || "").toLowerCase().trim()));
        const newRows = importRows.filter((r) => !existingNames.has((r.name || "").toLowerCase().trim()));
        const saved = await Promise.all(newRows.map((r) => upsertRecordInDatabase(SUPABASE_TABLES.incomeSources, { ...r })));
        setIncomeSources((prev) => [...prev, ...saved]);
        toast.success(`Imported ${saved.length} income source${saved.length !== 1 ? "s" : ""}${newRows.length < importRows.length ? ` (${importRows.length - newRows.length} duplicates skipped)` : ""}!`);
      } else if (importType === "assets") {
        const existing = assets;
        const existingNames = new Set(existing.map((r) => (r.name || "").toLowerCase().trim()));
        const newRows = importRows.filter((r) => !existingNames.has((r.name || "").toLowerCase().trim()));
        const saved = await Promise.all(newRows.map((r) => upsertRecordInDatabase(SUPABASE_TABLES.assets, { ...r, id: Date.now() + Math.random() })));
        setAssets((prev) => [...prev, ...saved]);
        toast.success(`Imported ${saved.length} asset${saved.length !== 1 ? "s" : ""}${newRows.length < importRows.length ? ` (${importRows.length - newRows.length} duplicates skipped)` : ""}!`);
      }
      setShowImportModal(false);
      setImportRows([]);
      setImportError("");
    } catch (err) { toast.error(err.message || "Import failed"); }
  };

  const confirmRecurring = async () => {
    const calcNext = (fromDate, freq) => {
      const d = parseLocalDate(fromDate);
      if (freq === "Weekly") d.setDate(d.getDate() + 7);
      else if (freq === "Fortnightly") d.setDate(d.getDate() + 14);
      else if (freq === "Monthly") d.setMonth(d.getMonth() + 1);
      else if (freq === "Quarterly") d.setMonth(d.getMonth() + 3);
      else if (freq === "Annually") d.setFullYear(d.getFullYear() + 1);
      else return null;
      return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    };
    const toCreate = recurringDue.filter((inv) => recurringSelected.includes(inv.id));
    try {
      for (const inv of toCreate) {
        const newDate = inv.dueRecurDate;
        const newDue = addDays(newDate, safeNumber(profile.paymentTermsDays) || 14);
        const nextRecur = calcNext(newDate, inv.recurs);
        const newInvoice = { ...inv, invoiceDate: newDate, dueDate: newDue,
          invoiceNumber: "", status: "Draft", paidAt: null, paidVia: null, nextRecurDate: nextRecur };
        delete newInvoice.clientName; delete newInvoice.dueRecurDate;
        const saved = await upsertRecordInDatabase(SUPABASE_TABLES.invoices, newInvoice);
        setInvoices((prev) => [...prev, saved]);
        const updatedSource = { ...inv, nextRecurDate: nextRecur };
        delete updatedSource.clientName; delete updatedSource.dueRecurDate;
        await upsertRecordInDatabase(SUPABASE_TABLES.invoices, updatedSource);
        setInvoices((prev) => prev.map((i) => String(i.id) === String(inv.id) ? { ...i, nextRecurDate: nextRecur } : i));
      }
      toast.success(toCreate.length + " recurring invoice" + (toCreate.length !== 1 ? "s" : "") + " created as Draft!");
    } catch (err) { toast.error(err.message || "Failed to create recurring invoices"); }
    setShowRecurringModal(false);
    setRecurringDue([]);
    setRecurringSelected([]);
  };

  const confirmRecurringJobs = async () => {
    const calcNext = (fromDate, freq) => {
      const d = parseLocalDate(fromDate);
      if (freq === "Weekly") d.setDate(d.getDate() + 7);
      else if (freq === "Fortnightly") d.setDate(d.getDate() + 14);
      else if (freq === "Monthly") d.setMonth(d.getMonth() + 1);
      else return null;
      return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    };
    const toCreate = recurringJobsDue.filter(j => recurringJobsSelected.includes(j.id));
    try {
      for (const job of toCreate) {
        const nextStart = job.nextDate;
        const daysDiff = job.endDate && job.startDate
          ? Math.round((new Date(job.endDate) - new Date(job.startDate)) / 86400000)
          : 0;
        const nextEnd = daysDiff > 0 ? (() => {
          const d = parseLocalDate(nextStart);
          d.setDate(d.getDate() + daysDiff);
          return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
        })() : nextStart;

        // Create next job
        const nextJob = {
          ...job,
          id: Date.now() + Math.random(),
          status: "Scheduled",
          startDate: nextStart,
          endDate: nextEnd,
          completionNotificationSent: null,
          bookingConfirmationSent: null,
          reviewRequestSent: null,
          dayBeforeReminderSent: null,
          certificate: null,
          photos: { before: [], after: [] },
          checklist: (job.checklist || []).map(t => ({ ...t, done: false })),
          parentRecurringJobId: job.parentRecurringJobId || job.id,
          nextRecurringCreated: null,
        };
        delete nextJob.clientName;
        delete nextJob.nextDate;
        const savedJob = await upsertRecordInDatabase(SUPABASE_TABLES.jobs, nextJob);
        setJobs(prev => [...prev, savedJob]);

        // Mark original as having spawned next
        const updatedOriginal = { ...job, nextRecurringCreated: true };
        delete updatedOriginal.clientName;
        delete updatedOriginal.nextDate;
        await upsertRecordInDatabase(SUPABASE_TABLES.jobs, updatedOriginal);
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, nextRecurringCreated: true } : j));

        // Auto-create invoice if job has a client
        if (job.clientId) {
          try {
            await createInvoiceFromJob(job);
          } catch (err) { console.error("Auto-invoice from recurring job:", err); }
        }
      }
      toast.success(`${toCreate.length} recurring job${toCreate.length !== 1 ? "s" : ""} created!`);
    } catch (err) { toast.error(err.message || "Failed to create recurring jobs"); }
    setShowRecurringJobsModal(false);
    setRecurringJobsDue([]);
    setRecurringJobsSelected([]);
  };

  const saveProfileToSupabase = async (profilePayload) => {
    if (!supabase || !authUser?.id) return null;
    try {
      setSupabaseSyncStatus("Saving profile to Supabase database...");
      let payloadWithId = { ...(profilePayload || {}) };

      if (!payloadWithId.id) {
        const { data: existingProfile, error: existingProfileError } = await supabase
          .from(SUPABASE_TABLES.profile)
          .select("id, data, user_id")
          .eq("user_id", activePortalUserId || authUser.id)
          .maybeSingle();
        if (existingProfileError) throw existingProfileError;
        if (existingProfile?.id) {
          payloadWithId = {
            ...(existingProfile.data || {}),
            ...payloadWithId,
            id: existingProfile.id,
          };
        }
      }

      const savedProfile = await upsertRecordInDatabase(SUPABASE_TABLES.profile, payloadWithId);

      setProfile((prev) => ({
        ...prev,
        ...savedProfile,
        setupComplete: Boolean(savedProfile?.setupComplete ?? prev?.setupComplete),
        setupCompletedAt: savedProfile?.setupCompletedAt || prev?.setupCompletedAt || "",
      }));
      setSetupComplete(Boolean(savedProfile?.setupComplete));
      lastSavedProfileRef.current = JSON.stringify(profilePayload);
      setSupabaseSyncStatus("Profile saved to Supabase database");
      return savedProfile;
    } catch (error) {
      console.error("SUPABASE PROFILE SAVE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Supabase profile save failed");
      return null;
    }
  };

  const saveAllCurrentStateToSupabase = async () => {
    if (!supabase) {
      setSupabaseSyncStatus("Supabase not connected");
      return;
    }

    setSupabaseSyncStatus("Saving all portal records to Supabase database...");

    try {
      await saveProfileToSupabase(profile);

      // Save each collection independently so one table's failure doesn't
      // mask errors in others. Collect all failures and report them together.
      const collections = [
        { name: "clients",       items: clients,       table: SUPABASE_TABLES.clients },
        { name: "invoices",      items: invoices,      table: SUPABASE_TABLES.invoices },
        { name: "quotes",        items: quotes,        table: SUPABASE_TABLES.quotes },
        { name: "expenses",      items: expenses,      table: SUPABASE_TABLES.expenses },
        { name: "income sources",items: incomeSources, table: SUPABASE_TABLES.incomeSources },
        { name: "services",      items: services,      table: SUPABASE_TABLES.services },
        { name: "documents",     items: documents,     table: SUPABASE_TABLES.documents },
        { name: "suppliers",     items: suppliers,     table: SUPABASE_TABLES.suppliers },
        { name: "recurring reminders", items: recurringReminders, table: SUPABASE_TABLES.recurringReminders },
      ];

      const saveResults = await Promise.all(
        collections.map(({ name, items, table }) =>
          Promise.all(items.map((item) => upsertRecordInDatabase(table, item)))
            .then(() => ({ name, ok: true }))
            .catch((err) => ({ name, ok: false, message: err?.message || "Unknown error" }))
        )
      );

      const failures = saveResults.filter((r) => !r.ok);
      if (failures.length) {
        const summary = failures.map((f) => `${f.name}: ${f.message}`).join("; ");
        console.error("SUPABASE BULK SAVE -- partial failure:", summary);
        setSupabaseSyncStatus(`Saved with errors -- ${summary}`);
      } else {
        setSupabaseSyncStatus("All portal records saved to Supabase database");
      }
    } catch (error) {
      console.error("SUPABASE BULK SAVE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Supabase bulk save failed");
    }
  };

  const restorePortalStateFromSupabase = async () => {
    if (!supabase || isSupabaseRestoring || !authUser) return;
    setHasLoadedUserProfile(false);
    setIsSupabaseRestoring(true);
    setSupabaseSyncStatus("Loading from Supabase database...");

    try {
      // Each table is fetched independently so a missing/broken table never
      // blocks the others from loading.
      const safeF = (table) => fetchCollectionFromDatabase(table).catch((err) => {
        console.warn(`[restore] Could not load table "${table}":`, err?.message);
        return [];
      });
      const [
        remoteProfileRows,
        remoteClients,
        remoteInvoices,
        remoteQuotes,
        remoteExpenses,
        remoteIncomeSources,
        remoteServices,
        remoteDocuments,
        remoteSuppliers,
        remoteAssets,
        remoteProperties,
        remoteJobs,
        remoteRecurringReminders,
      ] = await Promise.all([
        safeF(SUPABASE_TABLES.profile),
        safeF(SUPABASE_TABLES.clients),
        safeF(SUPABASE_TABLES.invoices),
        safeF(SUPABASE_TABLES.quotes),
        safeF(SUPABASE_TABLES.expenses),
        safeF(SUPABASE_TABLES.incomeSources),
        safeF(SUPABASE_TABLES.services),
        safeF(SUPABASE_TABLES.documents),
        safeF(SUPABASE_TABLES.suppliers),
        safeF(SUPABASE_TABLES.assets),
        safeF(SUPABASE_TABLES.properties),
        safeF(SUPABASE_TABLES.jobs),
        safeF(SUPABASE_TABLES.recurringReminders),
      ]);
      hasHydratedSupabaseState.current = true;

      // Fetch approved subcontractor costs for business owner (for ATO Tax Form)
      try {
        const { data: subCosts } = await supabase
          .from("sas_subcontractor_costs")
          .select("*")
          .eq("job_owner_user_id", activePortalUserId || authUser.id);
        if (subCosts) setSubcontractorCosts(subCosts);
      } catch (e) { console.warn("Could not load subcontractor costs:", e); }

      const remoteProfile =
        Array.isArray(remoteProfileRows) && remoteProfileRows.length
          ? [...remoteProfileRows].reverse().find((row) => Boolean(row?.setupComplete ?? row?.data?.setupComplete)) ||
            remoteProfileRows[remoteProfileRows.length - 1]
          : null;
      const nextProfile = remoteProfile?.data
        ? { ...initialProfile, ...remoteProfile.data, id: remoteProfile.id }
        : remoteProfile
          ? { ...initialProfile, ...remoteProfile }
          : initialProfile;
      // Migrate old default of 21 days to 14 days
      if (safeNumber(nextProfile.paymentTermsDays) === 21) {
        nextProfile.paymentTermsDays = 14;
      }
      const nextSetupComplete = Boolean(nextProfile.setupComplete);
      const shouldShowSetupWizard =
        Boolean(authUser?.user_metadata?.needs_setup || authUser?.user_metadata?.needsSetup) && !nextSetupComplete;

      setProfile(nextProfile);
      lastSavedProfileRef.current = JSON.stringify(nextProfile);
      setClients(Array.isArray(remoteClients) ? remoteClients : []);
      setInvoices(Array.isArray(remoteInvoices) ? remoteInvoices : []);
      setQuotes(Array.isArray(remoteQuotes) ? remoteQuotes : []);
      setExpenses(Array.isArray(remoteExpenses) ? remoteExpenses : []);
      setIncomeSources(Array.isArray(remoteIncomeSources) ? remoteIncomeSources : []);
      setServices(Array.isArray(remoteServices) ? remoteServices : []);
      setDocuments(Array.isArray(remoteDocuments) ? remoteDocuments : []);
      setSuppliers(Array.isArray(remoteSuppliers) ? remoteSuppliers : []);
      setAssets(Array.isArray(remoteAssets) ? remoteAssets : []);
      setProperties(Array.isArray(remoteProperties) ? remoteProperties : []);
      setJobs(Array.isArray(remoteJobs) ? remoteJobs : []);
      setRecurringReminders(Array.isArray(remoteRecurringReminders) ? remoteRecurringReminders : []);
      setSetupComplete(nextSetupComplete);
      setWizardForm((prev) => ({ ...prev,
        firstName: nextProfile.firstName || "",
        lastName: nextProfile.lastName || "",
        preferredName: nextProfile.preferredName || "",
        businessName: nextProfile.businessName || "",
        legalBusinessName: nextProfile.legalBusinessName || "",
        email: nextProfile.email || authUser?.email || "",
        phone: nextProfile.phone || "",
        address: nextProfile.address || "",
        abn: nextProfile.abn || "",
        workType: nextProfile.workType || "Financial / Management Accountant",
        gstRegistered: nextProfile.gstRegistered ?? true,
      }));

      if (shouldShowSetupWizard) {
        setActivePage("settings");
        setActiveSettingsTab("Profile");
      } else {
        setActivePage("dashboard");
      }

      setSupabaseSyncStatus(
        shouldShowSetupWizard ? "Setup required for this user" : "Loaded from Supabase database"
      );
    } catch (error) {
      console.error("SUPABASE DATABASE RESTORE ERROR:", error);
      hasHydratedSupabaseState.current = true;
      setSupabaseSyncStatus(error.message || "Supabase database load failed");
    } finally {
      setHasLoadedUserProfile(true);
      setIsSupabaseRestoring(false);
    }
  };

  // ─── Offline / Online detection ─────────────────────────────────────
  useEffect(() => {
    const goOffline = () => { setIsOffline(true); setShowBackOnline(false); };
    const goOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      // Auto-resync data when coming back online
      if (authUser && hasHydratedSupabaseState.current) {
        restorePortalStateFromSupabase();
      }
      setTimeout(() => setShowBackOnline(false), 4000);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => { window.removeEventListener("offline", goOffline); window.removeEventListener("online", goOnline); };
  }, [authUser]);

  // ─── Supabase Realtime subscriptions ────────────────────────────────
  useEffect(() => {
    if (!supabase || !authUser?.id || !hasHydratedSupabaseState.current) return;
    const uid = viewingAsUserId || authUser.id;

    // Cleanup previous channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    const TABLE_SETTER_MAP = {
      sas_jobs:            { setter: setJobs,           key: "scheduling" },
      sas_clients:         { setter: setClients,        key: "clients" },
      sas_invoices:        { setter: setInvoices,       key: "invoices" },
      sas_quotes:          { setter: setQuotes,         key: "quotes" },
      sas_expenses:        { setter: setExpenses,       key: "expenses" },
      sas_income_sources:  { setter: setIncomeSources,  key: "incomeSources" },
      sas_services:        { setter: setServices,       key: "services" },
      sas_documents:       { setter: setDocuments,      key: "documents" },
      sas_suppliers:       { setter: setSuppliers,      key: "suppliers" },
      sas_assets:          { setter: setAssets,          key: "assets" },
      sas_properties:      { setter: setProperties,     key: "properties" },
      sas_profile:         { setter: null,               key: "profile" },
      sas_recurring_reminders: { setter: setRecurringReminders, key: "scheduling" },
      sas_team_members:    { setter: setTeamMembers,     key: "settings" },
      sas_team_invitations:{ setter: setTeamInvitations, key: "settings" },
      sas_subcontractor_costs: { setter: setSubcontractorCosts, key: "jobs report" },
    };

    const parseRow = (row) => {
      const hasStructuredData = row.data && typeof row.data === "object" && !Array.isArray(row.data);
      const d = hasStructuredData ? row.data : row;
      return { ...d, id: row.id, user_id: row.user_id, updated_at: row.updated_at };
    };

    const handleChange = (payload) => {
      const table = payload.table;
      const entry = TABLE_SETTER_MAP[table];
      if (!entry) return;

      // Only process rows belonging to this user session
      const row = payload.new || payload.old;
      if (!row || row.user_id !== uid) return;

      // Show subtle pulse on the section
      setRealtimePulse(entry.key);
      setRealtimeStatusByKey((prev) => ({
        ...prev,
        [entry.key]: {
          table,
          eventType: payload.eventType,
          updatedAt: new Date().toISOString(),
        },
      }));
      setTimeout(() => setRealtimePulse(null), 1200);

      if (table === "sas_profile") {
        // Profile is special — single record
        if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
          const parsed = parseRow(payload.new);
          setProfile(prev => {
            // Don't overwrite if we just saved (avoid echo)
            const prevStr = lastSavedProfileRef.current;
            const newStr = JSON.stringify({ ...initialProfile, ...parsed, id: parsed.id });
            if (prevStr === newStr) return prev;
            return { ...initialProfile, ...parsed, id: parsed.id };
          });
        }
        return;
      }

      const { setter } = entry;
      if (!setter) return;

      if (payload.eventType === "INSERT") {
        const parsed = parseRow(payload.new);
        setter(prev => {
          if (prev.some(r => r.id === parsed.id)) return prev; // dedupe
          return [...prev, parsed];
        });
      } else if (payload.eventType === "UPDATE") {
        const parsed = parseRow(payload.new);
        setter(prev => prev.map(r => r.id === parsed.id ? parsed : r));
      } else if (payload.eventType === "DELETE") {
        const oldId = payload.old?.id;
        if (oldId) setter(prev => prev.filter(r => r.id !== oldId));
      }
    };

    const channel = supabase
      .channel(`portal-realtime-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_jobs",           filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_clients",        filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_invoices",       filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_quotes",         filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_expenses",       filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_income_sources", filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_services",       filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_documents",      filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_suppliers",      filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_assets",         filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_properties",     filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_profile",        filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_recurring_reminders", filter: `user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_team_members",   filter: `owner_user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_team_invitations", filter: `inviter_user_id=eq.${uid}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "sas_subcontractor_costs", filter: `job_owner_user_id=eq.${uid}` }, handleChange)
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [authUser?.id, viewingAsUserId, hasHydratedSupabaseState.current]);

  // Clean up realtime on sign-out
  useEffect(() => {
    if (!authUser && realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  }, [authUser]);

  const uploadDocument = async () => {
    try {
      if (!documentFile) {
        toast.warning("Please select a file first");
        return;
      }

      const uploaded = await uploadDocumentToSupabase(documentFile);
      const newDocument = {
        name: uploaded.fileName,
        filePath: uploaded.filePath,
        url: uploaded.url,
        uploadedAt: new Date().toISOString(),
      };
      const savedDocument = await upsertRecordInDatabase(SUPABASE_TABLES.documents, newDocument);

      setDocuments((prev) => [...prev, savedDocument]);

      setSupabaseSyncStatus("Document saved to Supabase database");
      setDocumentFile(null);
      toast.success("Document uploaded successfully!");
    } catch (err) {
      console.error("DOCUMENT UPLOAD ERROR:", err);
      setSupabaseSyncStatus(err.message || "Document save failed");
      toast.error(err.message || "Something went wrong");
    }
  };

  const deleteDocument = (id) => {
    confirm({ title: "Delete document", message: "This document will be permanently removed.", confirmLabel: "Delete", onConfirm: async () => {
    try {
      await deleteRecordFromDatabase(SUPABASE_TABLES.documents, id);
      setDocuments((prev) => prev.filter((item) => item.id !== id));
      setSupabaseSyncStatus("Document deleted from Supabase database");
    } catch (error) {
      console.error("DOCUMENT DELETE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Document delete failed");
      toast.error(error.message || "Document delete failed");
    }
      },
    });
  };

  const calculateServiceValues = (priceValue, gstTypeValue) => {
    const price = safeNumber(priceValue);
    const gst = gstTypeValue === "GST on Income (10%)" ? price * 0.1 : 0;
    return {
      gst: gst.toFixed(2),
      total: (price + gst).toFixed(2),
    };
  };

  const resetServiceForm = () => {
    setEditingServiceId(null);
    setServiceForm({
      name: "",
      gstType: "GST on Income (10%)",
      price: "",
      gst: "0.00",
      total: "0.00",
    });
  };

  const openNewServiceModal = () => {
    resetServiceForm();
    setShowServiceModal(true);
  };

  const openEditServiceModal = (service) => {
    setEditingServiceId(service.id);
    setServiceForm({
      name: service.name || "",
      gstType: service.gstType || "",
      price: String(service.price ?? ""),
      gst: Number(service.gst || 0).toFixed(2),
      total: Number(service.total || 0).toFixed(2),
    });
    setShowServiceModal(true);
  };

  const handleServiceFormChange = (field, value) => {
    if (field === "name") {
      setServiceForm((prev) => ({ ...prev, name: value }));
      return;
    }

    if (field === "price") {
      const cleaned = value.replace(/[^0-9.]/g, "");
      const computed = calculateServiceValues(cleaned, serviceForm.gstType);
      setServiceForm((prev) => ({ ...prev,
        price: cleaned,
        gst: computed.gst,
        total: computed.total,
      }));
      return;
    }

    if (field === "gstType") {
      const computed = calculateServiceValues(serviceForm.price, value);
      setServiceForm((prev) => ({ ...prev,
        gstType: value,
        gst: computed.gst,
        total: computed.total,
      }));
      return;
    }
  };

  const saveService = async () => {
    if (!serviceForm.name.trim() || !serviceForm.gstType) return;
    const payload = {
      ...(editingServiceId ? { id: editingServiceId } : {}),
      name: serviceForm.name.trim(),
      gstType: serviceForm.gstType,
      price: safeNumber(serviceForm.price),
      gst: safeNumber(serviceForm.gst),
      total: safeNumber(serviceForm.total),
    };
    try {
      const savedService = await upsertRecordInDatabase(SUPABASE_TABLES.services, payload);
      if (editingServiceId) {
        setServices((prev) => prev.map((item) => (item.id === editingServiceId ? savedService : item)));
      } else {
        setServices((prev) => [...prev, savedService]);
      }

      setSupabaseSyncStatus("Service saved to Supabase database");
      setShowServiceModal(false);
      resetServiceForm();
    } catch (error) {
      console.error("SERVICE SAVE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Service save failed");
      toast.error(error.message || "Service save failed");
    }
  };

  const deleteService = (serviceId) => {
    confirm({ title: "Delete service", message: "This service will be removed from your catalogue.", confirmLabel: "Delete", onConfirm: async () => {
    try {
      await deleteRecordFromDatabase(SUPABASE_TABLES.services, serviceId);
      setServices((prev) => prev.filter((item) => item.id !== serviceId));
      setSupabaseSyncStatus("Service deleted from Supabase database");
    } catch (error) {
      console.error("SERVICE DELETE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Service delete failed");
      toast.error(error.message || "Service delete failed");
    }
      },
    });
  };

  const resetIncomeSourceForm = () => {
    setIncomeSourceForm({
      name: "",
      incomeType: "Casual employment",
      beforeTax: "",
      frequency: "",
      startedAfterDate: false,
      hasEndDate: false,
    });
  };

  const saveIncomeSource = async () => {
    const incomeErrors = validateIncomeSourcePayload({ ...incomeSourceForm, beforeTax: safeNumber(incomeSourceForm.beforeTax) });
    if (incomeErrors.length) {
      summariseValidationErrors("Income source", incomeErrors, toast);
      return;
    }

    const payload = {
      name: incomeSourceForm.name.trim(),
      incomeType: incomeSourceForm.incomeType,
      beforeTax: safeNumber(incomeSourceForm.beforeTax),
      frequency: incomeSourceForm.frequency,
      startedAfterDate: incomeSourceForm.startedAfterDate,
      hasEndDate: incomeSourceForm.hasEndDate,
    };
    try {
      const savedIncomeSource = await upsertRecordInDatabase(SUPABASE_TABLES.incomeSources, payload);
      setIncomeSources((prev) => [...prev, savedIncomeSource]);
      setSupabaseSyncStatus("Income source saved to Supabase database");
      setShowIncomeSourceModal(false);
      resetIncomeSourceForm();
    } catch (error) {
      console.error("INCOME SOURCE SAVE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Income source save failed");
      toast.error(error.message || "Income source save failed");
    }
  };

  const getClientName = (clientId) =>
    clients.find((c) => c.id === safeNumber(clientId))?.name || "Unknown client";

  const getClientById = (clientId) =>
    clients.find((c) => c.id === safeNumber(clientId));

  const formatClientCurrency = (value, clientId) =>
    formatCurrencyByCode(value, getClientCurrencyCode(getClientById(clientId)));

  const clientIsGstExempt = (clientId) => {
    const client = getClientById(clientId);
    return Boolean(client?.outsideAustraliaOrGstExempt);
  };

  const gstAppliesToClient = (clientId) =>
    Boolean(profile.gstRegistered) && !clientIsGstExempt(clientId);

  const calculateFormGst = ({ unitPrice, quantity, gstType, clientId, manualGst, gstOverride }) => {
    if (clientIsGstExempt(clientId)) {
      return 0;
    }

    if (manualGst && gstOverride !== "") {
      return safeNumber(gstOverride);
    }

    const subtotalExGst = safeNumber(unitPrice) * Math.max(1, safeNumber(quantity || 1));
    const serviceHasGst = gstType === "GST on Income (10%)";

    if (!gstAppliesToClient(clientId) || !serviceHasGst) {
      return 0;
    }

    return subtotalExGst * 0.1;
  };

  const computeLineItemTotals = (lineItems, clientId) => {
    const exempt = clientIsGstExempt(clientId);
    return (lineItems || []).map((item) => {
      const qty = Math.max(1, safeNumber(item.quantity || 1));
      const unit = safeNumber(item.unitPrice);
      const rowSubtotal = unit * qty;
      const effectiveGstType = exempt ? "GST Free" : (item.gstType || "GST on Income (10%)");
      const rowGst = effectiveGstType === "GST on Income (10%)" ? rowSubtotal * 0.1 : 0;
      return { ...item, qty, unit, rowSubtotal, rowGst, rowTotal: rowSubtotal + rowGst };
    });
  };

  const getDocumentBusinessName = () =>
    profile.hideLegalNameOnDocs || !profile.legalBusinessName
      ? profile.businessName
      : profile.legalBusinessName;

  const getDocumentAddress = () => (profile.hideAddressOnDocs ? "" : profile.address || "");

  const buildLineItemSummary = ({ clientId, subtotal, total, gst, purchaseOrderReference = "" }) => {
    const client = getClientById(clientId);
    const adjustments = calculateAdjustmentValues({
      subtotal,
      total,
      client,
      profile,
    });
    return {
      client,
      currencyCode: getClientCurrencyCode(client),
      gstStatus: clientIsGstExempt(clientId) ? "GST not applicable" : gst > 0 ? "GST applies" : "GST free",
      feeAmount: adjustments.feeAmount,
      taxWithheld: adjustments.taxWithheld,
      netExpected: adjustments.netExpected,
      purchaseOrderReference,
    };
  };

  const sendSavedDocumentEmail = async ({ documentType, documentRecord }) => {
  let emailDocumentRecord = { ...(documentRecord || {}) };
  let stripeCheckoutUrl = emailDocumentRecord?.stripeCheckoutUrl || "";

  // ── Persist publicToken for quotes before emailing so the acceptance link can resolve ──
  if (documentType === "quote") {
    const persistedToken = emailDocumentRecord.publicToken || crypto.randomUUID();
    emailDocumentRecord = {
      ...emailDocumentRecord,
      publicToken: persistedToken,
      status: emailDocumentRecord.status === "Draft" ? "Sent" : emailDocumentRecord.status,
    };
    try {
      const saved = await upsertRecordInDatabase(SUPABASE_TABLES.quotes, emailDocumentRecord);
      if (!saved?.publicToken) {
        throw new Error("Quote link could not be prepared. Please save the quote and try again.");
      }
      setQuotes((prev) => mergeRecordById(prev, saved));
      emailDocumentRecord = { ...saved };
    } catch (e) {
      console.error("Failed to save publicToken to quote:", e);
      throw new Error(e?.message || "Quote link could not be prepared. Please try again.");
    }
  }

  const client = getClientById(emailDocumentRecord?.clientId);

  const recipientList = Array.from(
    new Set(
      [
        client?.sendToClient && isValidEmail(client?.email)
          ? String(client.email).trim()
          : "",
        client?.sendToMe && isValidEmail(profile?.email)
          ? String(profile.email).trim()
          : "",
      ].filter(Boolean)
    )
  );

  if (!recipientList.length) {
    return {
      ok: false,
      skipped: true,
      message: `No email recipients configured for this ${documentType}.`,
    };
  }

  const serverBaseUrl = getApiBaseUrl(profile?.stripeServerUrl);

  const shouldAttemptAutomaticStripeCheckout =
    documentType === "invoice" &&
    !stripeCheckoutUrl &&
    Boolean(profile?.stripePaymentLink);

  if (
    shouldAttemptAutomaticStripeCheckout &&
    typeof resolveInvoiceStripeAmount === "function" &&
    resolveInvoiceStripeAmount(emailDocumentRecord) > 0
  ) {
    try {
      stripeCheckoutUrl = await createStripeCheckoutForInvoice(emailDocumentRecord);

      if (stripeCheckoutUrl) {
        emailDocumentRecord = {
          ...emailDocumentRecord,
          stripeCheckoutUrl,
        };
      }
    } catch (e) {
      console.error("EMAIL STRIPE LINK ERROR:", e);
    }
  }

  const resolvedTotal = safeNumber(
    emailDocumentRecord?.total ??
    emailDocumentRecord?.grandTotal ??
    emailDocumentRecord?.invoiceTotal ??
    emailDocumentRecord?.amount ??
    emailDocumentRecord?.totalAmount
  );

  let invoiceHtml = "";
  let quoteHtml = "";

  if (documentType === "invoice") {
    invoiceHtml = buildInvoiceHtml(
      emailDocumentRecord,
      stripeCheckoutUrl || emailDocumentRecord?.stripeCheckoutUrl || "",
      { allowEmail: false },
      { profile, clients }
    );
  }

  if (documentType === "quote") {
    try {
      quoteHtml = buildQuoteHtml(
        emailDocumentRecord,
        { allowEmail: false },
        { profile, clients }
      );
    } catch (error) {
      console.error("buildQuoteHtml crashed:", error);
      quoteHtml = "";
    }

    if (!String(quoteHtml || "").trim()) {
      console.warn("Using fallback quote HTML for PDF generation", {
        quoteId: emailDocumentRecord?.id,
        quoteNumber: emailDocumentRecord?.quoteNumber,
        clientId: emailDocumentRecord?.clientId,
      });

      quoteHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Quote ${emailDocumentRecord?.quoteNumber || ""}</title>
<style>
body { font-family: Arial, sans-serif; padding: 40px; color: #14202B; }
.card { border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; }
.title { font-size: 32px; font-weight: 900; color: #6A1B9A; margin-bottom: 18px; }
.row { margin: 8px 0; }
.label { font-weight: 700; }
.total { margin-top: 20px; font-size: 20px; font-weight: 800; color: #006D6D; }
</style>
</head>
<body>
  <div class="card">
    <div class="title">QUOTE</div>
    <div class="row"><span class="label">Business:</span> ${profile?.businessName || "Your Business"}</div>
    <div class="row"><span class="label">Quote Number:</span> ${emailDocumentRecord?.quoteNumber || ""}</div>
    <div class="row"><span class="label">Quote Date:</span> ${formatDateAU(emailDocumentRecord?.quoteDate)}</div>
    <div class="row"><span class="label">Expiry Date:</span> ${formatDateAU(emailDocumentRecord?.expiryDate)}</div>
    <div class="row"><span class="label">Client:</span> ${getClientName(emailDocumentRecord?.clientId)}</div>
    <div class="row"><span class="label">Description:</span> ${emailDocumentRecord?.description || "Professional services"}</div>
    <div class="row"><span class="label">Quantity:</span> ${safeNumber(emailDocumentRecord?.quantity || 1)}</div>
    <div class="row"><span class="label">Subtotal:</span> ${formatCurrencyByCode(safeNumber(emailDocumentRecord?.subtotal), emailDocumentRecord?.currencyCode || "AUD")}</div>
    <div class="row"><span class="label">GST:</span> ${formatCurrencyByCode(safeNumber(emailDocumentRecord?.gst), emailDocumentRecord?.currencyCode || "AUD")}</div>
    <div class="total">Total Estimate: ${formatCurrencyByCode(resolvedTotal, emailDocumentRecord?.currencyCode || "AUD")}</div>
  </div>
</body>
</html>`;
    }
  }

  let emailBodyHtml =
    documentType === "invoice"
      ? invoiceHtml
      : buildQuoteEmailHtml(emailDocumentRecord, { profile, clients });

  // ── Inject "View & Accept Quote" button into quote emails ──
  if (documentType === "quote" && emailDocumentRecord.publicToken) {
    const quoteViewUrl = `${window.location.origin}/?quote_token=${encodeURIComponent(emailDocumentRecord.publicToken)}`;
    const acceptanceBanner = `
      <div style="margin:24px auto 0; max-width:760px; text-align:center; padding:24px; background:#FAFBFF; border:2px solid #E2E8F0; border-radius:16px;">
        <div style="font-size:16px; font-weight:700; color:#14202B; margin-bottom:12px;">Ready to proceed?</div>
        <p style="font-size:14px; color:#475569; margin-bottom:18px;">Click the button below to view the full quote and accept or decline it online.</p>
        <a href="${quoteViewUrl}" style="display:inline-block; background:#006D6D; color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:12px; font-weight:800; font-size:16px;">View &amp; Accept Quote</a>
      </div>`;
    // Insert before </body>
    emailBodyHtml = emailBodyHtml.replace("</body>", acceptanceBanner + "\n</body>");
  }

  const payload = {
    to: recipientList,
    subject:
      documentType === "invoice"
        ? `Invoice ${emailDocumentRecord?.invoiceNumber || ""} from ${profile.businessName || "Your Business"}`
        : `Quote ${emailDocumentRecord?.quoteNumber || ""} from ${profile.businessName || "Your Business"}`,
    customerName: getClientName(emailDocumentRecord?.clientId),
    clientName: getClientById(emailDocumentRecord?.clientId)?.name || "",
    clientEmail: getClientById(emailDocumentRecord?.clientId)?.email || "",
    businessName: profile?.businessName || "",
    businessAddress: profile?.address || "",
    businessEmail: profile?.email || "",
    businessPhone: profile?.phone || "",
    abn: profile?.abn || "",
    logoDataUrl: profile?.logoDataUrl || "",
    documentType,
    html: emailBodyHtml,
    documentHtml:
      documentType === "quote"
        ? (quoteHtml || emailBodyHtml)
        : (invoiceHtml || emailBodyHtml),
    quoteHtml: documentType === "quote" ? (quoteHtml || emailBodyHtml) : "",
    invoiceHtml: documentType === "invoice" ? (invoiceHtml || emailBodyHtml) : "",
    text: `Please see your ${documentType} below in the email body.`,
    filename: `${documentType}-${emailDocumentRecord?.invoiceNumber || emailDocumentRecord?.quoteNumber || "document"}.pdf`,
    replyTo: profile?.email || "",
    number:
      documentType === "invoice"
        ? emailDocumentRecord?.invoiceNumber || ""
        : emailDocumentRecord?.quoteNumber || "",
    invoiceNumber: emailDocumentRecord?.invoiceNumber || "",
    quoteNumber: emailDocumentRecord?.quoteNumber || "",
    invoiceDate: emailDocumentRecord?.invoiceDate || "",
    dueDate: emailDocumentRecord?.dueDate || "",
    quoteDate: emailDocumentRecord?.quoteDate || "",
    expiryDate: emailDocumentRecord?.expiryDate || "",
    description: emailDocumentRecord?.description || "",
    comments: emailDocumentRecord?.comments || "",
    quantity: safeNumber(emailDocumentRecord?.quantity || 1),
    subtotal: safeNumber(emailDocumentRecord?.subtotal),
    gst: safeNumber(emailDocumentRecord?.gst),
    total: resolvedTotal,
    currencyCode: emailDocumentRecord?.currencyCode || "AUD",
    hidePhoneNumber: Boolean(emailDocumentRecord?.hidePhoneNumber),
    stripeCheckoutUrl: stripeCheckoutUrl || emailDocumentRecord?.stripeCheckoutUrl || "",
  };

  let response;
  let data = null;

  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke("send-document-email", {
      body: payload,
    });

    if (fnError) {
      console.error("EMAIL FUNCTION ERROR:", fnError);
      throw new Error(fnError.message || "Email function failed");
    }

    data = fnData;
  } catch (error) {
    console.error("EMAIL NETWORK ERROR:", {
      documentType,
      error,
    });
    throw new Error(error.message || "Could not send email. Please try again.");
  }

  if (!data?.ok) {
    console.error("EMAIL ERROR:", data);
    throw new Error(data?.error || data?.message || "Email failed");
  }

  return {
    ok: true,
    message: data?.message || "Email sent",
    recipients: recipientList,
    stripeCheckoutUrl,
    updatedDocumentRecord: emailDocumentRecord,
  };
};
    useEffect(() => {
    setInvoiceForm((prev) => {
      const currentDate = prev.invoiceDate || todayLocal();
      const autoDueDate = addDays(currentDate, (safeNumber(profile.paymentTermsDays) || 14));
      return { ...prev,
        dueDate: autoDueDate,
        hidePhoneNumber: profile.hidePhoneOnDocs,
      };
    });
    }, [profile.paymentTermsDays, profile.hidePhoneOnDocs]);

    useEffect(() => {
    setInvoiceForm((prev) => ({ ...prev,
      dueDate: addDays(prev.invoiceDate || todayLocal(), (safeNumber(profile.paymentTermsDays) || 14)),
    }));
    }, [invoiceForm.invoiceDate]);

    useEffect(() => {
    setQuoteForm((prev) => ({ ...prev,
      hidePhoneNumber: profile.hidePhoneOnDocs,
    }));
    }, [profile.hidePhoneOnDocs]);

    useEffect(() => {
    setInvoiceForm((prev) => {
      if (!prev.savedRecordId) return prev;
      return {
        ...prev,
        savedRecordId: null,
        invoiceNumber: "",
      };
    });
    }, [invoiceForm.clientId, invoiceForm.invoiceDate, invoiceForm.dueDate, invoiceForm.lineItems, invoiceForm.description, invoiceForm.subtotal, invoiceForm.quantity, invoiceForm.comments, invoiceForm.purchaseOrderReference, invoiceForm.includesUntaxedPortion, invoiceForm.hidePhoneNumber, invoiceForm.gstType, invoiceForm.gstOverride, invoiceForm.manualGst, invoiceForm.startDate, invoiceForm.endDate, invoiceForm.sendDate, invoiceForm.sendTime, invoiceForm.recurs, invoiceForm.serviceId]);

    useEffect(() => {
    setQuoteForm((prev) => {
      if (!prev.savedRecordId) return prev;
      return {
        ...prev,
        savedRecordId: null,
        quoteNumber: "",
      };
    });
    }, [quoteForm.clientId, quoteForm.quoteDate, quoteForm.expiryDate, quoteForm.lineItems, quoteForm.serviceId, quoteForm.gstType, quoteForm.manualGst, quoteForm.currencyCode, quoteForm.description, quoteForm.quantity, quoteForm.subtotal, quoteForm.gstOverride, quoteForm.comments, quoteForm.hidePhoneNumber]);

    useEffect(() => {
    if (!invoiceEditorOpen || !invoiceEditorForm) return;

    setInvoiceEditorForm((prev) => {
      if (!prev) return prev;
      const selectedClient = getClientById(prev.clientId) || clients[0];
      if (!selectedClient) return prev;
      const gstExempt = Boolean(selectedClient?.outsideAustraliaOrGstExempt);

      return { ...prev,
        clientId: selectedClient.id,
        currencyCode: getClientCurrencyCode(selectedClient),
        gstType: gstExempt ? "GST Free" : prev.gstType || "GST on Income (10%)",
      };
    });
    }, [clients, invoiceEditorOpen]);

    useEffect(() => {
    if (!quoteEditorOpen || !quoteEditorForm) return;

    setQuoteEditorForm((prev) => {
      if (!prev) return prev;
      const selectedClient = getClientById(prev.clientId) || clients[0];
      if (!selectedClient) return prev;
      const gstExempt = Boolean(selectedClient?.outsideAustraliaOrGstExempt);

      return { ...prev,
        clientId: selectedClient.id,
        currencyCode: getClientCurrencyCode(selectedClient),
        gstType: gstExempt ? "GST Free" : prev.gstType || "GST on Income (10%)",
      };
    });
    }, [clients, quoteEditorOpen]);

    useEffect(() => {
    if (!clients.length) return;

    setInvoiceForm((prev) => {
      const clientId = clients.some((c) => c.id === safeNumber(prev.clientId)) ? prev.clientId : clients[0].id;
      const selectedClient = getClientById(clientId) || clients[0];
      return { ...prev,
        clientId,
        currencyCode: getClientCurrencyCode(selectedClient),
        manualGst: clientIsGstExempt(clientId) ? false : prev.manualGst,
        gstOverride: clientIsGstExempt(clientId) ? "" : prev.gstOverride,
      };
    });

    setQuoteForm((prev) => {
      const clientId = clients.some((c) => c.id === safeNumber(prev.clientId)) ? prev.clientId : clients[0].id;
      const selectedClient = getClientById(clientId) || clients[0];
      return { ...prev,
        clientId,
        currencyCode: getClientCurrencyCode(selectedClient),
        manualGst: clientIsGstExempt(clientId) ? false : prev.manualGst,
        gstOverride: clientIsGstExempt(clientId) ? "" : prev.gstOverride,
      };
    });
    }, [clients]);

    const invoiceAllocations = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === "Paid")
      .map((inv) => {
        const gross = safeNumber(inv.total);
        const gst = safeNumber(inv.gst);
        const incomeExGst = gross - gst;
        const client = getClientById(inv.clientId);
        const feeAmount =
          inv.feeAmount != null ? safeNumber(inv.feeAmount) : calculateAdjustmentValues({
            subtotal: safeNumber(inv.subtotal),
            total: gross,
            client,
            profile,
          }).feeAmount;
        const taxWithheld =
          inv.taxWithheld != null ? safeNumber(inv.taxWithheld) : calculateAdjustmentValues({
            subtotal: safeNumber(inv.subtotal),
            total: gross,
            client,
            profile,
          }).taxWithheld;
        const estimatedTax = client?.deductsTaxPrior ? 0 : incomeExGst * (safeNumber(profile.taxRate) / 100);
        const netAvailable =
          inv.netExpected != null
            ? safeNumber(inv.netExpected)
            : gross - gst - estimatedTax - feeAmount - taxWithheld;
        return { ...inv,
          gross,
          gst,
          incomeExGst,
          estimatedTax,
          fee: feeAmount,
          taxWithheld,
          netAvailable,
        };
      });
    }, [invoices, clients, profile.taxRate, profile.feeRate]);

    const totals = useMemo(() => {
    const totalIncome = invoices.reduce((sum, inv) => sum + safeNumber(inv.total), 0);
    const paidIncome = invoices
      .filter((x) => x.status === "Paid")
      .reduce((sum, inv) => sum + safeNumber(inv.total), 0);
    const totalExpenses = expenses.reduce((sum, ex) => sum + safeNumber(ex.amount), 0);

    const gstCollected = invoiceAllocations.reduce((sum, x) => sum + x.gst, 0);
    const gstOnExpenses = expenses.reduce((sum, ex) => sum + safeNumber(ex.gst), 0);
    const gstPayable = gstCollected - gstOnExpenses;

    const incomeExGst = invoiceAllocations.reduce((sum, x) => sum + x.incomeExGst, 0);
    const estimatedTax = invoiceAllocations.reduce((sum, x) => sum + x.estimatedTax, 0);
    const totalFees = invoiceAllocations.reduce((sum, x) => sum + x.fee, 0);
    const totalTaxWithheld = invoiceAllocations.reduce((sum, x) => sum + x.taxWithheld, 0);
    const preExpenseAvailable = invoiceAllocations.reduce((sum, x) => sum + x.netAvailable, 0);
    const monthlySubscriptionCost = safeNumber(profile.monthlySubscription ?? DEFAULT_MONTHLY_SUBSCRIPTION);
    const safeToSpend = preExpenseAvailable - totalExpenses - monthlySubscriptionCost;

    return {
      totalIncome,
      paidIncome,
      totalExpenses,
      gstCollected,
      gstOnExpenses,
      gstPayable,
      incomeExGst,
      estimatedTax,
      totalFees,
      totalTaxWithheld,
      preExpenseAvailable,
      monthlySubscriptionCost,
      safeToSpend,
    };
    }, [invoices, expenses, invoiceAllocations, profile.monthlySubscription]);


    const buildClientEditorForm = (client) => ({ ...blankClient,
    ...(client || {}),
    });
    const buildExpenseEditorForm = (expense) => ({ ...(expense || {}),
    date: expense?.date || todayLocal(),
    dueDate: expense?.dueDate || expense?.date || todayLocal(),
    supplier: expense?.supplier || "",
    category: expense?.category || "",
    description: expense?.description || "",
    amount: expense?.amount != null ? String(expense.amount) : "",
    expenseType: expense?.expenseType || "",
    workType: expense?.workType || profile.workType,
    receiptFileName: expense?.receiptFileName || "",
    receiptUrl: expense?.receiptUrl || "",
    });
    const buildIncomeSourceEditorForm = (item) => ({ ...(item || {}),
    name: item?.name || "",
    incomeType: item?.incomeType || "Casual employment",
    beforeTax: item?.beforeTax != null ? String(item.beforeTax) : "",
    frequency: item?.frequency || "",
    startedAfterDate: Boolean(item?.startedAfterDate),
    hasEndDate: Boolean(item?.hasEndDate),
    });
    const openClientEditor = (client) => {
    setClientEditorForm(buildClientEditorForm(client));
    setClientEditorOpen(true);
    };
    const closeClientEditor = () => {
    setClientEditorOpen(false);
    setClientEditorForm(null);
    };
    const openExpenseEditor = (expense) => {
    setExpenseEditorForm(buildExpenseEditorForm(expense));
    setExpenseEditorOpen(true);
    };
    const closeExpenseEditor = () => {
    setExpenseEditorOpen(false);
    setExpenseEditorForm(null);
    };
    const openIncomeSourceEditor = (item) => {
    setIncomeSourceEditorForm(buildIncomeSourceEditorForm(item));
    setIncomeSourceEditorOpen(true);
    };
    const closeIncomeSourceEditor = () => {
    setIncomeSourceEditorOpen(false);
    setIncomeSourceEditorForm(null);
    };
    const openDocumentEditor = (item) => {
    setDocumentEditorForm({ ...(item || {}),
      name: item?.name || "",
      url: item?.url || "",
    });
    setDocumentEditorOpen(true);
    };

    const closeDocumentEditor = () => {
    setDocumentEditorOpen(false);
    setDocumentEditorForm(null);
    };
    const openDocumentFile = (item) => {
    const directUrl = String(item?.url || "").trim();
    const storageUrl = !directUrl && item?.filePath && supabase
      ? supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(item.filePath)?.data?.publicUrl || ""
      : "";
    const targetUrl = directUrl || storageUrl;

    if (!targetUrl) {
      toast.warning("This document does not have a file link yet");
      return;
    }

    const openedWindow = window.open(targetUrl, "_blank", "noopener,noreferrer");
    if (!openedWindow) {
      toast.warning("Please allow pop-ups to open this document");
    }
    };
    const saveClientEdits = async () => {
    if (!clientEditorForm) return;
    const payload = { ...clientEditorForm,
      name: String(clientEditorForm.name || "").trim(),
      address: clientEditorForm.addressDetails || clientEditorForm.address || "",
    };
    const errors = validateClientPayload(payload);
    if (errors.length) {
      summariseValidationErrors("Client", errors, toast);
      setSavingClient(false);
      return;
    }
    try {
      const savedClient = await upsertRecordInDatabase(SUPABASE_TABLES.clients, payload);
      setClients((prev) => prev.map((item) => (item.id === savedClient.id ? savedClient : item)));
      closeClientEditor();
      setSupabaseSyncStatus("Client updated in Supabase database");
      toast.success("Client updated!");
    } catch (error) {
      console.error("CLIENT EDIT SAVE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Client update failed");
      toast.error(error.message || "Client update failed");
    }
    };

    const saveExpenseEdits = async () => {
    if (!expenseEditorForm) return;
    const payload = { ...expenseEditorForm,
      dueDate: expenseEditorForm.dueDate || expenseEditorForm.date,
      supplier: String(expenseEditorForm.supplier || "").trim(),
      category: String(expenseEditorForm.category || "").trim(),
      description: String(expenseEditorForm.description || "").trim(),
      amount: safeNumber(expenseEditorForm.amount),
      gst: safeNumber(expenseEditorForm.amount) / 11,
    };
    const errors = validateExpensePayload(payload);
    if (errors.length) {
      summariseValidationErrors("Expense", errors, toast);
      return;
    }
    try {
      const savedExpense = await upsertRecordInDatabase(SUPABASE_TABLES.expenses, payload);
      setExpenses((prev) => prev.map((item) => (item.id === savedExpense.id ? savedExpense : item)));
      closeExpenseEditor();
      setSupabaseSyncStatus("Expense updated in Supabase database");
      toast.success("Expense updated!");
    } catch (error) {
      console.error("EXPENSE EDIT SAVE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Expense update failed");
      toast.error(error.message || "Expense update failed");
    }
    };


    const markBillPaid = async (expense) => {
    try {
      const savedExpense = await upsertRecordInDatabase(SUPABASE_TABLES.expenses, {
        ...expense,
        isPaid: true,
        paidAt: new Date().toISOString(),
      });
      setExpenses((prev) => prev.map((item) => (item.id === savedExpense.id ? savedExpense : item)));
      setSupabaseSyncStatus("Bill marked paid");
    } catch (error) {
      console.error("MARK BILL PAID ERROR:", error);
      toast.error(error.message || "Could not mark bill paid");
    }
    };

    const markBillUnpaid = async (expense) => {
    try {
      const savedExpense = await upsertRecordInDatabase(SUPABASE_TABLES.expenses, {
        ...expense,
        isPaid: false,
        paidAt: "",
      });
      setExpenses((prev) => prev.map((item) => (item.id === savedExpense.id ? savedExpense : item)));
      setSupabaseSyncStatus("Bill marked unpaid");
    } catch (error) {
      console.error("MARK BILL UNPAID ERROR:", error);
      toast.error(error.message || "Could not mark bill unpaid");
    }
    };

    const sendExpenseDirect = async (expense) => {
    try {
      const recipient = String(profile?.email || "").trim();
      if (!recipient) {
        toast.warning("Add your email in Settings first to email this expense.");
        return;
      }

      const subject = encodeURIComponent(`Expense ${expense?.supplier || expense?.description || expense?.id || ""}`);
      const lines = [
        `Expense details`,
        `Supplier: ${expense?.supplier || ""}`,
        `Date: ${formatDateAU(expense?.date)}`,
        `Category: ${expense?.category || ""}`,
        `Amount: ${currency(expense?.amount)}`,
        expense?.description ? `Description: ${expense.description}` : "",
        expense?.receiptUrl ? `Receipt: ${expense.receiptUrl}` : "",
      ].filter(Boolean);
      const body = encodeURIComponent(lines.join("\n"));
      window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
      toast.success("Expense email opened.");
    } catch (error) {
      console.error("EXPENSE EMAIL ERROR:", error);
      toast.error(error.message || "Expense email failed");
    }
    };

    const saveIncomeSourceEdits = async () => {
    if (!incomeSourceEditorForm) return;
    const payload = { ...incomeSourceEditorForm,
      name: String(incomeSourceEditorForm.name || "").trim(),
      beforeTax: safeNumber(incomeSourceEditorForm.beforeTax),
    };
    const errors = validateIncomeSourcePayload(payload);
    if (errors.length) {
      summariseValidationErrors("Income source", errors, toast);
      return;
    }
    try {
      const savedItem = await upsertRecordInDatabase(SUPABASE_TABLES.incomeSources, payload);
      setIncomeSources((prev) => prev.map((item) => (item.id === savedItem.id ? savedItem : item)));
      closeIncomeSourceEditor();
      setSupabaseSyncStatus("Income source updated in Supabase database");
      toast.success("Income source updated!");
    } catch (error) {
      console.error("INCOME SOURCE EDIT SAVE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Income source update failed");
      toast.error(error.message || "Income source update failed");
    }
    };
    const saveDocumentEdits = async () => {
    if (!documentEditorForm) return;
    const payload = { ...documentEditorForm,
      name: String(documentEditorForm.name || "").trim(),
      url: String(documentEditorForm.url || "").trim(),
    };
    if (!payload.name) {
      toast.warning("Document name is required");
      return;
    }
    try {
      const savedDocument = await upsertRecordInDatabase(SUPABASE_TABLES.documents, payload);
      setDocuments((prev) => prev.map((item) => (item.id === savedDocument.id ? savedDocument : item)));
      closeDocumentEditor();
      setSupabaseSyncStatus("Document updated in Supabase database");
      toast.success("Document updated!");
    } catch (error) {
      console.error("DOCUMENT EDIT SAVE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Document update failed");
      toast.error(error.message || "Document update failed");
    }
    };

    const saveClient = async () => {
    setSavingClient(true);
    const payload = {
      ...clientForm,
      name: String(clientForm.name || "").trim(),
      address: clientForm.addressDetails || clientForm.address || "",
    };
    const errors = validateClientPayload(payload);
    if (errors.length) {
      summariseValidationErrors("Client", errors, toast);
      return;
    }

    try {
      const savedClient = await upsertRecordInDatabase(SUPABASE_TABLES.clients, payload);
      setClients((prev) => [...prev, savedClient]);
      setSupabaseSyncStatus("Client saved to Supabase database");
      setClientForm(blankClient);
      toast.success("Client saved!");
    } catch (error) {
      console.error("CLIENT SAVE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Client save failed");
      toast.error(error.message || "Client save failed");
    } finally {
      setSavingClient(false);
    }
    };

    const saveInvoice = async () => {
    const computedLines = computeLineItemTotals(invoiceForm.lineItems, invoiceForm.clientId);
    const hasLines = computedLines.some((l) => l.rowSubtotal > 0 || l.description);
    if (!invoiceForm.clientId) { toast.warning("Please select a client for this invoice"); return; }
    if (!hasLines) { toast.warning("Add at least one line item with a description and amount"); return; }

    const subtotal = computedLines.reduce((s, l) => s + l.rowSubtotal, 0);
    const gst = computedLines.reduce((s, l) => s + l.rowGst, 0);
    const total = subtotal + gst;
    const lineItemSummary = buildLineItemSummary({
      clientId: invoiceForm.clientId,
      subtotal,
      total,
      gst,
      purchaseOrderReference: invoiceForm.purchaseOrderReference,
    });
    const invoiceNumber = nextNumber(profile.invoicePrefix, invoices, "invoiceNumber");
    const invoiceDate = invoiceForm.invoiceDate || todayLocal();
    const dueDate = invoiceForm.dueDate || addDays(invoiceDate, (safeNumber(profile.paymentTermsDays) || 14));
    const payload = {
      invoiceNumber,
      clientId: safeNumber(invoiceForm.clientId),
      invoiceDate,
      dueDate,
      startDate: invoiceForm.startDate,
      endDate: invoiceForm.endDate,
      sendDate: invoiceForm.sendDate,
      sendTime: invoiceForm.sendTime,
      recurs: invoiceForm.recurs,
      lineItems: computedLines,
      gstType: invoiceForm.gstType,
      currencyCode: lineItemSummary.currencyCode,
      gstStatus: lineItemSummary.gstStatus,
      description: computedLines.map((l) => l.description).filter(Boolean).join("; "),
      subtotal,
      gst,
      total,
      feeAmount: lineItemSummary.feeAmount,
      taxWithheld: lineItemSummary.taxWithheld,
      netExpected: lineItemSummary.netExpected,
      comments: invoiceForm.comments,
      purchaseOrderReference: invoiceForm.purchaseOrderReference,
      includesUntaxedPortion: invoiceForm.includesUntaxedPortion,
      hidePhoneNumber: invoiceForm.hidePhoneNumber,
      quantity: computedLines.reduce((s, l) => s + l.qty, 0),
      status: "Draft",
      paymentReference: makePaymentReference(invoiceNumber),
      stripeCheckoutUrl: "",
      trackingId: crypto.randomUUID(),
      jobId: invoiceForm.jobId || "",
      viewStatus: "Draft",
    };

    setSavingInvoice(true);
    try {
      const savedInvoice = await upsertRecordInDatabase(SUPABASE_TABLES.invoices, payload);
      let nextInvoice = savedInvoice;
      const saveMessage = "Invoice saved to Supabase database. Use Preview to print or download the PDF.";

      setInvoices((prev) => [...prev, nextInvoice]);
      setInvoiceForm((prev) => ({
        ...prev,
        savedRecordId: nextInvoice.id,
        invoiceNumber: nextInvoice.invoiceNumber || "",
        currencyCode: nextInvoice.currencyCode || prev.currencyCode,
      }));
      setSupabaseSyncStatus(saveMessage);
      toast.success(saveMessage);
      return true;
    } catch (error) {
      console.error("INVOICE SAVE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Invoice save failed");
      toast.error(error.message || "Invoice save failed");
      return false;
    } finally {
      setSavingInvoice(false);
    }
    };

    const openInvoiceEditor = (invoice) => {
    setInvoiceEditorForm(buildInvoiceEditorForm(invoice));
    setInvoiceEditorOpen(true);
    };
    const closeInvoiceEditor = () => {
    setInvoiceEditorOpen(false);
    setInvoiceEditorForm(null);
    };
    const saveInvoiceEdits = async () => {
    if (!invoiceEditorForm?.id || !invoiceEditorForm.clientId) return;
    const syncedLines = syncSingleLineEditorToLineItems(invoiceEditorForm);
    const computedLines = computeLineItemTotals(syncedLines || [], invoiceEditorForm.clientId);
    const subtotal = computedLines.reduce((s, l) => s + l.rowSubtotal, 0);
    const gst = computedLines.reduce((s, l) => s + l.rowGst, 0);
    const total = subtotal + gst;
    const lineItemSummary = buildLineItemSummary({
      clientId: invoiceEditorForm.clientId,
      subtotal,
      total,
      gst,
      purchaseOrderReference: invoiceEditorForm.purchaseOrderReference,
    });
    const updatedInvoice = {
      id: invoiceEditorForm.id,
      invoiceNumber: invoiceEditorForm.invoiceNumber,
      clientId: safeNumber(invoiceEditorForm.clientId),
      invoiceDate: invoiceEditorForm.invoiceDate,
      dueDate: invoiceEditorForm.dueDate,
      startDate: invoiceEditorForm.startDate,
      endDate: invoiceEditorForm.endDate,
      sendDate: invoiceEditorForm.sendDate,
      sendTime: invoiceEditorForm.sendTime,
      recurs: invoiceEditorForm.recurs,
      lineItems: computedLines,
      gstType: invoiceEditorForm.gstType,
      currencyCode: lineItemSummary.currencyCode,
      gstStatus: lineItemSummary.gstStatus,
      description: computedLines.map((l) => l.description).filter(Boolean).join("; "),
      subtotal,
      gst,
      total,
      feeAmount: lineItemSummary.feeAmount,
      taxWithheld: lineItemSummary.taxWithheld,
      netExpected: lineItemSummary.netExpected,
      comments: invoiceEditorForm.comments,
      purchaseOrderReference: invoiceEditorForm.purchaseOrderReference,
      includesUntaxedPortion: invoiceEditorForm.includesUntaxedPortion,
      hidePhoneNumber: invoiceEditorForm.hidePhoneNumber,
      quantity: computedLines.reduce((s, l) => s + l.qty, 0),
      status: invoiceEditorForm.status || "Draft",
      paymentReference: invoiceEditorForm.paymentReference || "",
      stripeCheckoutUrl: invoiceEditorForm.stripeCheckoutUrl || "",
      jobId: invoiceEditorForm.jobId || "",
    };

    setSavingInvoiceEdits(true);
    try {
      const savedInvoice = await upsertRecordInDatabase(SUPABASE_TABLES.invoices, updatedInvoice);
      setInvoices((prev) =>
        prev.map((invoice) => (invoice.id === invoiceEditorForm.id ? savedInvoice : invoice))
      );
      setSupabaseSyncStatus("Invoice changes saved to Supabase database");
      closeInvoiceEditor();
    } catch (error) {
      console.error("INVOICE UPDATE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Invoice update failed");
      toast.error(error.message || "Invoice update failed");
    } finally {
      setSavingInvoiceEdits(false);
    }
    };
    const saveQuote = async () => {
    const computedLines = computeLineItemTotals(quoteForm.lineItems, quoteForm.clientId);
    const hasLines = computedLines.some((l) => l.rowSubtotal > 0 || l.description);
    if (!quoteForm.clientId) { toast.warning("Please select a client for this quote"); return; }
    if (!hasLines) { toast.warning("Add at least one line item with a description and amount"); return; }

    const subtotal = computedLines.reduce((s, l) => s + l.rowSubtotal, 0);
    const gst = computedLines.reduce((s, l) => s + l.rowGst, 0);
    const total = subtotal + gst;
    const lineItemSummary = buildLineItemSummary({
      clientId: quoteForm.clientId,
      subtotal,
      total,
      gst,
    });
    const quoteNumber = nextNumber(profile.quotePrefix, quotes, "quoteNumber");
    const quoteDate = quoteForm.quoteDate || todayLocal();
    const expiryDate = quoteForm.expiryDate || addDays(quoteDate, 31);
    const payload = {
      quoteNumber,
      clientId: safeNumber(quoteForm.clientId),
      quoteDate,
      expiryDate,
      lineItems: computedLines,
      gstType: quoteForm.gstType,
      currencyCode: lineItemSummary.currencyCode,
      gstStatus: lineItemSummary.gstStatus,
      description: computedLines.map((l) => l.description).filter(Boolean).join("; "),
      quantity: computedLines.reduce((s, l) => s + l.qty, 0),
      subtotal,
      gst,
      total,
      feeAmount: lineItemSummary.feeAmount,
      taxWithheld: lineItemSummary.taxWithheld,
      netExpected: lineItemSummary.netExpected,
      comments: quoteForm.comments,
      hidePhoneNumber: quoteForm.hidePhoneNumber,
      status: "Draft",
    };
    setSavingQuote(true);
    try {
      const savedQuote = await upsertRecordInDatabase(SUPABASE_TABLES.quotes, payload);
      let nextQuote = savedQuote;
      const saveMessage = "Quote saved to Supabase database. Use Preview to print or download the PDF.";

      setQuotes((prev) => mergeRecordById(prev, nextQuote));
      setQuoteForm((prev) => ({
        ...prev,
        savedRecordId: nextQuote.id,
        quoteNumber: nextQuote.quoteNumber || "",
        currencyCode: nextQuote.currencyCode || prev.currencyCode,
      }));
      setSupabaseSyncStatus(saveMessage);
      toast.success(saveMessage);
      return true;
    } catch (error) {
      console.error("QUOTE SAVE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Quote save failed");
      toast.error(error.message || "Quote save failed");
      return false;
    } finally {
      setSavingQuote(false);
    }
    };

    const openQuoteEditor = (quote) => {
    setQuoteEditorForm(buildQuoteEditorForm(quote));
    setQuoteEditorOpen(true);
    };
    const closeQuoteEditor = () => {
    setQuoteEditorOpen(false);
    setQuoteEditorForm(null);
    };
    const saveQuoteEdits = async () => {
    if (!quoteEditorForm?.id || !quoteEditorForm.clientId) return;
    const syncedLines = syncSingleLineEditorToLineItems(quoteEditorForm);
    const computedLines = computeLineItemTotals(syncedLines || [], quoteEditorForm.clientId);
    const subtotal = computedLines.reduce((s, l) => s + l.rowSubtotal, 0);
    const gst = computedLines.reduce((s, l) => s + l.rowGst, 0);
    const total = subtotal + gst;
    const lineItemSummary = buildLineItemSummary({
      clientId: quoteEditorForm.clientId,
      subtotal,
      total,
      gst,
    });
    const updatedQuote = {
      id: quoteEditorForm.id,
      quoteNumber: quoteEditorForm.quoteNumber,
      clientId: safeNumber(quoteEditorForm.clientId),
      quoteDate: quoteEditorForm.quoteDate,
      expiryDate: quoteEditorForm.expiryDate,
      lineItems: computedLines,
      gstType: quoteEditorForm.gstType,
      currencyCode: lineItemSummary.currencyCode,
      gstStatus: lineItemSummary.gstStatus,
      description: computedLines.map((l) => l.description).filter(Boolean).join("; "),
      quantity: computedLines.reduce((s, l) => s + l.qty, 0),
      subtotal,
      gst,
      total,
      feeAmount: lineItemSummary.feeAmount,
      taxWithheld: lineItemSummary.taxWithheld,
      netExpected: lineItemSummary.netExpected,
      comments: quoteEditorForm.comments,
      hidePhoneNumber: quoteEditorForm.hidePhoneNumber,
      status: quoteEditorForm.status || "Draft",
    };

    setSavingQuoteEdits(true);
    try {
      const savedQuote = await upsertRecordInDatabase(SUPABASE_TABLES.quotes, updatedQuote);
      setQuotes((prev) => mergeRecordById(prev, savedQuote));
      setSupabaseSyncStatus("Quote changes saved to Supabase database");
      closeQuoteEditor();
    } catch (error) {
      console.error("QUOTE UPDATE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Quote update failed");
      toast.error(error.message || "Quote update failed");
    } finally {
      setSavingQuoteEdits(false);
    }
    };
    const convertQuoteToInvoice = async (quote) => {
    if (!quote?.id) return;
    try {
      const existingInvoice = invoices.find((invoice) => String(invoice.convertedFromQuoteId) === String(quote.id));
      if (existingInvoice) {
        toast.success(`Quote already linked to invoice ${existingInvoice.invoiceNumber || existingInvoice.id}.`);
        setActivePage("invoices");
        return existingInvoice;
      }

      // 1. Mark the quote as Accepted and save
      const acceptedQuote = {
        ...quote,
        status: "Accepted",
        acceptedDate: quote.acceptedDate || new Date().toISOString(),
      };
      const savedQuote = await upsertRecordInDatabase(SUPABASE_TABLES.quotes, acceptedQuote);
      setQuotes((prev) => prev.map((q) => q.id === quote.id ? savedQuote : q));

      // 2. Build the invoice payload from the quote -- preserve all line items, amounts, client
      const invoiceNumber = nextNumber(profile.invoicePrefix, invoices, "invoiceNumber");
      const invoiceDate = todayLocal();
      const dueDate = addDays(invoiceDate, safeNumber(profile.paymentTermsDays) || 14);
      const invoicePayload = {
        invoiceNumber,
        clientId: safeNumber(quote.clientId),
        invoiceDate,
        dueDate,
        lineItems: quote.lineItems || [],
        gstType: quote.gstType || "GST on Income (10%)",
        currencyCode: quote.currencyCode || "AUD",
        gstStatus: quote.gstStatus || "",
        description: quote.description || "",
        subtotal: safeNumber(quote.subtotal),
        gst: safeNumber(quote.gst),
        total: safeNumber(quote.total),
        feeAmount: safeNumber(quote.feeAmount),
        taxWithheld: safeNumber(quote.taxWithheld),
        netExpected: safeNumber(quote.netExpected),
        quantity: safeNumber(quote.quantity) || 1,
        comments: quote.comments || "",
        purchaseOrderReference: quote.purchaseOrderReference || "",
        hidePhoneNumber: quote.hidePhoneNumber ?? profile.hidePhoneOnDocs,
        status: "Draft",
        paymentReference: makePaymentReference(invoiceNumber),
        stripeCheckoutUrl: "",
        convertedFromQuoteId: quote.id,
        convertedFromQuoteNumber: quote.quoteNumber || "",
        jobId: quote.jobId || quote.convertedToJobId || "",
      };
      const savedInvoice = await upsertRecordInDatabase(SUPABASE_TABLES.invoices, invoicePayload);
      setInvoices((prev) => [...prev, savedInvoice]);

      toast.success(`Invoice ${invoiceNumber} created from quote ${quote.quoteNumber || quote.id}!`);
      setSupabaseSyncStatus("Quote converted to invoice");
      closeQuoteEditor();
      setActivePage("invoices");
      return savedInvoice;
    } catch (error) {
      console.error("CONVERT QUOTE TO INVOICE ERROR:", error);
      toast.error(error.message || "Could not convert quote to invoice");
      return null;
    }
    };

    const convertQuoteToJob = async (quote) => {
      if (!quote?.id) return;
      try {
        const existingJob = jobs.find((job) => String(job.quoteId) === String(quote.id) || String(job.id) === String(quote.convertedToJobId || quote.jobId));
        if (existingJob) {
          const savedQuoteWithExistingJob = await upsertRecordInDatabase(SUPABASE_TABLES.quotes, {
            ...quote,
            status: "Accepted",
            acceptedDate: quote.acceptedDate || new Date().toISOString(),
            convertedToJobId: String(existingJob.id),
            jobId: String(existingJob.id),
          });
          setQuotes((prev) => prev.map((q) => q.id === quote.id ? savedQuoteWithExistingJob : q));
          toast.success(`Quote already linked to job ${existingJob.title || existingJob.id}.`);
          setActivePage("scheduling");
          return existingJob;
        }

        // Mark quote as Accepted
        const acceptedQuote = {
          ...quote,
          status: "Accepted",
          acceptedDate: quote.acceptedDate || new Date().toISOString(),
        };
        const savedQuote = await upsertRecordInDatabase(SUPABASE_TABLES.quotes, acceptedQuote);
        setQuotes((prev) => prev.map((q) => q.id === quote.id ? savedQuote : q));

        // Create job from quote data
        const jobPayload = {
          id: Date.now(),
          title: quote.description || `Job from Quote #${quote.quoteNumber || quote.id}`,
          clientId: quote.clientId || "",
          status: "Scheduled",
          priority: "Medium",
          startDate: todayLocal(),
          startTime: "09:00",
          endDate: todayLocal(),
          endTime: "17:00",
          quoteId: String(quote.id),
          quotedTotal: safeNumber(quote.total),
          colour: "#6A1B9A",
          notes: `Created from Quote #${quote.quoteNumber || quote.id}`,
          costs: { labour: [], materials: [], subcontractor: [], misc: [] },
        };
        const savedJob = await upsertRecordInDatabase(SUPABASE_TABLES.jobs, jobPayload);
        setJobs((prev) => [...prev, savedJob]);

        const linkedQuote = await upsertRecordInDatabase(SUPABASE_TABLES.quotes, {
          ...savedQuote,
          convertedToJobId: String(savedJob.id),
          jobId: String(savedJob.id),
        });
        setQuotes((prev) => prev.map((q) => q.id === quote.id ? linkedQuote : q));

        toast.success(`Job created from Quote #${quote.quoteNumber || quote.id}!`);
        setActivePage("scheduling");
        return savedJob;
      } catch (error) {
        console.error("CONVERT QUOTE TO JOB ERROR:", error);
        toast.error(error.message || "Could not convert quote to job");
        return null;
      }
    };
    const sendInvoiceFromPreview = async (invoiceId, previewWindow) => {
    const invoice = invoices.find((item) => String(item.id) === String(invoiceId));
    if (!invoice) {
      previewWindow?.alert?.("Invoice not found. Save the invoice first, then try again.");
      return;
    }

    const statusEl = previewWindow?.document?.getElementById?.("preview-email-status");
    const emailButton = previewWindow?.document?.getElementById?.("preview-email-button");
    const setStatus = (message, colour = "#64748B") => {
      if (statusEl) {
        statusEl.textContent = message || "";
        statusEl.style.color = colour;
      }
    };

    try {
      if (emailButton) {
        emailButton.disabled = true;
        emailButton.textContent = "Sending...";
        emailButton.style.opacity = "0.7";
        emailButton.style.cursor = "not-allowed";
      }
      setStatus("Sending invoice...", "#64748B");

      const result = await sendSavedDocumentEmail({
        documentType: "invoice",
        documentRecord: invoice,
      });

      if (result?.ok) {
        const updatedInvoice = {
...invoice,
          ...(result.updatedDocumentRecord || {}),
          stripeCheckoutUrl:
            result.stripeCheckoutUrl ||
            result.updatedDocumentRecord?.stripeCheckoutUrl ||
            invoice.stripeCheckoutUrl ||
            "",
          emailedAt: new Date().toISOString(),
          emailRecipients: result.recipients || [],
          viewStatus: "Sent",
          status: invoice.status === "Draft" ? "Sent" : invoice.status,
        };
        const savedInvoice = await upsertRecordInDatabase(SUPABASE_TABLES.invoices, updatedInvoice);
        setInvoices((prev) =>
          prev.map((item) => (String(item.id) === String(invoiceId) ? savedInvoice : item))
        );
        setSupabaseSyncStatus(result.message || "Invoice emailed");
        setStatus(result.message || "Invoice emailed.", "#166534");
        toast.success(result.message || `Sent to ${(result.recipients || []).join(", ")}`, "Invoice emailed");
      } else {
        setStatus(result?.message || "Could not send invoice.", "#B42318");
        toast.error(result?.message || "Could not send invoice.", "Email not sent");
      }
    } catch (error) {
      console.error("PREVIEW INVOICE EMAIL ERROR:", error);
      setStatus(`Send failed: ${error.message || "Unknown error"}`, "#B42318");
      toast.error(error.message || "Unknown error", "Email failed");
    } finally {
      if (emailButton) {
        emailButton.disabled = false;
        emailButton.textContent = "Email Invoice";
        emailButton.style.opacity = "1";
        emailButton.style.cursor = "pointer";
      }
    }
    };

    const sendQuoteFromPreview = async (quoteId, previewWindow) => {
    const quote = quotes.find((item) => String(item.id) === String(quoteId));
    if (!quote) {
      previewWindow?.alert?.("Quote not found. Save the quote first, then try again.");
      return;
    }

    const statusEl = previewWindow?.document?.getElementById?.("preview-email-status");
    const emailButton = previewWindow?.document?.getElementById?.("preview-email-button");
    const setStatus = (message, colour = "#64748B") => {
      if (statusEl) {
        statusEl.textContent = message || "";
        statusEl.style.color = colour;
      }
    };

    try {
      if (emailButton) {
        emailButton.disabled = true;
        emailButton.textContent = "Sending...";
        emailButton.style.opacity = "0.7";
        emailButton.style.cursor = "not-allowed";
      }
      setStatus("Sending quote...", "#64748B");

      const result = await sendSavedDocumentEmail({
        documentType: "quote",
        documentRecord: quote,
      });

      if (result?.ok) {
        const updatedQuote = {
          ...quote,
          emailedAt: new Date().toISOString(),
          emailRecipients: result.recipients || [],
        };
        const savedQuote = await upsertRecordInDatabase(SUPABASE_TABLES.quotes, updatedQuote);
        setQuotes((prev) =>
          prev.map((item) => (String(item.id) === String(quoteId) ? savedQuote : item))
        );
        setSupabaseSyncStatus(result.message || "Quote emailed");
        setStatus(result.message || "Quote emailed.", "#166534");
        toast.success(result.message || `Sent to ${(result.recipients || []).join(", ")}`, "Quote emailed");
      } else {
        setStatus(result?.message || "Could not send quote.", "#B42318");
        toast.error(result?.message || "Could not send quote.", "Email not sent");
      }
    } catch (error) {
      console.error("PREVIEW QUOTE EMAIL ERROR:", error);
      setStatus(`Send failed: ${error.message || "Unknown error"}`, "#B42318");
      toast.error(error.message || "Unknown error", "Email failed");
    } finally {
      if (emailButton) {
        emailButton.disabled = false;
        emailButton.textContent = "Email Quote";
        emailButton.style.opacity = "1";
        emailButton.style.cursor = "pointer";
      }
    }
    };

    const writeQuotePreviewToWindow = (w, quote, options = {}) => {
    const html = buildQuoteHtml(quote, options, { profile, clients });
    const blob = new Blob([html], { type: "text/html" });
    openBlobUrlInWindow(w, blob);
    };

    const openSavedQuotePreview = (quote) => {
    const w = window.open("", "_blank");
    if (!w) return;
    writeQuotePreviewToWindow(w, quote, { allowEmail: true });
    };

    const saveExpense = async () => {
    try {
      const expenseErrors = validateExpensePayload({ ...expenseForm, amount: safeNumber(expenseForm.amount) });
      if (expenseErrors.length) {
        summariseValidationErrors("Expense", expenseErrors, toast);
        return;
      }
      if (!expenseForm.supplier || !expenseForm.amount || !expenseForm.category) {
        toast.warning("Please fill in supplier, amount and category");
        return;
      }

      const amount = safeNumber(expenseForm.amount);
      const isMileage = expenseForm.category === "Mileage" || expenseForm.expenseType === "Motor Vehicle";
      const gst = isMileage ? 0 : amount / 11;
      let receiptUrl = "";
      let receiptFileName = "";

      if (receiptFile) {
        const uploaded = await uploadReceiptToSupabase(receiptFile);
        receiptUrl = uploaded.receiptUrl;
        receiptFileName = uploaded.fileName;
      }

      const payload = {
        ...expenseForm,
        dueDate: expenseForm.dueDate || expenseForm.date,
        amount,
        gst,
        isPaid: isMileage ? true : false,
        paidAt: isMileage ? expenseForm.date : "",
        receiptFileName: receiptFileName || expenseForm.receiptFileName || "",
        receiptUrl: receiptUrl || expenseForm.receiptUrl || "",
      };
      const savedExpense = await upsertRecordInDatabase(SUPABASE_TABLES.expenses, payload);

      setExpenses((prev) => {
        const existing = prev.some((item) => String(item.id) === String(savedExpense.id));
        if (existing) {
          return prev.map((item) => (String(item.id) === String(savedExpense.id) ? savedExpense : item));
        }
        return [...prev, savedExpense];
      });
      setExpenseForm({
        id: "",
        date: todayLocal(),
        dueDate: addDaysEOM(todayLocal()),
        supplier: "",
        category: "",
        description: "",
        amount: "",
        expenseType: "",
        workType: profile.workType,
        receiptFileName: "",
        receiptUrl: "",
        jobId: "",
        contactId: "",
      });
      setSupabaseSyncStatus("Expense saved to Supabase database");
      setReceiptFile(null);
      toast.success("Expense saved!");
    } catch (err) {
      console.error("SAVE ERROR:", err);
      setSupabaseSyncStatus(err.message || "Expense save failed");
      toast.error(err.message || "Something went wrong");
    }
    };

    const saveBill = async (opts = {}) => {
      if (opts.clear) {
        setExpenseForm({
          date: todayLocal(),
          dueDate: addDaysEOM(todayLocal()),
          supplier: "",
          category: "",
          description: "",
          amount: "",
          expenseType: "",
          workType: profile.workType,
          receiptFileName: "",
          receiptUrl: "",
          jobId: "",
          contactId: "",
        });
        setBillLineItems([blankBillLine()]);
        setBillWizardStep(1);
        setReceiptFile(null);
        return;
      }
      try {
        setSavingBill(true);
        let receiptUrl = "";
        let receiptFileName = "";
        if (receiptFile) {
          const uploaded = await uploadReceiptToSupabase(receiptFile);
          receiptUrl = uploaded.receiptUrl;
          receiptFileName = uploaded.fileName;
        }
        const amount = safeNumber(opts.totalAmt || 0);
        const gst = safeNumber(opts.totalGst || 0);
        const payload = {
          ...expenseForm,
          dueDate: expenseForm.dueDate || expenseForm.date,
          amount,
          gst,
          isPaid: false,
          paidAt: "",
          receiptFileName,
          receiptUrl,
          lineItems: billLineItems.filter(l => l.description || l.amount),
        };
        const savedExpense = await upsertRecordInDatabase(SUPABASE_TABLES.expenses, payload);
        setExpenses((prev) => [...prev, savedExpense]);
        setExpenseForm({
          date: todayLocal(),
          dueDate: addDaysEOM(todayLocal()),
          supplier: "",
          category: "",
          description: "",
          amount: "",
          expenseType: "",
          workType: profile.workType,
          receiptFileName: "",
          receiptUrl: "",
        });
        setBillLineItems([blankBillLine()]);
        setBillWizardStep(1);
        setReceiptFile(null);
        setSavingBill(false);
        toast.success("Bill saved!");
      } catch (err) {
        console.error("SAVE BILL ERROR:", err);
        setSavingBill(false);
        toast.error(err.message || "Something went wrong saving the bill");
      }
    };

    const markInvoicePaid = async (invoiceId, paidVia = "Manual") => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const updatedInvoice = { ...invoice, status: "Paid", paidAt: new Date().toISOString(), paidVia };
    try {
      const savedInvoice = await upsertRecordInDatabase(SUPABASE_TABLES.invoices, updatedInvoice);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? savedInvoice : inv))
      );
      setSupabaseSyncStatus("Invoice payment status saved to Supabase database");
    } catch (error) {
      console.error("MARK INVOICE PAID ERROR:", error);
      setSupabaseSyncStatus(error.message || "Invoice payment update failed");
      toast.error(error.message || "Invoice payment update failed");
    }
    };
    async function simulateInvoicePayment(invoiceId) {
    const invoice = invoices.find((x) => String(x.id) === String(invoiceId));
    if (!invoice) {
      toast.error("Invoice not found");
      return;
    }

    const updatedInvoice = { ...invoice,
      status: "Paid",
      paidAt: new Date().toISOString(),
    };
    try {
      const savedInvoice = await upsertRecordInDatabase(SUPABASE_TABLES.invoices, updatedInvoice);
      setInvoices((prev) =>
        prev.map((inv) =>
          String(inv.id) === String(invoiceId) ? savedInvoice : inv
        )
      );
      const client = getClientById(invoice.clientId);
      setSupabaseSyncStatus("Simulated payment saved to Supabase database");
      toast.success(`Simulated payment completed for ${invoice.invoiceNumber}`);
    } catch (error) {
      console.error("SIMULATED PAYMENT ERROR:", error);
      setSupabaseSyncStatus(error.message || "Simulated payment failed");
      toast.error(error.message || "Simulated payment failed");
    }
    }

    const deleteInvoice = (id) => {
    confirm({ title: "Delete invoice", message: "This invoice will be permanently deleted.", confirmLabel: "Delete", onConfirm: async () => {
    try {
      await deleteRecordFromDatabase(SUPABASE_TABLES.invoices, id);
      setInvoices((prev) => prev.filter((item) => item.id !== id));
      setSupabaseSyncStatus("Invoice deleted from Supabase database");
    } catch (error) {
      console.error("INVOICE DELETE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Invoice delete failed");
      toast.error(error.message || "Invoice delete failed");
    }
      },
    });
    };
    const deleteQuote = (id) => {
    confirm({ title: "Delete quote", message: "This quote will be permanently deleted.", confirmLabel: "Delete", onConfirm: async () => {
    try {
      await deleteRecordFromDatabase(SUPABASE_TABLES.quotes, id);
      setQuotes((prev) => prev.filter((item) => item.id !== id));
      setSupabaseSyncStatus("Quote deleted from Supabase database");
    } catch (error) {
      console.error("QUOTE DELETE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Quote delete failed");
      toast.error(error.message || "Quote delete failed");
    }
      },
    });
    };
    const deleteExpense = (id) => {
    confirm({ title: "Delete expense", message: "This expense record will be permanently deleted.", confirmLabel: "Delete", onConfirm: async () => {
    try {
      await deleteRecordFromDatabase(SUPABASE_TABLES.expenses, id);
      setExpenses((prev) => prev.filter((item) => item.id !== id));
      setSupabaseSyncStatus("Expense deleted from Supabase database");
    } catch (error) {
      console.error("EXPENSE DELETE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Expense delete failed");
      toast.error(error.message || "Expense delete failed");
    }
      },
    });
    };
    const deleteClient = (id) => {
    confirm({ title: "Delete client", message: "This client will be permanently deleted.", confirmLabel: "Delete", onConfirm: async () => {
    try {
      await deleteRecordFromDatabase(SUPABASE_TABLES.clients, id);
      setClients((prev) => prev.filter((item) => item.id !== id));
      setSupabaseSyncStatus("Client deleted from Supabase database");
    } catch (error) {
      console.error("CLIENT DELETE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Client delete failed");
      toast.error(error.message || "Client delete failed");
    }
      },
    });
    };
    const deleteIncomeSource = (id) => {
    confirm({ title: "Delete income source", message: "This income source will be permanently deleted.", confirmLabel: "Delete", onConfirm: async () => {
    try {
      await deleteRecordFromDatabase(SUPABASE_TABLES.incomeSources, id);
      setIncomeSources((prev) => prev.filter((item) => item.id !== id));
      setSupabaseSyncStatus("Income source deleted from Supabase database");
    } catch (error) {
      console.error("INCOME SOURCE DELETE ERROR:", error);
      setSupabaseSyncStatus(error.message || "Income source delete failed");
      toast.error(error.message || "Income source delete failed");
    }
      },
    });
    };

  const resolveInvoiceStripeAmount = (invoice) => {
    const storedTotal = safeNumber(
      invoice?.total ?? invoice?.grandTotal ?? invoice?.invoiceTotal ??
      invoice?.totalAmount ?? invoice?.amount ?? null
    );
    if (storedTotal > 0) return Number(storedTotal.toFixed(2));

    const quantity = Math.max(1, safeNumber(invoice?.quantity || 1));
    const resolvedSubtotal = safeNumber(invoice?.subtotal);
    const resolvedGst = safeNumber(invoice?.gst) > 0
      ? safeNumber(invoice?.gst)
      : calculateFormGst({
          unitPrice: quantity > 0 ? resolvedSubtotal / quantity : resolvedSubtotal,
          quantity,
          gstType: invoice?.gstType || "GST on Income (10%)",
          clientId: invoice?.clientId,
          manualGst: false,
          gstOverride: "",
        });
    const recomputed = resolvedSubtotal + resolvedGst;
    if (recomputed > 0) return Number(recomputed.toFixed(2));
    return 0;
  };

    const createStripeCheckoutForInvoice = async (invoice) => {
    const selectedClient = getClientById(invoice?.clientId) || {};

    const rawTotal = resolveInvoiceStripeAmount(invoice);

    if (!Number.isFinite(rawTotal) || rawTotal <= 0) {
      console.error("Stripe invoice total could not be resolved", { invoice, rawTotal });
      throw new Error(`Invoice total could not be determined for ${invoice?.invoiceNumber || invoice?.id}. Please open and re-save the invoice.`);
    }

    const payload = {
      invoiceId: invoice?.id,
      invoiceNumber: invoice?.invoiceNumber,
      clientId: invoice?.clientId,
      customerName: selectedClient?.name || selectedClient?.businessName || "",
      customerEmail: selectedClient?.email || "",
      description:
        invoice?.description ||
        `Invoice ${invoice?.invoiceNumber || invoice?.id || ""}`,
      currency: String(invoice?.currencyCode || "AUD").toLowerCase(),
      amount: Number(rawTotal.toFixed(2)),
      total: Number(rawTotal.toFixed(2)),
      successUrl: `${window.location.origin}?stripe=success&invoice=${encodeURIComponent(
        invoice?.invoiceNumber || ""
      )}&invoiceId=${encodeURIComponent(String(invoice?.id || ""))}`,
      cancelUrl: `${window.location.origin}?stripe=cancel&invoice=${encodeURIComponent(
        invoice?.invoiceNumber || ""
      )}&invoiceId=${encodeURIComponent(String(invoice?.id || ""))}`,
    };

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const headers = {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-invoice-checkout`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("STRIPE CHECKOUT ERROR:", data);
      throw new Error(data?.error || "Could not create Stripe checkout. Please try again.");
    }

    if (!data?.url) {
      console.error("Stripe checkout response missing URL", data);
      throw new Error(data?.error || "Stripe checkout URL was not returned");
    }

    return data.url;
    };

    const payInvoiceWithStripe = async (invoice) => {
    try {
      const checkoutUrl = await createStripeCheckoutForInvoice(invoice);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("STRIPE CHECKOUT ERROR:", error);
      toast.error(error.message || "Stripe checkout failed");
    }
    };

    const payInvoiceWithPayPal = (invoice) => {
      const amount = safeNumber(invoice?.total || 0).toFixed(2);
      const invoiceNumber = invoice?.invoiceNumber || "";
      const paypalEmail = profile?.paypalEmail || profile?.email || "";
      const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(paypalEmail)}&amount=${amount}&currency_code=AUD&item_name=${encodeURIComponent("Invoice " + invoiceNumber)}&invoice=${encodeURIComponent(invoiceNumber)}`;
      window.open(url, "_blank");
    };

    const resetExpenseModal = () => {
    setExpenseModalOpen(false);
    setExpenseTypeStep(1);
    setExpenseTypeSelection("");
    setExpenseWorkType(profile.workType);
    setExpenseCategorySelection("");
    setSearchExpenseCategory("");
    setReceiptFile(null);
    };

    const nextExpenseModalStep = () => {
    if (expenseTypeStep === 1) {
      if (!expenseTypeSelection) return;
      setExpenseTypeStep(2);
      return;
    }

    if (expenseTypeStep === 2) {
      if (!expenseTypeSelection || !expenseWorkType || !expenseCategorySelection) return;
      setExpenseForm((prev) => ({ ...prev,
        expenseType: expenseTypeSelection,
        workType: expenseWorkType,
        category: expenseCategorySelection,
      }));
      setExpenseTypeStep(3);
      return;
    }

    if (expenseTypeStep === 3) {
      setExpenseModalOpen(false);
      return;
    }
    };


    const openSavedInvoicePreview = async (invoice) => {
    const w = window.open("", "_blank");
    if (!w) return;

    let stripeCheckoutUrl = invoice.stripeCheckoutUrl || "";
    const previewInvoice = { ...invoice };

    // Show the invoice immediately — don't block on Stripe
    writeInvoicePreviewToWindow(w, previewInvoice, stripeCheckoutUrl, { allowEmail: true }, { profile, clients });
    w.simulateInvoicePayment = () => simulateInvoicePayment(invoice.id);

    // Try to generate a Stripe checkout URL in the background and refresh the preview
    if (!stripeCheckoutUrl && resolveInvoiceStripeAmount(invoice) > 0) {
      try {
        stripeCheckoutUrl = await createStripeCheckoutForInvoice(invoice);
        if (stripeCheckoutUrl) {
          const updatedInvoice = { ...invoice, stripeCheckoutUrl };
          setInvoices((prev) =>
            prev.map((item) =>
              item.id === invoice.id ? { ...item, stripeCheckoutUrl } : item
            )
          );
          // Refresh the preview window with the Stripe URL
          writeInvoicePreviewToWindow(w, updatedInvoice, stripeCheckoutUrl, { allowEmail: true }, { profile, clients });
        }
      } catch (error) {
        console.error("STRIPE PREVIEW ERROR:", error);
      }
    }
    };

    const openInvoicePreview = async () => {
    const computedPreviewLines = computeLineItemTotals(invoiceForm.lineItems || [], invoiceForm.clientId);
    const previewSubtotal = computedPreviewLines.reduce((s, l) => s + l.rowSubtotal, 0);
    const previewGst = computedPreviewLines.reduce((s, l) => s + l.rowGst, 0);
    const previewTotal = previewSubtotal + previewGst;

    const savedInvoiceNumber = String(invoiceForm.invoiceNumber || "").trim();
    const previewNumber = savedInvoiceNumber || nextNumber(profile.invoicePrefix, invoices, "invoiceNumber");
    const previewInvoice = {
      id: invoiceForm.savedRecordId || Date.now(),
      invoiceNumber: previewNumber,
      clientId: safeNumber(invoiceForm.clientId),
      invoiceDate: invoiceForm.invoiceDate,
      dueDate: invoiceForm.dueDate,
      description: computedPreviewLines.map((l) => l.description).filter(Boolean).join("; "),
      lineItems: computedPreviewLines,
      subtotal: previewSubtotal,
      gst: previewGst,
      total: previewTotal,
      comments: invoiceForm.comments,
      purchaseOrderReference: invoiceForm.purchaseOrderReference,
      hidePhoneNumber: invoiceForm.hidePhoneNumber,
      quantity: computedPreviewLines.reduce((s, l) => s + l.qty, 0),
      paymentReference: makePaymentReference(previewNumber),
      stripeCheckoutUrl: "",
    };

    const w = window.open("", "_blank");
    if (!w) return;

    // Show invoice immediately without Stripe URL
    writeInvoicePreviewToWindow(w, previewInvoice, "", { allowEmail: true }, { profile, clients });
    w.simulateInvoicePayment = () => simulateInvoicePayment(previewInvoice.id);

    // Generate Stripe URL in background and refresh
    if (resolveInvoiceStripeAmount(previewInvoice) > 0) {
      createStripeCheckoutForInvoice(previewInvoice).then((stripeCheckoutUrl) => {
        if (stripeCheckoutUrl) {
          const updated = { ...previewInvoice, stripeCheckoutUrl };
          writeInvoicePreviewToWindow(w, updated, stripeCheckoutUrl, { allowEmail: true }, { profile, clients });
        }
      }).catch((error) => console.error("STRIPE PREVIEW ERROR:", error));
    }
    };

    const openQuotePreview = () => {
    const computedPreviewLines = computeLineItemTotals(quoteForm.lineItems || [], quoteForm.clientId);
    const qSubtotal = computedPreviewLines.reduce((s, l) => s + l.rowSubtotal, 0);
    const qGst = computedPreviewLines.reduce((s, l) => s + l.rowGst, 0);
    const qTotal = qSubtotal + qGst;

    const previewNumber = nextNumber(profile.quotePrefix, quotes, "quoteNumber");
    const previewQuote = {
      id: `preview-${Date.now()}`,
      quoteNumber: previewNumber,
      clientId: safeNumber(quoteForm.clientId),
      quoteDate: quoteForm.quoteDate,
      expiryDate: quoteForm.expiryDate,
      lineItems: computedPreviewLines,
      gstType: quoteForm.gstType,
      currencyCode: getClientCurrencyCode(getClientById(quoteForm.clientId)),
      gstStatus: clientIsGstExempt(quoteForm.clientId)
        ? "GST not applicable"
        : qGst > 0
          ? "GST applies"
          : "GST free",
      description: computedPreviewLines.map((l) => l.description).filter(Boolean).join("; "),
      quantity: computedPreviewLines.reduce((s, l) => s + l.qty, 0),
      subtotal: qSubtotal,
      gst: qGst,
      total: qTotal,
      ...calculateAdjustmentValues({
        subtotal: qSubtotal,
        total: qTotal,
        client: getClientById(quoteForm.clientId),
        profile,
      }),
      comments: quoteForm.comments,
      hidePhoneNumber: quoteForm.hidePhoneNumber,
      status: "Preview",
    };

    const w = window.open("", "_blank");
    if (!w) return;
    writeQuotePreviewToWindow(w, previewQuote, { allowEmail: true });
    };

    const exportToATOForm = () => {
      setActivePage("ato tax form");
    };

    const monthlyFinance = useMemo(() => {
      const bucket = new Map();
      const ensureBucket = (key) => {
        if (!bucket.has(key)) {
          bucket.set(key, {
            monthKey: key,
            label: formatMonthLabel(key),
            revenue: 0,
            expenses: 0,
            gst: 0,
            net: 0,
          });
        }
        return bucket.get(key);
      };

      invoiceAllocations.forEach((invoice) => {
        const key = formatMonthKey(invoice.paidAt || invoice.invoiceDate);
        const row = ensureBucket(key);
        row.revenue += safeNumber(invoice.gross);
        row.gst += safeNumber(invoice.gst);
        row.net += safeNumber(invoice.netAvailable);
      });

      expenses.forEach((expense) => {
        const key = formatMonthKey(expense.date);
        const row = ensureBucket(key);
        row.expenses += safeNumber(expense.amount);
        row.net -= safeNumber(expense.amount);
      });

      return [...bucket.values()]
        .sort((a, b) => String(a.monthKey).localeCompare(String(b.monthKey)))
        .slice(-6);
    }, [invoiceAllocations, expenses]);

    const clientRevenueRows = useMemo(() => {
      const grouped = new Map();
      invoiceAllocations.forEach((invoice) => {
        const key = getClientName(invoice.clientId) || "Unknown client";
        grouped.set(key, (grouped.get(key) || 0) + safeNumber(invoice.gross));
      });
      return [...grouped.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    }, [invoiceAllocations]);

    const expenseCategoryRows = useMemo(() => {
      const grouped = new Map();
      expenses.forEach((expense) => {
        const key = expense.category || expense.expenseType || "Other";
        grouped.set(key, (grouped.get(key) || 0) + safeNumber(expense.amount));
      });
      return [...grouped.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    }, [expenses]);

    const invoiceStatusRows = useMemo(() => {
      const grouped = new Map();
      invoices.forEach((invoice) => {
        const key = invoice.status || "Draft";
        grouped.set(key, (grouped.get(key) || 0) + 1);
      });
      return [...grouped.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    }, [invoices]);

    const recentActivityRows = useMemo(() => {
      const invoiceRows = invoices.map((invoice) => ({
        type: "Invoice",
        sortDate: invoice.paidAt || invoice.invoiceDate || "",
        date: formatDateAU(invoice.paidAt || invoice.invoiceDate),
        label: `${invoice.invoiceNumber || "Invoice"} . ${getClientName(invoice.clientId)}`,
        caption: `${invoice.status || "Draft"} invoice`,
        value: currency(invoice.total),
      }));

      const expenseRows = expenses.map((expense) => ({
        type: "Expense",
        sortDate: expense.date || "",
        date: formatDateAU(expense.date),
        label: expense.supplier || expense.description || "Expense",
        caption: expense.category || expense.expenseType || "Expense",
        value: currency(expense.amount),
      }));

      return [...invoiceRows, ...expenseRows]
        .sort((a, b) => String(b.sortDate).localeCompare(String(a.sortDate)))
        .slice(0, 6);
    }, [invoices, expenses]);

    const dashboardInsights = useMemo(() => {
      const collectionRate = totals.totalIncome > 0 ? (totals.paidIncome / totals.totalIncome) * 100 : 0;
      const averagePaidInvoice = invoiceAllocations.length ? totals.paidIncome / invoiceAllocations.length : 0;
      const expenseCoverage = totals.totalExpenses > 0 ? totals.safeToSpend / totals.totalExpenses : 0;
      return {
        collectionRate,
        averagePaidInvoice,
        expenseCoverage,
        paidInvoiceCount: invoiceAllocations.length,
      };
    }, [totals, invoiceAllocations]);


    const financialInsights = useMemo(() => {
      const topClientValue = clientRevenueRows[0]?.value || 0;
      const topThreeClientValue = clientRevenueRows.slice(0, 3).reduce((sum, row) => sum + safeNumber(row.value), 0);
      const topClientShare = totals.paidIncome > 0 ? (topClientValue / totals.paidIncome) * 100 : 0;
      const topThreeClientShare = totals.paidIncome > 0 ? (topThreeClientValue / totals.paidIncome) * 100 : 0;
      const averageInvoiceValue = invoices.length ? totals.totalIncome / invoices.length : 0;
      const averageMonthlyRevenue = monthlyFinance.length
        ? monthlyFinance.reduce((sum, month) => sum + safeNumber(month.revenue), 0) / monthlyFinance.length
        : 0;
      const usableCashRatio = totals.paidIncome > 0 ? (totals.safeToSpend / totals.paidIncome) * 100 : 0;
      const expenseRatio = totals.paidIncome > 0 ? (totals.totalExpenses / totals.paidIncome) * 100 : 0;
      const gstRatio = totals.paidIncome > 0 ? (totals.gstPayable / totals.paidIncome) * 100 : 0;
      const taxRatio = totals.paidIncome > 0 ? (totals.estimatedTax / totals.paidIncome) * 100 : 0;
      const volatility = monthlyFinance.length > 1
        ? monthlyFinance.slice(1).map((month, index) => {
            const previous = monthlyFinance[index]?.revenue || 0;
            const change = previous > 0 ? ((month.revenue - previous) / previous) * 100 : 0;
            return { ...month, change };
          })
        : [];
      const averageVolatility = volatility.length
        ? volatility.reduce((sum, row) => sum + Math.abs(row.change), 0) / volatility.length
        : 0;
      const bestMonth = monthlyFinance.length
        ? monthlyFinance.reduce((best, month) => safeNumber(month.revenue) > safeNumber(best.revenue) ? month : best, monthlyFinance[0])
        : null;
      const worstMonth = monthlyFinance.length
        ? monthlyFinance.reduce((worst, month) => safeNumber(month.revenue) < safeNumber(worst.revenue) ? month : worst, monthlyFinance[0])
        : null;
      const latestMonth = monthlyFinance.length ? monthlyFinance[monthlyFinance.length - 1] : null;
      const previousMonth = monthlyFinance.length > 1 ? monthlyFinance[monthlyFinance.length - 2] : null;
      const revenueChangePct = previousMonth && safeNumber(previousMonth.revenue) > 0
        ? ((safeNumber(latestMonth?.revenue) - safeNumber(previousMonth.revenue)) / safeNumber(previousMonth.revenue)) * 100
        : 0;
      const expenseByMonth = expenses.reduce((acc, expense) => {
        const key = String(expense?.date || '').slice(0, 7);
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + safeNumber(expense?.amount);
        return acc;
      }, {});
      const sortedExpenseMonths = Object.entries(expenseByMonth).sort((a, b) => a[0].localeCompare(b[0]));
      const latestExpenseValue = sortedExpenseMonths.length ? safeNumber(sortedExpenseMonths[sortedExpenseMonths.length - 1][1]) : 0;
      const previousExpenseValue = sortedExpenseMonths.length > 1 ? safeNumber(sortedExpenseMonths[sortedExpenseMonths.length - 2][1]) : 0;
      const expenseChangePct = previousExpenseValue > 0 ? ((latestExpenseValue - previousExpenseValue) / previousExpenseValue) * 100 : 0;
      const largestExpenseCategory = expenseCategoryRows[0] || null;
      const healthScore = Math.max(
        0,
        Math.min(
          100,
          100 - Math.min(topClientShare, 100) * 0.35 - Math.min(expenseRatio, 100) * 0.25 - Math.min(averageVolatility, 100) * 0.2 + Math.max(usableCashRatio, 0) * 0.2,
        ),
      );
      let healthLabel = "Needs attention";
      if (healthScore >= 75) healthLabel = "Healthy";
      else if (healthScore >= 55) healthLabel = "Watch list";
      const alerts = [];
      if (topThreeClientShare >= 60) alerts.push(`Client concentration is elevated: ${topThreeClientShare.toFixed(1)}% of paid revenue comes from your top 3 clients.`);
      if (revenueChangePct <= -10) alerts.push(`Revenue is down ${Math.abs(revenueChangePct).toFixed(1)}% versus the prior month.`);
      if (expenseChangePct >= 10) alerts.push(`Expenses are up ${expenseChangePct.toFixed(1)}% versus the prior month.`);
      if (usableCashRatio <= 35 && totals.paidIncome > 0) alerts.push(`Only ${Math.max(usableCashRatio, 0).toFixed(1)}% of paid income is currently safe to spend.`);
      if (!alerts.length) alerts.push("No immediate financial alerts. The current trend looks relatively stable.");
      return {
        topClientShare,
        topThreeClientShare,
        averageInvoiceValue,
        averageMonthlyRevenue,
        usableCashRatio,
        expenseRatio,
        gstRatio,
        taxRatio,
        averageVolatility,
        bestMonth,
        worstMonth,
        revenueChangePct,
        expenseChangePct,
        largestExpenseCategory,
        healthScore,
        healthLabel,
        alerts,
      };
    }, [clientRevenueRows, totals, invoices, monthlyFinance, expenses, expenseCategoryRows]);


    if (!authReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colours.bg,
          display: "grid",
          placeItems: "center",
          color: colours.text,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        Loading portal...
      </div>
    );
    }

    if (!authUser) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        authPortalType={authPortalType}
        authForm={authForm}
        setAuthForm={setAuthForm}
        authLoading={authLoading}
        handleAuthSubmit={handleAuthSubmit}
        handlePasswordReset={handlePasswordReset}
        colours={colours}
        cardStyle={cardStyle}
        inputStyle={inputStyle}
        labelStyle={labelStyle}
        buttonPrimary={buttonPrimary}
        buttonSecondary={buttonSecondary}
      />
    );
    }

    if (isResettingPassword) {
      return (
        <div style={{ minHeight: "100vh", background: colours.bg, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ ...cardStyle, width: "100%", maxWidth: 440, padding: 32 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: colours.text, marginBottom: 8 }}>Set New Password</div>
            <div style={{ fontSize: 14, color: colours.muted, marginBottom: 24 }}>Enter your new password below.</div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>New Password</label>
                <input type="password" style={inputStyle} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <input type="password" style={inputStyle} value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} placeholder="Repeat new password" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button style={buttonPrimary} onClick={async () => {
                if (!newPassword || newPassword.length < 8) { toast.warning("Password must be at least 8 characters"); return; }
                if (newPassword !== newPasswordConfirm) { toast.warning("Passwords do not match"); return; }
                try {
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) throw error;
                  toast.success("Password updated! Signing you in...");
                  setIsResettingPassword(false);
                  setNewPassword("");
                  setNewPasswordConfirm("");
                } catch (err) { toast.error(err.message || "Failed to update password"); }
              }}>Update Password</button>
            </div>
          </div>
        </div>
      );
    }

    if (isSupabaseRestoring || !hasLoadedUserProfile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colours.bg,
          display: "grid",
          placeItems: "center",
          color: colours.text,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        Loading your profile...
      </div>
    );
    }

    const shouldShowSetupWizard =
      Boolean(authUser?.user_metadata?.needs_setup || authUser?.user_metadata?.needsSetup) && !setupComplete;

    if (shouldShowSetupWizard) {
    return (
      <SetupWizardPage
        wizardForm={wizardForm}
        setWizardForm={setWizardForm}
        wizardSaving={wizardSaving}
        completeSetupWizard={completeSetupWizard}
        authUser={authUser}
        colours={colours}
        cardStyle={cardStyle}
        inputStyle={inputStyle}
        labelStyle={labelStyle}
        buttonPrimary={buttonPrimary}
        buttonSecondary={buttonSecondary}
      />
    );
    }

    // Subcontractor limited portal
    if (isSubcontractor && !isAdmin) {
      return (
        <>
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          {confirmModal}
          <SubcontractorPortal authUser={authUser} onSignOut={handleSignOut} />
        </>
      );
    }

    if (profile?.accountStatus === "closed") {
    return (
      <div style={{ minHeight: "100vh", background: colours.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>[locked]</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: colours.text, marginBottom: 10 }}>Account closed</div>
          <div style={{ fontSize: 15, color: colours.muted, lineHeight: 1.7, marginBottom: 28 }}>
            Your account has been closed. Your data is safe and your account can be reactivated at any time.
          </div>
          <a href={`mailto:${profile?.email || ""}`} style={{ display: "inline-block", background: colours.purple, color: "#fff", borderRadius: 12, padding: "12px 28px", fontWeight: 700, textDecoration: "none", fontSize: 15, marginBottom: 16 }}>
            Contact us to reactivate
          </a>
          <div style={{ marginTop: 16 }}>
            <button onClick={handleSignOut} style={{ background: "none", border: "none", color: colours.muted, cursor: "pointer", fontSize: 13 }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
    }

    const subscriptionAccess = getSubscriptionAccess(profile);
    if (!subscriptionAccess.allowed) {
      return <PaywallScreen profile={profile} supabase={supabase} />;
    }

    return (
    <TerminologyProvider businessType={profile.businessType} customOverrides={profile.terminologyOverrides}>
    <div
      style={{
        minHeight: "100vh",
        background: colours.bg,
        color: colours.text,
        fontFamily:
          '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        body { font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .sas-layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); min-height: 100vh; }
        .sas-sidebar {
          background: linear-gradient(180deg, #FFFFFF 0%, #FAFBFE 100%);
          border-right: 1px solid ${colours.border};
          padding: 24px 16px;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          z-index: 100;
          display: flex;
          flex-direction: column;
        }
        .sas-sidebar::-webkit-scrollbar { width: 4px; }
        .sas-sidebar::-webkit-scrollbar-thumb { background: ${colours.border}; border-radius: 4px; }
        .sas-sidebar button { transition: all 0.18s ease; }
        .sas-sidebar button:hover { transform: none; }
        .sas-overlay { display: none; }
        .sas-hamburger { display: none; }
        .sas-main {
          padding: 32px;
          overflow-x: auto;
          background:
            radial-gradient(circle at top right, rgba(106, 27, 154, 0.04), transparent 30%),
            linear-gradient(180deg, #F8FAFC 0%, #F4F7FB 100%);
        }
        .sas-page-wrap { width: 100%; overflow-x: auto; }
        .sas-page-inner { min-width: 0; }
        .sas-page-panel {
          display: grid;
          gap: 24px;
          width: 100%;
        }
        .sas-inline-page-card {
          background: #FFFFFF;
          border: 1px solid ${colours.border};
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
          padding: 24px;
        }
        .sas-inline-page-card h1,
        .sas-inline-page-card h2,
        .sas-inline-page-card h3 { overflow-wrap: anywhere; font-family: "Playfair Display", serif; }
        .sas-section-card,
        .sas-summary-box,
        .sas-metric-card,
        .sas-action-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .sas-section-card:hover,
        .sas-summary-box:hover,
        .sas-metric-card:hover,
        .sas-action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
        }
        .sas-section-card { overflow: hidden; }
        .sas-summary-box { min-height: 124px; }
        @keyframes sas-realtime-pulse {
          0% { box-shadow: 0 0 0 0 rgba(106,27,154,0.3); }
          70% { box-shadow: 0 0 0 8px rgba(106,27,154,0); }
          100% { box-shadow: 0 0 0 0 rgba(106,27,154,0); }
        }
        .sas-realtime-pulse { animation: sas-realtime-pulse 1s ease-out; }
        .sas-dashboard-hero .sas-hero-title { word-break: break-word; overflow-wrap: anywhere; font-family: "Playfair Display", serif; }
        .sas-dashboard-hero .sas-hero-subtitle { word-break: break-word; font-family: "DM Sans", sans-serif; }
        .sas-dashboard-hero .sas-insight-chip { backdrop-filter: blur(6px); }
        .sas-table-wrap {
          border: 1px solid ${colours.border};
          border-radius: 16px;
          background: #FFFFFF;
          overflow: hidden;
        }
        .sas-data-table th {
          background: #F8FAFC;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-family: "DM Sans", sans-serif;
        }
        .sas-data-table th,
        .sas-data-table td {
          padding: 14px 16px !important;
          border-bottom: 1px solid ${colours.border};
          vertical-align: top;
        }
        .sas-data-table tbody tr { transition: background 0.15s ease; }
        .sas-data-table tbody tr:hover td { background: #FAFBFE; }
        .sas-data-table tbody tr:nth-child(even) td { background: #FCFCFE; }
        .sas-data-table tbody tr:nth-child(even):hover td { background: #F5F6FA; }
        input, select, textarea, button { font-family: inherit; }
        input, select, textarea {
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: ${colours.purple} !important;
          box-shadow: 0 0 0 3px rgba(106, 27, 154, 0.10);
        }
        button { transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease; }
        button:hover { box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06); }
        button:active { transform: translateY(1px); }
        .sas-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          border: none;
          border-radius: 10px;
          padding: 10px 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          position: relative;
          width: 100%;
        }
        .sas-nav-item.active {
          background: ${colours.lightPurple};
          color: ${colours.purple};
          font-weight: 700;
        }
        .sas-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: ${colours.purple};
        }
        .sas-nav-item:not(.active) {
          background: transparent;
          color: ${colours.text};
        }
        .sas-nav-item:not(.active):hover {
          background: #F5F6FA;
        }
        .sas-nav-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          opacity: 0.7;
        }
        .sas-nav-item.active .sas-nav-icon { opacity: 1; }
        @media (max-width: 1080px) {
          .sas-layout { grid-template-columns: 240px minmax(0, 1fr); }
          .sas-main { padding: 24px; }
        }
        @media (max-width: 768px) {
          .sas-layout { grid-template-columns: 1fr; }
          .sas-sidebar {
            position: fixed;
            top: 0;
            left: -280px;
            width: 260px;
            height: 100vh;
            overflow-y: auto;
            transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 200;
            box-shadow: 10px 0 30px rgba(15, 23, 42, 0.18);
          }
          .sas-sidebar.open { left: 0; }
          .sas-overlay { display: block; position: fixed; inset: 0; background: rgba(15,23,42,0.45); z-index: 199; }
          .sas-hamburger {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(255,255,255,0.97);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid ${colours.border};
            padding: 14px 16px;
            position: sticky;
            top: 0;
            z-index: 100;
          }
          .sas-hamburger-btn { background: none; border: none; cursor: pointer; padding: 4px; display: flex; flex-direction: column; gap: 5px; box-shadow: none !important; }
          .sas-hamburger-btn span { display: block; width: 22px; height: 2px; background: ${colours.purple}; border-radius: 2px; }
          .sas-main { padding: 16px; }
          .sas-page-wrap { overflow-x: auto; }
          .sas-page-inner { max-width: 100% !important; }
          .sas-inline-page-card { padding: 16px; border-radius: 16px; }
          .sas-dashboard-hero.sas-hero-grid { grid-template-columns: 1fr !important; gap: 16px !important; padding: 20px !important; border-radius: 20px !important; }
          .sas-dashboard-hero .sas-hero-title { font-size: 26px !important; line-height: 1.15 !important; }
          .sas-dashboard-hero .sas-hero-subtitle { font-size: 14px !important; line-height: 1.55 !important; }
          .sas-dashboard-hero .sas-hero-focus-card { padding: 18px !important; min-height: auto !important; }
          .sas-dashboard-hero .sas-hero-focus-value { font-size: 24px !important; line-height: 1.1 !important; word-break: break-word; }
          .sas-data-table { min-width: 680px !important; }
          .sas-summary-box, .sas-metric-card, .sas-action-card { min-height: auto !important; }
        }
        @media (max-width: 480px) {
          .sas-main { padding: 12px; }
          .sas-inline-page-card { padding: 14px; }
          .sas-dashboard-hero .sas-hero-title { font-size: 22px !important; }
          .sas-section-card, .sas-summary-box, .sas-metric-card, .sas-action-card { border-radius: 16px !important; }
        }
      `}</style>

      <div className="sas-hamburger">
        <button className="sas-hamburger-btn" onClick={() => setSidebarOpen(true)}>
          <span /><span /><span />
        </button>
        <span style={{ fontSize: 16, fontWeight: 800, color: colours.purple, fontFamily: '"Playfair Display", serif' }}>{profile.businessName || "My Portal"}</span>
      </div>

      {sidebarOpen && <div className="sas-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Offline / Online banner */}
      {isOffline && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, background: "#991B1B", color: "#fff", padding: "10px 20px", textAlign: "center", fontSize: 14, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
          ⚠️ You are offline. Some features may be unavailable.
        </div>
      )}
      {showBackOnline && !isOffline && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, background: "#065F46", color: "#fff", padding: "10px 20px", textAlign: "center", fontSize: 14, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", transition: "opacity 0.5s ease" }}>
          ✅ Back online — data synced
        </div>
      )}

      <div className="sas-layout" style={{ marginTop: isOffline || showBackOnline ? 40 : 0, transition: "margin-top 0.3s ease" }}>
        <aside className={`sas-sidebar${sidebarOpen ? " open" : ""}`}>
          <div style={{ fontSize: 20, fontWeight: 800, color: colours.purple, marginBottom: 6, fontFamily: '"Playfair Display", serif' }}>
            {profile.businessName || "My Portal"}
          </div>

          <div style={{ fontSize: 12, color: colours.muted, marginBottom: isAdmin ? 8 : 24, paddingBottom: isAdmin ? 8 : 16, borderBottom: isAdmin ? "none" : `1px solid ${colours.border}` }}>
            {authUser.email || "user"}
          </div>

          {/* Admin client switcher */}
          {isAdmin && allPortalUsers.length > 0 && (
            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colours.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", color: colours.muted, marginBottom: 6 }}>
                👤 Viewing As
              </div>
              <select
                value={viewingAsUserId || authUser.id}
                onChange={(e) => switchToUser(e.target.value)}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8,
                  border: `1px solid ${viewingAsUserId ? colours.purple : colours.border}`,
                  fontSize: 12, fontWeight: 600,
                  background: viewingAsUserId ? colours.lightPurple : colours.white,
                  color: colours.text, cursor: "pointer",
                }}
              >
                <option value={authUser.id}>🔑 My Portal</option>
                {allPortalUsers
                  .filter(u => u.userId !== authUser.id)
                  .sort((a, b) => (a.businessName || "").localeCompare(b.businessName || ""))
                  .map(u => (
                    <option key={u.userId} value={u.userId}>
                      {u.businessName || u.email || "Unknown"}
                    </option>
                  ))
                }
              </select>
              {viewingAsUserId && (
                <div style={{ fontSize: 11, color: colours.purple, fontWeight: 700, marginTop: 4, textAlign: "center" }}>
                  ⚠ Viewing client data
                </div>
              )}
            </div>
          )}

          <div style={{ display: "grid", gap: 16, flex: 1 }}>
            {getNavSections(profile.businessType).map((section) => (
              <div key={section.title} style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", color: colours.muted, padding: "4px 12px 6px", opacity: 0.7 }}>
                  {section.title}
                </div>
                <div style={{ display: "grid", gap: 2 }}>
                  {section.items.map((item) => {
                    const isActive = activePage === item;
                    const userTier = getUserTier(profile);
                    const pageAccess = isPageAllowed(item, userTier);
                    const isLocked = !pageAccess.allowed;
                    const iconMap = {
                      "dashboard": "⬡", "financial insights": "📊", "invoices": "📄", "quotes": "📋",
                      "clients": "👥", "services": "⚙", "expenses": "💳", "bills / payables": "🧾",
                      "income sources": "💰", "documents": "📁", "properties": "🏠", "scheduling": "📅", "bank reconciliation": "🏦",
                      "bas report": "📑", "ato tax form": "🏛", "tax estimator": "🧮", "settings": "⚙",
                    };
                    return (
                      <button
                        key={item}
                        className={`sas-nav-item${isActive ? " active" : ""}`}
                        onClick={() => { setActivePage(item); setSidebarOpen(false); }}
                        style={isLocked ? { opacity: 0.5 } : {}}
                      >
                        <span className="sas-nav-icon" style={{ fontSize: 15 }}>{iconMap[item] || "•"}</span>
                        <span style={{ flex: 1 }}>{getNavLabels(profile.businessType)[item] || (item.charAt(0).toUpperCase() + item.slice(1))}</span>
                        {isLocked && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 9, fontWeight: 800, color: "#fff",
                            background: colours.purple, borderRadius: 8,
                            padding: "2px 7px", letterSpacing: 0.3,
                          }}>
                            🔒 Upgrade
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${colours.border}`, paddingTop: 16, marginTop: 16 }}>
            <button
              onClick={handleSignOut}
              style={{ ...buttonSecondary, width: "100%", fontSize: 13 }}
            >
              Log out
            </button>
            <div style={{ fontSize: 10, color: colours.muted, textAlign: "center", marginTop: 10, opacity: 0.6 }}>
              Mustered
            </div>
          </div>
        </aside>

        <main className="sas-main">
          <div className="sas-page-wrap">
            <div className="sas-page-inner sas-page-panel" style={{ maxWidth: 1480, margin: "0 auto" }}>
            {(() => {
              const activeSync = realtimeStatusByKey[activePage];
              const syncLabel = isOffline
                ? "Offline"
                : isSupabaseRestoring
                  ? "Syncing"
                  : realtimePulse === activePage
                    ? "Live update received"
                    : activeSync?.updatedAt
                      ? `Last synced ${new Date(activeSync.updatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`
                      : "Live sync ready";
              const syncTone = isOffline
                ? { bg: "#FEF2F2", border: "#FECACA", color: "#991B1B" }
                : realtimePulse === activePage
                  ? { bg: "#ECFDF5", border: "#A7F3D0", color: "#065F46" }
                  : { bg: "#F8FAFC", border: colours.border, color: colours.muted };
              return (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, border: `1px solid ${syncTone.border}`, background: syncTone.bg, color: syncTone.color, fontSize: 12, fontWeight: 700 }}>
                    <span>{realtimePulse === activePage ? "●" : "○"}</span>
                    <span>{syncLabel}</span>
                  </div>
                </div>
              );
            })()}
            {(() => {
              const userTier = getUserTier(profile);
              const pageAccess = isPageAllowed(activePage, userTier);
              if (!pageAccess.allowed) {
                const featureIconMap = {
                  "financial insights": "📊", "services": "⚙", "bills / payables": "🧾",
                  "income sources": "💰", "documents": "📁", "properties": "🏠",
                  "scheduling": "📅", "bank reconciliation": "🏦", "bas report": "📑",
                  "ato tax form": "🏛", "tax estimator": "🧮", "assets": "📦",
                  "jobs report": "📋",
                };
                return (
                  <UpgradePrompt
                    featureName={getNavLabels(profile.businessType)[activePage] || activePage}
                    featureIcon={featureIconMap[activePage] || "🔒"}
                    currentTier={userTier}
                    onUpgrade={() => { setActivePage("settings"); setActiveSettingsTab("Plan & Billing"); }}
                    onViewPlans={() => { setActivePage("settings"); setActiveSettingsTab("Plan & Billing"); }}
                    colours={colours}
                  />
                );
              }
              return null;
            })()}
            {isPageAllowed(activePage, getUserTier(profile)).allowed && <>
            {activePage === "dashboard" && <DashboardPage
              profile={profile} clients={clients} invoices={invoices} quotes={quotes}
              expenses={expenses} documents={documents} services={services}
              totals={totals} invoiceAllocations={invoiceAllocations}
              monthlyFinance={monthlyFinance} clientRevenueRows={clientRevenueRows}
              expenseCategoryRows={expenseCategoryRows} invoiceStatusRows={invoiceStatusRows}
              recentActivityRows={recentActivityRows} dashboardInsights={dashboardInsights}
              financialInsights={financialInsights}
              setActivePage={setActivePage} setActiveSettingsTab={setActiveSettingsTab}
              cardStyle={cardStyle} colours={colours} currency={currency}
              formatDateAU={formatDateAU} safeNumber={safeNumber}
              DEFAULT_MONTHLY_SUBSCRIPTION={DEFAULT_MONTHLY_SUBSCRIPTION}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              ActionHubCard={ActionHubCard} TrendBarsCard={TrendBarsCard}
              WaterfallCard={WaterfallCard} ActivityListCard={ActivityListCard}
              SectionCard={SectionCard} DataTable={DataTable}
              exportToATOForm={exportToATOForm}
              restorePortalStateFromSupabase={restorePortalStateFromSupabase}
              saveAllCurrentStateToSupabase={saveAllCurrentStateToSupabase}
               supabaseSyncStatus={supabaseSyncStatus} getClientName={getClientName}
               properties={properties} jobs={jobs}
            />}
            {activePage === "financial insights" && <FinancialInsightsPage
              profile={profile} totals={totals} invoiceAllocations={invoiceAllocations}
              monthlyFinance={monthlyFinance} clientRevenueRows={clientRevenueRows}
              expenseCategoryRows={expenseCategoryRows} financialInsights={financialInsights}
              setActivePage={setActivePage} cardStyle={cardStyle} colours={colours}
              currency={currency} formatDateAU={formatDateAU} safeNumber={safeNumber}
              todayLocal={todayLocal}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              TrendBarsCard={TrendBarsCard} WaterfallCard={WaterfallCard}
              SectionCard={SectionCard} ActionHubCard={ActionHubCard} DataTable={DataTable}
            />}
            {activePage === "invoices" && <InvoicesPage
              profile={profile} clients={clients} invoices={invoices} services={services} jobs={jobs}
              invoiceForm={invoiceForm} setInvoiceForm={setInvoiceForm}
              invoiceWizardStep={invoiceWizardStep} setInvoiceWizardStep={setInvoiceWizardStep}
              invoiceEditorOpen={invoiceEditorOpen} invoiceEditorForm={invoiceEditorForm}
              setInvoiceEditorForm={setInvoiceEditorForm}
              savingInvoice={savingInvoice} savingInvoiceEdits={savingInvoiceEdits}
              invClientSearch={invClientSearch} setInvClientSearch={setInvClientSearch}
              showARCreditNoteModal={showARCreditNoteModal} setShowARCreditNoteModal={setShowARCreditNoteModal}
              creditNoteSource={creditNoteSource} setCreditNoteSource={setCreditNoteSource}
              creditNoteForm={creditNoteForm} setCreditNoteForm={setCreditNoteForm}
              setActivePage={setActivePage} confirm={confirm}
              cardStyle={cardStyle} colours={colours} currency={currency}
              formatDateAU={formatDateAU} safeNumber={safeNumber} todayLocal={todayLocal}
              addDays={addDays} formatCurrencyByCode={formatCurrencyByCode}
              getClientCurrencyCode={getClientCurrencyCode}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle} GST_TYPE_OPTIONS={GST_TYPE_OPTIONS}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              saveInvoice={saveInvoice} saveInvoiceEdits={saveInvoiceEdits}
              openInvoiceEditor={openInvoiceEditor} closeInvoiceEditor={closeInvoiceEditor}
              deleteInvoice={deleteInvoice} markInvoicePaid={markInvoicePaid}
              openSavedInvoicePreview={openSavedInvoicePreview} openInvoicePreview={openInvoicePreview}
              saveARCreditNote={saveARCreditNote}
              createStripeCheckoutForInvoice={createStripeCheckoutForInvoice}
              payInvoiceWithStripe={payInvoiceWithStripe}
              getClientName={getClientName} getClientById={getClientById}
              clientIsGstExempt={clientIsGstExempt} gstAppliesToClient={gstAppliesToClient}
              calculateFormGst={calculateFormGst} computeLineItemTotals={computeLineItemTotals}
              getDocumentBusinessName={getDocumentBusinessName} getDocumentAddress={getDocumentAddress}
              invoiceAllocations={invoiceAllocations} totals={totals}
              sendInvoiceFromPreview={sendInvoiceFromPreview}
              setClientModalForm={setClientModalForm} setEditingClientId={setEditingClientId}
              setShowClientModal={setShowClientModal}
              setImportType={setImportType} setImportRows={setImportRows}
              setImportError={setImportError} setShowImportModal={setShowImportModal}
              payInvoiceWithPayPal={payInvoiceWithPayPal}
            />}
            {activePage === "quotes" && <QuotesPage
              profile={profile} clients={clients} invoices={invoices}
              quotes={quotes} services={services}
              quoteForm={quoteForm} setQuoteForm={setQuoteForm}
              quoteWizardStep={quoteWizardStep} setQuoteWizardStep={setQuoteWizardStep}
              quoteEditorOpen={quoteEditorOpen} quoteEditorForm={quoteEditorForm}
              setQuoteEditorForm={setQuoteEditorForm}
              savingQuote={savingQuote} savingQuoteEdits={savingQuoteEdits}
              quoteClientSearch={quoteClientSearch} setQuoteClientSearch={setQuoteClientSearch}
              setActivePage={setActivePage} confirm={confirm}
              cardStyle={cardStyle} colours={colours} currency={currency}
              formatDateAU={formatDateAU} safeNumber={safeNumber} todayLocal={todayLocal}
              addDays={addDays} formatCurrencyByCode={formatCurrencyByCode}
              getClientCurrencyCode={getClientCurrencyCode}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle} GST_TYPE_OPTIONS={GST_TYPE_OPTIONS}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              saveQuote={saveQuote} saveQuoteEdits={saveQuoteEdits}
              openQuoteEditor={openQuoteEditor} closeQuoteEditor={closeQuoteEditor}
              deleteQuote={deleteQuote} openSavedQuotePreview={openSavedQuotePreview}
              getClientName={getClientName} getClientById={getClientById}
              sendQuoteFromPreview={sendQuoteFromPreview}
              clientIsGstExempt={clientIsGstExempt} gstAppliesToClient={gstAppliesToClient}
              calculateFormGst={calculateFormGst} computeLineItemTotals={computeLineItemTotals}
              setClientModalForm={setClientModalForm} setEditingClientId={setEditingClientId}
              setShowClientModal={setShowClientModal}
              setImportType={setImportType} setImportRows={setImportRows}
              setImportError={setImportError} setShowImportModal={setShowImportModal}
              convertQuoteToInvoice={convertQuoteToInvoice} convertQuoteToJob={convertQuoteToJob} openQuotePreview={openQuotePreview}
            />}
            {activePage === "clients" && <ClientsPage
              profile={profile} clients={clients} invoices={invoices}
              setActivePage={setActivePage} confirm={confirm}
              cardStyle={cardStyle} colours={colours} currency={currency}
              safeNumber={safeNumber} buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              showClientModal={showClientModal} setShowClientModal={setShowClientModal}
              showImportModal={showImportModal} setShowImportModal={setShowImportModal}
              editingClientId={editingClientId} setEditingClientId={setEditingClientId}
              clientModalForm={clientModalForm} setClientModalForm={setClientModalForm}
              clientForm={clientForm} setClientForm={setClientForm}
              importType={importType} setImportType={setImportType}
              importRows={importRows} setImportRows={setImportRows}
              importError={importError} setImportError={setImportError}
              invClientSearch={invClientSearch} setInvClientSearch={setInvClientSearch}
              saveClientFromModal={saveClientFromModal} deleteClient={deleteClient}
              confirmImport={confirmImport} downloadTemplate={downloadTemplate}
              parseImportCSV={parseImportCSV} openClientEditor={openClientEditor}
              clientEditorOpen={clientEditorOpen} clientEditorForm={clientEditorForm}
              setClientEditorForm={setClientEditorForm} closeClientEditor={closeClientEditor}
              saveClientEdits={saveClientEdits} saveClient={saveClient} todayLocal={todayLocal}
               blankClient={blankClient} jobs={jobs}
               quotes={quotes} expenses={expenses} formatDateAU={formatDateAU}
            />}
            {activePage === "services" && <ServicesPage
              services={services} serviceSearch={serviceSearch} setServiceSearch={setServiceSearch}
              showServiceModal={showServiceModal} setShowServiceModal={setShowServiceModal}
              editingServiceId={editingServiceId}
              serviceForm={serviceForm} setServiceForm={setServiceForm} savingService={savingService}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              safeNumber={safeNumber} currency={currency}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              GST_TYPE_OPTIONS={GST_TYPE_OPTIONS}
              openNewServiceModal={openNewServiceModal} openEditServiceModal={openEditServiceModal}
              saveService={saveService} deleteService={deleteService}
              handleServiceFormChange={handleServiceFormChange}
            />}
            {activePage === "expenses" && <ExpensesPage
              expenses={expenses} expenseForm={expenseForm} setExpenseForm={setExpenseForm}
              savingExpense={savingExpense} receiptFile={receiptFile} setReceiptFile={setReceiptFile}
              expenseEditorOpen={expenseEditorOpen} expenseEditorForm={expenseEditorForm}
              setExpenseEditorForm={setExpenseEditorForm}
              expenseModalOpen={expenseModalOpen} setExpenseModalOpen={setExpenseModalOpen}
              expenseTypeStep={expenseTypeStep} setExpenseTypeStep={setExpenseTypeStep}
              expenseTypeSelection={expenseTypeSelection} setExpenseTypeSelection={setExpenseTypeSelection}
              expenseWorkType={expenseWorkType} setExpenseWorkType={setExpenseWorkType}
              expenseWorkTypes={expenseWorkTypes} setExpenseWorkTypes={setExpenseWorkTypes}
              expenseCategorySelection={expenseCategorySelection}
              setExpenseCategorySelection={setExpenseCategorySelection}
              searchExpenseCategory={searchExpenseCategory}
              setSearchExpenseCategory={setSearchExpenseCategory}
              confirm={confirm} setActivePage={setActivePage}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              currency={currency} formatDateAU={formatDateAU} safeNumber={safeNumber}
              todayLocal={todayLocal} expenseCategories={expenseCategories}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              ExpenseTypeModal={ExpenseTypeModal}
              saveExpense={saveExpense} deleteExpense={deleteExpense}
              openExpenseEditor={openExpenseEditor} closeExpenseEditor={closeExpenseEditor}
              saveExpenseEdits={saveExpenseEdits}
              resetExpenseModal={resetExpenseModal} nextExpenseModalStep={nextExpenseModalStep}
              totals={totals} uploadReceiptToSupabase={uploadReceiptToSupabase}
              jobs={jobs} clients={clients} getClientName={getClientName}
              setImportType={setImportType} setImportRows={setImportRows} setImportError={setImportError} setShowImportModal={setShowImportModal}
            />}
            {activePage === "assets" && <AssetsPage
              assets={assets} expenses={expenses}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              currency={currency} formatDateAU={formatDateAU} safeNumber={safeNumber}
              todayLocal={todayLocal}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              saveAsset={saveAsset} deleteAsset={deleteAsset} confirm={confirm}
              setImportType={setImportType} setImportRows={setImportRows} setImportError={setImportError} setShowImportModal={setShowImportModal}
            />}
            {activePage === "properties" && <PropertiesPage
              properties={properties} clients={clients}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              currency={currency} safeNumber={safeNumber}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              saveProperty={saveProperty} deleteProperty={deleteProperty} confirm={confirm}
               setActivePage={setActivePage} jobs={jobs}
            />}
            {activePage === "scheduling" && <SchedulingPage
              jobs={jobs} clients={clients} properties={properties}
              recurringReminders={recurringReminders}
              quotes={quotes} invoices={invoices}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              saveJob={saveJob} deleteJob={deleteJob} confirm={confirm}
              saveRecurringReminder={saveRecurringReminder}
              deleteRecurringReminder={deleteRecurringReminder}
              sendRecurringReminderNow={sendRecurringReminderNow}
               setActivePage={setActivePage} currency={currency}
               authUser={authUser} profile={profile}
               createInvoiceFromJob={createInvoiceFromJob}
            />}
            {activePage === "timesheets" && <TimesheetsPage
              jobs={jobs} clients={clients}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              currency={currency}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} EmptyState={EmptyState}
              saveJob={saveJob} saveProfileToSupabase={saveProfileToSupabase} profile={profile}
            />}
            {activePage === "jobs report" && <JobsReportPage
              jobs={jobs} invoices={invoices} quotes={quotes} clients={clients}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              currency={currency} formatDateAU={formatDateAU} safeNumber={safeNumber}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              setActivePage={setActivePage}
              onUpdateJob={saveJob}
            />}
            {activePage === "bills / payables" && <BillsPage
              profile={profile} expenses={expenses} suppliers={suppliers} clients={clients}
              expenseForm={expenseForm} setExpenseForm={setExpenseForm}
              billLineItems={billLineItems} setBillLineItems={setBillLineItems} blankBillLine={blankBillLine}
              billWizardStep={billWizardStep} setBillWizardStep={setBillWizardStep}
              savingBill={savingBill} receiptFile={receiptFile} setReceiptFile={setReceiptFile}
              showSupplierModal={showSupplierModal} setShowSupplierModal={setShowSupplierModal}
              supplierForm={supplierForm} setSupplierForm={setSupplierForm}
              editingSupplierId={editingSupplierId} setEditingSupplierId={setEditingSupplierId}
              showAPCreditNoteModal={showAPCreditNoteModal} setShowAPCreditNoteModal={setShowAPCreditNoteModal}
              creditNoteSource={creditNoteSource} setCreditNoteSource={setCreditNoteSource}
              creditNoteForm={creditNoteForm} setCreditNoteForm={setCreditNoteForm}
              setActivePage={setActivePage} confirm={confirm}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              currency={currency} formatDateAU={formatDateAU} safeNumber={safeNumber}
              todayLocal={todayLocal} addDaysEOM={addDaysEOM}
              expenseCategories={expenseCategories} GST_TYPE_OPTIONS={GST_TYPE_OPTIONS}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              saveExpense={saveExpense} deleteExpense={deleteExpense}
              markBillPaid={markBillPaid} markBillUnpaid={markBillUnpaid}
              sendExpenseDirect={sendExpenseDirect}
              saveSupplier={saveSupplier} deleteSupplier={deleteSupplier}
              saveAPCreditNote={saveAPCreditNote}
              getClientName={getClientName} totals={totals}
              saveBill={saveBill}
            />}
            {activePage === "income sources" && <IncomeSourcesPage
              incomeSources={incomeSources}
              showIncomeSourceModal={showIncomeSourceModal}
              setShowIncomeSourceModal={setShowIncomeSourceModal}
              incomeSourceForm={incomeSourceForm} setIncomeSourceForm={setIncomeSourceForm}
              savingIncomeSource={savingIncomeSource}
              incomeSourceEditorOpen={incomeSourceEditorOpen}
              incomeSourceEditorForm={incomeSourceEditorForm}
              setIncomeSourceEditorForm={setIncomeSourceEditorForm}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              currency={currency} safeNumber={safeNumber}
              incomeTypeOptions={incomeTypeOptions} incomeFrequencyOptions={incomeFrequencyOptions}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              MiniBarChart={MiniBarChart} IncomeSourceModal={IncomeSourceModal}
              saveIncomeSource={saveIncomeSource} deleteIncomeSource={deleteIncomeSource}
              setImportType={setImportType} setImportRows={setImportRows} setImportError={setImportError} setShowImportModal={setShowImportModal}
            />}
            {activePage === "documents" && <DocumentsPage
              documents={documents} documentFile={documentFile} setDocumentFile={setDocumentFile}
              documentEditorOpen={documentEditorOpen} documentEditorForm={documentEditorForm}
              setDocumentEditorForm={setDocumentEditorForm}
              savingDocumentEdits={savingDocumentEdits}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              formatDateAU={formatDateAU} safeNumber={safeNumber}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              MiniBarChart={MiniBarChart}
              uploadDocument={uploadDocument} deleteDocument={deleteDocument}
              openDocumentEditor={openDocumentEditor} closeDocumentEditor={closeDocumentEditor}
              saveDocumentEdits={saveDocumentEdits}
              openDocumentFile={openDocumentFile}
              jobs={jobs} setActivePage={setActivePage} getClientName={getClientName}
            />}
            {activePage === "bank reconciliation" && <BankReconciliationPage
              invoices={invoices} expenses={expenses} clients={clients}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              currency={currency} formatDateAU={formatDateAU} safeNumber={safeNumber}
              DashboardHero={DashboardHero} SectionCard={SectionCard}
              DataTable={DataTable} EmptyState={EmptyState}
            />}
            {activePage === "ato tax form" && (
              <div className="sas-inline-page-card">
                <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: colours.muted }}>Admin workspace</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: colours.text }}>ATO Tax Form</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: colours.muted }}>Review income, expenses and tax values in the same clean card layout used across the rest of your portal.</div>
                </div>
                <ATOTaxFormPage
                  profile={profile} invoices={invoices} expenses={expenses}
                  incomeSources={incomeSources} getClientById={getClientById}
                  assets={assets} subcontractorCosts={subcontractorCosts}
                />
              </div>
            )}
            {activePage === "bas report" && (
              <div className="sas-inline-page-card">
                <BASReportPage
                  profile={profile} invoices={invoices} expenses={expenses} assets={assets}
                  invoiceAllocations={invoiceAllocations} totals={totals}
                  basQuarter={basQuarter} setBasQuarter={setBasQuarter}
                  basNotes={basNotes} setBasNotes={setBasNotes}
                  colours={colours} cardStyle={cardStyle}
                  buttonPrimary={buttonPrimary} inputStyle={inputStyle} labelStyle={labelStyle}
                  currency={currency} formatDateAU={formatDateAU} safeNumber={safeNumber}
                  DashboardHero={DashboardHero} InsightChip={InsightChip}
                  MetricCard={MetricCard} SectionCard={SectionCard} SummaryBox={SummaryBox}
                  setActivePage={setActivePage}
                />
              </div>
            )}
            {activePage === "tax estimator" && (
              <div className="sas-inline-page-card">
                <TaxEstimatorPage
                  profile={profile} invoices={invoices} expenses={expenses}
                  assets={assets} incomeSources={incomeSources}
                  colours={colours} cardStyle={cardStyle}
                  buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
                  inputStyle={inputStyle} labelStyle={labelStyle}
                  currency={currency} formatDateAU={formatDateAU} safeNumber={safeNumber}
                  DashboardHero={DashboardHero} InsightChip={InsightChip}
                  MetricCard={MetricCard} SectionCard={SectionCard}
                  setActivePage={setActivePage}
                />
              </div>
            )}
            {activePage === "settings" && <SettingsPage
              profile={profile} setProfile={setProfile}
              activeSettingsTab={activeSettingsTab} setActiveSettingsTab={setActiveSettingsTab}
              savingClient={savingClient}
              newPassword={newPassword} setNewPassword={setNewPassword}
              newPasswordConfirm={newPasswordConfirm} setNewPasswordConfirm={setNewPasswordConfirm}
              isResettingPassword={isResettingPassword} setIsResettingPassword={setIsResettingPassword}
              colours={colours} cardStyle={cardStyle}
              buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
              inputStyle={inputStyle} labelStyle={labelStyle}
              currency={currency} safeNumber={safeNumber} isValidEmail={isValidEmail}
              DEFAULT_MONTHLY_SUBSCRIPTION={DEFAULT_MONTHLY_SUBSCRIPTION}
              settingsTabs={settingsTabs}
              DashboardHero={DashboardHero} InsightChip={InsightChip} MetricCard={MetricCard}
              SectionCard={SectionCard} DataTable={DataTable} EmptyState={EmptyState}
              saveProfileToSupabase={saveProfileToSupabase}
              handleCloseAccount={handleCloseAccount} handleSignOut={handleSignOut}
              toast={toast} confirm={confirm}
              authUserEmail={authUser?.email || ""}
              teamMembers={teamMembers} setTeamMembers={setTeamMembers}
              teamInvitations={teamInvitations} setTeamInvitations={setTeamInvitations}
              supabase={supabase} authUser={authUser}
            />}
            </>}
            </div>
          </div>
        </main>
      </div>

      <div style={{ position: "fixed", right: 20, bottom: isMobileViewport ? 20 : 24, zIndex: 1000 }}>
        {showQuickAddMenu && !isMobileViewport && (
          <div style={{ ...cardStyle, width: 220, padding: 10, marginBottom: 10, boxShadow: "0 16px 40px rgba(15,23,42,0.18)" }}>
            {[
              { label: "New Invoice", action: () => { setActivePage("invoices"); setShowQuickAddMenu(false); } },
              { label: "New Quote", action: () => { setActivePage("quotes"); setShowQuickAddMenu(false); } },
              { label: "New Expense", action: () => { setActivePage("expenses"); setShowQuickAddMenu(false); } },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", borderRadius: 10, padding: "12px 12px", fontWeight: 700, color: colours.text, cursor: "pointer" }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            if (isMobileViewport) {
              setShowMobileWizard(true);
            } else {
              setShowQuickAddMenu((prev) => !prev);
            }
          }}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "none",
            background: colours.purple,
            color: "#fff",
            fontSize: 30,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 14px 34px rgba(106,27,154,0.32)",
          }}
          aria-label="Quick add"
        >
          +
        </button>
      </div>

      {showMobileWizard && (
        <MobileWizard
          profile={profile}
          clients={clients}
          invoices={invoices}
          quotes={quotes}
          expenses={expenses}
          services={services}
          onSaveInvoice={(savedInvoice) => {
            setInvoices((prev) => [...prev, savedInvoice]);
          }}
          onSaveQuote={(savedQuote) => {
            setQuotes((prev) => [...prev, savedQuote]);
          }}
          onSaveExpense={(savedExpense) => {
            setExpenses((prev) => [...prev, savedExpense]);
          }}
          onEmailDocument={sendSavedDocumentEmail}
          upsertRecord={upsertRecordInDatabase}
          uploadReceipt={uploadReceiptToSupabase}
          toast={toast}
          onClose={() => setShowMobileWizard(false)}
        />
      )}

      <ExpenseTypeModal
        isOpen={expenseModalOpen}
        onClose={resetExpenseModal}
        expenseTypeStep={expenseTypeStep}
        setExpenseTypeStep={setExpenseTypeStep}
        expenseTypeSelection={expenseTypeSelection}
        setExpenseTypeSelection={setExpenseTypeSelection}
        expenseWorkType={expenseWorkType}
        setExpenseWorkType={setExpenseWorkType}
        expenseCategorySelection={expenseCategorySelection}
        setExpenseCategorySelection={setExpenseCategorySelection}
        expenseWorkTypes={expenseWorkTypes}
        setExpenseWorkTypes={setExpenseWorkTypes}
        searchExpenseCategory={searchExpenseCategory}
        setSearchExpenseCategory={setSearchExpenseCategory}
        expenseForm={expenseForm}
        setExpenseForm={setExpenseForm}
        receiptFile={receiptFile}
        setReceiptFile={setReceiptFile}
        onNext={nextExpenseModalStep}
        toast={toast}
      />

      <IncomeSourceModal
        isOpen={showIncomeSourceModal}
        onClose={() => setShowIncomeSourceModal(false)}
        incomeSourceForm={incomeSourceForm}
        setIncomeSourceForm={setIncomeSourceForm}
        onSave={saveIncomeSource}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {confirmModal}

      {/* -- Password Reset Sent Modal -- */}
      {showResetSentModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 36, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center", fontFamily: "sans-serif" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>[email]</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#14202B", marginBottom: 12 }}>Check your email</div>
            <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, marginBottom: 8 }}>
              A password reset link has been sent to
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#6A1B9A", marginBottom: 20 }}>
              {authForm.email}
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, marginBottom: 28 }}>
              Click the link in the email to set a new password. Check your spam folder if it doesn't arrive within a few minutes.
            </div>
            <button onClick={() => setShowResetSentModal(false)}
              style={{ background: "#6A1B9A", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" }}>
              Got it
            </button>
          </div>
        </div>
      )}

      {/* -- Import Modal -- */}
      {showImportModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99993, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 620, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "sans-serif", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: colours.text, marginBottom: 6 }}>
              Import {importType === "clients" ? "Clients" : importType === "suppliers" ? "Suppliers" : importType === "invoices" ? "Invoices" : importType === "income" ? "Income Sources" : importType === "assets" ? "Assets" : "Expenses / Bills"}
            </div>

            {/* Tab switcher */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {["clients", "suppliers", "invoices", "expenses", "income", "assets"].map((t) => (
                <button key={t} onClick={() => { setImportType(t); setImportRows([]); setImportError(""); }}
                  style={{ background: importType === t ? colours.purple : "#F1F5F9", color: importType === t ? "#fff" : colours.text, border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13, textTransform: "capitalize" }}>
                  {t === "expenses" ? "Bills / Expenses" : t === "income" ? "Income Sources" : t}
                </button>
              ))}
            </div>

            {/* How to section */}
            <div style={{ background: colours.lightPurple, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: colours.purple, marginBottom: 10 }}>📋 How to import</div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: colours.text, lineHeight: 2 }}>
                <li>Click <strong>Download Template</strong> below to get the CSV file</li>
                <li>Open it in Excel or Google Sheets</li>
                <li>Fill in your {importType === "expenses" ? "bills / expenses" : importType === "income" ? "income sources" : importType === "assets" ? "assets" : importType} — <strong>{importType === "invoices" ? "Invoice Number or Client Name" : importType === "expenses" ? "Supplier or Amount" : importType === "assets" ? "Asset Name" : "Name"} is required</strong></li>
                <li>Save as <strong>CSV</strong> (File → Save As → CSV)</li>
                <li>Click <strong>Choose File</strong> below and select your saved CSV</li>
                <li>Review the preview, then click <strong>Confirm Import</strong></li>
              </ol>
              {(importType === "clients" || importType === "suppliers" || importType === "income" || importType === "assets") && (
                <div style={{ marginTop: 12, fontSize: 12, color: colours.muted }}>
                  ℹ️ Duplicates are skipped automatically — existing {importType === "income" ? "income sources" : importType} with the same name won't be overwritten.
                </div>
              )}
              {importType === "invoices" && (
                <div style={{ marginTop: 12, fontSize: 12, color: colours.muted }}>
                  ℹ️ Client names are automatically matched to your existing clients. Unmatched clients will have a blank client field you can update later.
                </div>
              )}
            </div>

            {/* Column headings reference */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: colours.muted, textTransform: "uppercase", marginBottom: 8 }}>Columns in your CSV</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(importType === "clients"
                  ? ["Name *", "Business Name", "Email", "Phone", "Address", "ABN", "Currency", "Work Type"]
                  : importType === "suppliers"
                  ? ["Name *", "Contact Person", "Email", "Phone", "Address", "ABN", "Notes"]
                  : importType === "invoices"
                  ? ["Invoice Number *", "Client Name *", "Date", "Due Date", "Description", "Subtotal", "GST", "Total", "Status"]
                  : importType === "income"
                  ? ["Name *", "Income Type", "Before Tax", "Frequency", "Started After Jul 2025", "Has End Date"]
                  : ["Supplier *", "Date", "Due Date", "Category", "Description", "Amount *", "GST", "Is Paid"]
                ).map((col) => (
                  <span key={col} style={{ background: col.includes("*") ? colours.purple : "#F1F5F9", color: col.includes("*") ? "#fff" : colours.text, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
                    {col}
                  </span>
                ))}
              </div>
            </div>

            {/* Download template button */}
            <button onClick={() => downloadTemplate(importType)}
              style={{ ...buttonSecondary, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              ⬇️ Download {importType === "clients" ? "Clients" : importType === "suppliers" ? "Suppliers" : importType === "invoices" ? "Invoices" : importType === "income" ? "Income Sources" : importType === "assets" ? "Assets" : "Expenses"} Template
            </button>

            {/* File upload */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Upload your filled CSV</label>
              <input type="file" accept=".csv,.txt" style={{ ...inputStyle, padding: 8 }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const { rows, error } = parseImportCSV(ev.target.result, importType);
                    setImportRows(rows);
                    setImportError(error);
                  };
                  reader.readAsText(file);
                }} />
            </div>

            {/* Error */}
            {importError && (
              <div style={{ background: "#FEF2F2", color: "#991B1B", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{importError}</div>
            )}

            {/* Preview */}
            {importRows.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: colours.text, marginBottom: 8 }}>Preview — {importRows.length} row{importRows.length !== 1 ? "s" : ""} ready to import</div>
                <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${colours.border}`, borderRadius: 10 }}>
                  {importRows.slice(0, 10).map((row, i) => (
                    <div key={i} style={{ padding: "10px 14px", borderBottom: `1px solid ${colours.border}`, fontSize: 13 }}>
                      {(importType === "clients" || importType === "suppliers") && (
                        <>
                          <strong>{row.name}</strong>
                          {row.businessName && <span style={{ color: colours.muted }}> — {row.businessName}</span>}
                          {row.email && <span style={{ color: colours.muted }}> · {row.email}</span>}
                        </>
                      )}
                      {importType === "invoices" && (
                        <>
                          <strong>{row.invoiceNumber || "No #"}</strong>
                          <span style={{ color: colours.muted }}> — {row.clientName || "Unknown client"}</span>
                          <span style={{ color: colours.muted }}> · {row.invoiceDate || "No date"}</span>
                          <span style={{ fontWeight: 700, marginLeft: 8, color: colours.teal }}>${Number(row.total || 0).toFixed(2)}</span>
                          <span style={{ marginLeft: 8, fontSize: 11, color: colours.purple, fontWeight: 600 }}>{row.status}</span>
                        </>
                      )}
                      {importType === "expenses" && (
                        <>
                          <strong>{row.supplier || "Unknown"}</strong>
                          <span style={{ color: colours.muted }}> — {row.category || "Uncategorised"}</span>
                          <span style={{ color: colours.muted }}> · {row.date || "No date"}</span>
                          <span style={{ fontWeight: 700, marginLeft: 8, color: colours.purple }}>${Number(row.amount || 0).toFixed(2)}</span>
                          {row.isPaid && <span style={{ marginLeft: 8, fontSize: 11, color: colours.teal, fontWeight: 600 }}>Paid</span>}
                        </>
                      )}
                      {importType === "income" && (
                        <>
                          <strong>{row.name || "Unknown"}</strong>
                          <span style={{ color: colours.muted }}> — {row.incomeType || "Unspecified"}</span>
                          <span style={{ fontWeight: 700, marginLeft: 8, color: colours.teal }}>${Number(row.beforeTax || 0).toFixed(2)}</span>
                          <span style={{ marginLeft: 8, fontSize: 11, color: colours.muted }}>{row.frequency || ""}</span>
                        </>
                      )}
                      {importType === "assets" && (
                        <>
                          <strong>{row.name || "Unknown"}</strong>
                          <span style={{ color: colours.muted }}> — {row.assetType || "Other"}</span>
                          <span style={{ fontWeight: 700, marginLeft: 8, color: colours.teal }}>${Number(row.purchasePrice || 0).toFixed(2)}</span>
                          <span style={{ marginLeft: 8, fontSize: 11, color: colours.purple, fontWeight: 600 }}>{row.depreciationMethod || "prime_cost"}</span>
                        </>
                      )}
                    </div>
                  ))}
                  {importRows.length > 10 && <div style={{ padding: "8px 14px", fontSize: 12, color: colours.muted }}>...and {importRows.length - 10} more</div>}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowImportModal(false); setImportRows([]); setImportError(""); }}
                style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
              {importRows.length > 0 && (
                <button onClick={confirmImport}
                  style={{ background: colours.purple, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                  Confirm Import ({importRows.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -- Client Modal -- */}
      {showClientModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99994, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "sans-serif" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: colours.text, marginBottom: 20 }}>{editingClientId ? "Edit Client" : "Add New Client"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Client Name *</label>
                <input style={inputStyle} value={clientModalForm.name} onChange={(e) => setClientModalForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. John Smith" />
              </div>
              <div>
                <label style={labelStyle}>Business Name</label>
                <input style={inputStyle} value={clientModalForm.businessName} onChange={(e) => setClientModalForm((p) => ({ ...p, businessName: e.target.value }))} placeholder="e.g. Smith Farms Pty Ltd" />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" style={inputStyle} value={clientModalForm.email} onChange={(e) => setClientModalForm((p) => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={clientModalForm.phone} onChange={(e) => setClientModalForm((p) => ({ ...p, phone: e.target.value }))} placeholder="04XX XXX XXX" />
              </div>
              <div>
                <label style={labelStyle}>ABN</label>
                <input style={inputStyle} value={clientModalForm.abn} onChange={(e) => setClientModalForm((p) => ({ ...p, abn: e.target.value }))} placeholder="12 345 678 901" />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select style={inputStyle} value={clientModalForm.defaultCurrency} onChange={(e) => setClientModalForm((p) => ({ ...p, defaultCurrency: e.target.value }))}>
                  <option value="AUD $">AUD $</option>
                  <option value="USD $">USD $</option>
                  <option value="NZD $">NZD $</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Address</label>
                <input style={inputStyle} value={clientModalForm.address} onChange={(e) => setClientModalForm((p) => ({ ...p, address: e.target.value }))} placeholder="123 Farm Rd, Dubbo NSW 2830" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => { setShowClientModal(false); setClientModalForm({ name: "", businessName: "", email: "", phone: "", address: "", abn: "", defaultCurrency: "AUD $", workType: "" }); setEditingClientId(null); }}
                style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={async () => {
                await saveClientFromModal();
                const saved = clients.find((c) => c.name === clientModalForm.name);
                if (saved) { setInvClientSearch(saved.name); setInvoiceForm((p) => ({ ...p, clientId: String(saved.id) })); setQuoteClientSearch(saved.name); setQuoteForm((p) => ({ ...p, clientId: String(saved.id) })); }
              }}
                style={{ background: colours.purple, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {editingClientId ? "Update Client" : "Save Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Supplier Modal -- */}
      {showSupplierModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99995, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "sans-serif" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: colours.text, marginBottom: 20 }}>{editingSupplierId ? "Edit Supplier" : "Add Supplier"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Supplier Name *</label>
                <input style={inputStyle} value={supplierForm.name} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. AGL Energy" />
              </div>
              <div>
                <label style={labelStyle}>Contact Person</label>
                <input style={inputStyle} value={supplierForm.contactPerson} onChange={(e) => setSupplierForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="e.g. John Smith" />
              </div>
              <div>
                <label style={labelStyle}>ABN</label>
                <input style={inputStyle} value={supplierForm.abn} onChange={(e) => setSupplierForm((p) => ({ ...p, abn: e.target.value }))} placeholder="e.g. 12 345 678 901" />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" style={inputStyle} value={supplierForm.email} onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))} placeholder="accounts@supplier.com.au" />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={supplierForm.phone} onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))} placeholder="02 1234 5678" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Address</label>
                <input style={inputStyle} value={supplierForm.address} onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))} placeholder="123 Main St, Sydney NSW 2000" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={supplierForm.notes} onChange={(e) => setSupplierForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Payment terms, account numbers, etc." />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => { setShowSupplierModal(false); setSupplierForm({ name: "", email: "", phone: "", address: "", abn: "", contactPerson: "", notes: "" }); setEditingSupplierId(null); }}
                style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={saveSupplier}
                style={{ background: colours.purple, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {editingSupplierId ? "Update Supplier" : "Save Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- AR Credit Note Modal -- */}
      {showARCreditNoteModal && creditNoteSource && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99996, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "sans-serif" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: colours.text, marginBottom: 4 }}>AR Credit Note</div>
            <div style={{ fontSize: 13, color: colours.muted, marginBottom: 20 }}>
              Against invoice <strong>{creditNoteSource.invoiceNumber || creditNoteSource.id}</strong> -- {getClientName(creditNoteSource.clientId)}
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Credit Note Date</label>
                <input type="date" style={inputStyle} value={creditNoteForm.date}
                  onChange={(e) => setCreditNoteForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Amount (ex GST)</label>
                <input type="number" min="0" step="0.01" style={inputStyle} value={creditNoteForm.amount}
                  onChange={(e) => setCreditNoteForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Reason</label>
                <input style={inputStyle} value={creditNoteForm.reason}
                  onChange={(e) => setCreditNoteForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="e.g. Returned goods, overcharge adjustment..." />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => { setShowARCreditNoteModal(false); setCreditNoteForm({ amount: "", reason: "", date: todayLocal() }); }}
                style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={saveARCreditNote}
                style={{ background: colours.purple, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Save Credit Note</button>
            </div>
          </div>
        </div>
      )}

      {/* -- AP Credit Note Modal -- */}
      {showAPCreditNoteModal && creditNoteSource && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99996, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "sans-serif" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: colours.text, marginBottom: 4 }}>AP Credit Note</div>
            <div style={{ fontSize: 13, color: colours.muted, marginBottom: 20 }}>
              Against bill from <strong>{creditNoteSource.supplier}</strong> dated {formatDateAU(creditNoteSource.date)}
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Credit Note Date</label>
                <input type="date" style={inputStyle} value={creditNoteForm.date}
                  onChange={(e) => setCreditNoteForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Amount (incl GST)</label>
                <input type="number" min="0" step="0.01" style={inputStyle} value={creditNoteForm.amount}
                  onChange={(e) => setCreditNoteForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Reason</label>
                <input style={inputStyle} value={creditNoteForm.reason}
                  onChange={(e) => setCreditNoteForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="e.g. Returned goods, overcharge adjustment..." />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => { setShowAPCreditNoteModal(false); setCreditNoteForm({ amount: "", reason: "", date: todayLocal() }); }}
                style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={saveAPCreditNote}
                style={{ background: colours.purple, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Save Credit Note</button>
            </div>
          </div>
        </div>
      )}
      {/* -- Recurring Invoices Modal -- */}
      {showRecurringModal && recurringDue.length > 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99996, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 28 }}>[repeat]</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#14202B" }}>Recurring Invoices Due</div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{recurringDue.length} invoice{recurringDue.length !== 1 ? "s" : ""} ready to be created</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
              {recurringDue.map((inv) => (
                <div key={inv.id} onClick={() => setRecurringSelected((prev) => prev.includes(inv.id) ? prev.filter((x) => x !== inv.id) : [...prev, inv.id])}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                    background: recurringSelected.includes(inv.id) ? colours.lightPurple : "#F8FAFC",
                    border: "1px solid " + (recurringSelected.includes(inv.id) ? colours.purple : colours.border) }}>
                  <input type="checkbox" checked={recurringSelected.includes(inv.id)}
                    onChange={() => setRecurringSelected((prev) => prev.includes(inv.id) ? prev.filter((x) => x !== inv.id) : [...prev, inv.id])}
                    onClick={(e) => e.stopPropagation()} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colours.text }}>{inv.clientName}</div>
                    <div style={{ fontSize: 12, color: colours.muted, marginTop: 2 }}>
                      {inv.recurs} . Due {formatDateAU(inv.dueRecurDate)} . {currency(safeNumber(inv.total))}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: colours.purple, background: colours.lightPurple, padding: "2px 8px", borderRadius: 6 }}>
                    {inv.recurs}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowRecurringModal(false); setRecurringDue([]); setRecurringSelected([]); }}
                style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Skip
              </button>
              <button onClick={confirmRecurring} disabled={recurringSelected.length === 0}
                style={{ background: recurringSelected.length === 0 ? "#9CA3AF" : colours.purple, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: recurringSelected.length === 0 ? "not-allowed" : "pointer", fontSize: 14 }}>
                Create {recurringSelected.length} Invoice{recurringSelected.length !== 1 ? "s" : ""} as Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Recurring Jobs Modal -- */}
      {showRecurringJobsModal && recurringJobsDue.length > 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99995, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 28 }}>🔄</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#14202B" }}>Recurring Jobs Due</div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{recurringJobsDue.length} job{recurringJobsDue.length !== 1 ? "s" : ""} ready to be rescheduled</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
              {recurringJobsDue.map((job) => (
                <div key={job.id} onClick={() => setRecurringJobsSelected(prev => prev.includes(job.id) ? prev.filter(x => x !== job.id) : [...prev, job.id])}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                    background: recurringJobsSelected.includes(job.id) ? colours.lightPurple : "#F8FAFC",
                    border: "1px solid " + (recurringJobsSelected.includes(job.id) ? colours.purple : colours.border) }}>
                  <input type="checkbox" checked={recurringJobsSelected.includes(job.id)}
                    onChange={() => setRecurringJobsSelected(prev => prev.includes(job.id) ? prev.filter(x => x !== job.id) : [...prev, job.id])}
                    onClick={e => e.stopPropagation()} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colours.text }}>{job.title}</div>
                    <div style={{ fontSize: 12, color: colours.muted, marginTop: 2 }}>
                      {job.clientName} · {job.recurs} · Next: {formatDateAU(job.nextDate)}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: colours.purple, background: colours.lightPurple, padding: "2px 8px", borderRadius: 6 }}>
                    {job.recurs}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
              ✅ A draft invoice will also be created for each job with a linked contact.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowRecurringJobsModal(false); setRecurringJobsDue([]); setRecurringJobsSelected([]); }}
                style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Skip
              </button>
              <button onClick={confirmRecurringJobs} disabled={recurringJobsSelected.length === 0}
                style={{ background: recurringJobsSelected.length === 0 ? "#9CA3AF" : colours.purple, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: recurringJobsSelected.length === 0 ? "not-allowed" : "pointer", fontSize: 14 }}>
                Create {recurringJobsSelected.length} Job{recurringJobsSelected.length !== 1 ? "s" : ""} + Invoice{recurringJobsSelected.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvoiceAlerts && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99997, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 28 }}>[bell]</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#14202B" }}>Bills & Payables Reminders</div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                  {invoiceAlerts.length} bill{invoiceAlerts.length !== 1 ? "s" : ""} need{invoiceAlerts.length === 1 ? "s" : ""} your attention
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
              {invoiceAlerts.map((alert) => (
                <div key={alert.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                  background: alert.type === "overdue" ? "#FEF2F2" : alert.type === "today" ? "#FFF7ED" : "#FEFCE8",
                  border: `1px solid ${alert.type === "overdue" ? "#FECACA" : alert.type === "today" ? "#FED7AA" : "#FDE68A"}`,
                }}>
                  <div style={{ fontSize: 18 }}>{alert.type === "overdue" ? "[red]" : alert.type === "today" ? "[orange]" : "[yellow]"}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: alert.type === "overdue" ? "#991B1B" : alert.type === "today" ? "#92400E" : "#78350F" }}>
                    {alert.label}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowInvoiceAlerts(false); setActivePage("bills / payables"); }}
                style={{ background: colours.purple, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                View Bills
              </button>
              <button onClick={() => setShowInvoiceAlerts(false)}
                style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div> 
    </TerminologyProvider>
    );
}
