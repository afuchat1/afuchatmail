// Verify a custom domain by asking Resend to re-check the DNS records it
// issued for that domain. This replaces the old TXT-only check so we
// match the records the user is actually instructed to add.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const RESEND_API = "https://api.resend.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

async function resendFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${RESEND_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) return json(500, { error: "Email provider not configured" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization header" });

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return json(401, { error: "Authentication failed" });

    const body = await req.json().catch(() => ({}));
    if (!body?.domain_id) return json(400, { error: "domain_id is required" });

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("custom_domains")
      .select("id, user_id, domain, status, resend_domain_id")
      .eq("id", body.domain_id)
      .maybeSingle();
    if (fetchErr || !row) return json(404, { error: "Domain not found" });

    let isAdmin = false;
    {
      const { data } = await supabaseAdmin
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      isAdmin = !!data;
    }
    if (row.user_id !== user.id && !isAdmin) {
      return json(403, { error: "You do not own this domain" });
    }

    if (!row.resend_domain_id) {
      return json(409, {
        error: "Domain not registered with email provider yet. Open the DNS panel to generate the records, then try again.",
      });
    }

    const verify = await resendFetch(`/domains/${row.resend_domain_id}/verify`, { method: "POST" });
    const fresh = await resendFetch(`/domains/${row.resend_domain_id}`);
    const providerStatus: string = fresh.body?.status ?? "pending";
    const nowIso = new Date().toISOString();

    if (providerStatus === "verified") {
      await supabaseAdmin
        .from("custom_domains")
        .update({
          status: "verified",
          verified_at: nowIso,
          last_checked_at: nowIso,
          last_error: null,
          dns_records: fresh.body?.records ?? null,
        })
        .eq("id", row.id);
      return json(200, { success: true, status: "verified", verified_at: nowIso });
    }

    const reason = verify.ok
      ? `Provider says domain is ${providerStatus}. DNS records may still be propagating — try again in a few minutes.`
      : `Verify call failed (${verify.status}): ${typeof verify.body === "string" ? verify.body : JSON.stringify(verify.body)}`;

    await supabaseAdmin
      .from("custom_domains")
      .update({
        status: row.status === "verified" ? "verified" : "failed",
        last_checked_at: nowIso,
        last_error: reason,
        dns_records: fresh.body?.records ?? null,
      })
      .eq("id", row.id);

    return json(200, {
      success: false,
      status: row.status === "verified" ? "verified" : "failed",
      provider_status: providerStatus,
      error: reason,
    });
  } catch (err) {
    console.error("verify-custom-domain error:", err);
    return json(500, { error: err instanceof Error ? err.message : String(err), code: "VERIFY_ERROR" });
  }
};

serve(handler);
