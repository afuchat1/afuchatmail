-- Fix search_path for check_alias_target function
CREATE OR REPLACE FUNCTION public.check_alias_target()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check if this is an alias
  IF NEW.is_alias = true AND NEW.alias_for_id IS NOT NULL THEN
    -- Check if the target is also an alias
    IF EXISTS (
      SELECT 1 FROM public.email_addresses 
      WHERE id = NEW.alias_for_id AND is_alias = true
    ) THEN
      RAISE EXCEPTION 'Aliases cannot point to other aliases';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;