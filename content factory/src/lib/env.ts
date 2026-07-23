import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  GEMINI_API_KEY: z.string().min(20),
  CONTENT_FACTORY_AUTH_SECRET: z.string().min(32),
});

export function factoryEnvironment() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Content Factory environment is invalid: ${details}`);
  }
  return parsed.data;
}

export function factoryEnvironmentReadiness() {
  const parsed = schema.safeParse(process.env);
  return {
    valid: parsed.success,
    missing: parsed.success ? [] : [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
  };
}
