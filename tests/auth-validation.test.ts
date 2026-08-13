import { describe, expect, it } from "vitest";
import { loginSchema, passwordSchema, registerSchema } from "@/lib/auth/validation";
import { createToken, hashToken } from "@/lib/security/tokens";
import { roleCanAccessPath, roleHome } from "@/types/roles";

describe("authentication validation", () => {
  it("normalizes valid registrations", () => {
    const result = registerSchema.parse({ name: "  Ada Lovelace  ", email: " ADA@EXAMPLE.COM ", password: "Secure!Pass1", academicStatus:"graduate",age18:"on",termsAccepted:"on",privacyAccepted:"on" });
    expect(result).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com", password: "Secure!Pass1",academicStatus:"graduate",age18:"on",termsAccepted:"on",privacyAccepted:"on" });
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
  it("routes each database role to its own workspace", () => {
    expect(roleHome("STUDENT")).toBe("/dashboard");
    expect(roleHome("FACULTY")).toBe("/admin/faculty");
    expect(roleHome("COLLEGE_ADMIN")).toBe("/admin");
    expect(roleHome("SUPER_ADMIN")).toBe("/super-admin");
  });
  it("does not allow a callback URL to cross role boundaries", () => {
    expect(roleCanAccessPath("SUPER_ADMIN", "/superadmin/content-factory")).toBe(true);
    expect(roleCanAccessPath("FACULTY", "/admin/faculty/learners")).toBe(true);
    expect(roleCanAccessPath("STUDENT", "/dashboard")).toBe(true);
    expect(roleCanAccessPath("STUDENT", "/super-admin")).toBe(false);
    expect(roleCanAccessPath("COLLEGE_ADMIN", "/student/courses")).toBe(false);
  });
  it("requires students to replace the shared onboarding password with a strong password", () => {
    expect(passwordSchema.safeParse("welcome2026").success).toBe(false);
    expect(passwordSchema.safeParse("Private!Pass2026").success).toBe(true);
  });
});
