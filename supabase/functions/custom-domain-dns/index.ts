// Custom Domain DNS helper, integrated with Resend Domains API.
//
// Actions:
//   - "records": ensures the domain is registered with Resend, returns the
//     exact DNS records (TXT for verification, SPF, DKIM, DMARC, MX) the
//     user must add at their registrar.
//   - "check": asks Resend to re-verify the domain (which performs DNS
//     lookups against the registered records). On success, also marks the
//     domain as verified locally so the user can send/receive mail.
//
// Auth: requires a valid Supabase JWT. The caller must own the domain
// (or be an admin).

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

interface ResendDnsRecord {
  record: string;        // e.g. "SPF", "DKIM", "MX", "DMARC"
  name: string;          // FQDN (e.g. "send.example.com")
  type: string;          // "TXT" | "MX" | "CNAME"
  ttl?: string | number;
  status?: string;       // "pending" | "verified" | "not_started"
  value: string;
  priority?: number;
}

interface NormalizedRecord {
  purpose: "spf" | "dkim" | "dmarc" | "mx" | "verification" | "other";
  kind: "TXT" | "MX" | "CNAME";
  host: string;          // host portion relative to the domain ("@" for apex)
  fqdn: string;          // full record name
  value: string;
  priority?: number;
  ttl?: string | number;
  status?: string;
  required: boolean;
  description: string;
}

function hostFor(domain: string, fqdn: string): string {
  const d = domain.toLowerCase().replace(/\.$/, "");
  const f = fqdn.toLowerCase().replace(/\.$/, "");
  if (f === d) return "@";
  if (f.endsWith(`.${d}`)) return f.slice(0, -1 - d.length);
  return f;
}

function describe(record: string, type: string): { purpose: NormalizedRecord["purpose"]; required: boolean; description: string } {
  const r = (record || "").toUpperCase();
  if (r === "SPF" || (type === "TXT" && r.includes("SPF"))) {
    return { purpose: "spf", required: true, description: "SPF — authorizes our mail servers to send on behalf of your domain." };
  }
  if (r === "DKIM" || r.startsWith("DKIM")) {
    return { purpose: "dkim", required: true, description: "DKIM — cryptographically signs your outgoing mail so receivers trust it." };
  }
  if (r === "DMARC") {
    return { purpose: "dmarc", required: false, description: "DMARC — tells receivers what to do if SPF/DKIM fail. Recommended." };
  }
  if (r === "MX" || type === "MX") {
    return { purpose: "mx", required: true, description: "MX — routes inbound mail for your domain to AfuChat." };
  }
  return { purpose: "other", required: true, description: `${r || type} record required by the email provider.` };
}

function normalizeResendRecords(domain: string, records: ResendDnsRecord[]): NormalizedRecord[] {
  return (records || []).map((r) => {
    const meta = describe(r.record, r.type);
    const fqdn = r.name;
    return {
      purpose: meta.purpose,
      kind: (r.type as "TXT" | "MX" | "CNAME") || "TXT",
      host: hostFor(domain, fqdn),
      fqdn,
      value: r.value,
      priority: r.priority,
      ttl: r.ttl,
      status: r.status,
      required: meta.required,
      description: meta.description,
    };
  });
}

async function resendFetch(path: string, init: RequestInit = {}) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured on the server");
  }
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

async function findResendDomainByName(name: string): Promise<{ id: string; status?: string; records?: ResendDnsRecord[] } | null> {
  const list = await resendFetch("/domains");
  if (!list.ok || !list.body) return null;
  const arr: any[] = list.body.data ?? list.body ?? [];
  const match = arr.find((d: any) => String(d.name).toLowerCase() === name.toLowerCase());
  return match ? { id: match.id, status: match.status, records: match.records } : null;
}

