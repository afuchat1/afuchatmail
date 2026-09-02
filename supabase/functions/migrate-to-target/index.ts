// One-shot migration: copies auth users (with password hashes) and all app
// data from this backend into the target Supabase project.
//
// Requires the schema to already exist on the target project.
//
// Secrets used: TARGET_SUPABASE_URL, TARGET_SUPABASE_SERVICE_ROLE_KEY,
//               TARGET_SUPABASE_DB_URL, SUPABASE_DB_URL (source)
// Access: caller must present a valid session for a user with the `admin` role.
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Load order matters only for readability — the target import runs with
// triggers/FK checks relaxed.
const PLAN: { table: string; chunk: number; order: string }[] = [
  { table: "auth.users", chunk: 100, order: "created_at" },
  { table: "auth.identities", chunk: 200, order: "created_at" },
  { table: "profiles", chunk: 200, order: "created_at" },
  { table: "folders", chunk: 500, order: "created_at" },
  { table: "email_addresses", chunk: 500, order: "created_at" },
  { table: "custom_domains", chunk: 200, order: "created_at" },
  { table: "emails", chunk: 25, order: "created_at" },
  { table: "email_templates", chunk: 50, order: "created_at" },
  { table: "user_settings", chunk: 200, order: "created_at" },
  { table: "user_roles", chunk: 500, order: "created_at" },
  { table: "oauth_applications", chunk: 200, order: "created_at" },
  { table: "oauth_authorization_codes", chunk: 200, order: "created_at" },
  { table: "oauth_tokens", chunk: 200, order: "created_at" },
  { table: "payment_transactions", chunk: 100, order: "created_at" },
  { table: "subscriptions", chunk: 200, order: "created_at" },
  { table: "telegram_links", chunk: 200, order: "linked_at" },
  { table: "push_subscriptions", chunk: 200, order: "created_at" },
  { table: "admin_audit_log", chunk: 200, order: "created_at" },
  { table: "password_reset_tokens", chunk: 200, order: "created_at" },
  { table: "status_latest", chunk: 200, order: "checked_at" },
  { table: "status_daily", chunk: 500, order: "day" },
  { table: "status_incidents", chunk: 100, order: "created_at" },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const targetUrl = (Deno.env.get("TARGET_SUPABASE_URL") ?? "").replace(/\/+$/, "");
  const targetKey = Deno.env.get("TARGET_SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const targetDbUrl = Deno.env.get("TARGET_SUPABASE_DB_URL") ?? "";
  const dbUrl = Deno.env.get("SUPABASE_DB_URL") ?? "";

  if (!targetUrl || !targetKey) {
    return json({ error: "TARGET_SUPABASE_URL / TARGET_SUPABASE_SERVICE_ROLE_KEY are not configured" }, 500);
  }
  if (!targetDbUrl) return json({ error: "TARGET_SUPABASE_DB_URL is not configured" }, 500);
  if (!dbUrl) return json({ error: "SUPABASE_DB_URL is not available" }, 500);

  // --- Access control: admin session required -------------------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await authClient.auth.getUser();
  if (authErr || !user) return json({ error: "Invalid or expired session" }, 401);

  const { data: isAdmin } = await authClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (isAdmin !== true) return json({ error: "Admin role required" }, 403);


  let body: { dry_run?: boolean; only?: string[] } = {};
  try { body = await req.json(); } catch { /* no body */ }
  const dryRun = body.dry_run === true;
  const only = Array.isArray(body.only) && body.only.length ? new Set(body.only) : null;

  const sql = postgres(dbUrl, { prepare: false, max: 2, ssl: "require" });
  const targetSql = postgres(targetDbUrl, { prepare: false, max: 1, ssl: "require" });
  const report: Record<string, unknown>[] = [];

  const pushRows = async (table: string, rows: unknown[]) => {
    const [schema, name] = table.includes(".") ? table.split(".") : ["public", table];
    if (!schema || !name) throw new Error(`Invalid migration table: ${table}`);

    return await targetSql.begin(async (tx) => {
      const columns = await tx`
        select string_agg(quote_ident(column_name), ', ' order by ordinal_position) as names
          from information_schema.columns
         where table_schema = ${schema}
           and table_name = ${name}
           and is_generated = 'NEVER'
           and coalesce(identity_generation, '') <> 'ALWAYS'`;
      const names = columns[0]?.names;
      if (typeof names !== "string" || !names) {
        throw new Error(`${table}: table is missing on target`);
      }

      const result = await tx.unsafe(
        `insert into "${schema}"."${name}" (${names}) select ${names} from jsonb_populate_recordset(null::"${schema}"."${name}", $1) on conflict do nothing`,
        [tx.json(rows)],
      );

      if (table === "auth.users") {
        const ids = rows
          .map((row) => (row as Record<string, unknown>)?.id)
          .filter((id): id is string => typeof id === "string");
        if (ids.length) {
          await tx`delete from public.email_addresses where user_id = any(${ids}::uuid[])`;
          await tx`delete from public.folders where user_id = any(${ids}::uuid[])`;
        }
      }

      return result.count;
    });
  };

  try {
    for (const step of PLAN) {
      if (only && !only.has(step.table)) continue;

      const [schema, name] = step.table.includes(".")
        ? step.table.split(".")
        : ["public", step.table];

      // Skip tables that don't exist on this source project.
      const exists = await sql`
        select 1 from information_schema.tables
         where table_schema = ${schema} and table_name = ${name} limit 1`;
      if (exists.length === 0) {
        report.push({ table: step.table, skipped: "not present on source" });
        continue;
      }

      const countRows = await sql.unsafe(
        `select count(*)::bigint as c from ${schema}."${name}"`,
      );
      const total = Number(countRows[0].c);
      if (total === 0) {
        report.push({ table: step.table, rows: 0 });
        continue;
      }
      if (dryRun) {
        report.push({ table: step.table, rows: total, dry_run: true });
        continue;
      }

      let migrated = 0;
      for (let offset = 0; offset < total; offset += step.chunk) {
        const rows = await sql.unsafe(
          `select to_jsonb(t) as row from ${schema}."${name}" t
             order by ${step.order === "day" ? '"day"' : `"${step.order}"`} nulls first
             limit ${step.chunk} offset ${offset}`,
        );
        const payload = rows.map((r: Record<string, unknown>) => r.row);
        if (payload.length === 0) break;
        await pushRows(step.table, payload);
        migrated += payload.length;
      }
      report.push({ table: step.table, rows: total, migrated });
      console.log(`[migrate] ${step.table}: ${migrated}/${total}`);
    }

    return json({ ok: true, dry_run: dryRun, target: targetUrl, report });
  } catch (err) {
    console.error("[migrate] failed:", err);
    return json({ ok: false, error: String((err as Error).message ?? err), report }, 500);
  } finally {
    await sql.end({ timeout: 5 });
    await targetSql.end({ timeout: 5 });
  }
});
