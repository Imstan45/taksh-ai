import { describe, expect, it } from "vitest";
import { loginSchema, passwordSchema, registerSchema } from "@/lib/auth/validation";
import { createToken, hashToken } from "@/lib/security/tokens";

describe("authentication validation", () => {
  it("normalizes valid registrations", () => {
    const result = registerSchema.parse({ name: "  Ada Lovelace  ", email: " ADA@EXAMPLE.COM ", password: "Secure!Pass1" });
    expect(result).toEqual({ name: "Ada Lovelace", email: "ada@example.com", password: "Secure!Pass1" });
  });
  it.each(["short", "alllowercase1!", "NOLOWERCASE1!", "NoNumberHere!", "NoSymbolHere1"])("rejects weak password %s", (password) => {
    expect(passwordSchema.safeParse(password).success).toBe(false);
  });
  it("defaults remember me to false", () => {
    expect(loginSchema.parse({ email: "user@example.com", password: "x" }).rememberMe).toBe(false);
  });
  it("creates opaque, consistently hashable tokens", () => {
    const token = createToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });
});
