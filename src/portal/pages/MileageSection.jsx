import React, { useState, useEffect, useRef } from "react";

const ATO_RATE_PER_KM = 0.88; // 2024-25 ATO rate

const emptyTrip = () => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString().slice(0, 10),
  from: "",
  to: "",
  purpose: "",
  km: "",
  ratePerKm: String(ATO_RATE_PER_KM),
  jobId: "",
});

export default function MileageSection({
  expenses,
  expenseForm,
  setExpenseForm,
  saveExpense,
  openExpenseEditor = () => {},
  deleteExpense,
  confirm,
  colours,
  cardStyle,
  buttonPrimary,
  buttonSecondary,
  inputStyle,
  labelStyle,
  currency,
  formatDateAU,
  safeNumber,
  SectionCard,
  DataTable,
  jobs = [],
  getClientName = () => "Unknown",
}) {
  const [trip, setTrip] = useState(emptyTrip());
  const [editingId, setEditingId] = useState(null);
  const pendingSaveRef = useRef(false);

  const parseTripFromExpense = (expense) => {
    const description = String(expense?.description || "");
    const routeMatch = description.match(/^(.+?)\s+(?:→|->|--)\s+(.+?)\s*(\(|\d+\s*km|$)/);
    const purposeMatch = description.match(/\(([^)]+)\)/);
    const kmMatch = description.match(/([\d.]+)\s*km/i);
    const rateMatch = description.match(/\$\s*([\d.]+)\s*\/\s*km/i);
    return {
      id: expense?.id || crypto.randomUUID(),
      date: expense?.date || new Date().toISOString().slice(0, 10),
      from: routeMatch?.[1]?.trim() || "",
      to: routeMatch?.[2]?.trim() || "",
      purpose: purposeMatch?.[1]?.trim() || "",
      km: kmMatch?.[1] || "",
      ratePerKm: rateMatch?.[1] || String(ATO_RATE_PER_KM),
      jobId: expense?.jobId || "",
      receiptFileName: expense?.receiptFileName || "",
      receiptUrl: expense?.receiptUrl || "",
    };
  };

  // After expenseForm is updated with mileage data, trigger save
  useEffect(() => {
    if (
      pendingSaveRef.current &&
      expenseForm.category === "Mileage" &&
      expenseForm.supplier === "Mileage" &&
      safeNumber(expenseForm.amount) > 0
    ) {
      pendingSaveRef.current = false;
      saveExpense();
    }
  }, [expenseForm, saveExpense, safeNumber]);

  // Filter mileage expenses from the main expenses list
  const mileageExpenses = expenses.filter(
    (e) => e.category === "Motor Vehicle – Logbook" || e.category === "Mileage"
  );

  const totalKm = mileageExpenses.reduce((s, e) => {
    // Try to extract km from description like "45 km @ $0.88/km"
    const kmMatch = (e.description || "").match(/([\d.]+)\s*km/i);
    return s + (kmMatch ? parseFloat(kmMatch[1]) : 0);
  }, 0);
  const totalMileageAmt = mileageExpenses.reduce(
    (s, e) => s + safeNumber(e.amount),
    0
  );

  const handleSave = () => {
    const km = parseFloat(trip.km);
    if (!km || km <= 0) return alert("Please enter a valid distance in km.");
    if (!trip.from && !trip.to && !trip.purpose)
      return alert("Please enter trip details (from, to, or purpose).");

    const rate = parseFloat(trip.ratePerKm) || ATO_RATE_PER_KM;
    const amount = (km * rate).toFixed(2);
    const description = [
      trip.from && trip.to ? `${trip.from} → ${trip.to}` : trip.from || trip.to || "",
      trip.purpose ? `(${trip.purpose})` : "",
      `${km} km @ $${rate}/km`,
    ]
      .filter(Boolean)
      .join(" ");

    pendingSaveRef.current = true;

    setExpenseForm((prev) => ({
      ...prev,
      id: editingId || "",
      date: trip.date,
      dueDate: trip.date,
      supplier: "Mileage",
      category: "Mileage",
      amount: String(amount),
      description,
      gst: "0",
      expenseType: "Motor Vehicle",
      jobId: trip.jobId || "",
      receiptFileName: trip.receiptFileName || "",
      receiptUrl: trip.receiptUrl || "",
    }));

    setTrip(emptyTrip());
    setEditingId(null);
  };

  const f = (field, value) => setTrip((prev) => ({ ...prev, [field]: value }));

  const calculatedAmount =
    parseFloat(trip.km) > 0 && parseFloat(trip.ratePerKm) > 0
      ? (parseFloat(trip.km) * parseFloat(trip.ratePerKm)).toFixed(2)
      : "0.00";

  return (
    <SectionCard
      title="Mileage / Motor Vehicle Log"
      right={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontSize: 13,
              color: colours.muted,
              background: colours.bg,
              borderRadius: 8,
              padding: "4px 12px",
              fontWeight: 700,
            }}
          >
            ATO rate: ${ATO_RATE_PER_KM}/km
          </span>
        </div>
      }
    >
      {/* Summary strip */}
      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          marginBottom: 18,
          padding: "12px 16px",
          background: colours.bg,
          borderRadius: 12,
          fontSize: 14,
        }}
      >
        <div>
          <span style={{ color: colours.muted, fontWeight: 700, marginRight: 6 }}>
            Total trips:
          </span>
          {mileageExpenses.length}
        </div>
        <div>
          <span style={{ color: colours.muted, fontWeight: 700, marginRight: 6 }}>
            Total km:
          </span>
          {totalKm.toLocaleString()}
        </div>
        <div>
          <span style={{ color: colours.muted, fontWeight: 700, marginRight: 6 }}>
            Total claimed:
          </span>
          {currency(totalMileageAmt)}
        </div>
      </div>

      {/* Form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date"
            style={inputStyle}
            value={trip.date}
            onChange={(e) => f("date", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>From</label>
          <input
            style={inputStyle}
            placeholder="e.g. Office"
            value={trip.from}
            onChange={(e) => f("from", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input
            style={inputStyle}
            placeholder="e.g. Client site"
            value={trip.to}
            onChange={(e) => f("to", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Purpose</label>
          <input
            style={inputStyle}
            placeholder="e.g. Site inspection"
            value={trip.purpose}
            onChange={(e) => f("purpose", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Distance (km)</label>
          <input
            type="number"
            style={inputStyle}
            placeholder="0"
            value={trip.km}
            onChange={(e) => f("km", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Rate ($/km)</label>
          <input
            type="number"
            step="0.01"
            style={inputStyle}
            value={trip.ratePerKm}
            onChange={(e) => f("ratePerKm", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Link to Job (optional)</label>
          <select
            style={inputStyle}
            value={trip.jobId || ""}
            onChange={(e) => f("jobId", e.target.value)}
          >
            <option value="">— none —</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}{j.clientId ? ` (${getClientName(j.clientId)})` : ""}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Amount</label>
          <div
            style={{
              ...inputStyle,
              background: colours.bg,
              fontWeight: 800,
              color: colours.teal,
              display: "flex",
              alignItems: "center",
            }}
          >
            ${calculatedAmount}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button style={buttonPrimary} onClick={handleSave}>
          {editingId ? "Update Trip" : "Log Trip"}
        </button>
        {editingId && (
          <button
            style={buttonSecondary}
            onClick={() => {
              setTrip(emptyTrip());
              setEditingId(null);
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Mileage table */}
      <div style={{ marginTop: 24 }}>
        <DataTable
          emptyState={{
            icon: "🚗",
            title: "No mileage logged",
            message:
              "Log your first business trip above. The ATO cents-per-km rate is applied automatically.",
          }}
          columns={[
            {
              key: "date",
              label: "Date",
              render: (v) => formatDateAU(v),
            },
            {
              key: "description",
              label: "Trip Details",
            },
            {
              key: "amount",
              label: "Claim",
              render: (v) => currency(v),
            },
            {
              key: "actions",
              label: "",
              render: (_, row) => (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    style={buttonSecondary}
                    onClick={() => {
                      const nextTrip = parseTripFromExpense(row);
                      setTrip(nextTrip);
                      setEditingId(row.id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    style={buttonSecondary}
                    onClick={() => deleteExpense(row.id)}
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={mileageExpenses}
        />
      </div>
    </SectionCard>
  );
}
