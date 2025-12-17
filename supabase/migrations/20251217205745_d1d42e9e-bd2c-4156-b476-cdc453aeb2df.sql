-- Drop existing functions first to change return types
DROP FUNCTION IF EXISTS public.admin_get_user_emails(uuid);
DROP FUNCTION IF EXISTS public.admin_get_all_users();

-- Fix OAuth client secrets exposure
-- 1. Drop the overly permissive policy that exposes client_secret
DROP POLICY IF EXISTS "Anyone can view OAuth apps for authorization" ON oauth_applications;

-- 2. Create a secure view that only exposes safe columns for authorization flow
CREATE OR REPLACE VIEW public.oauth_app_public_info AS
SELECT id, name, client_id, redirect_uris, scopes
FROM oauth_applications;

-- 3. Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.oauth_app_public_info TO authenticated;
GRANT SELECT ON public.oauth_app_public_info TO anon;

-- 4. Create admin audit log table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Create admin_get_user_emails with truncated body_text and audit logging
CREATE FUNCTION public.admin_get_user_emails(_target_user_id uuid)
RETURNS TABLE (
  id uuid,
  subject text,
  from_address text,
  to_addresses text[],
  body_text text,
  is_read boolean,
  is_starred boolean,
  folder_type text,
  created_at timestamptz,
  sent_at timestamptz,
  received_at timestamptz
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
  VALUES (auth.uid(), 'view_user_emails', _target_user_id, jsonb_build_object('action_time', now()));
  
  RETURN QUERY
  SELECT 
    e.id,
    e.subject,
    e.from_address,
    e.to_addresses,
    CASE 
      WHEN e.body_text IS NULL THEN NULL
      ELSE LEFT(e.body_text, 200) || CASE WHEN LENGTH(e.body_text) > 200 THEN '...' ELSE '' END
    END as body_text,
    e.is_read,
    e.is_starred,
    COALESCE(f.type, 'unknown') as folder_type,
    e.created_at,
    e.sent_at,
    e.received_at
  FROM emails e
  LEFT JOIN folders f ON e.folder_id = f.id
  WHERE e.user_id = _target_user_id
  ORDER BY COALESCE(e.received_at, e.sent_at, e.created_at) DESC
  LIMIT 100;
END;
$$;

-- 6. Create admin_get_all_users with audit logging
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
    au.email as auth_email,
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

-- 7. Update admin_toggle_user_ban to add audit logging
CREATE OR REPLACE FUNCTION public.admin_toggle_user_ban(_target_user_id uuid, _ban boolean, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (
    auth.uid(), 
    CASE WHEN _ban THEN 'ban_user' ELSE 'unban_user' END, 
    _target_user_id, 
    jsonb_build_object('reason', _reason, 'action_time', now())
  );
  
  UPDATE profiles
  SET 
    banned_at = CASE WHEN _ban THEN now() ELSE NULL END,
    ban_reason = CASE WHEN _ban THEN _reason ELSE NULL END
  WHERE id = _target_user_id;
  
  RETURN true;
END;
$$;

-- 8. Update admin_toggle_user_role to add audit logging
CREATE OR REPLACE FUNCTION public.admin_toggle_user_role(_target_user_id uuid, _make_admin boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (
    auth.uid(), 
    CASE WHEN _make_admin THEN 'grant_admin' ELSE 'revoke_admin' END, 
    _target_user_id, 
    jsonb_build_object('action_time', now())
  );
  
  IF _make_admin THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (_target_user_id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM user_roles
    WHERE user_id = _target_user_id AND role = 'admin';
  END IF;
  
  RETURN true;
END;
$$;