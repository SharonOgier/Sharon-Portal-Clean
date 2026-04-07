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

  const log = (msg: string, data?: any) =>
    console.log(`[JOB-REMINDERS] ${msg}${data ? ` ${JSON.stringify(data)}` : ""}`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email API keys not configured");

    // Calculate tomorrow's date in YYYY-MM-DD
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    log("Checking for jobs on", { date: tomorrowStr });

    // Fetch all job rows
    const { data: jobRows, error: jobErr } = await supabase.from("sas_jobs").select("*");
    if (jobErr) throw new Error(`Failed to fetch jobs: ${jobErr.message}`);

    let sent = 0;
    let skipped = 0;

    for (const row of (jobRows || [])) {
      const userId = row.user_id;
      const data = row.data as any;
      const jobs = Array.isArray(data) ? data : (data?.jobs || []);

      // Get profile
      const { data: profileRows } = await supabase.from("sas_profile").select("data").eq("user_id", userId).limit(1);
      const profile = (profileRows?.[0]?.data as any) || {};

      if (profile.jobRemindersDisabled) {
        log("Job reminders disabled", { userId });
        continue;
      }

      // Get clients
      const { data: clientRows } = await supabase.from("sas_clients").select("data").eq("user_id", userId).limit(1);
      const clients = Array.isArray(clientRows?.[0]?.data) ? clientRows[0].data : (clientRows?.[0]?.data as any)?.clients || [];

      // Get properties
      const { data: propRows } = await supabase.from("sas_properties").select("data").eq("user_id", userId).limit(1);
      const properties = Array.isArray(propRows?.[0]?.data) ? propRows[0].data : (propRows?.[0]?.data as any)?.properties || [];

      for (const job of jobs) {
        if (!job || job.status === "Completed" || job.status === "Cancelled") continue;
        if (job.startDate !== tomorrowStr) continue;
        if (job.dayBeforeReminderSent) continue;

        // Find client
        const client = clients.find((c: any) => String(c.id) === String(job.clientId));
        if (!client?.email) {
          log("No client email", { jobId: job.id, clientId: job.clientId });
          skipped++;
          continue;
        }

        // Find property address
        const property = properties.find((p: any) => String(p.id) === String(job.propertyId));
        const propertyAddress = property?.address || "";

        // Call the send-job-notification function
        const notifUrl = `${supabaseUrl}/functions/v1/send-job-notification`;
        const res = await fetch(notifUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            type: "day-before-reminder",
            job: { ...job, propertyAddress },
            profile,
            client,
          }),
        });

        const result = await res.json();
        if (result.ok) {
          log("Sent reminder", { jobId: job.id, to: client.email });
          job.dayBeforeReminderSent = new Date().toISOString();
          sent++;
        } else {
          log("Failed to send", { jobId: job.id, error: result.error });
          skipped++;
        }
      }

      // Save updated job data with dayBeforeReminderSent flags
      if (sent > 0) {
        await supabase.from("sas_jobs").update({ data: Array.isArray(data) ? jobs : { ...data, jobs } }).eq("user_id", userId);
      }
    }

    log("Completed", { sent, skipped });
    return new Response(JSON.stringify({ success: true, sent, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
