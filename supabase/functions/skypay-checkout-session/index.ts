import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SKY_PAY_CHECKOUT_BASE = "https://fxdpbbscczpvmblyhnts.supabase.co/functions/v1/sdk/checkout";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const sellerId = Deno.env.get("SKYPAY_SELLER_ID");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase function environment is not configured.");
    }
    if (!sellerId) {
      throw new Error("SKYPAY_SELLER_ID is required for live SkyPay checkout.");
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
    const planId = String(body.planId || "");
    const plan = plans[planId as keyof typeof plans];
    if (!plan) {
      return Response.json({ error: "Invalid subscription plan." }, { status: 400, headers: corsHeaders });
    }

    const requestOrigin = typeof body.origin === "string" ? body.origin : req.headers.get("Origin");
    const origin = requestOrigin && /^https?:\/\//.test(requestOrigin) ? requestOrigin : "https://afuchat.com";
    const clientReference = `afuchat-${planId}-${crypto.randomUUID()}`;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { error: insertError } = await serviceClient.from("payment_transactions").insert({
      user_id: user.id,
      client_reference: clientReference,
      plan_id: planId,
      amount: plan.amount,
      currency: "UGX",
      status: "pending",
      raw_payload: { source: "checkout-session" },
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    const callbackUrl = new URL("/dashboard", origin);
    callbackUrl.searchParams.set("payment", "success");
    callbackUrl.searchParams.set("plan", planId);

    const checkoutParams = new URLSearchParams({
      amount: String(plan.amount),
      currency: "UGX",
      description: plan.description,
      merchant: "AfuChat Mail",
      seller_id: sellerId,
      product_id: clientReference,
      plan: planId,
      billing_cycle: "monthly",
      environment: "production",
      mode: "live",
      test: "false",
      callback_url: callbackUrl.toString(),
      success_url: callbackUrl.toString(),
      cancel_url: new URL(`/pricing?payment=cancelled&plan=${planId}`, origin).toString(),
    });

    return Response.json({
      checkoutUrl: `${SKY_PAY_CHECKOUT_BASE}?${checkoutParams.toString()}`,
      clientReference,
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Unable to create SkyPay checkout session.",
    }, { status: 500, headers: corsHeaders });
  }
});