import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    console.error("[STRIPE-WEBHOOK] STRIPE_SECRET_KEY not set");
    return new Response("Server error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // Fallback: parse without signature verification (dev/testing)
      event = JSON.parse(body);
      console.warn("[STRIPE-WEBHOOK] No webhook secret configured — skipping signature verification");
    }
  } catch (err) {
    console.error("[STRIPE-WEBHOOK] Signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`[STRIPE-WEBHOOK] Received event: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const invoiceNumber = session.metadata?.invoiceNumber;
    const paymentStatus = session.payment_status;

    console.log(`[STRIPE-WEBHOOK] Checkout completed — invoice: ${invoiceNumber}, payment: ${paymentStatus}`);

    if (paymentStatus === "paid" && invoiceNumber) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Find the invoice by invoiceNumber in the JSONB data
      const { data: rows, error: fetchError } = await supabaseAdmin
        .from("sas_invoices")
        .select("id, user_id, data")
        .filter("data->>invoiceNumber", "eq", invoiceNumber);

      if (fetchError) {
        console.error("[STRIPE-WEBHOOK] DB fetch error:", fetchError.message);
        return new Response("DB error", { status: 500 });
      }

      if (!rows || rows.length === 0) {
        console.warn(`[STRIPE-WEBHOOK] No invoice found for ${invoiceNumber}`);
        return new Response("OK", { status: 200 });
      }

      for (const row of rows) {
        const invoiceData = row.data as any;
        if (invoiceData.status === "Paid") {
          console.log(`[STRIPE-WEBHOOK] Invoice ${invoiceNumber} already paid, skipping`);
          continue;
        }

        const updatedData = {
          ...invoiceData,
          status: "Paid",
          paidAt: new Date().toISOString(),
          paidVia: "Stripe",
          stripeSessionId: session.id,
        };

        const { error: updateError } = await supabaseAdmin
          .from("sas_invoices")
          .update({ data: updatedData, updated_at: new Date().toISOString() })
          .eq("id", row.id);

        if (updateError) {
          console.error(`[STRIPE-WEBHOOK] Failed to update invoice ${invoiceNumber}:`, updateError.message);
        } else {
          console.log(`[STRIPE-WEBHOOK] Invoice ${invoiceNumber} marked as Paid`);
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});