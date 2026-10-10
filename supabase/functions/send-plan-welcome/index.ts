import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";
import { deliverWelcomeBatch, workerAuthorized } from "../_shared/welcome-worker.ts";

// Scheduler/service-role only. Ordinary authenticated users cannot invoke sends.
Deno.serve(async (request) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!workerAuthorized(request.headers.get("authorization"), serviceKey)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const url = Deno.env.get("SUPABASE_URL");
  if (!url || !serviceKey || !Deno.env.get("RESEND_API_KEY")) {
    // Do not claim jobs until configuration exists: preserve the retry window.
    return Response.json({ error: "Welcome email service not configured" }, { status: 503 });
  }
  const database = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const totals = await deliverWelcomeBatch({
      async claim() {
        const { data, error } = await database.rpc("claim_plan_welcome_email");
        if (error) throw new Error("welcome_claim_failed");
        return data?.[0] ?? null;
      },
      async finish(job, result) {
        const { data, error } = await database.rpc("finish_plan_welcome_email", {
          p_id: job.id,
          p_lease_token: job.lease_token,
          p_sent_id: result.ok ? result.id : null,
          p_error: result.ok ? null : result.error,
          p_retryable: !result.ok && result.retryable,
        });
        return !error && data === true;
      },
    }, { getSecret: () => Deno.env.get("RESEND_API_KEY") });
    return Response.json(totals);
  } catch {
    console.error("plan_welcome_worker_failed");
    return Response.json({ error: "Welcome email processing failed" }, { status: 500 });
  }
});
