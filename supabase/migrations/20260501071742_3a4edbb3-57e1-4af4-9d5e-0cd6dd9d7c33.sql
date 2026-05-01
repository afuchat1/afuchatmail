-- Custom-domain primary addresses should not count toward the platform (afuchat.com) cap.
-- Plan caps only apply to addresses on the shared platform domain.
CREATE OR REPLACE FUNCTION public.check_email_address_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  email_count INTEGER;
  user_plan TEXT;
  max_allowed INTEGER;
  v_owns_domain BOOLEAN;
BEGIN
  -- Aliases are unlimited for everyone.
  IF NEW.is_alias = true THEN
    RETURN NEW;
  END IF;

  user_plan := public.get_user_plan(NEW.user_id);

  -- Admins and Business get unlimited primary addresses everywhere.
  IF user_plan IN ('admin', 'business') THEN
    RETURN NEW;
  END IF;

  -- Addresses created on a verified custom domain that the user owns
  -- do NOT count against the platform-domain cap. They are governed by
  -- the user owning the domain (and require Pro+, enforced in the RPC).
  IF NEW.domain <> 'afuchat.com' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.custom_domains
       WHERE user_id = NEW.user_id
         AND domain = NEW.domain
         AND status = 'verified'
    ) INTO v_owns_domain;
    IF v_owns_domain THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Plan-based caps for primary addresses on the shared platform domain.
  IF user_plan = 'professional' THEN
    max_allowed := 3;
  ELSE
    max_allowed := 1; -- starter / free
  END IF;

  SELECT COUNT(*) INTO email_count
    FROM public.email_addresses
   WHERE user_id = NEW.user_id
     AND is_alias = false
     AND domain = 'afuchat.com';

  IF email_count >= max_allowed THEN
    RAISE EXCEPTION 'You have reached the address limit for the afuchat.com domain on your plan. Upgrade at /pricing or add an address on one of your verified custom domains.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;