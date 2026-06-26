import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vfcukxlzqfeehhkiogpf.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmY3VreGx6cWZlZWhoa2lvZ3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0OTI4NTYsImV4cCI6MjA3OTA2ODg1Nn0.hVE2dRQCTerROZJLlUbZqCuIPggQc4bUoXDK-BOm77A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
