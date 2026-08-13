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
  purpose: "spf" | "dkim" | "dmarc" | "mx" | "inbound_mx" | "verification" | "other";
  kind: "TXT" | "MX" | "CNAME";
  host: string;          // host portion relative to the domain ("@" for apex)
  fqdn: string;          // full record name
  value: string;
  priority?: number;
  ttl?: string | number;
  status?: string;
  required: boolean;
  description: string;
  direction: "sending" | "receiving";
}

// Inbound mail for a custom domain is routed to our provider's inbound MX.
// Resend does not issue this record as part of domain verification, so we add
// it ourselves and verify it with a live DNS lookup.
const INBOUND_MX_HOST = "inbound.resend.com";
const INBOUND_MX_PRIORITY = 10;

// DNS-over-HTTPS lookup (Google public resolver).
// Returns the answer strings, or null when the lookup itself could not be
// completed (network/resolver failure). null must never be treated as
// "record missing" — that is how previously verified domains flip back to
// unverified for no reason.
async function dohLookup(name: string, type: "MX" | "TXT"): Promise<string[] | null> {
  const resolvers = [
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
  ];
  for (const url of resolvers) {
    try {
      const res = await fetch(url, { headers: { accept: "application/dns-json" } });
      if (!res.ok) continue;
      const body = await res.json();
      // NXDOMAIN (3) / NOERROR (0) are authoritative answers; anything else
      // (SERVFAIL etc.) is inconclusive.
      const rcode = Number(body?.Status ?? 0);
      if (rcode !== 0 && rcode !== 3) continue;
      const answers: any[] = body?.Answer ?? [];
      return answers
        .filter((a) => (type === "MX" ? a.type === 15 : a.type === 16))
        .map((a) => String(a.data ?? "").replace(/^"|"$/g, "").trim().toLowerCase());
    } catch (err) {
      console.warn("DoH lookup failed", name, type, (err as Error)?.message);
    }
  }
  return null;
}

/** Once a record has been seen live, keep it verified unless DNS positively says it is gone. */
function stickyStatus(present: boolean | null, priorStatus?: string): string {
  if (present === true) return "verified";
  if (present === null) return priorStatus === "verified" ? "verified" : (priorStatus ?? "pending");
  // Positive absence: only downgrade if it was never verified before.
  return priorStatus === "verified" ? "verified" : "pending";
}

type CachedMap = Map<string, NormalizedRecord>;

function cachedRecordMap(cachedRecords: unknown): CachedMap {
  const map: CachedMap = new Map();
  if (Array.isArray(cachedRecords)) {
    for (const record of cachedRecords) {
      if (record && typeof record === "object" && "purpose" in record) {
        const r = record as NormalizedRecord;
        map.set(`${r.purpose}:${(r.fqdn ?? "").toLowerCase()}`, r);
      }
    }
  }
  return map;
}

const priorStatusOf = (cache: CachedMap, purpose: string, fqdn: string) =>
  cache.get(`${purpose}:${(fqdn ?? "").toLowerCase()}`)?.status;

async function inboundMxRecord(domain: string, cache: CachedMap = new Map()): Promise<NormalizedRecord> {
  const answers = await dohLookup(domain, "MX");
  const present = answers === null ? null : answers.some((a) => a.includes(INBOUND_MX_HOST));
  return {
    purpose: "inbound_mx",
    kind: "MX",
    host: "@",
    fqdn: domain,
    value: INBOUND_MX_HOST,
    priority: INBOUND_MX_PRIORITY,
    ttl: 3600,
    status: stickyStatus(present, priorStatusOf(cache, "inbound_mx", domain)),
    required: true,
    description:
      "Inbound MX — delivers mail addressed to your domain into your AfuChat inbox. Remove other MX records on the apex, or mail will go to your old provider.",
    direction: "receiving",
  };
}

