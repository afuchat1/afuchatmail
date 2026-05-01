// Custom Domain DNS helper:
// - GET-style action "records": returns the full list of DNS records the user
//   needs to add at their registrar (verification TXT, MX, SPF, DKIM, DMARC).
// - action "check": resolves each record live and reports which are present.
//
// Auth: requires a valid Supabase JWT. The caller must own the domain (or be admin).

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

// AfuChat mail infrastructure (inbound via Resend, SPF include).
const MX_HOST = "feedback-smtp.us-east-1.amazonses.com";
const MX_PRIORITY = 10;
const SPF_VALUE = "v=spf1 include:amazonses.com ~all";
const DMARC_HOST = "_dmarc";
const DMARC_VALUE = "v=DMARC1; p=none; rua=mailto:dmarc@afuchat.com";
const DKIM_HOST = "resend._domainkey";
// We don't have a per-domain DKIM key to hand out yet — we tell the user it
// will be issued after the domain is verified. The `check` action treats
// "any TXT at resend._domainkey starting with v=DKIM1" as success.
const DKIM_PLACEHOLDER = "Issued automatically after verification";

interface DnsRecord {
  kind: "TXT" | "MX" | "CNAME";
  purpose: "verification" | "mx" | "spf" | "dkim" | "dmarc";
  name: string;       // host portion ("@" for apex)
  value: string;
  priority?: number;
  required: boolean;
  description: string;
}

function buildRecords(domain: string, verificationToken: string): DnsRecord[] {
  return [
    {
      kind: "TXT",
      purpose: "verification",
      name: "@",
      value: `afuchat-verify=${verificationToken}`,
      required: true,
      description: "Proves you own the domain. Required before any other record is checked.",
    },
    {
      kind: "MX",
      purpose: "mx",
      name: "@",
      value: MX_HOST,
      priority: MX_PRIORITY,
      required: true,
      description: "Routes inbound mail for your domain to AfuChat.",
    },
    {
      kind: "TXT",
      purpose: "spf",
      name: "@",
      value: SPF_VALUE,
      required: true,
      description: "Authorizes AfuChat to send mail on behalf of your domain (SPF).",
    },
    {
      kind: "TXT",
      purpose: "dkim",
      name: DKIM_HOST,
      value: DKIM_PLACEHOLDER,
      required: false,
      description: "DKIM signing key. Will be issued automatically once the domain is verified.",
    },
    {
      kind: "TXT",
      purpose: "dmarc",
      name: DMARC_HOST,
      value: DMARC_VALUE,
      required: false,
      description: "Recommended DMARC policy to improve deliverability.",
    },
  ];
}

async function resolveSafe<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkRecord(domain: string, rec: DnsRecord) {
  const fqdn = rec.name === "@" ? domain : `${rec.name}.${domain}`;

  if (rec.kind === "TXT") {
    const res = await resolveSafe(() => Deno.resolveDns(fqdn, "TXT"));
    if (!res.ok) return { found: false, seen: [] as string[], error: res.error };
    const flat = res.value.map((parts) => parts.join("").trim());
    let found = false;
    if (rec.purpose === "verification") {
      found = flat.some((t) => t === rec.value);
    } else if (rec.purpose === "spf") {
      found = flat.some((t) => /^v=spf1\b/i.test(t) && /amazonses\.com/i.test(t));
    } else if (rec.purpose === "dmarc") {
      found = flat.some((t) => /^v=DMARC1\b/i.test(t));
    } else if (rec.purpose === "dkim") {
      found = flat.some((t) => /^v=DKIM1\b/i.test(t));
    }
    return { found, seen: flat, error: null };
  }

  if (rec.kind === "MX") {
    const res = await resolveSafe(() => Deno.resolveDns(fqdn, "MX"));
    if (!res.ok) return { found: false, seen: [] as string[], error: res.error };
    const flat = res.value.map((m: any) => `${m.preference} ${String(m.exchange).replace(/\.$/, "")}`);
    const found = res.value.some((m: any) =>
      String(m.exchange).replace(/\.$/, "").toLowerCase() === rec.value.toLowerCase(),
    );
    return { found, seen: flat, error: null };
  }

  return { found: false, seen: [], error: "Unsupported record kind" };
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
      .select("id, user_id, domain, verification_token, status")
      .eq("id", domainId)
      .maybeSingle();
    if (fetchErr || !row) return json(404, { error: "Domain not found" });

    // Owner or admin only.
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

    const records = buildRecords(row.domain, row.verification_token);

    if (action === "records") {
      return json(200, {
        domain: row.domain,
        status: row.status,
        records,
      });
    }

    if (action === "check") {
      const results = await Promise.all(records.map(async (r) => {
        const res = await checkRecord(row.domain, r);
        return { ...r, ...res };
      }));
      const requiredOk = results.filter((r) => r.required).every((r) => r.found);
      const allOk = results.every((r) => r.found);
      return json(200, {
        domain: row.domain,
        status: row.status,
        required_ok: requiredOk,
        all_ok: allOk,
        records: results,
        checked_at: new Date().toISOString(),
      });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("custom-domain-dns error:", err);
    return json(500, { error: "DNS helper failed", code: "DNS_HELPER_ERROR" });
  }
};

serve(handler);
