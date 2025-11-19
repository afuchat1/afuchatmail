-- Add snooze and importance fields to emails table
ALTER TABLE public.emails
ADD COLUMN snoozed_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_important BOOLEAN NOT NULL DEFAULT false;

-- Create index for snooze queries
CREATE INDEX idx_emails_snoozed_until ON public.emails(snoozed_until) WHERE snoozed_until IS NOT NULL;

-- Create index for importance
CREATE INDEX idx_emails_important ON public.emails(is_important) WHERE is_important = true;

-- Function to automatically detect important emails
CREATE OR REPLACE FUNCTION public.detect_important_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_email_count INTEGER;
  has_important_keywords BOOLEAN;
BEGIN
  -- Check if sender has sent/received many emails with this user
  SELECT COUNT(*) INTO sender_email_count
  FROM public.emails
  WHERE user_id = NEW.user_id
    AND (from_address = NEW.from_address OR NEW.from_address = ANY(to_addresses))
    AND created_at > NOW() - INTERVAL '30 days';
  
  -- Check for important keywords in subject
  has_important_keywords := (
    NEW.subject ~* '(urgent|important|asap|critical|priority|action required|deadline|meeting|invoice|payment)'
  );
  
  -- Mark as important if:
  -- 1. Sender has 5+ emails in last 30 days (frequent contact)
  -- 2. Subject contains important keywords
  IF sender_email_count >= 5 OR has_important_keywords THEN
    NEW.is_important := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic importance detection
CREATE TRIGGER detect_important_email_trigger
  BEFORE INSERT ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_important_email();

-- Function to un-snooze emails
CREATE OR REPLACE FUNCTION public.unsnooze_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.emails
  SET snoozed_until = NULL
  WHERE snoozed_until IS NOT NULL
    AND snoozed_until <= NOW();
END;
$$;