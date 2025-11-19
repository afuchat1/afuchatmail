-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup job to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-trash-emails',
  '0 2 * * *',
  $$SELECT public.cleanup_old_trash_emails()$$
);