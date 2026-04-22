-- Allow paid users to create aliases, with caps enforced in the trigger.
-- Starter users: 0 aliases. Professional: 5. Business: 25. Admin: unlimited.

CREATE OR REPLACE FUNCTION public.check_alias_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan text;
  v_alias_count integer;
  v_max integer;
BEGIN
  IF NEW.is_alias = true THEN
    -- Allow system / SECURITY DEFINER inserts (no auth context).
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    -- Admins always allowed, unlimited.
    IF public.has_role(auth.uid(), 'admin') THEN
      RETURN NEW;
    END IF;

    v_plan := public.get_user_plan(NEW.user_id);

    IF v_plan = 'business' THEN
      v_max := 25;
    ELSIF v_plan = 'professional' THEN
      v_max := 5;
    ELSE
      RAISE EXCEPTION 'Aliases are available on the Professional plan and above. Upgrade at /pricing to add aliases.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT COUNT(*) INTO v_alias_count
    FROM public.email_addresses
    WHERE user_id = NEW.user_id
      AND is_alias = true;

    IF v_alias_count >= v_max THEN
      RAISE EXCEPTION 'Alias limit reached for your plan (% used of %). Upgrade at /pricing for more aliases.', v_alias_count, v_max
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;