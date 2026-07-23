import { z } from "zod";

const url = z.string().url();

const mainEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  AUTH_SECRET: z.string().min(24),
  NEXT_PUBLIC_APP_URL: url,
  NEXT_PUBLIC_CONTENT_FACTORY_URL: url.optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  CONTENT_FACTORY_AUTH_SECRET: z.string().min(32),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
});

export type MainEnvironment = z.infer<typeof mainEnvironmentSchema>;

let cached: MainEnvironment | undefined;

export function mainEnvironment(): MainEnvironment {
  if (cached) return cached;
  const parsed = mainEnvironmentSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Taksh AI environment is invalid: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}

export function environmentReadiness() {
  const parsed = mainEnvironmentSchema.safeParse(process.env);
  return {
    valid: parsed.success,
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    contentFactory: Boolean(process.env.NEXT_PUBLIC_CONTENT_FACTORY_URL),
    missing: parsed.success ? [] : [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
  };
}
