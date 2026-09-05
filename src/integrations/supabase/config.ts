/**
 * Public backend connection settings.
 *
 * These values intentionally live in the client bundle so the app connects
 * directly to the live backend project. The publishable key is safe for
 * browser use; never put a service-role key in this file.
 *
 * They are read from the build environment so the app always follows the
 * backend that actually serves its functions, mail webhooks and secrets.
 */
export const SUPABASE_PROJECT_ID =
  (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ??
  "vfcukxlzqfeehhkiogpf";
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? "";
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
