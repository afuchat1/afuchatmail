import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verify the caller's JWT and resolve their user id.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Confirm intent — caller must POST {"confirm": "DELETE"}.
    let body: { confirm?: string } = {};
    try { body = await req.json(); } catch { /* empty body */ }
    if (body.confirm !== "DELETE") {
      return new Response(JSON.stringify({ error: "Confirmation required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const userId = user.id;

    // 3. Best-effort cleanup of app data that doesn't have ON DELETE CASCADE
    //    against auth.users. Order: child tables first.
    const tablesToScrub = [
      "oauth_tokens",
      "oauth_authorization_codes",
      "oauth_applications",
      "push_subscriptions",
      "telegram_links",
      "user_settings",
      "subscriptions",
      "payment_transactions",
      "email_templates",
      "emails",
      "email_addresses",
      "user_roles",
      "profiles",
    ];
    for (const table of tablesToScrub) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error && !/no rows|does not exist/i.test(error.message)) {
        console.warn(`[delete-account] ${table}:`, error.message);
      }
    }
    // profiles uses `id` not `user_id`
    await admin.from("profiles").delete().eq("id", userId);

    // 4. Finally delete the auth user. This invalidates all their sessions.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error("[delete-account] auth delete failed:", delErr);
      return new Response(JSON.stringify({ error: "Failed to delete account", detail: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[delete-account] unexpected:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
