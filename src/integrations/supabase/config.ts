/**
 * Public Supabase connection settings.
 *
 * These values intentionally live in the client bundle so the app connects
 * directly to the production Supabase project without depending on stale
 * local environment variables. The publishable key is safe for browser use;
 * never put a Supabase service-role key in this file.
 */
export const SUPABASE_PROJECT_ID = "lqowocmjmhbkoxlwyxku";
export const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_GivejXjATbLLc15I102__g_VaPih8-C";
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;