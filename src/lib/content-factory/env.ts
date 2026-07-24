import { z } from "zod";

const supabaseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});
const geminiSchema = z.object({
  GEMINI_API_KEY: z.string().min(20),
});
const schema = supabaseSchema.merge(geminiSchema);

export function factoryEnvironment() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Content Factory environment is invalid: ${details}`);
  }
  return parsed.data;
}

export function contentFactorySupabaseEnvironment() {
  const parsed = supabaseSchema.safeParse(process.env);
  if (!parsed.success) throw new Error("Content Factory Supabase environment is invalid.");
  return parsed.data;
}

export function factoryEnvironmentReadiness() {
  const parsed = schema.safeParse(process.env);
  const configured = {
    gemini: z.string().min(20).safeParse(process.env.GEMINI_API_KEY).success,
    supabase: z.string().url().safeParse(process.env.NEXT_PUBLIC_SUPABASE_URL).success
      && z.string().min(20).safeParse(process.env.SUPABASE_SERVICE_ROLE_KEY).success,
  };
  return {
    valid: parsed.success,
    configured,
    missing: parsed.success ? [] : [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
  };
}
