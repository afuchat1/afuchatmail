import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SKY_PAY_CHECKOUT_BASE = "https://fxdpbbscczpvmblyhnts.supabase.co/functions/v1/sdk/checkout";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const plans = {
  professional: {
    amount: 15000,
    description: "AfuChat Mail Professional — Monthly",
  },
  business: {
    amount: 50000,
    description: "AfuChat Mail Business — Monthly",
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const sellerId = Deno.env.get("SKYPAY_SELLER_ID");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Backend environment is not configured.");
    }
    if (!sellerId) {
      throw new Error("SKYPAY_SELLER_ID is required for SkyPay checkout.");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Sign in is required." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Sign in is required." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string | undefined) ?? null;

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const planId = String((body as Record<string, unknown>).planId ?? "");
    const plan = plans[planId as keyof typeof plans];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid subscription plan." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestOriginRaw = (body as Record<string, unknown>).origin;
    const requestOrigin = typeof requestOriginRaw === "string" ? requestOriginRaw : req.headers.get("Origin");
    const origin = requestOrigin && /^https?:\/\//.test(requestOrigin) ? requestOrigin : "https://email.afuchat.com";
    const clientReference = `afuchat-${planId}-${crypto.randomUUID()}`;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { error: insertError } = await serviceClient.from("payment_transactions").insert({
      user_id: userId,
      buyer_email: userEmail,
      client_reference: clientReference,
      plan_id: planId,
      amount: plan.amount,
      currency: "UGX",
      status: "pending",
      seller_id: sellerId,
      raw_payload: { source: "checkout-session" },
    });

    if (insertError) {
      console.error("[skypay-checkout-session] insert failed:", insertError);
      throw new Error(insertError.message);
    }

    const callbackUrl = new URL("/dashboard", origin);
    callbackUrl.searchParams.set("payment", "success");
    callbackUrl.searchParams.set("plan", planId);

    const cancelUrl = new URL("/pricing", origin);
    cancelUrl.searchParams.set("payment", "cancelled");
    cancelUrl.searchParams.set("plan", planId);

    // SkyPay hosted checkout only accepts: amount, merchant, seller_id, description, product_id, callback_url
    const checkoutParams = new URLSearchParams({
      amount: String(plan.amount),
      merchant: "AfuChat Mail",
      seller_id: sellerId,
      description: plan.description,
      product_id: clientReference,
      callback_url: callbackUrl.toString(),
    });

    return new Response(
      JSON.stringify({
        checkoutUrl: `${SKY_PAY_CHECKOUT_BASE}?${checkoutParams.toString()}`,
        clientReference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[skypay-checkout-session] error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unable to create SkyPay checkout session.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
