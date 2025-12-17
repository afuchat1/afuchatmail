-- Add banned_at column to profiles table for account banning
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text DEFAULT NULL;

-- Function for admin to get user emails
CREATE OR REPLACE FUNCTION public.admin_get_user_emails(_target_user_id uuid)
RETURNS TABLE (
  id uuid,
  subject text,
  from_address text,
  to_addresses text[],
  body_text text,
  is_read boolean,
  is_starred boolean,
  created_at timestamptz,
  sent_at timestamptz,
  received_at timestamptz,
  folder_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    e.id,
    e.subject,
    e.from_address,
    e.to_addresses,
    e.body_text,
    e.is_read,
    e.is_starred,
    e.created_at,
    e.sent_at,
    e.received_at,
    f.type as folder_type
  FROM public.emails e
  LEFT JOIN public.folders f ON f.id = e.folder_id
  WHERE e.user_id = _target_user_id
  ORDER BY e.created_at DESC
  LIMIT 100;
END;
$$;

-- Function to ban/unban user
CREATE OR REPLACE FUNCTION public.admin_toggle_user_ban(_target_user_id uuid, _ban boolean, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  IF _ban THEN
    UPDATE public.profiles
    SET banned_at = now(), ban_reason = _reason
    WHERE id = _target_user_id;
  ELSE
    UPDATE public.profiles
    SET banned_at = NULL, ban_reason = NULL
    WHERE id = _target_user_id;
  END IF;

  RETURN true;
END;
$$;

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND banned_at IS NOT NULL
  )
$$;