-- Remove the implicit "everyone" EXECUTE grant on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.create_default_folders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_alias_target() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_alias_admin_only() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_email_address_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.detect_important_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_trash_emails() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unsnooze_emails() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_user_banned(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_recovery_address_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_storage_quota_bytes(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_storage_used_bytes(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_recovery_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_all_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_user_emails(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_toggle_user_ban(uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_toggle_user_role(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_custom_domain_address(uuid, text) FROM PUBLIC;

-- Keep the app working: signed-in users need these RPCs
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_storage_quota_bytes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_storage_used_bytes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_recovery_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_recovery_address_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_custom_domain_address(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_emails(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_ban(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_role(uuid, boolean) TO authenticated;

-- Signup needs the username availability check before sign-in
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;
