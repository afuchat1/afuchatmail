import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  domain_id: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization header" });

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return json(401, { error: "Authentication failed" });

    const body: VerifyRequest = await req.json();
    if (!body?.domain_id) return json(400, { error: "domain_id is required" });

    // Fetch the domain row using the service role, then check ownership ourselves.
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("custom_domains")
      .select("id, user_id, domain, verification_token, status")
      .eq("id", body.domain_id)
      .maybeSingle();

    if (fetchErr || !row) return json(404, { error: "Domain not found" });

    // Allow owner OR admin.
    let isAdmin = false;
    {
      const { data } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!data;
    }
    if (row.user_id !== user.id && !isAdmin) {
      return json(403, { error: "You do not own this domain" });
    }

    // Look up TXT records for the domain.
    const expected = `afuchat-verify=${row.verification_token}`;
    let records: string[][] = [];
    let lookupError: string | null = null;
    try {
      records = await Deno.resolveDns(row.domain, "TXT");
    } catch (err) {
      lookupError = err instanceof Error ? err.message : String(err);
    }

    const flat = records.map((parts) => parts.join("")).map((s) => s.trim());
    const match = flat.some((txt) => txt === expected);

    const nowIso = new Date().toISOString();
    if (match) {
      const { error: updErr } = await supabaseAdmin
        .from("custom_domains")
        .update({
          status: "verified",
          verified_at: nowIso,
          last_checked_at: nowIso,
          last_error: null,
        })
        .eq("id", row.id);
      if (updErr) return json(500, { error: "Failed to mark domain verified" });

      return json(200, {
        success: true,
        status: "verified",
        verified_at: nowIso,
      });
    }

    const failureReason = lookupError
      ? `DNS lookup failed: ${lookupError}`
      : `Expected TXT record "${expected}" was not found. Found: ${
          flat.length === 0 ? "(none)" : flat.join(" | ")
        }`;

    await supabaseAdmin
      .from("custom_domains")
      .update({
        status: row.status === "verified" ? "verified" : "failed",
        last_checked_at: nowIso,
        last_error: failureReason,
      })
      .eq("id", row.id);

    return json(200, {
      success: false,
      status: row.status === "verified" ? "verified" : "failed",
      error: failureReason,
      expected_txt: expected,
      txt_records_seen: flat,
    });
  } catch (err) {
    console.error("verify-custom-domain error:", err);
    return json(500, { error: "Verification failed", code: "VERIFY_ERROR" });
  }
};

serve(handler);
