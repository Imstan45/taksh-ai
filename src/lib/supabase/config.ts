import { mainEnvironment } from "@/lib/env";

export function supabaseConfig() {
  const env = mainEnvironment();
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}
