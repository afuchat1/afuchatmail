import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const WEB_APP_URL   = Deno.env.get("STATUS_WEB_URL") ?? "https://afuchat.com";
const TIMEOUT_MS    = 8_000;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

async function timed(fn: () => Promise<Response>) {
  const start = performance.now();
  try {
    const res = await withTimeout(fn());
    return { ok: res.status < 500, ms: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - start) };
  }
}

const probeFunction = (name: string) =>
  timed(() =>
    fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "OPTIONS",
      headers: {
        "Access-Control-Request-Method": "POST",
        "Origin": "https://status.afuchat.com",
      },
    })
  );

type Service = { id: string; name: string; check: () => Promise<{ ok: boolean; ms: number }> };

const SERVICES: Service[] = [
  { id: "web",           name: "Web Application",  check: () => timed(() => fetch(WEB_APP_URL, { method: "HEAD", redirect: "follow" })) },
  { id: "auth",          name: "Authentication",   check: () => timed(() => fetch(`${SUPABASE_URL}/auth/v1/health`)) },
  { id: "database",      name: "Database",         check: () => timed(() => fetch(`${SUPABASE_URL}/rest/v1/?apikey=${ANON_KEY}`, { method: "HEAD" })) },
  { id: "realtime",      name: "Realtime",         check: () => timed(() =>
      fetch(`${SUPABASE_URL}/realtime/v1/api/tenants/realtime/health`).catch(() =>
        fetch(`${SUPABASE_URL}/realtime/v1/`, { method: "HEAD" })
      ) as Promise<Response>
    ) },
  { id: "storage",       name: "Storage",          check: () => timed(() =>
      fetch(`${SUPABASE_URL}/storage/v1/object/public/avatars/_probe.png`, { method: "HEAD" })
    ) },
  { id: "send-email",    name: "Mail Delivery",    check: () => probeFunction("send-email") },
  { id: "receive-email", name: "Inbound Mail",     check: () => probeFunction("receive-email") },
  { id: "ai-assist",     name: "AI Assistant",     check: () => probeFunction("ai-email-assist") },
  { id: "telegram",      name: "Telegram Bot",     check: () => probeFunction("telegram-bot") },
  { id: "payments",      name: "Payments",         check: () => probeFunction("skypay-checkout-session") },
  { id: "afumail-api",   name: "OAuth API",        check: () => probeFunction("afumail-api") },
];

// Ask Lovable AI to draft a short status article.
async function aiArticle(opts: {
  serviceName: string;
  severity: "degraded" | "down";
  kind: "open" | "resolved";
  ms?: number;
  durationMs?: number;
}): Promise<{ title: string; summary: string; body: string } | null> {
  if (!LOVABLE_API_KEY) return null;

  const sys =
    "You are AfuChat's site reliability writer. Produce concise, factual, customer-friendly status updates. Avoid speculation. No emojis.";

  const ctx =
    opts.kind === "open"
      ? `Service "${opts.serviceName}" is currently ${opts.severity}. Latest probe latency: ${opts.ms ?? "unknown"} ms.`
      : `Service "${opts.serviceName}" has fully recovered after ~${Math.round((opts.durationMs ?? 0) / 60000)} minutes of ${opts.severity} state.`;

  const user =
    opts.kind === "open"
      ? `Write a short incident article. Return JSON with keys: title (max 80 chars, plain), summary (1 sentence, what users may notice), body (2-4 short paragraphs explaining the most likely cause area for this service, what we are doing, and what users should expect). Context:\n${ctx}`
      : `Write a short resolution article. Return JSON with keys: title (max 80 chars), summary (1 sentence), body (2-3 short paragraphs confirming recovery, what was affected, and any follow-ups). Context:\n${ctx}`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        tools: [{
          type: "function",
          function: {
            name: "write_article",
            description: "Return the status article",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                body: { type: "string" },
              },
              required: ["title", "summary", "body"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "write_article" } },
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    const parsed = JSON.parse(args);
    return { title: parsed.title, summary: parsed.summary, body: parsed.body };
  } catch (e) {
    console.error("aiArticle error:", e);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json(500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const checkedAt = new Date().toISOString();

  const settled = await Promise.all(
    SERVICES.map(async (svc) => {
      try {
        const { ok, ms } = await svc.check();
        return { id: svc.id, name: svc.name, ok, ms };
      } catch {
        return { id: svc.id, name: svc.name, ok: false, ms: 0 };
      }
    })
  );

  // Persist each result via the SECURITY DEFINER helper
  await Promise.all(
    settled.map((r) =>
      admin.rpc("record_status_check", {
        _service_id: r.id,
        _ok: r.ok,
        _ms: r.ms,
        _checked_at: checkedAt,
      })
    )
  );

  // Incident management — open/resolve articles via AI
  for (const r of settled) {
    const slow = r.ok && r.ms > 1500;
    const severity: "degraded" | "down" | null =
      !r.ok ? "down" : slow ? "degraded" : null;

    const { data: openIncident } = await admin
      .from("status_incidents")
      .select("id, severity, opened_at")
      .eq("service_id", r.id)
      .eq("status", "open")
      .maybeSingle();

    if (severity && !openIncident) {
      const article = (await aiArticle({
        serviceName: r.name,
        severity,
        kind: "open",
        ms: r.ms,
      })) ?? {
        title: `${r.name} is ${severity}`,
        summary: `${r.name} is currently ${severity}.`,
        body: `We detected that ${r.name} is responding ${severity === "down" ? "with errors" : "slowly"}. Our team is investigating.`,
      };
      await admin.from("status_incidents").insert({
        service_id: r.id,
        severity,
        status: "open",
        title: article.title,
        summary: article.summary,
        body_open: article.body,
        opened_at: checkedAt,
      });
    } else if (!severity && openIncident) {
      const durationMs = Date.now() - new Date(openIncident.opened_at).getTime();
      const article = (await aiArticle({
        serviceName: r.name,
        severity: openIncident.severity as "degraded" | "down",
        kind: "resolved",
        durationMs,
      })) ?? {
        title: `${r.name} is operational`,
        summary: `${r.name} has fully recovered.`,
        body: `${r.name} is now responding normally. The earlier disruption has been resolved.`,
      };
      await admin
        .from("status_incidents")
        .update({
          status: "resolved",
          resolved_at: checkedAt,
          body_resolved: article.body,
        })
        .eq("id", openIncident.id);
    }
  }

  return json(200, { success: true, checked_at: checkedAt, results: settled });
};

serve(handler);
