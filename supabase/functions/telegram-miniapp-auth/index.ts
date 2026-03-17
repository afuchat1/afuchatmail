import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Validate Telegram WebApp initData using HMAC-SHA-256
async function validateInitData(initData: string): Promise<Record<string, string> | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");
  const entries = Array.from(params.entries());
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const encoder = new TextEncoder();

  // secret_key = HMAC-SHA256("WebAppData", bot_token)
  const secretKey = await crypto.subtle.importKey(
    "raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const secretHash = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(TELEGRAM_BOT_TOKEN));

  // computed_hash = HMAC-SHA256(secret_key, data_check_string)
  const computeKey = await crypto.subtle.importKey(
    "raw", secretHash, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const computedHash = await crypto.subtle.sign("HMAC", computeKey, encoder.encode(dataCheckString));

  const computedHex = Array.from(new Uint8Array(computedHash))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  if (computedHex !== hash) return null;

  // Check auth_date isn't too old (allow 24 hours)
  const authDate = parseInt(params.get("auth_date") || "0");
  if (Date.now() / 1000 - authDate > 86400) return null;

  const result: Record<string, string> = {};
  for (const [k, v] of params.entries()) result[k] = v;
  return result;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData } = await req.json();
    if (!initData) {
      return new Response(JSON.stringify({ error: "Missing initData" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const validated = await validateInitData(initData);
    if (!validated) {
      return new Response(JSON.stringify({ error: "Invalid initData" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Parse user info
    let tgUser: { id: number; username?: string; first_name?: string };
    try {
      tgUser = JSON.parse(validated.user || "{}");
    } catch {
      return new Response(JSON.stringify({ error: "No user in initData" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Find linked account
    const { data: link } = await supabaseAdmin
      .from("telegram_links")
      .select("user_id")
      .eq("chat_id", tgUser.id)
      .neq("user_id", "00000000-0000-0000-0000-000000000000")
      .maybeSingle();

    if (!link) {
      return new Response(JSON.stringify({ error: "not_linked", telegram_id: tgUser.id }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user's email addresses
    const { data: addresses } = await supabaseAdmin
      .from("email_addresses")
      .select("id, full_email, is_primary")
      .eq("user_id", link.user_id)
      .eq("is_alias", false)
      .order("is_primary", { ascending: false });

    // Get user's folders
    const { data: folders } = await supabaseAdmin
      .from("folders")
      .select("id, name, type, icon")
      .eq("user_id", link.user_id);

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", link.user_id)
      .single();

    return new Response(JSON.stringify({
      user_id: link.user_id,
      profile: profile || {},
      email_addresses: addresses || [],
      folders: folders || [],
      telegram_user: tgUser,
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("TG auth error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
