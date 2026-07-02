import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

export function createSupabaseServerClient() {
  const { url, anonKey } = supabaseConfig();
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
