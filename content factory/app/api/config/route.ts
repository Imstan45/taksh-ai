import { factoryEnvironmentReadiness } from "../../../src/lib/env";
import { requireFactorySession } from "../../../src/lib/factory-auth";

export const runtime = "edge";

export async function GET(request: Request) {
  if (!await requireFactorySession(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const readiness = factoryEnvironmentReadiness();
  return Response.json({
    gemini: readiness.valid,
    supabase: readiness.valid,
    missing: readiness.missing,
  });
}

