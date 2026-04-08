import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const REMINDER_TIERS = [
  { key: "30_days", days: 30, label: "30 days overdue" },
  { key: "14_days", days: 14, label: "14 days overdue" },
  { key: "7_days", days: 7, label: "7 days overdue" },
];

function buildReminderHtml(invoice: any, profile: any, reminderTier: string) {
  const businessName = profile?.businessName || profile?.name || "Our Business";
  const invoiceNumber = invoice.invoiceNumber || invoice.id || "N/A";
  const total = invoice.total || invoice.amount || 0;
  const dueDate = invoice.dueDate || "N/A";
  const clientName = invoice.clientName || "Valued Client";

  const urgency = reminderTier === "30_days" ? "final" : reminderTier === "14_days" ? "second" : "friendly";
  const urgencyColor = reminderTier === "30_days" ? "#DC2626" : reminderTier === "14_days" ? "#F59E0B" : "#6A1B9A";

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="border-top:4px solid ${urgencyColor};padding:24px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <h1 style="color:${urgencyColor};font-size:20px;margin:0 0 16px;">Payment Reminder</h1>
        <p style="color:#333;font-size:14px;line-height:1.6;">
          Dear ${clientName},
        </p>
        <p style="color:#333;font-size:14px;line-height:1.6;">
          This is a ${urgency} reminder that invoice <strong>#${invoiceNumber}</strong> 
          for <strong>$${Number(total).toFixed(2)}</strong> was due on <strong>${dueDate}</strong> 
          and remains unpaid.
        </p>
        <div style="background:#F8FAFC;padding:16px;border-radius:8px;margin:16px 0;">
          <table style="width:100%;font-size:13px;color:#333;">
            <tr><td style="padding:4px 0;font-weight:700;">Invoice:</td><td>#${invoiceNumber}</td></tr>
            <tr><td style="padding:4px 0;font-weight:700;">Amount Due:</td><td>$${Number(total).toFixed(2)}</td></tr>
            <tr><td style="padding:4px 0;font-weight:700;">Due Date:</td><td>${dueDate}</td></tr>
          </table>
        </div>
        ${reminderTier === "30_days" ? `
          <p style="color:#DC2626;font-size:14px;font-weight:700;line-height:1.6;">
            Please arrange payment immediately to avoid any further action.
          </p>
        ` : `
          <p style="color:#333;font-size:14px;line-height:1.6;">
            Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this reminder.
          </p>
        `}
        <p style="color:#64748B;font-size:13px;margin-top:20px;">
          Kind regards,<br/><strong>${businessName}</strong>
          ${profile?.email ? `<br/>${profile.email}` : ""}
          ${profile?.phone ? `<br/>${profile.phone}` : ""}
        </p>
      </div>
    </div>
  `;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const logStep = (step: string, details?: any) => {
    console.log(`[PAYMENT-REMINDERS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
  };

  try {
    logStep("Function started");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email API keys not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // Get all users' invoices
    const { data: invoiceRows, error: invErr } = await supabase.from("sas_invoices").select("*");
    if (invErr) throw new Error(`Failed to fetch invoices: ${invErr.message}`);
    logStep("Fetched invoice rows", { count: invoiceRows?.length });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let totalSent = 0;
    let totalSkipped = 0;

    for (const row of (invoiceRows || [])) {
      const userId = row.user_id;
      const data = row.data as any;
      const invoices = Array.isArray(data) ? data : (data?.invoices || []);

      // Get user's profile for business name
      const { data: profileRows } = await supabase.from("sas_profile").select("data").eq("user_id", userId).limit(1);
      const profile = (profileRows?.[0]?.data as any) || {};

      // Check if reminders are enabled (default: enabled)
      if (profile.remindersDisabled) {
        logStep("Reminders disabled for user", { userId });
        continue;
      }

      // Get clients for email lookup
      const { data: clientRows } = await supabase.from("sas_clients").select("data").eq("user_id", userId).limit(1);
      const clients = Array.isArray(clientRows?.[0]?.data) ? clientRows[0].data : (clientRows?.[0]?.data as any)?.clients || [];

      // Get existing reminders for this user
      const { data: existingReminders } = await supabase.from("sas_payment_reminders").select("invoice_id, reminder_type").eq("user_id", userId);
      const sentSet = new Set((existingReminders || []).map(r => `${r.invoice_id}:${r.reminder_type}`));

      let invoiceDataChanged = false;

      for (const inv of invoices) {
        if (!inv || inv.status === "Paid" || inv.status === "Cancelled" || inv.status === "Draft") continue;
        if (!inv.dueDate) continue;

        const dueDate = new Date(inv.dueDate);
        if (isNaN(dueDate.getTime())) continue;
        dueDate.setHours(0, 0, 0, 0);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue < 7) continue;

        // Find client email
        const client = clients.find((c: any) => c.name === inv.clientName || c.id === inv.clientId);
        const clientEmail = client?.email || inv.clientEmail;
        if (!clientEmail) {
          logStep("No email for client", { invoiceNumber: inv.invoiceNumber, clientName: inv.clientName });
          totalSkipped++;
          continue;
        }

        // Determine which reminder to send
        for (const tier of REMINDER_TIERS) {
          if (daysOverdue < tier.days) continue;
          const reminderId = `${inv.invoiceNumber || inv.id}:${tier.key}`;
          if (sentSet.has(reminderId)) continue;

          // Send reminder email
          const html = buildReminderHtml(inv, profile, tier.key);
          const fromName = profile.businessName || "Sharon Ogier Accounting";
          const normEmail = String(profile.email || "").trim().toLowerCase();
          const fromEmail = normEmail.endsWith("@sharonogier.com") ? normEmail : "info@sharonogier.com";

          logStep("Sending reminder", { invoiceNumber: inv.invoiceNumber, tier: tier.key, to: clientEmail });

          const res = await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": RESEND_API_KEY,
            },
            body: JSON.stringify({
              from: `${fromName} <${fromEmail}>`,
              to: [clientEmail],
              subject: `Payment Reminder: Invoice #${inv.invoiceNumber || inv.id} - ${tier.label}`,
              html,
              reply_to: profile.email || fromEmail,
            }),
          });

          const status = res.ok ? "sent" : "failed";
          if (!res.ok) {
            const errBody = await res.text();
            logStep("Email send failed", { status: res.status, body: errBody });
          }

          // Record the reminder
          await supabase.from("sas_payment_reminders").insert({
            user_id: userId,
            invoice_id: String(inv.invoiceNumber || inv.id),
            reminder_type: tier.key,
            recipient_email: clientEmail,
            status,
          });

          // Mark on the invoice data
          if (!inv.remindersSent) inv.remindersSent = {};
          inv.remindersSent[tier.key] = new Date().toISOString();
          invoiceDataChanged = true;

          totalSent++;
          sentSet.add(reminderId);
          break; // Only send one reminder per invoice per run (highest tier first)
        }
      }

      // Update invoice data if reminders were marked
      if (invoiceDataChanged) {
        await supabase.from("sas_invoices").update({ data: Array.isArray(data) ? invoices : { ...data, invoices } }).eq("user_id", userId);
      }
    }

    logStep("Completed", { totalSent, totalSkipped });

    return new Response(JSON.stringify({ success: true, sent: totalSent, skipped: totalSkipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
