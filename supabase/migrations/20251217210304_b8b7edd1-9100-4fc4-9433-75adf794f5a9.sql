-- Fix type mismatch in admin_get_all_users function
DROP FUNCTION IF EXISTS public.admin_get_all_users();

CREATE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  user_id uuid,
  auth_email text,
  email_addresses text[],
  email_count bigint,
  is_admin boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'view_all_users', NULL, jsonb_build_object('action_time', now()));
  
  RETURN QUERY
  SELECT 
    p.id as user_id,
    au.email::text as auth_email,
    ARRAY_AGG(ea.full_email ORDER BY ea.is_primary DESC, ea.created_at) FILTER (WHERE ea.full_email IS NOT NULL) as email_addresses,
    COUNT(ea.id) as email_count,
    EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') as is_admin,
    p.created_at
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN email_addresses ea ON p.id = ea.user_id AND ea.is_alias = false
  GROUP BY p.id, au.email, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;