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
  BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_message = MESSAGE_TEXT, err_state = RETURNED_SQLSTATE;
    RAISE WARNING 'handle_new_user[profiles] sqlstate=% message=%', err_state, err_message;
  END;

  derived_username := lower(COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  ));
  derived_username := regexp_replace(derived_username, '[^a-z0-9._-]', '', 'g');
  derived_username := regexp_replace(derived_username, '^[._-]+', '', 'g');
  derived_username := regexp_replace(derived_username, '[._-]+$', '', 'g');
  IF derived_username IS NULL OR length(derived_username) < 3 THEN
    derived_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  IF length(derived_username) > 30 THEN
    derived_username := substr(derived_username, 1, 30);
  END IF;

  candidate := derived_username;
  WHILE EXISTS (SELECT 1 FROM public.email_addresses WHERE local_part = candidate) LOOP
    i := i + 1;
    candidate := substr(derived_username, 1, 28) || i::text;
    EXIT WHEN i > 50;
  END LOOP;

  BEGIN
    -- Note: full_email is a GENERATED column; do not insert into it.
    INSERT INTO public.email_addresses (user_id, local_part, is_primary, is_alias)
    VALUES (NEW.id, candidate, true, false);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_message = MESSAGE_TEXT, err_state = RETURNED_SQLSTATE, err_context = PG_EXCEPTION_CONTEXT;
    RAISE WARNING 'handle_new_user[email_addresses] sqlstate=% message=% context=% candidate=%', err_state, err_message, err_context, candidate;
    RAISE EXCEPTION 'Failed to provision mailbox for %: % (sqlstate %)', candidate, err_message, err_state;
  END;

  RETURN NEW;
END;
$function$;