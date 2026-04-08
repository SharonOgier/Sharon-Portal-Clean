import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const SMS_GATEWAY_URL = "https://connector-gateway.lovable.dev/sms";

type ReminderRow = {
  id: number;
  user_id: string;
  data: Record<string, unknown>;
};

type ReminderSendResult = {
  ok: boolean;
  status: string;
  message: string;
};

type UserBundle = {
  profile: Record<string, unknown>;
  clients: Array<Record<string, unknown>>;
  jobs: Array<Record<string, unknown>>;
};

const userBundleCache = new Map<string, Promise<UserBundle>>();

const asString = (v: unknown) => String(v ?? "").trim();
const normalise = (v: unknown) => asString(v).toLowerCase().replace(/\s+/g, " ").trim();

const toDateInPerth = (d: Date = new Date()) =>
  d.toLocaleDateString("en-CA", { timeZone: "Australia/Perth" });

const addMonthsToIsoDate = (isoDate: string, months: number) => {
  const [y, m, d] = asString(isoDate).split("-").map((n) => Number(n));
  if (!y || !m || !d || !months) return isoDate;
  const source = new Date(Date.UTC(y, m - 1, d));
  const day = source.getUTCDate();
  source.setUTCMonth(source.getUTCMonth() + months, 1);
  const end = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 0)).getUTCDate();
  source.setUTCDate(Math.min(day, end));
  const yy = source.getUTCFullYear();
  const mm = String(source.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(source.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

const recurrenceMonths = (recurrence: string, customMonths: number) => {
  const key = normalise(recurrence);
  if (key === "monthly") return 1;
  if (key === "quarterly") return 3;
  if (key === "every 6 months") return 6;
  if (key === "annually") return 12;
  if (key === "custom") return Math.max(1, Number(customMonths || 1));
  return 1;
};

const getClientMobile = (client: Record<string, unknown> | undefined) =>
  asString(client?.mobile || client?.phone || client?.phoneNumber || client?.contactNumber || "");

const buildBookingLink = (supabaseUrl: string, reminderId: number, token: string) =>
  `${supabaseUrl}/functions/v1/send-recurring-reminders?action=book&reminderId=${encodeURIComponent(String(reminderId))}&token=${encodeURIComponent(token)}`;

const escapeHtml = (v: unknown) =>
  asString(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const applyTemplate = (template: string, vars: Record<string, string>) => {
  let text = template;
  Object.entries(vars).forEach(([k, value]) => {
    text = text.split(`[${k}]`).join(value);
  });
  return text;
};

const logActivity = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
  reminderId: number | null,
  eventType: string,
  status: string,
  data: Record<string, unknown>,
) => {
  await supabase.from("sas_recurring_reminder_activity").insert({
    user_id: userId,
    reminder_id: reminderId,
    event_type: eventType,
    status,
    data,
  });
};

const sendEmailReminder = async (
  profile: Record<string, unknown>,
  to: string,
  subject: string,
  html: string,
) => {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableApiKey || !resendApiKey) {
    throw new Error("Email API keys are not configured");
  }
  const businessName = asString(profile.businessName) || "Mustered";
  const businessEmail = asString(profile.email).toLowerCase();
  const fromEmail = businessEmail.endsWith("@sharonogier.com") ? businessEmail : "info@sharonogier.com";
  const res = await fetch(`${EMAIL_GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": resendApiKey,
    },
    body: JSON.stringify({
      from: `${businessName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
      reply_to: asString(profile.email) || fromEmail,
    }),
  });
  const payload = await res.json();
  return { ok: res.ok, payload };
};

const sendSmsReminder = async (
  profile: Record<string, unknown>,
  to: string,
  message: string,
) => {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const smsApiKey = Deno.env.get("SMS_API_KEY") || Deno.env.get("TWILIO_API_KEY") || "";
  if (!lovableApiKey || !smsApiKey) {
    throw new Error("SMS API keys are not configured");
  }
  const res = await fetch(SMS_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": smsApiKey,
    },
    body: JSON.stringify({
      to,
      message,
      from: asString(profile.businessName) || "Mustered",
    }),
  });
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  return { ok: res.ok, payload };
};

