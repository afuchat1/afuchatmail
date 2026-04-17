-- Helper: returns the user's effective plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin') THEN 'admin'
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = _user_id
        AND status = 'active'
        AND plan_id = 'business'
        AND (current_period_end IS NULL OR current_period_end > now())
    ) THEN 'business'
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = _user_id
        AND status = 'active'
        AND plan_id = 'professional'
        AND (current_period_end IS NULL OR current_period_end > now())
    ) THEN 'professional'
    ELSE 'starter'
  END;
$$;

-- Plan-aware email address limit
CREATE OR REPLACE FUNCTION public.check_email_address_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_count INTEGER;
  user_plan TEXT;
  max_allowed INTEGER;
BEGIN
  -- Aliases are unlimited for everyone
  IF NEW.is_alias = true THEN
    RETURN NEW;
  END IF;

  user_plan := public.get_user_plan(NEW.user_id);

  -- Admins and Business get unlimited
  IF user_plan IN ('admin', 'business') THEN
    RETURN NEW;
  END IF;

  -- Plan-based caps for primary addresses
  IF user_plan = 'professional' THEN
    max_allowed := 3;
  ELSE
    max_allowed := 1; -- starter / free
  END IF;

  SELECT COUNT(*) INTO email_count
  FROM public.email_addresses
  WHERE user_id = NEW.user_id
    AND is_alias = false;

  IF email_count >= max_allowed THEN
    RAISE EXCEPTION 'Email address limit reached for your plan. Upgrade at /pricing to add more addresses.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;