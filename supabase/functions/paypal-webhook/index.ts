import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // PayPal IPN sends form-encoded POST
  const body = await req.text();
  console.log("[PAYPAL-WEBHOOK] Received IPN notification");

  // Step 1: Verify with PayPal
  const verifyUrl = "https://ipnpb.paypal.com/cgi-bin/webscr";
  const verifyBody = `cmd=_notify-validate&${body}`;

  try {
    const verifyRes = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyBody,
    });
    const verifyText = await verifyRes.text();

    if (verifyText.trim() !== "VERIFIED") {
      console.error("[PAYPAL-WEBHOOK] IPN verification failed:", verifyText);
      return new Response("IPN not verified", { status: 400 });
    }

    console.log("[PAYPAL-WEBHOOK] IPN verified successfully");

    // Step 2: Parse IPN data
    const params = new URLSearchParams(body);
    const paymentStatus = params.get("payment_status");
    const invoiceNumber = params.get("invoice");
    const txnId = params.get("txn_id");
    const receiverEmail = params.get("receiver_email") || params.get("business");
    const mcGross = params.get("mc_gross");
    const mcCurrency = params.get("mc_currency");

    console.log(`[PAYPAL-WEBHOOK] Status: ${paymentStatus}, Invoice: ${invoiceNumber}, Amount: ${mcGross} ${mcCurrency}, TxnID: ${txnId}`);

    if (paymentStatus !== "Completed") {
      console.log(`[PAYPAL-WEBHOOK] Payment status is ${paymentStatus}, not marking as paid`);
      return new Response("OK", { status: 200 });
    }

    if (!invoiceNumber) {
      console.warn("[PAYPAL-WEBHOOK] No invoice number in IPN");
      return new Response("OK", { status: 200 });
    }

    // Step 3: Update invoice in database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: rows, error: fetchError } = await supabaseAdmin
      .from("sas_invoices")
      .select("id, user_id, data")
      .filter("data->>invoiceNumber", "eq", invoiceNumber);

    if (fetchError) {
      console.error("[PAYPAL-WEBHOOK] DB fetch error:", fetchError.message);
      return new Response("DB error", { status: 500 });
    }

    if (!rows || rows.length === 0) {
      console.warn(`[PAYPAL-WEBHOOK] No invoice found for ${invoiceNumber}`);
      return new Response("OK", { status: 200 });
    }

    for (const row of rows) {
      const invoiceData = row.data as any;
      if (invoiceData.status === "Paid") {
        console.log(`[PAYPAL-WEBHOOK] Invoice ${invoiceNumber} already paid, skipping`);
        continue;
      }

      const updatedData = {
        ...invoiceData,
        status: "Paid",
        paidAt: new Date().toISOString(),
        paidVia: "PayPal",
        paypalTxnId: txnId,
        paypalAmount: mcGross,
        paypalCurrency: mcCurrency,
      };

      const { error: updateError } = await supabaseAdmin
        .from("sas_invoices")
        .update({ data: updatedData, updated_at: new Date().toISOString() })
        .eq("id", row.id);

      if (updateError) {
        console.error(`[PAYPAL-WEBHOOK] Failed to update invoice ${invoiceNumber}:`, updateError.message);
      } else {
        console.log(`[PAYPAL-WEBHOOK] Invoice ${invoiceNumber} marked as Paid via PayPal`);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("[PAYPAL-WEBHOOK] Error:", e.message);
    return new Response("Error", { status: 500 });
  }
});