import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SKY_PAY_STATUS_BASE = "https://fxdpbbscczpvmblyhnts.supabase.co/functions/v1/sdk/momo-status";

const plans = {
  professional: 15000,
  business: 50000,
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const skyPayApiKey = Deno.env.get("SKYPAY_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase function environment is not configured.");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Sign in is required." }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const reference = String(body.reference || "").trim();
    const planId = String(body.planId || "").trim() as keyof typeof plans;

    if (!reference || !plans[planId]) {
      return Response.json({ error: "Payment reference and valid plan are required." }, { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    let { data: transaction, error: transactionError } = await serviceClient
      .from("payment_transactions")
      .select("*")
      .eq("skypay_reference_id", reference)
      .maybeSingle();

    if (transactionError) {
      throw new Error(transactionError.message);
    }

    if (!transaction) {
      const statusResponse = await fetch(`${SKY_PAY_STATUS_BASE}/${encodeURIComponent(reference)}`, {
        headers: skyPayApiKey ? { "X-Api-Key": skyPayApiKey } : undefined,
      }).catch(() => null);
      const statusPayload = statusResponse ? await statusResponse.json().catch(() => null) : null;
      const remoteStatus = String(statusPayload?.status || "").toLowerCase();

      if (remoteStatus === "success" || remoteStatus === "successful") {
        const { data: insertedTransaction, error: insertError } = await serviceClient
          .from("payment_transactions")
          .insert({
            user_id: user.id,
            skypay_reference_id: reference,
            plan_id: planId,
            amount: plans[planId],
            currency: "UGX",
            status: "completed",
            raw_payload: { source: "skypay-status", status: statusPayload },
          })
          .select("*")
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        transaction = insertedTransaction;
      } else {
        return Response.json({
          success: false,
          pending: true,
          error: "Waiting for SkyPay webhook confirmation.",
        }, { status: 202, headers: corsHeaders });
      }
    }

    if (transaction.status !== "completed") {
      return Response.json({
        success: false,
        pending: transaction.status === "pending",
        error: `Payment is ${transaction.status}.`,
      }, { status: 409, headers: corsHeaders });
    }

    if (transaction.amount !== plans[planId] || transaction.currency !== "UGX") {
      return Response.json({ error: "Payment amount does not match the selected plan." }, { status: 400, headers: corsHeaders });
    }

    if (transaction.user_id && transaction.user_id !== user.id) {
      return Response.json({ error: "This payment has already been assigned to another account." }, { status: 403, headers: corsHeaders });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error: updatePaymentError } = await serviceClient
      .from("payment_transactions")
      .update({ user_id: user.id, plan_id: planId })
      .eq("skypay_reference_id", reference);

    if (updatePaymentError) {
      throw new Error(updatePaymentError.message);
    }

    const { error: subscriptionError } = await serviceClient
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        plan_id: planId,
        status: "active",
        skypay_reference_id: reference,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      }, { onConflict: "user_id" });

    if (subscriptionError) {
      throw new Error(subscriptionError.message);
    }

    return Response.json({ success: true, planId, currentPeriodEnd: periodEnd.toISOString() }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Unable to confirm SkyPay payment.",
    }, { status: 500, headers: corsHeaders });
  }
});