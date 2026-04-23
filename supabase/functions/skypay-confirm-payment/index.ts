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
    const rawReference = String(body.reference || "").trim();
    const paymentId = String(body.paymentId || "").trim();
    const rawProductId = String(body.productId || body.product_id || "").trim();
    const reference = rawReference && !rawReference.startsWith("afuchat-") ? rawReference : "";
    const productId = rawProductId || (rawReference.startsWith("afuchat-") ? rawReference : "");
    const planId = String(body.planId || "").trim() as keyof typeof plans;

    if (!plans[planId]) {
      return Response.json({ error: "Valid plan is required." }, { status: 400, headers: corsHeaders });
    }
    if (!reference && !paymentId && !productId) {
      return Response.json({ error: "Payment reference, payment id, or product id is required." }, { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the local row first — by real SkyPay reference, then payment row id, then client_reference (product_id)
    let transaction: any = null;
    if (reference) {
      const { data, error } = await serviceClient
        .from("payment_transactions")
        .select("*")
        .eq("skypay_reference_id", reference)
        .maybeSingle();
      if (error) throw new Error(error.message);
      transaction = data;
    }
    if (!transaction && paymentId) {
      const { data, error } = await serviceClient
        .from("payment_transactions")
        .select("*")
        .eq("id", paymentId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      transaction = data;
    }
    if (!transaction && productId) {
      const { data, error } = await serviceClient
        .from("payment_transactions")
        .select("*")
        .eq("client_reference", productId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      transaction = data;
    }

    // Last-resort recovery: attach the latest pending transaction for this user + plan.
    if (!transaction && reference) {
      const { data, error } = await serviceClient
        .from("payment_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("plan_id", planId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      transaction = data;
    }

    const isRealSkyPayReference = (value: string | null | undefined) => !!value && !String(value).startsWith("afuchat-");

    // Resolve the identifier to query: prefer the real SkyPay reference, otherwise fall back to the checkout product_id
    const lookupRef =
      reference ||
      (isRealSkyPayReference(transaction?.skypay_reference_id) ? transaction?.skypay_reference_id : "") ||
      (productId || transaction?.client_reference || "");

    // If the local row says it's still pending (or we have no row at all), poll SkyPay to see if it actually completed
    if (!transaction || transaction.status !== "completed") {
      let remoteStatus: string = "";
      let statusPayload: any = null;
      let resolvedReference: string = isRealSkyPayReference(transaction?.skypay_reference_id)
        ? String(transaction.skypay_reference_id)
        : reference;

      if (lookupRef) {
        const statusResponse = await fetch(`${SKY_PAY_STATUS_BASE}/${encodeURIComponent(lookupRef)}`, {
          headers: skyPayApiKey ? { "X-Api-Key": skyPayApiKey } : undefined,
        }).catch(() => null);
        statusPayload = statusResponse ? await statusResponse.json().catch(() => null) : null;
        remoteStatus = String(statusPayload?.status || "").toLowerCase();
        if (statusPayload?.reference_id && isRealSkyPayReference(statusPayload.reference_id)) {
          resolvedReference = String(statusPayload.reference_id);
        }
      }

      if (remoteStatus === "success" || remoteStatus === "successful") {
        if (transaction) {
          const { data: updated, error: updErr } = await serviceClient
            .from("payment_transactions")
            .update({
              status: "completed",
              skypay_reference_id: resolvedReference || transaction.skypay_reference_id,
              client_reference: transaction.client_reference || productId || null,
              plan_id: planId,
              raw_payload: { ...(transaction.raw_payload || {}), confirm_status: statusPayload },
            })
            .eq("id", transaction.id)
            .select("*")
            .single();
          if (updErr) throw new Error(updErr.message);
          transaction = updated;
        } else {
          const { data: inserted, error: insErr } = await serviceClient
            .from("payment_transactions")
            .insert({
              user_id: user.id,
              skypay_reference_id: resolvedReference || null,
              client_reference: productId || null,
              plan_id: planId,
              amount: plans[planId],
              currency: "UGX",
              status: "completed",
              raw_payload: { source: "skypay-status", status: statusPayload },
            })
            .select("*")
            .single();
          if (insErr) throw new Error(insErr.message);
          transaction = inserted;
        }
      } else {
        if (transaction) {
          await serviceClient
            .from("payment_transactions")
            .update({
              skypay_reference_id: resolvedReference || transaction.skypay_reference_id,
              client_reference: transaction.client_reference || productId || null,
              raw_payload: { ...(transaction.raw_payload || {}), last_poll: statusPayload },
            })
            .eq("id", transaction.id);
        }
        return Response.json({
          success: false,
          pending: true,
          remoteStatus: remoteStatus || "unknown",
          error: lookupRef
            ? "Payment is still pending on SkyPay. If you paid from your SkyPay balance, give it a moment and try again."
            : "This payment hasn't been registered with SkyPay yet. Complete the checkout, then try again.",
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

    const finalRef = transaction.skypay_reference_id || reference;

    const { error: updatePaymentError } = await serviceClient
      .from("payment_transactions")
      .update({ user_id: user.id, plan_id: planId })
      .eq("id", transaction.id);

    if (updatePaymentError) {
      throw new Error(updatePaymentError.message);
    }

    const { error: subscriptionError } = await serviceClient
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        plan_id: planId,
        status: "active",
        skypay_reference_id: finalRef,
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