const getUserBundle = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<UserBundle> => {
  if (!userBundleCache.has(userId)) {
    userBundleCache.set(userId, (async () => {
      const [profileRows, clientRows, jobRows] = await Promise.all([
        supabase.from("sas_profile").select("data").eq("user_id", userId).limit(1),
        supabase.from("sas_clients").select("id,data").eq("user_id", userId),
        supabase.from("sas_jobs").select("id,data").eq("user_id", userId),
      ]);
      const profile = (profileRows.data?.[0]?.data as Record<string, unknown>) || {};
      const clients = (clientRows.data || []).map((r) => ({ ...(r.data as Record<string, unknown>), _dbId: r.id }));
      const jobs = (jobRows.data || []).map((r) => ({ ...(r.data as Record<string, unknown>), _dbId: r.id }));
      return { profile, clients, jobs };
    })());
  }
  return userBundleCache.get(userId)!;
};

const hasOpenSameTypeJob = (
  jobs: Array<Record<string, unknown>>,
  clientId: string,
  jobType: string,
) => {
  const targetType = normalise(jobType);
  return jobs.some((job) => {
    const status = normalise(job.status);
    if (status === "completed" || status === "cancelled") return false;
    if (asString(job.clientId) !== clientId) return false;
    const currentType = normalise(job.jobType || job.title || "");
    return currentType === targetType;
  });
};

const updateReminder = async (
  supabase: ReturnType<typeof createClient>,
  reminderRow: ReminderRow,
  nextData: Record<string, unknown>,
) => {
  await supabase
    .from("sas_recurring_reminders")
    .update({ data: nextData, updated_at: new Date().toISOString() })
    .eq("id", reminderRow.id)
    .eq("user_id", reminderRow.user_id);
};

