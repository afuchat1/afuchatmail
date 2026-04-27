import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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

const SERVICES: { id: string; check: () => Promise<{ ok: boolean; ms: number }> }[] = [
  {
    id: "web",
    check: () => timed(() => fetch(WEB_APP_URL, { method: "HEAD", redirect: "follow" })),
  },
  {
    id: "auth",
    check: () => timed(() => fetch(`${SUPABASE_URL}/auth/v1/health`)),
  },
  {
    id: "database",
    check: () => timed(() => fetch(`${SUPABASE_URL}/rest/v1/?apikey=${ANON_KEY}`, { method: "HEAD" })),
  },
  {
    id: "realtime",
    check: () => timed(() =>
      fetch(`${SUPABASE_URL}/realtime/v1/api/tenants/realtime/health`).catch(() =>
        fetch(`${SUPABASE_URL}/realtime/v1/`, { method: "HEAD" })
      ) as Promise<Response>
    ),
  },
  {
    id: "storage",
    check: () => timed(() =>
      fetch(`${SUPABASE_URL}/storage/v1/object/public/avatars/_probe.png`, { method: "HEAD" })
    ),
  },
  { id: "send-email",    check: () => probeFunction("send-email") },
  { id: "receive-email", check: () => probeFunction("receive-email") },
  { id: "push",          check: () => probeFunction("send-push-notification") },
  { id: "ai-assist",     check: () => probeFunction("ai-email-assist") },
  { id: "telegram",      check: () => probeFunction("telegram-bot") },
  { id: "payments",      check: () => probeFunction("skypay-checkout-session") },
  { id: "afumail-api",   check: () => probeFunction("afumail-api") },
];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json(500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const checkedAt = new Date().toISOString();

  // Run all probes in parallel
  const settled = await Promise.all(
    SERVICES.map(async (svc) => {
      try {
        const { ok, ms } = await svc.check();
        return { id: svc.id, ok, ms };
      } catch {
        return { id: svc.id, ok: false, ms: 0 };
      }
    })
  );

  // Persist each result via the SECURITY DEFINER helper
  const writes = await Promise.all(
    settled.map((r) =>
      admin.rpc("record_status_check", {
        _service_id: r.id,
        _ok: r.ok,
        _ms: r.ms,
        _checked_at: checkedAt,
      })
    )
  );

  const errors = writes
    .map((w, i) => (w.error ? { id: settled[i].id, error: w.error.message } : null))
    .filter(Boolean);

  return json(200, {
    success: true,
    checked_at: checkedAt,
    results: settled,
    write_errors: errors,
  });
};

serve(handler);
