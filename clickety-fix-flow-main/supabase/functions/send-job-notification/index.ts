import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

type NotificationType = "job-booked" | "day-before-reminder" | "job-completed" | "review-request";

function escapeHtml(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDateAU(iso: string): string {
  if (!iso) return "—";
  const p = iso.split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function fmtTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = +h;
  return `${hh > 12 ? hh - 12 : hh || 12}:${m} ${hh >= 12 ? "pm" : "am"}`;
}

function buildJobBookedHtml(job: any, profile: any, client: any): string {
  const biz = escapeHtml(profile.businessName || "Our Business");
  const bizPhone = escapeHtml(profile.phone || "");
  const bizEmail = escapeHtml(profile.email || "");
  const clientName = escapeHtml(client?.name || "Valued Customer");
  const jobTitle = escapeHtml(job.title || "");
  const dateStr = fmtDateAU(job.startDate);
  const timeStr = fmtTime(job.startTime);
  const endTimeStr = fmtTime(job.endTime);
  const propertyAddr = escapeHtml(job.propertyAddress || "");

  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="border-top:4px solid #6A1B9A;padding:24px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <h1 style="color:#6A1B9A;font-size:22px;margin:0 0 16px;">Job Booked ✅</h1>
    <p style="color:#333;font-size:14px;line-height:1.6;">Hi ${clientName},</p>
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Great news — your job has been booked and confirmed. Here are the details:
    </p>
    <div style="background:#F8FAFC;padding:16px;border-radius:8px;margin:16px 0;">
      <table style="width:100%;font-size:13px;color:#333;">
        <tr><td style="padding:6px 0;font-weight:700;width:120px;">Job:</td><td>${jobTitle}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">Date:</td><td>${dateStr}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">Time:</td><td>${timeStr}${endTimeStr ? ` – ${endTimeStr}` : ""}</td></tr>
        ${propertyAddr ? `<tr><td style="padding:6px 0;font-weight:700;">Location:</td><td>${propertyAddr}</td></tr>` : ""}
      </table>
    </div>
    <p style="color:#333;font-size:14px;line-height:1.6;">
      If you need to make any changes, please don't hesitate to contact us.
    </p>
    <p style="color:#64748B;font-size:13px;margin-top:24px;">
      Kind regards,<br/><strong>${biz}</strong>
      ${bizEmail ? `<br/>${bizEmail}` : ""}
      ${bizPhone ? `<br/>${bizPhone}` : ""}
    </p>
  </div>
</div>`;
}

function buildDayBeforeReminderHtml(job: any, profile: any, client: any): string {
  const biz = escapeHtml(profile.businessName || "Our Business");
  const bizPhone = escapeHtml(profile.phone || "");
  const bizEmail = escapeHtml(profile.email || "");
  const clientName = escapeHtml(client?.name || "Valued Customer");
  const jobTitle = escapeHtml(job.title || "");
  const timeStr = fmtTime(job.startTime);
  const endTimeStr = fmtTime(job.endTime);
  const propertyAddr = escapeHtml(job.propertyAddress || "");

  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="border-top:4px solid #1E88E5;padding:24px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <h1 style="color:#1E88E5;font-size:22px;margin:0 0 16px;">Appointment Reminder 📅</h1>
    <p style="color:#333;font-size:14px;line-height:1.6;">Hi ${clientName},</p>
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Just a friendly reminder that your appointment is <strong>tomorrow${timeStr ? ` at ${timeStr}` : ""}</strong>.
    </p>
    <div style="background:#F8FAFC;padding:16px;border-radius:8px;margin:16px 0;">
      <table style="width:100%;font-size:13px;color:#333;">
        <tr><td style="padding:6px 0;font-weight:700;width:120px;">Job:</td><td>${jobTitle}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">Time:</td><td>${timeStr}${endTimeStr ? ` – ${endTimeStr}` : ""}</td></tr>
        ${propertyAddr ? `<tr><td style="padding:6px 0;font-weight:700;">Location:</td><td>${propertyAddr}</td></tr>` : ""}
      </table>
    </div>
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Please ensure access to the site is available. If you need to reschedule, contact us as soon as possible.
    </p>
    <p style="color:#64748B;font-size:13px;margin-top:24px;">
      See you tomorrow!<br/><strong>${biz}</strong>
      ${bizEmail ? `<br/>${bizEmail}` : ""}
      ${bizPhone ? `<br/>${bizPhone}` : ""}
    </p>
  </div>
</div>`;
}

function buildJobCompletedHtml(job: any, profile: any, client: any, invoiceInfo?: any): string {
  const biz = escapeHtml(profile.businessName || "Our Business");
  const bizPhone = escapeHtml(profile.phone || "");
  const bizEmail = escapeHtml(profile.email || "");
  const clientName = escapeHtml(client?.name || "Valued Customer");
  const jobTitle = escapeHtml(job.title || "");
  const dateStr = fmtDateAU(job.startDate);

  const invoiceSection = invoiceInfo ? `
    <div style="background:#E8F5E9;padding:16px;border-radius:8px;margin:16px 0;">
      <p style="color:#2E7D32;font-weight:700;font-size:14px;margin:0 0 8px;">Invoice Attached</p>
      <table style="width:100%;font-size:13px;color:#333;">
        <tr><td style="padding:4px 0;font-weight:700;width:120px;">Invoice #:</td><td>${escapeHtml(invoiceInfo.invoiceNumber || "")}</td></tr>
        <tr><td style="padding:4px 0;font-weight:700;">Amount:</td><td>$${Number(invoiceInfo.total || 0).toFixed(2)}</td></tr>
        ${invoiceInfo.dueDate ? `<tr><td style="padding:4px 0;font-weight:700;">Due Date:</td><td>${fmtDateAU(invoiceInfo.dueDate)}</td></tr>` : ""}
      </table>
      ${invoiceInfo.paymentLink ? `
        <div style="text-align:center;margin-top:16px;">
          <a href="${escapeHtml(invoiceInfo.paymentLink)}" style="display:inline-block;background:#2E7D32;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px;">Pay Invoice</a>
        </div>
      ` : ""}
    </div>
  ` : "";

  // Before/after photos section
  const photos = job.photos || { before: [], after: [] };
  const hasBefore = (photos.before || []).length > 0;
  const hasAfter = (photos.after || []).length > 0;
  const photoSection = (hasBefore || hasAfter) ? `
    <div style="margin:20px 0;">
      <p style="font-weight:700;font-size:14px;color:#333;margin:0 0 12px;">Site Photos</p>
      ${hasBefore ? `
        <p style="font-size:12px;font-weight:700;color:#64748B;margin:0 0 8px;">📷 Before</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          ${photos.before.slice(0, 4).map((p: any) => `<img src="${escapeHtml(p.url)}" style="width:120px;height:90px;object-fit:cover;border-radius:6px;border:1px solid #E2E8F0;" />`).join("")}
        </div>
      ` : ""}
      ${hasAfter ? `
        <p style="font-size:12px;font-weight:700;color:#64748B;margin:0 0 8px;">✅ After</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${photos.after.slice(0, 4).map((p: any) => `<img src="${escapeHtml(p.url)}" style="width:120px;height:90px;object-fit:cover;border-radius:6px;border:1px solid #E2E8F0;" />`).join("")}
        </div>
      ` : ""}
    </div>
  ` : "";

  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="border-top:4px solid #2E7D32;padding:24px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <h1 style="color:#2E7D32;font-size:22px;margin:0 0 16px;">Job Completed ✅</h1>
    <p style="color:#333;font-size:14px;line-height:1.6;">Hi ${clientName},</p>
    <p style="color:#333;font-size:14px;line-height:1.6;">
      We're pleased to let you know that the following job has been completed:
    </p>
    <div style="background:#F8FAFC;padding:16px;border-radius:8px;margin:16px 0;">
      <table style="width:100%;font-size:13px;color:#333;">
        <tr><td style="padding:6px 0;font-weight:700;width:120px;">Job:</td><td>${jobTitle}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">Date:</td><td>${dateStr}</td></tr>
      </table>
    </div>
    ${photoSection}
    ${invoiceSection}
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Thank you for choosing us. If you have any questions or need anything further, please don't hesitate to get in touch.
    </p>
    <p style="color:#64748B;font-size:13px;margin-top:24px;">
      Kind regards,<br/><strong>${biz}</strong>
      ${bizEmail ? `<br/>${bizEmail}` : ""}
      ${bizPhone ? `<br/>${bizPhone}` : ""}
    </p>
  </div>
</div>`;
}

function buildReviewRequestHtml(job: any, profile: any, client: any, googleReviewUrl?: string, portalUrl?: string): string {
  const biz = escapeHtml(profile.businessName || "Our Business");
  const bizPhone = escapeHtml(profile.phone || "");
  const bizEmail = escapeHtml(profile.email || "");
  const clientName = escapeHtml(client?.name || "Valued Customer");
  const jobTitle = escapeHtml(job.title || "your recent job");

  const googleBtn = googleReviewUrl ? `
    <div style="text-align:center;margin:24px 0;">
      <a href="${escapeHtml(googleReviewUrl)}" style="display:inline-block;background:#4285F4;color:#fff;padding:14px 32px;border-radius:10px;font-weight:800;text-decoration:none;font-size:15px;box-shadow:0 4px 12px rgba(66,133,244,0.3);">
        ⭐ Leave a Google Review
      </a>
    </div>
  ` : "";

  const portalBtn = portalUrl ? `
    <div style="text-align:center;margin:16px 0;">
      <a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#6A1B9A;color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;">
        📋 View Your Job History
      </a>
    </div>
  ` : "";

  const testimonialSection = !googleReviewUrl ? `
    <div style="background:#FFF8E1;padding:16px;border-radius:10px;margin:16px 0;border:1px solid #FFE082;">
      <p style="font-weight:700;color:#F57F17;font-size:14px;margin:0 0 8px;">💬 Share Your Experience</p>
      <p style="color:#333;font-size:13px;line-height:1.6;margin:0;">
        We'd love to hear how we did! Simply reply to this email with a few words about your experience — we may feature it on our website or socials (with your permission of course!).
      </p>
    </div>
  ` : `
    <div style="background:#F8FAFC;padding:16px;border-radius:10px;margin:16px 0;border:1px solid #E2E8F0;">
      <p style="color:#475569;font-size:13px;line-height:1.6;margin:0;">
        Alternatively, feel free to reply to this email with a short testimonial — we'd love to share your feedback (with your permission) on our website or socials.
      </p>
    </div>
  `;

  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="border-top:4px solid #FFB300;padding:28px;background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:48px;margin-bottom:8px;">⭐</div>
      <h1 style="color:#333;font-size:22px;margin:0;">How did we do?</h1>
    </div>
    <p style="color:#333;font-size:14px;line-height:1.7;">Hi ${clientName},</p>
    <p style="color:#333;font-size:14px;line-height:1.7;">
      Thank you for trusting <strong>${biz}</strong> with <em>${jobTitle}</em>. We hope you're happy with the result!
    </p>
    <p style="color:#333;font-size:14px;line-height:1.7;">
      Your feedback means the world to us — it helps other locals find quality tradespeople and keeps us improving.
      ${googleReviewUrl ? "It only takes 30 seconds:" : ""}
    </p>
    ${googleBtn}
    ${testimonialSection}
    ${portalBtn}
    <p style="color:#333;font-size:14px;line-height:1.7;">
      Thanks again for your business — we look forward to helping you in the future! 🙏
    </p>
    <p style="color:#64748B;font-size:13px;margin-top:28px;">
      Warm regards,<br/><strong>${biz}</strong>
      ${bizEmail ? `<br/>${bizEmail}` : ""}
      ${bizPhone ? `<br/>${bizPhone}` : ""}
    </p>
  </div>
  <div style="text-align:center;margin-top:16px;">
    <span style="font-size:11px;color:#94A3B8;">Powered by Mustered</span>
  </div>
</div>`;
}


serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const body = await req.json();
    const { type, job, profile, client, invoiceInfo, propertyAddress, googleReviewUrl, portalUrl } = body as {
      type: NotificationType;
      job: any;
      profile: any;
      client: any;
      invoiceInfo?: any;
      propertyAddress?: string;
      googleReviewUrl?: string;
      portalUrl?: string;
    };

    if (!type || !job || !client?.email) {
      return new Response(JSON.stringify({ error: "type, job, and client.email are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Merge property address into job for templates
    const jobWithAddr = { ...job, propertyAddress: propertyAddress || job.propertyAddress || "" };

    let html: string;
    let subject: string;
    const biz = profile?.businessName || "Our Business";

    switch (type) {
      case "job-booked":
        html = buildJobBookedHtml(jobWithAddr, profile || {}, client);
        subject = `Job Confirmed — ${job.title || "Your appointment"} on ${fmtDateAU(job.startDate)}`;
        break;
      case "day-before-reminder":
        html = buildDayBeforeReminderHtml(jobWithAddr, profile || {}, client);
        subject = `Reminder: Your appointment is tomorrow${job.startTime ? ` at ${fmtTime(job.startTime)}` : ""}`;
        break;
      case "job-completed":
        html = buildJobCompletedHtml(jobWithAddr, profile || {}, client, invoiceInfo);
        subject = `Job Completed — ${job.title || "Your job"}${invoiceInfo ? ` | Invoice #${invoiceInfo.invoiceNumber}` : ""}`;
        break;
      case "review-request":
        html = buildReviewRequestHtml(jobWithAddr, profile || {}, client, googleReviewUrl, portalUrl);
        subject = `How was your experience with ${biz}? ⭐`;
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown notification type: ${type}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const normEmail = String(profile?.email || "").trim().toLowerCase();
    const fromEmail = normEmail.endsWith("@sharonogier.com") ? normEmail : "info@sharonogier.com";

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: `${biz} <${fromEmail}>`,
        to: [client.email],
        subject,
        html,
        reply_to: profile?.email || fromEmail,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Email send failed:", JSON.stringify(data));
      return new Response(JSON.stringify({ ok: false, error: data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-job-notification error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
