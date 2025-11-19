-- Add deleted_at column to track when emails were moved to trash
ALTER TABLE public.emails 
ADD COLUMN deleted_at timestamp with time zone;

-- Create function to permanently delete emails that have been in trash for 7+ days
CREATE OR REPLACE FUNCTION public.cleanup_old_trash_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.emails
  WHERE deleted_at IS NOT NULL
    AND deleted_at <= NOW() - INTERVAL '7 days';
END;
$$;

-- Add comment explaining the retention policy
COMMENT ON COLUMN public.emails.deleted_at IS 'Timestamp when email was moved to trash. Emails are permanently deleted after 7 days.';