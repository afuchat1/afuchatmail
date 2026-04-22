-- Harden handle_new_user with detailed exception logging so we can see the real error.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  derived_username text;
  candidate text;
  i integer := 0;
  err_context text;
  err_detail text;
  err_message text;
  err_state text;
BEGIN
  -- 1. Profile
  BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_message = MESSAGE_TEXT, err_state = RETURNED_SQLSTATE, err_detail = PG_EXCEPTION_DETAIL, err_context = PG_EXCEPTION_CONTEXT;
    RAISE WARNING 'handle_new_user[profiles] sqlstate=% message=% detail=% context=%', err_state, err_message, err_detail, err_context;
  END;

  -- 2. Derive username
  derived_username := lower(COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  ));
  derived_username := regexp_replace(derived_username, '[^a-z0-9._-]', '', 'g');
  -- Strip leading/trailing non-alphanum to satisfy valid_local_part check
  derived_username := regexp_replace(derived_username, '^[._-]+', '', 'g');
  derived_username := regexp_replace(derived_username, '[._-]+$', '', 'g');
  IF derived_username IS NULL OR length(derived_username) < 3 THEN
    derived_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  IF length(derived_username) > 30 THEN
    derived_username := substr(derived_username, 1, 30);
  END IF;

  -- 3. Reserve a unique local_part
  candidate := derived_username;
  WHILE EXISTS (SELECT 1 FROM public.email_addresses WHERE local_part = candidate) LOOP
    i := i + 1;
    candidate := substr(derived_username, 1, 28) || i::text;
    EXIT WHEN i > 50;
  END LOOP;

  -- 4. Insert primary mailbox with detailed error capture
  BEGIN
    INSERT INTO public.email_addresses (user_id, local_part, full_email, is_primary, is_alias)
    VALUES (NEW.id, candidate, candidate || '@afuchat.com', true, false);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_message = MESSAGE_TEXT, err_state = RETURNED_SQLSTATE, err_detail = PG_EXCEPTION_DETAIL, err_context = PG_EXCEPTION_CONTEXT;
    RAISE WARNING 'handle_new_user[email_addresses] sqlstate=% message=% detail=% context=% candidate=%', err_state, err_message, err_detail, err_context, candidate;
    -- Re-raise so signup fails clearly rather than silently leaving user without mailbox
    RAISE EXCEPTION 'Failed to provision mailbox for %: % (sqlstate %)', candidate, err_message, err_state;
  END;

  RETURN NEW;
END;
$function$;