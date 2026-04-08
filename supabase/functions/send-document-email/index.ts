import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const body = await req.json();
    const {
      to,
      subject,
      html,
      replyTo,
      businessName,
      businessEmail,
    } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject || !html) {
      return new Response(
        JSON.stringify({ error: "Subject and html are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromName = businessName || "Sharon Ogier Accounting";
    const normalisedBusinessEmail = String(businessEmail || "").trim().toLowerCase();
    const fromEmail = normalisedBusinessEmail.endsWith("@sharonogier.com")
      ? normalisedBusinessEmail
      : "info@sharonogier.com";

    const results = [];
    for (const recipient of to) {
      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [recipient],
          subject,
          html,
          reply_to: replyTo || businessEmail || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Resend gateway error for", recipient, JSON.stringify(data));
        results.push({ recipient, ok: false, error: data });
      } else {
        results.push({ recipient, ok: true, id: data.id });
      }
    }

    const allOk = results.every((r: any) => r.ok);
    const sentCount = results.filter((r: any) => r.ok).length;

    return new Response(
      JSON.stringify({
        ok: allOk,
        message: allOk
          ? `Email sent to ${sentCount} recipient(s)`
          : `Sent to ${sentCount}/${results.length} recipient(s)`,
        results,
      }),
      {
        status: allOk ? 200 : 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("send-document-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
