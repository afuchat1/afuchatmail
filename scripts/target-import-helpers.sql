-- ============================================================================
-- Run this ONCE in the SQL editor of the TARGET Supabase project
-- (lqowocmjmhbkoxlwyxku) AFTER scripts/new-supabase-schema.sql.
--
-- It creates a service-role-only import endpoint used by the `migrate-to-target`
-- edge function. It can import auth users (password hashes included) and any
-- whitelisted public table, skipping generated columns and bypassing triggers
-- and FK ordering while the copy runs.
--
-- Drop it again once the migration is done (see bottom of this file).
-- ============================================================================

create or replace function public.migrate_import(_target text, _rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_allowed text[] := array[
    'auth.users','auth.identities',
    'profiles','folders','email_addresses','custom_domains','emails',
    'email_templates','user_settings','user_roles',
    'oauth_applications','oauth_authorization_codes','oauth_tokens',
    'subscriptions','payment_transactions','telegram_links',
    'push_subscriptions','admin_audit_log','password_reset_tokens',
    'status_latest','status_daily','status_incidents'
  ];
  v_schema text;
  v_table  text;
  v_cols   text;
  v_sql    text;
  v_count  bigint := 0;
  v_ids    uuid[];
begin
  if not (_target = any (v_allowed)) then
    raise exception 'Table % is not allowed', _target;
  end if;

  if jsonb_typeof(_rows) <> 'array' then
    raise exception 'rows must be a JSON array';
  end if;

  if position('.' in _target) > 0 then
    v_schema := split_part(_target, '.', 1);
    v_table  := split_part(_target, '.', 2);
  else
    v_schema := 'public';
    v_table  := _target;
  end if;

  -- Disable triggers + FK checks for this transaction when permitted, so
  -- signup triggers do not re-provision imported users and load order is free.
  begin
    perform set_config('session_replication_role', 'replica', true);
  exception when others then
    raise notice 'could not switch to replica mode: %', sqlerrm;
  end;

  -- Real (non-generated, non-identity) columns only.
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
    from information_schema.columns
   where table_schema = v_schema
     and table_name = v_table
     and is_generated = 'NEVER'
     and coalesce(identity_generation, '') <> 'ALWAYS';

  if v_cols is null then
    raise exception 'Table %.% not found on this project', v_schema, v_table;
  end if;

  v_sql := format(
    'insert into %I.%I (%s) select %s from jsonb_populate_recordset(null::%I.%I, $1) on conflict do nothing',
    v_schema, v_table, v_cols, v_cols, v_schema, v_table
  );

  execute v_sql using _rows;
  get diagnostics v_count = row_count;

  -- After importing auth users, remove any rows the signup triggers may have
  -- auto-created for them so the real data can land unchanged.
  if _target = 'auth.users' then
    select array_agg((r->>'id')::uuid) into v_ids
      from jsonb_array_elements(_rows) r;

    delete from public.email_addresses where user_id = any (v_ids);
    delete from public.folders         where user_id = any (v_ids);
  end if;

  return jsonb_build_object('table', _target, 'received', jsonb_array_length(_rows), 'inserted', v_count);
end;
$$;

revoke all on function public.migrate_import(text, jsonb) from public, anon, authenticated;
grant execute on function public.migrate_import(text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Cleanup after a successful migration:
-- drop function if exists public.migrate_import(text, jsonb);
-- ---------------------------------------------------------------------------
