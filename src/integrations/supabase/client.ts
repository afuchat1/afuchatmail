// Supabase production client for AfuChat Mail.
// These values are intentionally hard-coded for the migrated production project.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

const SUPABASE_URL = "https://lqowocmjmhbkoxlwyxku.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GivejXjATbLLc15I102__g_VaPih8-C";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: brokeredPreviewStorage(),
    persistSession: true,
    autoRefreshToken: true,
  }
});
