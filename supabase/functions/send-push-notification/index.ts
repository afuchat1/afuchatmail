import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; emailId?: string }
) {
  const vapidHeaders = {
    "Content-Type": "application/json",
    Authorization: `vapid t=${generateJWT()}, k=${VAPID_PUBLIC_KEY}`,
  };

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: vapidHeaders,
    body: JSON.stringify(payload),
  });

  return response.ok;
}

function generateJWT() {
  const header = { typ: "JWT", alg: "ES256" };
  const jwtPayload = {
    aud: new URL(VAPID_PUBLIC_KEY).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: "mailto:noreply@afuchat.com",
  };

  // Note: This is a simplified version. In production, use a proper JWT library
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(jwtPayload));
  
  return `${encodedHeader}.${encodedPayload}`;
}

serve(async (req) => {
  try {
    const { email_address_id, email_id, from_address, subject } = await req.json();

    if (!email_address_id || !email_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get push subscriptions for this email address
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("email_address_id", email_address_id);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send push notification to all subscriptions
    const payload = {
      title: "New Email",
      body: `From: ${from_address}\n${subject}`,
      url: "/",
      emailId: email_id,
      tag: `email-${email_id}`,
    };

    const results = await Promise.all(
      subscriptions.map((sub) =>
        sendPushNotification(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          payload
        )
      )
    );

    const successCount = results.filter(Boolean).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: subscriptions.length 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