const processReminder = async (
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  reminderRow: ReminderRow,
  runDate: string,
  forceSend: boolean,
): Promise<ReminderSendResult> => {
  const reminder = reminderRow.data || {};
  const status = asString(reminder.status || "Active");
  if (status === "Paused") {
    return { ok: true, status: "skipped", message: "Paused" };
  }

  const nextDueDate = asString(reminder.nextDueDate);
  if (!forceSend && nextDueDate !== runDate) {
    return { ok: true, status: "skipped", message: "Not due" };
  }

  const bundle = await getUserBundle(supabase, reminderRow.user_id);
  const profile = bundle.profile;
  const clientId = asString(reminder.clientId);
  const reminderName = asString(reminder.reminderName) || "Service Reminder";
  const jobType = asString(reminder.jobType || reminder.linkedJobType || reminderName);

  const client = bundle.clients.find((c) => asString(c.id) === clientId || asString(c._dbId) === clientId);
  const clientName = asString(client?.name) || "there";
  const clientEmail = asString(client?.email);
  const clientMobile = getClientMobile(client);
  const sendVia = normalise(reminder.sendVia || "email"); // email | sms | both
  const portalToken = asString(client?.portalToken);
  const bookingLink = portalToken ? buildBookingLink(supabaseUrl, reminderRow.id, portalToken) : "";
  const businessName = asString(profile.businessName) || "Mustered";
  const businessPhone = asString(profile.phone);

  if (!bookingLink) {
    const nextData = {
      ...reminder,
      status: "Unable to send",
      lastDeliveryStatus: "failed",
      lastDeliveryNote: "Unable to send - client portal link unavailable",
    };
    await updateReminder(supabase, reminderRow, nextData);
    await logActivity(supabase, reminderRow.user_id, reminderRow.id, "delivery_skipped", "failed", {
      reason: "missing_portal_token",
      runDate,
      clientId,
    });
    return { ok: false, status: "failed", message: "Client portal token missing" };
  }

  if (!clientEmail && !clientMobile) {
    const nextData = {
      ...reminder,
      status: "Unable to send",
      lastDeliveryStatus: "failed",
      lastDeliveryNote: "Unable to send - contact details missing",
    };
    await updateReminder(supabase, reminderRow, nextData);
    await logActivity(supabase, reminderRow.user_id, reminderRow.id, "delivery_skipped", "failed", {
      reason: "missing_contact_details",
      runDate,
    });
    return { ok: false, status: "failed", message: "Missing contact details" };
  }

  if (hasOpenSameTypeJob(bundle.jobs, clientId, jobType)) {
    await logActivity(supabase, reminderRow.user_id, reminderRow.id, "delivery_skipped", "skipped", {
      reason: "open_job_exists",
      runDate,
      jobType,
      clientId,
    });
    return { ok: true, status: "skipped", message: "Open job exists for same type" };
  }

  const defaultTemplate = "Hi [Name], it is time to book your [Reminder Name] with [Business Name]. Click here to request a booking: [link]";
  const renderedMessage = applyTemplate(
    asString(reminder.messageToCustomer) || defaultTemplate,
    {
      Name: clientName,
      "Reminder Name": reminderName,
      "Business Name": businessName,
      link: bookingLink || `${supabaseUrl.replace(/\/$/, "")}/client-portal`,
    },
  );

  const emailSubject = `Your ${reminderName} is due`;
  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="color:#14202B;margin:0 0 12px;">Your ${escapeHtml(reminderName)} is due</h2>
      <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 10px;">
        Hi ${escapeHtml(clientName)}, it is time to book your ${escapeHtml(reminderName)} with ${escapeHtml(businessName)}.
      </p>
      <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">
        Click here to request a booking:
      </p>
      <p style="margin:0 0 20px;">
        <a href="${escapeHtml(bookingLink)}" style="display:inline-block;background:#6A1B9A;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
          Request Booking
        </a>
      </p>
      <p style="font-size:13px;color:#64748B;line-height:1.6;margin:0;">
        If the button does not work, copy this link: ${escapeHtml(bookingLink)}
      </p>
    </div>
  `;

  const smsBody = `Hi ${clientName}, your ${reminderName} with ${businessName} is due. Call us on ${businessPhone || "our office"} or click here to book: ${bookingLink}`;

  const sendEmail = sendVia === "email" || sendVia === "both";
  const sendSms = sendVia === "sms" || sendVia === "both";

  let emailOk = false;
  let smsOk = false;
  const notes: string[] = [];

  if (sendEmail) {
    if (!clientEmail) {
      notes.push("email_missing");
    } else {
      try {
        const res = await sendEmailReminder(profile, clientEmail, emailSubject, emailHtml);
        emailOk = res.ok;
        if (!res.ok) notes.push("email_failed");
      } catch (err) {
        notes.push(`email_error:${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (sendSms) {
    if (!clientMobile) {
      notes.push("sms_missing");
    } else {
      try {
        const res = await sendSmsReminder(profile, clientMobile, smsBody);
        smsOk = res.ok;
        if (!res.ok) notes.push("sms_failed");
      } catch (err) {
        notes.push(`sms_error:${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  const anyDelivered = (sendEmail ? emailOk : true) || (sendSms ? smsOk : true);
  const allDelivered = (!sendEmail || emailOk) && (!sendSms || smsOk);
  const nowIso = new Date().toISOString();

  const finalStatus = anyDelivered ? (allDelivered ? "sent" : "partial") : "failed";
  const nextData: Record<string, unknown> = {
    ...reminder,
    lastDeliveryStatus: finalStatus,
    lastDeliveryNote: notes.join(", "),
    status: anyDelivered ? "Active" : (notes.includes("email_missing") && notes.includes("sms_missing") ? "Unable to send" : status || "Active"),
  };

  if (anyDelivered) {
    const months = recurrenceMonths(asString(reminder.recurrenceInterval), Number(reminder.customMonths || 0));
    nextData.lastSentAt = nowIso;
    nextData.lastSentDate = toDateInPerth(new Date());
    nextData.nextDueDate = addMonthsToIsoDate(nextDueDate || runDate, months);
  }

  await updateReminder(supabase, reminderRow, nextData);
  await logActivity(supabase, reminderRow.user_id, reminderRow.id, "delivery_attempt", finalStatus, {
    runDate,
    sendVia,
    emailOk,
    smsOk,
    notes,
    nextDueDate: nextData.nextDueDate || nextDueDate,
  });

  return {
    ok: anyDelivered,
    status: finalStatus,
    message: anyDelivered ? "Reminder processed" : "No channel delivered",
  };
};

const renderBookingHtml = (title: string, message: string, bookingLink: string) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="font-family:Arial,sans-serif;background:#F8FAFC;margin:0;padding:24px;">
    <div style="max-width:560px;margin:32px auto;background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:24px;">
      <h2 style="margin:0 0 12px;color:#14202B;">${escapeHtml(title)}</h2>
      <p style="margin:0 0 16px;color:#334155;line-height:1.6;">${escapeHtml(message)}</p>
      <a href="${escapeHtml(bookingLink)}" style="display:inline-block;background:#6A1B9A;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:700;">
        Open Client Portal
      </a>
    </div>
  </body>
</html>
`;

const handleBookingClick = async (
  req: Request,
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
) => {
  const url = new URL(req.url);
  const reminderId = Number(url.searchParams.get("reminderId") || 0);
  const token = asString(url.searchParams.get("token"));
  if (!reminderId || !token) {
    return new Response(renderBookingHtml("Invalid link", "This booking link is invalid.", "/"), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  }

  const reminderResp = await supabase
    .from("sas_recurring_reminders")
    .select("id,user_id,data")
    .eq("id", reminderId)
    .maybeSingle();

  const reminderRow = reminderResp.data as ReminderRow | null;
  if (!reminderRow) {
    return new Response(renderBookingHtml("Reminder not found", "This reminder no longer exists.", "/"), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  }

  const reminder = reminderRow.data || {};
  const bundle = await getUserBundle(supabase, reminderRow.user_id);
  const clientId = asString(reminder.clientId);
  const reminderName = asString(reminder.reminderName) || "Service Reminder";
  const jobType = asString(reminder.jobType || reminderName);
  const client = bundle.clients.find((c) => asString(c.id) === clientId || asString(c._dbId) === clientId);
  if (!client || asString(client.portalToken) !== token) {
    return new Response(renderBookingHtml("Access denied", "This booking link is not valid for your portal access.", "/"), {
      status: 403,
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  }

  const todayKey = toDateInPerth(new Date());
  const dedupeKey = `${reminderId}:${token}:${todayKey}`;
  const existing = await supabase
    .from("sas_recurring_reminder_activity")
    .select("id")
    .eq("user_id", reminderRow.user_id)
    .eq("reminder_id", reminderId)
    .eq("event_type", "booking_created")
    .filter("data->>dedupeKey", "eq", dedupeKey)
    .limit(1);

  if ((existing.data || []).length > 0) {
    return new Response(
      renderBookingHtml(
        "Booking request already received",
        "Your request has already been submitted. We will contact you shortly.",
        `${supabaseUrl}/functions/v1/client-portal?token=${encodeURIComponent(token)}`,
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } },
    );
  }

  if (hasOpenSameTypeJob(bundle.jobs, clientId, jobType)) {
    await logActivity(supabase, reminderRow.user_id, reminderId, "booking_skipped", "skipped", {
      reason: "open_job_exists",
      dedupeKey,
    });
    return new Response(
      renderBookingHtml(
        "You already have an open request",
        "A job request of this type is already active. We will be in touch soon.",
        `${supabaseUrl}/functions/v1/client-portal?token=${encodeURIComponent(token)}`,
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } },
    );
  }

  const newJob = {
    id: crypto.randomUUID(),
    title: `Reminder Booking: ${reminderName}`,
    jobType,
    description: `Customer requested booking from recurring reminder "${reminderName}".`,
    clientId,
    client: asString(client.name),
    clientEmail: asString(client.email),
    status: "Requested",
    createdAt: new Date().toISOString(),
    requestedByClient: true,
    requestedViaPortal: true,
    requestedViaReminder: true,
    recurringReminderId: reminderId,
  };

  const insertJob = await supabase.from("sas_jobs").insert({
    user_id: reminderRow.user_id,
    data: newJob,
  });

  if (insertJob.error) {
    await logActivity(supabase, reminderRow.user_id, reminderId, "booking_failed", "failed", {
      error: insertJob.error.message,
      dedupeKey,
    });
    return new Response(renderBookingHtml("Booking failed", "We could not submit your request. Please try again.", "/"), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  }

  await logActivity(supabase, reminderRow.user_id, reminderId, "booking_created", "created", {
    dedupeKey,
    jobId: newJob.id,
    clientId,
  });

  const ownerEmail = asString(bundle.profile.email);
  if (ownerEmail) {
    const businessName = asString(bundle.profile.businessName) || "Mustered";
    const subject = `New booking request: ${reminderName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 12px;color:#14202B;">New recurring reminder booking request</h2>
        <p style="margin:0 0 8px;color:#334155;">Customer: ${escapeHtml(client.name)}</p>
        <p style="margin:0 0 8px;color:#334155;">Reminder: ${escapeHtml(reminderName)}</p>
        <p style="margin:0 0 8px;color:#334155;">Business: ${escapeHtml(businessName)}</p>
      </div>
    `;
    try {
      await sendEmailReminder(bundle.profile, ownerEmail, subject, html);
    } catch {
      // Non-blocking: booking is already created.
    }
  }

  return new Response(
    renderBookingHtml(
      "Booking request sent",
      "Thanks, your reminder booking request has been submitted successfully.",
      `${supabaseUrl}/functions/v1/client-portal?token=${encodeURIComponent(token)}`,
    ),
    { headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } },
  );
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase configuration is missing");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const url = new URL(req.url);
    const action = normalise(url.searchParams.get("action") || "");

    if (req.method === "GET" && action === "book") {
      return await handleBookingClick(req, supabase, supabaseUrl);
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const bodyAction = normalise((body as Record<string, unknown>).action || "run");
    const runDate = toDateInPerth(new Date());
    const results: Array<Record<string, unknown>> = [];

    if (bodyAction === "send_now") {
      const reminderId = Number((body as Record<string, unknown>).reminderId || 0);
      if (!reminderId) {
        return new Response(JSON.stringify({ ok: false, error: "reminderId is required for send_now" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authHeader = req.headers.get("Authorization") || "";
      const anonClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY") || "",
        { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
      );
      const { data: authData } = await anonClient.auth.getUser();
      const authUserId = authData.user?.id || "";
      if (!authUserId) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const reminderResp = await supabase
        .from("sas_recurring_reminders")
        .select("id,user_id,data")
        .eq("id", reminderId)
        .maybeSingle();
      if (!reminderResp.data) {
        return new Response(JSON.stringify({ ok: false, error: "Reminder not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const reminderRow = reminderResp.data as ReminderRow;
      if (reminderRow.user_id !== authUserId) {
        return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const outcome = await processReminder(supabase, supabaseUrl, reminderRow, runDate, true);
      return new Response(JSON.stringify({ ok: outcome.ok, action: "send_now", outcome }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dueRowsResp = await supabase
      .from("sas_recurring_reminders")
      .select("id,user_id,data")
      .neq("data->>status", "Paused")
      .eq("data->>nextDueDate", runDate);

    const rows = (dueRowsResp.data || []) as ReminderRow[];
    for (const row of rows) {
      const outcome = await processReminder(supabase, supabaseUrl, row, runDate, false);
      results.push({ id: row.id, ...outcome });
    }

    return new Response(JSON.stringify({
      ok: true,
      action: "run",
      runDate,
      processed: results.length,
      sent: results.filter((r) => r.status === "sent" || r.status === "partial").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-recurring-reminders error:", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
