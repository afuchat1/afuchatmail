-- 1. Fixed search_path on remaining functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.touch_custom_domain_updated_at() SET search_path = public;

-- 2. Revoke EXECUTE on internal/trigger functions from API roles
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_custom_domain_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.create_default_folders() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.detect_important_email() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.check_alias_target() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.check_alias_admin_only() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.check_email_address_limit() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_trash_emails() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.unsnooze_emails() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_user_banned(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.lookup_recovery_address_id(text) FROM anon, authenticated;

-- 3. Admin + user-scoped RPCs: signed-in only, never anonymous
REVOKE ALL ON FUNCTION public.admin_get_all_users() FROM anon;
REVOKE ALL ON FUNCTION public.admin_get_user_emails(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_toggle_user_ban(uuid, boolean, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_toggle_user_role(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.set_recovery_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.create_custom_domain_address(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_plan(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_storage_quota_bytes(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_storage_used_bytes(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- 4. Avatars bucket: stop broad listing of all files
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Users can list their own avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. oauth_tokens: owner delete + constrain revoke updates
DROP POLICY IF EXISTS "Users can revoke their own tokens" ON public.oauth_tokens;
CREATE POLICY "Users can revoke their own tokens"
  ON public.oauth_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND revoked = true);

CREATE POLICY "Users can delete their own tokens"
  ON public.oauth_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own tokens" ON public.oauth_tokens;
CREATE POLICY "Users can view their own tokens"
  ON public.oauth_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, UPDATE, DELETE ON public.oauth_tokens TO authenticated;
GRANT ALL ON public.oauth_tokens TO service_role;

-- 6. oauth_authorization_codes: owner can consume/remove own codes
CREATE POLICY "Users can consume their own auth codes"
  ON public.oauth_authorization_codes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND used = true);

CREATE POLICY "Users can delete their own auth codes"
  ON public.oauth_authorization_codes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own auth codes" ON public.oauth_authorization_codes;
CREATE POLICY "Users can view their own auth codes"
  ON public.oauth_authorization_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own auth codes" ON public.oauth_authorization_codes;
CREATE POLICY "Users can create their own auth codes"
  ON public.oauth_authorization_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_authorization_codes TO authenticated;
GRANT ALL ON public.oauth_authorization_codes TO service_role;

-- 7. payment_transactions: admin visibility (covers guest rows with NULL user_id)
CREATE POLICY "Admins can view all payment transactions"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. user_roles: no write access for app roles at all
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_roles FROM anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
