-- Per-plan alias caps that match the public Pricing page:
--   * Starter      — 1 alias
--   * Professional — 5 aliases
--   * Business     — 25 aliases
--   * Admin        — unlimited
--
-- Replaces the previous trigger which blocked Starter entirely and used
-- different numeric caps. SECURITY DEFINER / system inserts (auth.uid IS NULL)
-- continue to bypass the check so seed data and handle_new_user keep working.

CREATE OR REPLACE FUNCTION public.check_alias_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_plan text;
  v_cap int;
  v_count int;
BEGIN
  IF NEW.is_alias = true THEN
    v_uid := auth.uid();

    -- Allow system / SECURITY DEFINER inserts (no auth context).
    IF v_uid IS NULL THEN
      RETURN NEW;
    END IF;

    -- Admins always allowed.
    IF public.has_role(v_uid, 'admin') THEN
      RETURN NEW;
    END IF;

    v_plan := public.get_user_plan(v_uid);

    IF v_plan = 'business' THEN
      v_cap := 25;
    ELSIF v_plan = 'professional' THEN
      v_cap := 5;
    ELSE
      -- Starter (or any unknown tier) gets exactly 1 alias.
      v_cap := 1;
    END IF;

    SELECT count(*)
      INTO v_count
      FROM public.email_addresses
     WHERE user_id = NEW.user_id
       AND is_alias = true;

    IF v_count >= v_cap THEN
      RAISE EXCEPTION
        'Alias limit reached for the % plan (% of % used). Upgrade your plan to add more aliases.',
        v_plan, v_count, v_cap
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
