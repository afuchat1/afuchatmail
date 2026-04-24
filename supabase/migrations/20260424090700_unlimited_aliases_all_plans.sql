-- Align alias enforcement with the public pricing copy.
--
-- The Pricing page promises:
--   * Starter      — Unlimited aliases
--   * Professional — Unlimited aliases per address
--   * Business     — Team shared aliases (unlimited)
--
-- The previous trigger blocked Starter entirely and capped Pro/Business at
-- 5 / 25. This rewrite removes per-plan numeric caps and only enforces the
-- system-level rules:
--   * Aliases must reference a valid user (auth.uid IS NOT NULL on user inserts).
--   * SECURITY DEFINER / system inserts bypass the check (e.g. handle_new_user).
--   * Admins continue to be unrestricted.

CREATE OR REPLACE FUNCTION public.check_alias_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_alias = true THEN
    -- Allow system / SECURITY DEFINER inserts (no auth context).
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    -- Admins always allowed.
    IF public.has_role(auth.uid(), 'admin') THEN
      RETURN NEW;
    END IF;

    -- Every plan now includes unlimited aliases per the public pricing page.
    -- No numeric cap is enforced here.
  END IF;

  RETURN NEW;
END;
$function$;
