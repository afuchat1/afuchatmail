import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-skypay-signature, x-signature, skypay-signature",
};

const planByAmount: Record<number, "professional" | "business"> = {
  15000: "professional",
  50000: "business",
};

const toHex = (buffer: ArrayBuffer) => {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const verifySignature = async (body: string, signature: string | null, secret: string | undefined) => {
  if (!secret) return true;
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = toHex(digest);
  const received = signature.replace(/^sha256=/, "").trim().toLowerCase();

  return expected.length === received.length && expected === received;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookSecret = Deno.env.get("SKYPAY_WEBHOOK_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase function environment is not configured.");
    }

    const rawBody = await req.text();
    const signature =
      req.headers.get("x-skypay-signature") ||
      req.headers.get("x-signature") ||
      req.headers.get("skypay-signature");

    const signatureValid = await verifySignature(rawBody, signature, webhookSecret);
    if (!signatureValid) {
      return Response.json({ error: "Invalid webhook signature." }, { status: 401, headers: corsHeaders });
    }

    const payload = JSON.parse(rawBody);
    const event = String(payload.event || "");
    const data = payload.data || {};
    const referenceId = String(data.reference_id || "").trim();
    const amount = Number(data.amount || 0);
    const planId = planByAmount[amount] || null;
    const status = event === "payment.success" || event === "subscription.charged"
      ? "completed"
      : event === "payment.failed" || event === "subscription.past_due"
        ? "failed"
        : "pending";

    if (!referenceId) {
      return Response.json({ error: "Missing reference_id." }, { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const clientReference = typeof data.product_id === "string" ? data.product_id : null;

    // Try to locate an existing row, preferring skypay_reference_id, then client_reference
    let { data: existingTransaction } = await serviceClient
      .from("payment_transactions")
      .select("id, user_id, client_reference, plan_id")
      .eq("skypay_reference_id", referenceId)
      .maybeSingle();

    if (!existingTransaction && clientReference) {
      const { data: pendingTransaction } = await serviceClient
        .from("payment_transactions")
        .select("id, user_id, client_reference, plan_id")
        .eq("client_reference", clientReference)
        .maybeSingle();
      existingTransaction = pendingTransaction || null;
    }

    const userId = existingTransaction?.user_id || null;
    const finalPlanId = planId || existingTransaction?.plan_id || null;
    const finalClientRef = clientReference || existingTransaction?.client_reference || null;

    const transactionFields = {
      user_id: userId,
      client_reference: finalClientRef,
      skypay_reference_id: referenceId,
      plan_id: finalPlanId,
      amount,
      currency: String(data.currency || "UGX"),
      status,
      method: data.method ? String(data.method) : null,
      buyer_email: data.buyer_email ? String(data.buyer_email) : null,
      seller_id: data.seller_id ? String(data.seller_id) : null,
      raw_payload: payload,
    };

    if (existingTransaction) {
      // Update the existing row in place — this enriches the pending row with the SkyPay reference
      const { error: updateError } = await serviceClient
        .from("payment_transactions")
        .update(transactionFields)
        .eq("id", existingTransaction.id);
      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      const { error: insertError } = await serviceClient
        .from("payment_transactions")
        .insert(transactionFields);
      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    if (status === "completed" && userId && planId) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { error: subscriptionError } = await serviceClient
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan_id: planId,
          status: "active",
          skypay_reference_id: referenceId,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        }, { onConflict: "user_id" });

      if (subscriptionError) {
        throw new Error(subscriptionError.message);
      }
    }

    return Response.json({ received: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Unable to process SkyPay webhook.",
    }, { status: 500, headers: corsHeaders });
  }
});