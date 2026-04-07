import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    if (!token || token.length < 10) {
      return new Response(JSON.stringify({ error: "Invalid or missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the client by portalToken in JSONB data
    const { data: clientRows, error: clientErr } = await supabase
      .from("sas_clients")
      .select("*")
      .filter("data->>portalToken", "eq", token);

    if (clientErr || !clientRows || clientRows.length === 0) {
      return new Response(JSON.stringify({ error: "Portal access not found. Please contact your service provider." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientRow = clientRows[0];
    const clientData = clientRow.data as Record<string, any>;
    const userId = clientRow.user_id;
    const clientName = clientData.name || "";
    const clientEmail = clientData.email || "";

    // GET = fetch portal data
    if (req.method === "GET") {
      // Fetch business profile
      const { data: profileRows } = await supabase
        .from("sas_profile")
        .select("*")
        .eq("user_id", userId);
      const profile = profileRows?.[0]?.data as Record<string, any> || {};

      // Fetch jobs linked to this client
      const { data: jobRows } = await supabase
        .from("sas_jobs")
        .select("*")
        .eq("user_id", userId);
      
      const allJobs = (jobRows || []).map((r: any) => ({ ...r.data, _dbId: r.id }));
      const clientJobs = allJobs.filter((j: any) => {
        const jClient = (j.client || j.clientName || "").toLowerCase();
        return jClient === clientName.toLowerCase() || 
               (clientData.businessName && jClient === clientData.businessName.toLowerCase());
      });

      // Fetch invoices for this client
      const { data: invoiceRows } = await supabase
        .from("sas_invoices")
        .select("*")
        .eq("user_id", userId);
      
      const allInvoices = (invoiceRows || []).map((r: any) => ({ ...r.data, _dbId: r.id }));
      const clientInvoices = allInvoices.filter((inv: any) => {
        const invClient = (inv.client || "").toLowerCase();
        return invClient === clientName.toLowerCase() ||
               (clientData.businessName && invClient === clientData.businessName.toLowerCase());
      });

      // Fetch quotes for this client
      const { data: quoteRows } = await supabase
        .from("sas_quotes")
        .select("*")
        .eq("user_id", userId);
      
      const allQuotes = (quoteRows || []).map((r: any) => ({ ...r.data, _dbId: r.id }));
      const clientQuotes = allQuotes.filter((q: any) => {
        const qClient = (q.client || "").toLowerCase();
        return qClient === clientName.toLowerCase() ||
               (clientData.businessName && qClient === clientData.businessName.toLowerCase());
      });

      // Build safe response (strip sensitive data)
      const safeJobs = clientJobs.map((j: any) => ({
        id: j.id,
        title: j.title || j.description || "Untitled Job",
        description: j.description || "",
        status: j.status || "Pending",
        scheduledDate: j.scheduledDate || j.date || "",
        scheduledTime: j.scheduledTime || j.time || "",
        completedDate: j.completedDate || "",
        propertyAddress: j.propertyAddress || j.address || "",
      }));

      const safeInvoices = clientInvoices.map((inv: any) => ({
        invoiceNumber: inv.invoiceNumber || "",
        date: inv.invoiceDate || inv.date || "",
        dueDate: inv.dueDate || "",
        total: Number(inv.total || 0),
        gst: Number(inv.gst || 0),
        subtotal: Number(inv.subtotal || 0),
        status: inv.status || "Draft",
        currencyCode: inv.currencyCode || "AUD",
        description: inv.description || "",
        lineItems: (inv.lineItems || []).map((li: any) => ({
          description: li.description || "",
          quantity: Number(li.quantity || 0),
          unitPrice: Number(li.unitPrice || 0),
          rowTotal: Number(li.rowTotal || li.unitPrice * li.quantity || 0),
        })),
        paymentUrl: inv.paymentUrl || "",
        stripePaymentUrl: inv.stripePaymentUrl || "",
        paypalPaymentUrl: inv.paypalPaymentUrl || "",
      }));

      const safeQuotes = clientQuotes.map((q: any) => ({
        quoteNumber: q.quoteNumber || "",
        quoteDate: q.quoteDate || "",
        expiryDate: q.expiryDate || "",
        total: Number(q.total || 0),
        status: q.status || "Draft",
        description: q.description || "",
      }));

      const business = {
        name: profile.businessName || profile.name || "Business",
        legalName: profile.legalName || "",
        address: profile.address || "",
        email: profile.email || "",
        phone: profile.phone || "",
        abn: profile.abn || "",
        logoDataUrl: profile.logoDataUrl || "",
        hideLegalName: profile.hideLegalName || false,
      };

      return new Response(JSON.stringify({
        ok: true,
        client: {
          name: clientData.name || "",
          businessName: clientData.businessName || "",
          email: clientData.email || "",
        },
        business,
        jobs: safeJobs,
        invoices: safeInvoices,
        quotes: safeQuotes,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST = submit a job request
    if (req.method === "POST") {
      const body = await req.json();
      const { title, description, preferredDate, preferredTime, address } = body;

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Job title is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create a new job with status "Requested"
      const jobId = crypto.randomUUID();
      const newJob = {
        id: jobId,
        title: title.trim().slice(0, 500),
        description: (description || "").trim().slice(0, 2000),
        client: clientName,
        clientEmail: clientEmail,
        status: "Requested",
        scheduledDate: preferredDate || "",
        scheduledTime: preferredTime || "",
        propertyAddress: (address || "").trim().slice(0, 500),
        createdAt: new Date().toISOString(),
        requestedByClient: true,
        requestedViaPortal: true,
      };

      const { error: insertErr } = await supabase
        .from("sas_jobs")
        .insert({ user_id: userId, data: newJob });

      if (insertErr) {
        console.error("Insert job error:", insertErr);
        return new Response(JSON.stringify({ error: "Failed to submit job request" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        ok: true,
        message: "Your job request has been submitted successfully! We'll be in touch soon.",
        jobId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("client-portal error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
