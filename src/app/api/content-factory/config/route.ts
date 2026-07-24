import { factoryEnvironmentReadiness } from "@/lib/content-factory/env";
import { requireFactorySession } from "@/lib/content-factory/auth";
import { supabaseRequest } from "@/lib/content-factory/supabase-rest";
import { geminiConfigured, resolveGeminiModel } from "@/lib/ai/gemini";

export const runtime = "edge";

export async function GET(request: Request) {
  if (!await requireFactorySession(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const readiness = factoryEnvironmentReadiness();
  let database = false;
  if (readiness.configured.supabase) {
    try {
      await supabaseRequest("taksh_curriculum?select=id&limit=1");
      database = true;
    } catch {
      database = false;
    }
  }
  return Response.json({
    gemini: geminiConfigured(),
    model: resolveGeminiModel(),
    supabase: readiness.configured.supabase,
    database,
    missing: readiness.missing,
  });
}


