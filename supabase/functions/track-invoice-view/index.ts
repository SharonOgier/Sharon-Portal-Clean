import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const trackingId = url.searchParams.get("id");

  if (!trackingId) {
    return new Response(JSON.stringify({ error: "Missing tracking id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // Find the invoice by tracking ID across all users
    const { data: invoiceRows } = await supabase.from("sas_invoices").select("*");
    let foundUserId: string | null = null;
    let foundInvoice: any = null;
    let foundIndex = -1;

    for (const row of (invoiceRows || [])) {
      const data = row.data as any;
      const invoices = Array.isArray(data) ? data : (data?.invoices || []);
      const idx = invoices.findIndex((inv: any) => inv.trackingId === trackingId);
      if (idx >= 0) {
        foundUserId = row.user_id;
        foundInvoice = invoices[idx];
        foundIndex = idx;

        // Mark as viewed if not already
        if (!foundInvoice.viewedAt) {
          invoices[idx] = { ...foundInvoice, viewedAt: new Date().toISOString(), viewStatus: foundInvoice.status === "Paid" ? "Paid" : "Viewed" };
          await supabase.from("sas_invoices").update({ data: Array.isArray(data) ? invoices : { ...data, invoices } }).eq("user_id", row.user_id);
        }
        break;
      }
    }

    if (!foundInvoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return invoice data for the public view page
    return new Response(JSON.stringify({
      success: true,
      invoice: {
        invoiceNumber: foundInvoice.invoiceNumber,
        clientName: foundInvoice.clientName,
        total: foundInvoice.total,
        dueDate: foundInvoice.dueDate,
        status: foundInvoice.status,
        invoiceDate: foundInvoice.invoiceDate,
        lineItems: foundInvoice.lineItems || [],
        viewedAt: foundInvoice.viewedAt,
        paymentLink: foundInvoice.paymentLink,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
