-- Block non-admins from creating alias rows.
-- Primary-address limits remain handled by check_email_address_limit().
CREATE OR REPLACE FUNCTION public.check_alias_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_alias = true THEN
    -- Only admins may create aliases
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only administrators can create email aliases.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_alias_admin_only ON public.email_addresses;
CREATE TRIGGER trg_check_alias_admin_only
BEFORE INSERT ON public.email_addresses
FOR EACH ROW
EXECUTE FUNCTION public.check_alias_admin_only();