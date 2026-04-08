import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

interface QuoteData {
  id?: string | number;
  quoteNumber: string;
  quoteDate: string;
  expiryDate: string;
  description: string;
  comments: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    gstType?: string;
    rowGst?: number;
    rowTotal?: number;
  }>;
  subtotal: number;
  gst: number;
  total: number;
  currencyCode: string;
  status: string;
  gstStatus: string;
  hidePhoneNumber: boolean;
  acceptedDate?: string;
  declinedDate?: string;
  respondedAt?: string;
  convertedToJobId?: string;
}

interface BusinessData {
  name: string;
  legalName: string;
  address: string;
  email: string;
  phone: string;
  abn: string;
  logoDataUrl: string;
  hideLegalName: boolean;
}

interface ClientData {
  name: string;
  businessName: string;
  addressDetails: string;
}

export default function QuoteViewPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);
  const [responding, setResponding] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid quote link.");
      setLoading(false);
      return;
    }

    const fetchQuote = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/handle-quote-response?token=${encodeURIComponent(token)}`
        );
        const json = await res.json();

        if (!res.ok || !json.ok) {
          setError(json.error || "Quote not found.");
          return;
        }

        setQuote(json.quote);
        setBusiness(json.business);
        setClient(json.client);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load quote.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [token]);

  const handleResponse = async (action: "accept" | "decline") => {
    if (!token) return;
    setResponding(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/handle-quote-response?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, message: clientNote }),
        }
      );
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error || "Something went wrong.");
        return;
      }

      setResponseMessage(json.message);
      // Update local state to reflect
      if (quote) {
        setQuote({
          ...quote,
          status: action === "accept" ? "Accepted" : "Declined",
          respondedAt: new Date().toISOString(),
          acceptedDate: action === "accept" ? new Date().toISOString() : quote.acceptedDate,
          declinedDate: action === "decline" ? new Date().toISOString() : quote.declinedDate,
          convertedToJobId: json.jobId || quote.convertedToJobId,
        });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to respond.";
      setError(message);
    } finally {
      setResponding(false);
      setShowDeclineConfirm(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    try {
      const date = new Date(d);
      return date.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const formatMoney = (v: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: quote?.currencyCode || "AUD",
    }).format(v || 0);
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={styles.spinner} />
            <p style={{ color: "#64748B", marginTop: 16 }}>Loading quote...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
            <h2 style={{ color: "#991B1B", marginBottom: 8 }}>Oops</h2>
            <p style={{ color: "#64748B" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!quote || !business) return null;

  const isExpired =
    quote.expiryDate && new Date(quote.expiryDate) < new Date() && quote.status !== "Accepted";
  const alreadyResponded = quote.status === "Accepted" || quote.status === "Declined";
  const displayName = business.hideLegalName || !business.legalName ? business.name : business.legalName;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            {business.logoDataUrl && (
              <div style={{ marginBottom: 12 }}>
                <img
                  src={business.logoDataUrl}
                  alt="Logo"
                  style={{ maxHeight: 60, maxWidth: 200, objectFit: "contain" }}
                />
              </div>
            )}
            <div style={styles.title}>QUOTE</div>
            <div style={styles.businessName}>{displayName}</div>
            {business.address && (
              <div style={styles.subText}>{business.address}</div>
            )}
            <div style={styles.subText}>
              {business.email}
              {!quote.hidePhoneNumber && business.phone ? ` | ${business.phone}` : ""}
            </div>
            {business.abn && <div style={styles.subText}>ABN: {business.abn}</div>}
          </div>
          <div style={{ textAlign: "right" as const }}>
            <div style={styles.metaRow}>
              <strong>Quote ref:</strong> {quote.quoteNumber}
            </div>
            <div style={styles.metaRow}>
              <strong>Quote date:</strong> {formatDate(quote.quoteDate)}
            </div>
            <div style={styles.metaRow}>
              <strong>Expiry:</strong> {formatDate(quote.expiryDate)}
            </div>
          </div>
        </div>

        {/* Client */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 700 }}>{client?.name || ""}</div>
          {client?.businessName && (
            <div style={styles.subText}>{client.businessName}</div>
          )}
          {client?.addressDetails && (
            <div style={styles.subText}>{client.addressDetails}</div>
          )}
        </div>

        {/* Status banner */}
        {(alreadyResponded || isExpired) && (
          <div
            style={{
              ...styles.statusBanner,
              background:
                quote.status === "Accepted"
                  ? "#ECFDF5"
                  : quote.status === "Declined"
                  ? "#FEF2F2"
                  : "#FFF7ED",
              color:
                quote.status === "Accepted"
                  ? "#065F46"
                  : quote.status === "Declined"
                  ? "#991B1B"
                  : "#9A3412",
              borderColor:
                quote.status === "Accepted"
                  ? "#A7F3D0"
                  : quote.status === "Declined"
                  ? "#FECACA"
                  : "#FED7AA",
            }}
          >
            {quote.status === "Accepted"
              ? "✅ This quote has been accepted"
              : quote.status === "Declined"
              ? "❌ This quote has been declined"
              : "⏰ This quote has expired"}
          </div>
        )}

        {responseMessage && (
          <div style={{ ...styles.statusBanner, background: "#ECFDF5", color: "#065F46", borderColor: "#A7F3D0" }}>
            {responseMessage}
          </div>
        )}

        {/* Line items table */}
        <div style={{ overflowX: "auto" as const }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Qty</th>
                <th style={{ ...styles.th, textAlign: "right" as const }}>Unit Price</th>
                <th style={{ ...styles.th, textAlign: "right" as const }}>GST</th>
                <th style={{ ...styles.th, textAlign: "right" as const }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(quote.lineItems && quote.lineItems.length > 0
                ? quote.lineItems
                : [
                    {
                      description: quote.description || "Professional services",
                      quantity: 1,
                      unitPrice: quote.subtotal,
                    },
                  ]
              ).map((item, i) => {
                const qty = Number(item.quantity) || 1;
                const unit = Number(item.unitPrice) || 0;
                const rowSub = unit * qty;
                const gstType = item.gstType || "";
                const rowGst =
                  item.rowGst !== undefined
                    ? Number(item.rowGst)
                    : gstType.includes("10%")
                    ? rowSub * 0.1
                    : 0;
                return (
                  <tr key={i}>
                    <td style={styles.td}>{item.description}</td>
                    <td style={styles.td}>{qty}</td>
                    <td style={{ ...styles.td, textAlign: "right" as const }}>
                      {formatMoney(unit)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" as const }}>
                      {formatMoney(rowGst)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" as const, fontWeight: 600 }}>
                      {formatMoney(rowSub + rowGst)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={styles.totals}>
          <div style={styles.totalRow}>
            <span>Subtotal</span>
            <span>{formatMoney(quote.subtotal)}</span>
          </div>
          {Number(quote.gst) > 0 && (
            <div style={styles.totalRow}>
              <span>GST</span>
              <span>{formatMoney(quote.gst)}</span>
            </div>
          )}
          <div
            style={{
              ...styles.totalRow,
              fontWeight: 800,
              fontSize: 20,
              color: "#006D6D",
              borderTop: "2px solid #E2E8F0",
              paddingTop: 12,
              marginTop: 8,
            }}
          >
            <span>Total</span>
            <span>{formatMoney(quote.total)}</span>
          </div>
        </div>

        {/* Comments */}
        {quote.comments && (
          <div style={styles.commentsBox}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>
              Notes
            </div>
            <div style={{ fontSize: 14, color: "#14202B", whiteSpace: "pre-wrap" as const }}>
              {quote.comments}
            </div>
          </div>
        )}

        {/* Accept / Decline actions */}
        {!alreadyResponded && !isExpired && !responseMessage && (
          <div style={styles.actionArea}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#14202B", marginBottom: 12 }}>
              Would you like to proceed with this quote?
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}
              >
                Add a message (optional)
              </label>
              <textarea
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                placeholder="Any questions or comments..."
                style={styles.textarea}
              />
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
              <button
                style={styles.acceptBtn}
                onClick={() => handleResponse("accept")}
                disabled={responding}
              >
                {responding ? "Processing..." : "✅ Accept Quote"}
              </button>
              <button
                style={styles.declineBtn}
                onClick={() => setShowDeclineConfirm(true)}
                disabled={responding}
              >
                Decline
              </button>
            </div>

            {showDeclineConfirm && (
              <div style={styles.declineConfirm}>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  Are you sure you want to decline this quote?
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button
                    style={{ ...styles.declineBtn, padding: "8px 20px" }}
                    onClick={() => handleResponse("decline")}
                    disabled={responding}
                  >
                    {responding ? "Processing..." : "Yes, Decline"}
                  </button>
                  <button
                    style={{ ...styles.cancelBtn }}
                    onClick={() => setShowDeclineConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <span>Powered by Mustered</span>
          <span>{business.name}</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#F8FAFC",
    padding: "24px 16px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    maxWidth: 800,
    margin: "0 auto",
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 18,
    padding: 32,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap" as const,
    borderBottom: "1px solid #E2E8F0",
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 900,
    color: "#6A1B9A",
  },
  businessName: {
    marginTop: 8,
    fontWeight: 700,
    fontSize: 16,
  },
  subText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },
  metaRow: {
    fontSize: 14,
    marginTop: 6,
  },
  statusBanner: {
    marginTop: 20,
    padding: "14px 20px",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    border: "1px solid",
    textAlign: "center" as const,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    marginTop: 24,
  },
  th: {
    textAlign: "left" as const,
    padding: "10px 8px",
    borderBottom: "2px solid #E2E8F0",
    color: "#64748B",
    fontSize: 13,
    fontWeight: 700,
  },
  td: {
    padding: "10px 8px",
    borderBottom: "1px solid #F1F5F9",
    fontSize: 14,
  },
  totals: {
    maxWidth: 360,
    marginLeft: "auto",
    marginTop: 20,
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    fontSize: 15,
  },
  commentsBox: {
    marginTop: 24,
    padding: 16,
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
  },
  actionArea: {
    marginTop: 32,
    padding: 24,
    background: "#FAFBFF",
    border: "2px solid #E2E8F0",
    borderRadius: 16,
  },
  textarea: {
    width: "100%",
    minHeight: 60,
    padding: "10px 14px",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "Arial, sans-serif",
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
  },
  acceptBtn: {
    background: "#006D6D",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px 32px",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  declineBtn: {
    background: "transparent",
    color: "#991B1B",
    border: "2px solid #FECACA",
    borderRadius: 12,
    padding: "14px 24px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  cancelBtn: {
    background: "transparent",
    color: "#64748B",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    padding: "8px 20px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  declineConfirm: {
    marginTop: 16,
    padding: 16,
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 12,
  },
  footer: {
    marginTop: 32,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#94A3B8",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #E2E8F0",
    borderTopColor: "#6A1B9A",
    borderRadius: "50%",
    margin: "0 auto",
    animation: "spin 0.8s linear infinite",
  },
};
