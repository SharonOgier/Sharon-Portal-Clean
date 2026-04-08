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

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (!data.user) throw new Error("Not authenticated");
    }

    const body = await req.json();
    const {
      invoiceNumber,
      customerName,
      customerEmail,
      description,
      currency = "aud",
      amount,
      successUrl,
      cancelUrl,
    } = body;

    if (!amount || amount <= 0) throw new Error("Invalid amount");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const amountInCents = Math.round(amount * 100);
    const origin = req.headers.get("origin") || "https://sharonogier.com";

    const sessionParams: any = {
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description || `Invoice ${invoiceNumber || ""}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${origin}/?stripe=success`,
      cancel_url: cancelUrl || `${origin}/?stripe=cancel`,
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    if (invoiceNumber) {
      sessionParams.metadata = { invoiceNumber, customerName: customerName || "" };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-INVOICE-CHECKOUT] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