async function ownershipRecord(domain: string, token: string, cache: CachedMap = new Map()): Promise<NormalizedRecord> {
  const value = `afuchat-verify=${token}`;
  const answers = await dohLookup(domain, "TXT");
  const present = answers === null ? null : answers.some((answer) => answer.includes(value.toLowerCase()));
  return {
    purpose: "verification",
    kind: "TXT",
    host: "@",
    fqdn: domain,
    value,
    ttl: 3600,
    status: stickyStatus(present, priorStatusOf(cache, "verification", domain)),
    required: true,
    description: "Ownership verification — proves that you control this domain.",
    direction: "receiving",
  };
}

async function buildProviderLimitRecords(
  domain: string,
  token: string,
  cachedRecords: unknown,
): Promise<NormalizedRecord[]> {
  const cache = cachedRecordMap(cachedRecords);
  const sending = [...cache.values()].filter((record) => record.direction === "sending");
  const [ownership, inbound] = await Promise.all([
    ownershipRecord(domain, token, cache),
    inboundMxRecord(domain, cache),
  ]);
  return [ownership, ...sending, inbound];
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
    return { purpose: "mx", required: true, description: "MX — bounce and feedback routing for your sending subdomain." };
  }
  return { purpose: "other", required: true, description: `${r || type} record required by the email provider.` };
}

function normalizeResendRecords(domain: string, records: ResendDnsRecord[], cache: CachedMap = new Map()): NormalizedRecord[] {
  return (records || []).map((r) => {
    const meta = describe(r.record, r.type);
    const fqdn = r.name;
    const prior = priorStatusOf(cache, meta.purpose, fqdn);
    // Provider statuses can flap back to "pending" while it re-checks; once a
    // record has been verified we keep it verified.
    const status = r.status === "verified" || prior === "verified" ? "verified" : (r.status ?? "pending");
    return {
      purpose: meta.purpose,
      kind: (r.type as "TXT" | "MX" | "CNAME") || "TXT",
      host: hostFor(domain, fqdn),
      fqdn,
      value: r.value,
      priority: r.priority,
      ttl: r.ttl,
      status,
      required: meta.required,
      description: meta.description,
      direction: "sending" as const,
    };
  });
}

// Sending records come from the provider; ownership + inbound MX are ours.
async function buildAllRecords(
  domain: string,
  providerRecords: ResendDnsRecord[],
  token: string,
  cachedRecords: unknown,
): Promise<NormalizedRecord[]> {
  const cache = cachedRecordMap(cachedRecords);
  const sending = normalizeResendRecords(domain, providerRecords, cache);
  const [ownership, inbound] = await Promise.all([
    ownershipRecord(domain, token, cache),
    inboundMxRecord(domain, cache),
  ]);
  return [ownership, ...sending, inbound];
}

