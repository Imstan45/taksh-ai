import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";
import { mainEnvironment } from "@/lib/env";

export function createSupabaseServerClient() {
  const { url, anonKey } = supabaseConfig();
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export function createSupabaseAdminClient() {
  const env = mainEnvironment();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
