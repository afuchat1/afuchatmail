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

// Order respects foreign-key dependencies so rows can be inserted with FK
// checks enabled. Chunk sizes are tuned to table width and row count.
const PLAN: { table: string; chunk: number; order: string }[] = [
  { table: "auth.users", chunk: 100, order: "created_at" },
  { table: "auth.identities", chunk: 200, order: "created_at" },
  // email_addresses must come before profiles/custom_domains because those
  // reference it; folders must come before emails.
  { table: "email_addresses", chunk: 500, order: "created_at" },
  { table: "folders", chunk: 500, order: "created_at" },
  { table: "profiles", chunk: 200, order: "created_at" },
  { table: "custom_domains", chunk: 200, order: "created_at" },
  { table: "emails", chunk: 100, order: "created_at" },
  { table: "email_templates", chunk: 200, order: "created_at" },
  { table: "user_settings", chunk: 200, order: "created_at" },
  { table: "user_roles", chunk: 500, order: "created_at" },
  { table: "oauth_applications", chunk: 200, order: "created_at" },
  { table: "oauth_authorization_codes", chunk: 200, order: "created_at" },
  { table: "oauth_tokens", chunk: 200, order: "created_at" },
  { table: "payment_transactions", chunk: 200, order: "created_at" },
  { table: "subscriptions", chunk: 200, order: "created_at" },
  { table: "telegram_links", chunk: 200, order: "linked_at" },
  { table: "push_subscriptions", chunk: 200, order: "created_at" },
  { table: "admin_audit_log", chunk: 500, order: "created_at" },
  { table: "password_reset_tokens", chunk: 200, order: "created_at" },
  { table: "status_latest", chunk: 200, order: "checked_at" },
  { table: "status_daily", chunk: 1000, order: "day" },
  { table: "status_incidents", chunk: 1500, order: "created_at" },
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
  const targetDbUrl = (Deno.env.get("TARGET_SUPABASE_DB_URL") ?? "")
    // Supabase's transaction pooler (6543) multiplexes queries across backend
    // connections, so session-level settings like disabled triggers do not
    // persist. Force the session pooler (5432) so the migration runs on one
    // stable backend connection.
    .replace(/:6543\//, ":5432/");
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
  // Use a single target connection so session-level settings (e.g. disabled
  // triggers) persist across the whole migration and transactions can share
  // the same connection safely.
  const targetSql = postgres(targetDbUrl, { prepare: false, max: 1, ssl: "require" });
  const report: Record<string, unknown>[] = [];
  const columnCache = new Map<string, string>();

  const columnNames = async (schema: string, name: string, tx?: any) => {
    const key = `${schema}.${name}`;
    const cached = columnCache.get(key);
    if (cached) return cached;

    const runner = tx ?? targetSql;
    const columns = await runner`
      select string_agg(quote_ident(column_name), ', ' order by ordinal_position) as names
        from information_schema.columns
       where table_schema = ${schema}
         and table_name = ${name}
         and is_generated = 'NEVER'
         and coalesce(identity_generation, '') <> 'ALWAYS'`;
    const names = columns[0]?.names;
    if (typeof names !== "string" || !names) {
      throw new Error(`${schema}.${name}: table is missing on target`);
    }
    columnCache.set(key, names);
    return names;
  };

  const pushRows = async (table: string, rows: unknown[]) => {
    const [schema, name] = table.includes(".") ? table.split(".") : ["public", table];
    if (!schema || !name) throw new Error(`Invalid migration table: ${table}`);

    const names = await columnNames(schema, name);
    const result = await targetSql.unsafe(
      `insert into "${schema}"."${name}" (${names}) select ${names} from jsonb_populate_recordset(null::"${schema}"."${name}", $1) on conflict do nothing`,
      [targetSql.json(rows)],
    );

    return result.count;
  };

  // Auth users and identities must land in the same transaction so the FK
  // from identities to users is satisfied without relying on cross-transaction
  // visibility. We also skip identities for any user_id that is not present in
  // the target after the insert, so a partially-imported or pre-existing user
  // set never causes an FK violation.
  const pushAuthUsersAndIdentities = async (users: unknown[], identities: unknown[]) => {
    return await targetSql.begin(async (tx) => {
      const userNames = await columnNames("auth", "users", tx);
      const userResult = await tx.unsafe(
        `insert into "auth"."users" (${userNames}) select ${userNames} from jsonb_populate_recordset(null::"auth"."users", $1) on conflict do nothing`,
        [tx.json(users)],
      );

      const ids = users
        .map((row) => (row as Record<string, unknown>)?.id)
        .filter((id): id is string => typeof id === "string");
      if (ids.length) {
        // Remove auto-provisioned rows created by target triggers so the
        // real data imported later wins instead of being skipped by
        // "on conflict do nothing".
        await tx`delete from public.profiles where id = any(${ids}::uuid[])`;
        await tx`delete from public.email_addresses where user_id = any(${ids}::uuid[])`;
        await tx`delete from public.folders where user_id = any(${ids}::uuid[])`;
      }

      if (identities.length) {
        const identityNames = await columnNames("auth", "identities", tx);
        const present = await tx`
          select id::text from auth.users where id = any(${ids}::uuid[])
        `;
        const presentSet = new Set(present.map((r: { id: string }) => r.id));
        const filteredIdentities = identities.filter((row) => {
          const userId = (row as Record<string, unknown>)?.user_id;
          return typeof userId === "string" && presentSet.has(userId);
        });
        if (filteredIdentities.length) {
          await tx.unsafe(
            `insert into "auth"."identities" (${identityNames}) select ${identityNames} from jsonb_populate_recordset(null::"auth"."identities", $1) on conflict do nothing`,
            [tx.json(filteredIdentities)],
          );
        }
      }

      return userResult.count;
    });
  };

  const verifyTargetUsers = async (ids: string[]) => {
    if (!ids.length) return [];
    const rows = await targetSql`
      select id::text from auth.users where id = any(${ids}::uuid[])
    `;
    return rows.map((r: { id: string }) => r.id);
  };

  // Temporarily disable user triggers on the tables we will import so that
  // target triggers (address limits, updated_at, etc.) do not block or mutate
  // the source data. System triggers (FK constraint triggers) are left enabled.
  // Auth schema tables are owned by Supabase internals and cannot be altered by
  // the postgres role, so failures there are ignored. Triggers are re-enabled in
  // the finally block.
  const disabledTriggers: { schema: string; name: string }[] = [];
  for (const step of PLAN) {
    if (only && !only.has(step.table)) continue;
    const [schema, name] = step.table.includes(".")
      ? step.table.split(".")
      : ["public", step.table];
    try {
      await targetSql.unsafe(`alter table "${schema}"."${name}" disable trigger user`);
      disabledTriggers.push({ schema, name });
    } catch (err) {
      console.warn(`[migrate] could not disable triggers on ${schema}.${name}:`, err);
    }
  }

  try {
    for (const step of PLAN) {
      if (only && !only.has(step.table)) continue;

      // auth.identities is handled together with auth.users.
      if (step.table === "auth.identities") continue;

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

      // Combined auth.users + auth.identities import in one transaction.
      if (step.table === "auth.users") {
        const identityStep = PLAN.find((s) => s.table === "auth.identities")!;
        const identityTotalRows = await sql.unsafe(
          `select count(*)::bigint as c from auth."identities"`,
        );
        const identityTotal = Number(identityTotalRows[0].c);

        let migratedUsers = 0;
        let migratedIdentities = 0;
        for (let offset = 0; offset < total; offset += step.chunk) {
          const userRows = await sql.unsafe(
            `select to_jsonb(t) as row from auth."users" t
               order by "${step.order}" nulls first
               limit ${step.chunk} offset ${offset}`,
          );
          const userPayload = userRows.map((r: Record<string, unknown>) => r.row);
          if (userPayload.length === 0) break;

          const ids = userPayload
            .map((row) => (row as Record<string, unknown>)?.id)
            .filter((id): id is string => typeof id === "string");

          let identityPayload: unknown[] = [];
          if (ids.length && identityTotal > 0) {
            const identityRows = await sql.unsafe(
              `select to_jsonb(t) as row from auth."identities" t
                 where t.user_id = any($1::uuid[])
                 order by "${identityStep.order}" nulls first`,
              [ids],
            );
            identityPayload = identityRows.map((r: Record<string, unknown>) => r.row);
          }

          await pushAuthUsersAndIdentities(userPayload, identityPayload);
          migratedUsers += userPayload.length;
          migratedIdentities += identityPayload.length;
        }
        report.push({ table: "auth.users", rows: total, migrated: migratedUsers });
        report.push({ table: "auth.identities", rows: identityTotal, migrated: migratedIdentities });
        console.log(`[migrate] auth.users: ${migratedUsers}/${total}`);
        console.log(`[migrate] auth.identities: ${migratedIdentities}/${identityTotal}`);

        const allUserIds: string[] = [];
        for (let offset = 0; offset < total; offset += step.chunk) {
          const userRows = await sql.unsafe(
            `select to_jsonb(t) as row from auth."users" t order by "${step.order}" nulls first limit ${step.chunk} offset ${offset}`,
          );
          allUserIds.push(...userRows.map((r: Record<string, unknown>) => (r.row as Record<string, unknown>)?.id as string).filter((id): id is string => typeof id === "string"));
        }
        const presentIds = await verifyTargetUsers(allUserIds);
        console.log(`[migrate] target auth.users verification: ${presentIds.length}/${allUserIds.length}`);
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

        if (step.table === "email_addresses") {
          const userIds = payload
            .map((row) => (row as Record<string, unknown>)?.user_id as string)
            .filter((id): id is string => typeof id === "string");
          const present = await verifyTargetUsers([...new Set(userIds)]);
          console.log(`[migrate] email_addresses batch user verification: ${present.length}/${userIds.length} unique`);
        }

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
    // Re-enable any user triggers we disabled so the target database stays consistent.
    try {
      for (const { schema, name } of disabledTriggers) {
        await targetSql.unsafe(`alter table "${schema}"."${name}" enable trigger user`);
      }
    } catch (enableErr) {
      console.error("[migrate] failed to re-enable triggers:", enableErr);
    }
    await sql.end({ timeout: 5 });
    await targetSql.end({ timeout: 5 });
  }
});