const readiness = (
  records: NormalizedRecord[],
  providerStatus: string,
  domainStatus?: string,
) => {
  const receiving = records.find((r) => r.purpose === "inbound_mx");
  const ownership = records.find((r) => r.purpose === "verification");
  // When the provider cannot host this domain as a sending domain, mail is
  // relayed through the platform sending domain instead. That only needs
  // proven ownership, so sending is still available in relay mode.
  const relayMode = providerStatus === "unavailable" || providerStatus === "limit_reached";
  const wasVerified = domainStatus === "verified";
  const providerVerified = providerStatus === "verified";
  const ownershipVerified = ownership?.status === "verified";
  return {
    // Proven ownership is enough: if the provider has not verified the domain
    // for direct sending, outgoing mail is relayed through the platform
    // sending domain with the custom address as sender/Reply-To.
    sending_ready: wasVerified || providerVerified || ownershipVerified,
    sending_mode: providerVerified && !relayMode ? "direct" : "relay",
    receiving_ready: receiving?.status === "verified",
  };
};



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
    const detail = typeof created.body === "string" ? created.body : (created.body?.message ?? JSON.stringify(created.body));
    const err = new Error(
      created.status === 403
        ? `Email provider plan limit reached: ${detail}`
        : `Resend domain create failed (${created.status}): ${detail}`,
    ) as Error & { statusCode?: number; code?: string };
    err.statusCode = created.status === 403 ? 409 : 502;
    err.code = created.status === 403 ? "PROVIDER_DOMAIN_LIMIT" : "PROVIDER_ERROR";
    throw err;
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
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken || accessToken === authHeader) {
      return json(401, { error: "Invalid authorization header" });
    }

    // Pass the bearer token explicitly. Edge clients do not persist a browser
    // session, so getUser() without a token can report "Auth session missing".
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(accessToken);
    if (userError || !user) {
      console.error("auth failed", userError?.message);
      return json(401, { error: "Authentication failed" });
    }


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
    let ensured: Awaited<ReturnType<typeof ensureResendDomain>>;
    try {
      ensured = await ensureResendDomain(row.domain, row.resend_domain_id);
    } catch (err) {
      const providerError = err as Error & { code?: string };
      if (providerError.code !== "PROVIDER_DOMAIN_LIMIT") throw err;

      // A provider account limit is an operational state, not a failed web
      // request. Return the records we can still configure so the settings UI
      // remains usable and receiving/ownership checks continue to work.
      const fallbackRecords = await buildProviderLimitRecords(
        row.domain,
        row.verification_token,
        row.dns_records,
      );
      const flags = readiness(fallbackRecords, "unavailable", row.status);
      const nowIso = new Date().toISOString();
      const limitUpdates: Record<string, unknown> = {
        dns_records: fallbackRecords,
        last_checked_at: nowIso,
        last_error: providerError.message,
      };
      // Ownership proven → the domain is usable in relay mode.
      if (flags.sending_ready && row.status !== "verified") {
        limitUpdates.status = "verified";
        limitUpdates.verified_at = nowIso;
      }
      await supabaseAdmin
        .from("custom_domains")
        .update(limitUpdates)
        .eq("id", row.id);

      return json(200, {
        domain: row.domain,
        status: (limitUpdates.status as string) ?? row.status,
        provider_status: "limit_reached",
        provider_limit: true,
        warning: providerError.message,
        records: fallbackRecords,
        ...flags,
        checked_at: nowIso,
      });
    }

    const normalized = await buildAllRecords(row.domain, ensured.records, row.verification_token, row.dns_records);

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
        ...readiness(normalized, ensured.status ?? "unknown", row.status),
      });
    }

    if (action === "check") {
      // Ask Resend to re-verify (it does the DNS lookups against the records
      // it issued for this exact domain).
      const verifyRes = await resendFetch(`/domains/${ensured.id}/verify`, { method: "POST" });
      // After the verify call, re-fetch to get the up-to-date statuses.
      const fresh = await resendFetch(`/domains/${ensured.id}`);
      const freshRecords: ResendDnsRecord[] = fresh.body?.records ?? ensured.records ?? [];
      const providerStatus: string = fresh.body?.status ?? ensured.status ?? "pending";
      const freshNormalized = await buildAllRecords(row.domain, freshRecords, row.verification_token, row.dns_records);
      const flags = readiness(freshNormalized, providerStatus, row.status);
      const verifiedAtProvider = flags.sending_ready;
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
        updates.last_error = flags.receiving_ready
          ? null
          : `Sending is live. Inbound mail is not routed yet — add the MX record ${INBOUND_MX_HOST} (priority ${INBOUND_MX_PRIORITY}) on ${row.domain}.`;
      } else if (row.status !== "verified") {
        updates.status = "pending";
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
        ...flags,
        records: freshNormalized,

        checked_at: nowIso,
      });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("custom-domain-dns error:", err);
    const e = err as Error & { statusCode?: number; code?: string };
    const msg = e?.message ?? String(err);
    return json(e?.statusCode ?? 500, { error: msg, code: e?.code ?? "DNS_HELPER_ERROR" });
  }
};

serve(handler);
