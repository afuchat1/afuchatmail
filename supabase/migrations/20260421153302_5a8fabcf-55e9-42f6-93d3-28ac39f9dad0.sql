-- Extend the new-user handler to also reserve the primary mailbox.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  derived_username text;
  candidate text;
  i integer := 0;
BEGIN
  -- 1. Profile (existing behavior)
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- 2. Determine the desired local-part:
  --    prefer the explicit `username` from sign-up metadata,
  --    fall back to the local part of the auth email.
  derived_username := lower(COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  ));
  -- Normalize: keep only safe chars
  derived_username := regexp_replace(derived_username, '[^a-z0-9._-]', '', 'g');
  IF derived_username IS NULL OR length(derived_username) < 2 THEN
    derived_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  -- 3. Reserve a unique local_part (in case of collision, append a numeric suffix)
  candidate := derived_username;
  WHILE EXISTS (SELECT 1 FROM public.email_addresses WHERE local_part = candidate) LOOP
    i := i + 1;
    candidate := derived_username || i::text;
    EXIT WHEN i > 50;
  END LOOP;

  -- 4. Insert the primary mailbox. SECURITY DEFINER bypasses our triggers'
  --    auth.uid() checks during signup (auth.uid() may be null here).
  INSERT INTO public.email_addresses (user_id, local_part, full_email, is_primary, is_alias)
  VALUES (NEW.id, candidate, candidate || '@afuchat.com', true, false)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Make the alias-admin-only check tolerant of system inserts (auth.uid() IS NULL).
CREATE OR REPLACE FUNCTION public.check_alias_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_alias = true THEN
    -- Allow system / SECURITY DEFINER inserts (no auth context).
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only administrators can create email aliases.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;