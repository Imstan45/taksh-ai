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
  collegeName: z.string().trim().max(120).optional().default(""),
  academicStatus: z.enum(["year_1","year_2","year_3","year_4","graduate"]),
  age18: z.literal("on"), termsAccepted: z.literal("on"), privacyAccepted: z.literal("on"),
  marketingConsent: z.enum(["on"]).optional(),
  utm_source:z.string().max(200).optional(),utm_medium:z.string().max(200).optional(),utm_campaign:z.string().max(200).optional(),utm_content:z.string().max(200).optional(),utm_term:z.string().max(200).optional(),referral_code:z.string().max(100).optional(),
  source:z.string().max(200).optional(),medium:z.string().max(200).optional(),campaign:z.string().max(200).optional(),campaign_id:z.string().uuid().optional(),landing_page:z.string().max(500).optional(),referral_url:z.string().max(500).optional(),
});
export const emailSchema = z.object({ email });
export const tokenSchema = z.object({ token: z.string().min(32).max(256) });
export const resetPasswordSchema = tokenSchema.extend({ password: passwordSchema });

export function firstValidationError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid request";
}
