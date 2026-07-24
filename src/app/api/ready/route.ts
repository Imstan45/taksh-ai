import { prisma } from "@/lib/prisma";
import { environmentReadiness } from "@/lib/env";

export const dynamic = "force-dynamic";
const requiredSchemaVersion = "202607240009";

export async function GET() {
  const environment = environmentReadiness();
  try {
    const rows = await prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version FROM public.schema_migrations ORDER BY version DESC LIMIT 1
    `;
    const schemaVersion = rows[0]?.version ?? null;
    const ready = environment.valid && schemaVersion === requiredSchemaVersion;
    return Response.json(
      { ready, version: environment.deploymentVersion, schemaVersion, requiredSchemaVersion },
      { status: ready ? 200 : 503 },
    );
  } catch {
    return Response.json(
      { ready: false, version: environment.deploymentVersion, schemaVersion: null, requiredSchemaVersion, error: "Database readiness check failed." },
      { status: 503 },
    );
  }
}
