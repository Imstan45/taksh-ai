import { factoryEnvironmentReadiness } from "../../../src/lib/env";
import { requireFactorySession } from "../../../src/lib/factory-auth";
import { supabaseRequest } from "../../../src/lib/supabase-rest";

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
    gemini: readiness.configured.gemini,
    supabase: readiness.configured.supabase,
    database,
    authentication: readiness.configured.authentication,
    missing: readiness.missing,
  });
}

