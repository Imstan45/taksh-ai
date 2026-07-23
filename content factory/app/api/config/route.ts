import { isSupabaseConfigured } from "../../../src/lib/supabase-rest";

export const runtime = "edge";

export async function GET() {
  return Response.json({
    gemini: Boolean(process.env.GEMINI_API_KEY),
    supabase: isSupabaseConfigured(),
  });
}

