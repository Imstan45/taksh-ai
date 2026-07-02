import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(10).max(128)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a symbol");

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().default(false),
});
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80).transform((value) => value.replace(/[<>]/g, "")),
  email,
  password: passwordSchema,
});
export const emailSchema = z.object({ email });
export const tokenSchema = z.object({ token: z.string().min(32).max(256) });
export const resetPasswordSchema = tokenSchema.extend({ password: passwordSchema });

export function firstValidationError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid request";
}
