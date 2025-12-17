-- Drop and recreate function with new return type
DROP FUNCTION IF EXISTS public.admin_get_all_users();

CREATE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  user_id uuid,
  auth_email text,
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
    au.email::text as auth_email,
    COUNT(ea.id)::bigint as email_count,
    COALESCE(public.has_role(ea.user_id, 'admin'), false) as is_admin,
    array_agg(ea.full_email ORDER BY ea.created_at) as email_addresses,
    MIN(ea.created_at) as created_at
  FROM public.email_addresses ea
  LEFT JOIN auth.users au ON au.id = ea.user_id
  WHERE ea.is_alias = false
  GROUP BY ea.user_id, au.email
  ORDER BY email_count DESC;
END;
$$;