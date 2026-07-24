import { environmentReadiness } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const requiredTables = [
  "schema_migrations",
  "user_roles",
  "institutions",
  "students",
  "student_profiles",
  "taksh_content_assets",
  "student_course_assignments",
  "student_content_progress",
  "assessments",
  "assessment_attempts",
  "audit_logs",
];

export async function GET() {
  const environment = environmentReadiness();
  let database = false;
  let schemaVersion: string | null = null;
  let missingTables = requiredTables;

  try {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY(${requiredTables}::text[])
    `;
    const installed = new Set(tables.map((row) => row.table_name));
    missingTables = requiredTables.filter((table) => !installed.has(table));
    database = true;
    if (installed.has("schema_migrations")) {
      const versions = await prisma.$queryRaw<Array<{ version: string }>>`
        SELECT version FROM public.schema_migrations ORDER BY installed_at DESC LIMIT 1
      `;
      schemaVersion = versions[0]?.version ?? null;
    }
  } catch {
    database = false;
  }

  const ready = environment.valid && database && missingTables.length === 0;
  return Response.json({
    version: environment.deploymentVersion,
    status: ready ? "ready" : "degraded",
    checks: {
      environment: environment.valid,
      database,
      schema: missingTables.length === 0,
      supabase: environment.supabase,
    },
    schemaVersion,
    missingConfiguration: environment.missing,
    missingTables,
  }, { status: ready ? 200 : 503 });
}
