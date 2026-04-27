-- Schedule the status-probe edge function to run every 5 minutes so the
-- daily history is filled in continuously, even when nobody is on the
-- status page. Also schedule a nightly prune to drop buckets older than
-- 90 days.
--
-- ⚠️  Requires `pg_cron` and `pg_net` to be enabled on your Supabase project.
--     Both are first-party Supabase extensions and can be enabled in
--     Database → Extensions. If you can't enable them on your plan, skip
--     this migration and call the status-probe function from any external
--     scheduler instead (cron-job.org, GitHub Actions, etc).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- Helper: read a setting with a default. We use Postgres GUCs so the
-- migration doesn't hardcode the project URL or service role key.
DO $$
DECLARE
  v_url   text := current_setting('app.settings.supabase_url', true);
  v_key   text := current_setting('app.settings.supabase_service_role_key', true);
BEGIN
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE NOTICE
      'Skipping status cron schedule: app.settings.supabase_url and app.settings.supabase_service_role_key must be set.';
    RAISE NOTICE
      'Run: ALTER DATABASE postgres SET app.settings.supabase_url = ''https://<project-ref>.supabase.co'';';
    RAISE NOTICE
      '     ALTER DATABASE postgres SET app.settings.supabase_service_role_key = ''<service-role-key>'';';
    RAISE NOTICE
      'Then re-run this migration (or schedule the cron jobs manually).';
    RETURN;
  END IF;

  -- Remove existing schedules with the same name (idempotent).
  PERFORM cron.unschedule(jobid)
    FROM cron.job
   WHERE jobname IN ('afuchat_status_probe', 'afuchat_status_prune');

  PERFORM cron.schedule(
    'afuchat_status_probe',
    '*/5 * * * *',
    format($cron$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body    := '{}'::jsonb
      );
    $cron$, v_url || '/functions/v1/status-probe', v_key)
  );

  PERFORM cron.schedule(
    'afuchat_status_prune',
    '15 3 * * *',
    'SELECT public.prune_status_history();'
  );
END $$;
