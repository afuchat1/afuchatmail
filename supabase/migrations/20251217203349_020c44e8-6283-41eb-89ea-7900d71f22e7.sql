-- Function for admins to get all users with their email counts
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  user_id uuid,
  email_count bigint,
  is_admin boolean,
  email_addresses text[],
  created_at timestamptz
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
    ea.user_id,
    COUNT(ea.id)::bigint as email_count,
    COALESCE(public.has_role(ea.user_id, 'admin'), false) as is_admin,
    array_agg(ea.full_email ORDER BY ea.created_at) as email_addresses,
    MIN(ea.created_at) as created_at
  FROM public.email_addresses ea
  WHERE ea.is_alias = false
  GROUP BY ea.user_id
  ORDER BY email_count DESC;
END;
$$;

-- Function for admins to toggle user admin role
CREATE OR REPLACE FUNCTION public.admin_toggle_user_role(_target_user_id uuid, _make_admin boolean)
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

  IF _make_admin THEN
    -- Add admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Remove admin role
    DELETE FROM public.user_roles
    WHERE user_id = _target_user_id AND role = 'admin';
  END IF;

  RETURN true;
END;
$$;