async function ensureResendDomain(domain: string, existingId: string | null): Promise<{ id: string; status?: string; records: ResendDnsRecord[]; }> {
  // 1) If we already have an id, fetch it.
  if (existingId) {
    const got = await resendFetch(`/domains/${existingId}`);
    if (got.ok && got.body) {
      return { id: got.body.id ?? existingId, status: got.body.status, records: got.body.records ?? [] };
    }
    // fall through to (re)create / lookup
  }

  // 2) Try to find by name (in case it was created previously).
  const found = await findResendDomainByName(domain);
  if (found?.id) {
    const got = await resendFetch(`/domains/${found.id}`);
    if (got.ok && got.body) {
      return { id: got.body.id, status: got.body.status, records: got.body.records ?? [] };
    }
  }

  // 3) Create it.
  const created = await resendFetch("/domains", {
    method: "POST",
    body: JSON.stringify({ name: domain, region: "us-east-1" }),
  });
  if (!created.ok) {
    throw new Error(
      `Resend domain create failed (${created.status}): ${typeof created.body === "string" ? created.body : JSON.stringify(created.body)}`,
    );
  }
  const id = created.body?.id;
  if (!id) throw new Error("Resend did not return a domain id");
  const got = await resendFetch(`/domains/${id}`);
  return { id, status: got.body?.status, records: got.body?.records ?? created.body?.records ?? [] };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization header" });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return json(401, { error: "Authentication failed" });

    const body = await req.json().catch(() => ({}));
    const action: "records" | "check" = body?.action ?? "records";
    const domainId: string | undefined = body?.domain_id;
    if (!domainId) return json(400, { error: "domain_id is required" });

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("custom_domains")
      .select("id, user_id, domain, verification_token, status, resend_domain_id, dns_records")
      .eq("id", domainId)
      .maybeSingle();
    if (fetchErr || !row) return json(404, { error: "Domain not found" });

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

    // Always make sure the domain exists at the email provider so we can
    // give the user a real DKIM key + MX record (these are domain-specific).
    const ensured = await ensureResendDomain(row.domain, row.resend_domain_id);
    const normalized = normalizeResendRecords(row.domain, ensured.records);

    // Persist resend id + cached records for fast subsequent loads.
    await supabaseAdmin
      .from("custom_domains")
      .update({
        resend_domain_id: ensured.id,
        dns_records: normalized,
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (action === "records") {
      return json(200, {
        domain: row.domain,
        status: row.status,
        provider_status: ensured.status ?? "unknown",
        records: normalized,
      });
    }

    if (action === "check") {
      // Ask Resend to re-verify (it does the DNS lookups against the records
      // it issued for this exact domain).
      const verifyRes = await resendFetch(`/domains/${ensured.id}/verify`, { method: "POST" });
      // After the verify call, re-fetch to get the up-to-date statuses.
      const fresh = await resendFetch(`/domains/${ensured.id}`);
      const freshRecords: ResendDnsRecord[] = fresh.body?.records ?? ensured.records ?? [];
      const freshNormalized = normalizeResendRecords(row.domain, freshRecords);
      const providerStatus: string = fresh.body?.status ?? ensured.status ?? "pending";
      const verifiedAtProvider = providerStatus === "verified";
      const requiredOk = freshNormalized.filter((r) => r.required).every((r) => r.status === "verified");
      const allOk = freshNormalized.every((r) => r.status === "verified");

      const nowIso = new Date().toISOString();
      const updates: Record<string, unknown> = {
        dns_records: freshNormalized,
        last_checked_at: nowIso,
      };
      if (verifiedAtProvider) {
        updates.status = "verified";
        updates.verified_at = nowIso;
        updates.last_error = null;
      } else if (row.status !== "verified") {
        updates.status = "failed";
        updates.last_error = verifyRes.ok
          ? `Provider says domain is ${providerStatus}. DNS records may still be propagating.`
          : `Verify call failed (${verifyRes.status}): ${typeof verifyRes.body === "string" ? verifyRes.body : JSON.stringify(verifyRes.body)}`;
      }
      await supabaseAdmin.from("custom_domains").update(updates).eq("id", row.id);

      return json(200, {
        domain: row.domain,
        status: updates.status ?? row.status,
        provider_status: providerStatus,
        required_ok: requiredOk,
        all_ok: allOk,
        records: freshNormalized,
        checked_at: nowIso,
      });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("custom-domain-dns error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return json(500, { error: msg, code: "DNS_HELPER_ERROR" });
  }
};

serve(handler);
