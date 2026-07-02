"use client";

import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | undefined;
export function createSupabaseBrowserClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
