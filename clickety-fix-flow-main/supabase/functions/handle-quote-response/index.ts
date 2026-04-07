import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the quote by publicToken in the JSONB data field
    const { data: rows, error: fetchErr } = await supabase
      .from("sas_quotes")
      .select("*")
      .filter("data->>publicToken", "eq", token);

    if (fetchErr || !rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quoteRow = rows[0];
    const quoteData = quoteRow.data as Record<string, any>;

    // Also fetch the owner's profile for context
    const { data: profileRows } = await supabase
      .from("sas_profile")
      .select("*")
      .eq("user_id", quoteRow.user_id);
    const profileData = (profileRows?.[0]?.data || {}) as Record<string, any>;

    // Fetch the client record
    let clientData: Record<string, any> = {};
    if (quoteData.clientId) {
      const { data: clientRows } = await supabase
        .from("sas_clients")
        .select("*")
        .eq("user_id", quoteRow.user_id);
      const match = (clientRows || []).find(
        (c: any) => String((c.data as any)?.id) === String(quoteData.clientId)
      );
      if (match) clientData = match.data as Record<string, any>;
    }

    // GET = return quote data for display
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          ok: true,
          quote: {
            quoteNumber: quoteData.quoteNumber || "",
            quoteDate: quoteData.quoteDate || "",
            expiryDate: quoteData.expiryDate || "",
            description: quoteData.description || "",
            comments: quoteData.comments || "",
            lineItems: quoteData.lineItems || [],
            subtotal: quoteData.subtotal || 0,
            gst: quoteData.gst || 0,
            total: quoteData.total || 0,
            currencyCode: quoteData.currencyCode || "AUD",
            status: quoteData.status || "Sent",
            gstStatus: quoteData.gstStatus || "",
            hidePhoneNumber: quoteData.hidePhoneNumber || false,
          },
          business: {
            name: profileData.businessName || "",
            legalName: profileData.legalBusinessName || "",
            address: profileData.hideAddressOnDocs ? "" : profileData.address || "",
            email: profileData.email || "",
            phone: profileData.phone || "",
            abn: profileData.abn || "",
            logoDataUrl: profileData.logoDataUrl || "",
            hideLegalName: profileData.hideLegalNameOnDocs || false,
          },
          client: {
            name: clientData.name || "",
            businessName: clientData.businessName || "",
            addressDetails: clientData.includeAddressDetails ? clientData.addressDetails || "" : "",
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST = accept or decline
    if (req.method === "POST") {
      const body = await req.json();
      const action = body.action; // "accept" or "decline"
      const clientMessage = body.message || "";

      if (!["accept", "decline"].includes(action)) {
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already responded
      if (quoteData.status === "Accepted" || quoteData.status === "Declined") {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `This quote has already been ${quoteData.status.toLowerCase()}.`,
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check expiry
      if (quoteData.expiryDate && new Date(quoteData.expiryDate) < new Date()) {
        return new Response(
          JSON.stringify({ ok: false, error: "This quote has expired." }),
          {
            status: 410,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const newStatus = action === "accept" ? "Accepted" : "Declined";
      const updatedData = {
        ...quoteData,
        status: newStatus,
        respondedAt: new Date().toISOString(),
        clientResponse: clientMessage,
      };

      // Update the quote
      const { error: updateErr } = await supabase
        .from("sas_quotes")
        .update({ data: updatedData, updated_at: new Date().toISOString() })
        .eq("id", quoteRow.id);

      if (updateErr) {
        console.error("Quote update error:", updateErr);
        return new Response(JSON.stringify({ error: "Failed to update quote" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If accepted, create a job
      let jobCreated = false;
      if (action === "accept") {
        const jobId = Date.now();
        const today = new Date().toISOString().split("T")[0];
        const jobPayload = {
          id: jobId,
          title: quoteData.description || `Job from Quote #${quoteData.quoteNumber || quoteData.id}`,
          clientId: quoteData.clientId || "",
          status: "Scheduled",
          priority: "Medium",
          startDate: today,
          startTime: "09:00",
          endDate: today,
          endTime: "17:00",
          quoteId: String(quoteData.id),
          quotedTotal: Number(quoteData.total) || 0,
          colour: "#6A1B9A",
          notes: `Auto-created from Quote #${quoteData.quoteNumber || quoteData.id} — accepted by client online`,
          costs: { labour: [], materials: [], subcontractor: [], misc: [] },
        };

        const { error: jobErr } = await supabase.from("sas_jobs").insert({
          user_id: quoteRow.user_id,
          data: jobPayload,
        });

        if (jobErr) {
          console.error("Job creation error:", jobErr);
        } else {
          jobCreated = true;
        }
      }

      // Send notification email to the owner
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

        if (LOVABLE_API_KEY && RESEND_API_KEY && profileData.email) {
          const clientName = clientData.name || "A client";
          const quoteRef = quoteData.quoteNumber || quoteData.id;
          const emoji = action === "accept" ? "✅" : "❌";
          const actionLabel = action === "accept" ? "ACCEPTED" : "DECLINED";
          const jobNote = jobCreated
            ? `<p style="color:#006D6D; font-weight:700;">A new job has been automatically created and is ready in your Scheduling page.</p>`
            : "";

          const notificationHtml = `
<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0; padding:24px; background:#F8FAFC; font-family:Arial, sans-serif; color:#14202B;">
  <div style="max-width:600px; margin:0 auto; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:18px; padding:28px;">
    <div style="font-size:28px; font-weight:900; color:${action === "accept" ? "#006D6D" : "#991B1B"}; margin-bottom:16px;">
      ${emoji} Quote ${actionLabel}
    </div>
    <p style="font-size:16px; margin-bottom:8px;"><strong>${clientName}</strong> has <strong>${actionLabel.toLowerCase()}</strong> Quote #${quoteRef}.</p>
    <p style="font-size:14px; color:#475569;">Total: <strong>$${Number(quoteData.total || 0).toFixed(2)}</strong></p>
    ${clientMessage ? `<div style="margin-top:16px; padding:14px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px;"><div style="font-size:12px; font-weight:700; color:#64748B; margin-bottom:6px;">Client's message:</div><div style="font-size:14px; color:#14202B;">${clientMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div></div>` : ""}
    ${jobNote}
    <p style="margin-top:24px; font-size:13px; color:#94A3B8;">This is an automated notification from Mustered.</p>
  </div>
</body>
</html>`;

          const fromEmail = String(profileData.email || "").trim().toLowerCase().endsWith("@sharonogier.com")
            ? profileData.email
            : "info@sharonogier.com";

          await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": RESEND_API_KEY,
            },
            body: JSON.stringify({
              from: `Mustered <${fromEmail}>`,
              to: [profileData.email],
              subject: `${emoji} Quote #${quoteRef} ${actionLabel} by ${clientName}`,
              html: notificationHtml,
            }),
          });
        }
      } catch (notifyErr) {
        console.error("Owner notification error:", notifyErr);
        // Non-fatal — don't fail the response
      }

      return new Response(
        JSON.stringify({
          ok: true,
          status: newStatus,
          jobCreated,
          message:
            action === "accept"
              ? "Quote accepted! The business has been notified and will be in touch."
              : "Quote declined. The business has been notified.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("handle-quote-response error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
