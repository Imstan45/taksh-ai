import { describe, expect, it } from "vitest";
import { invitationDestination, invitationInputSchema, invitationIsAcceptable } from "@/lib/invitations";

describe("invitation lifecycle", () => {
  it("binds and normalizes invitation input", () => {
    expect(invitationInputSchema.parse({
      email: " Student@Example.com ",
      role: "STUDENT",
      institutionId: "3f2c65d5-b964-4d32-a70a-8e78c399bfcb",
    })).toEqual({
      email: "student@example.com",
      role: "STUDENT",
      institutionId: "3f2c65d5-b964-4d32-a70a-8e78c399bfcb",
    });
  });

  it.each(["SUPER_ADMIN", "OWNER", ""])("rejects forbidden role %s", (role) => {
    expect(invitationInputSchema.safeParse({
      email: "user@example.com", role, institutionId: "3f2c65d5-b964-4d32-a70a-8e78c399bfcb",
    }).success).toBe(false);
  });

  it("rejects expired, revoked, accepted, and reused invitations", () => {
    const now = new Date("2026-07-24T10:00:00Z");
    expect(invitationIsAcceptable("pending", new Date("2026-07-24T11:00:00Z"), now)).toBe(true);
    expect(invitationIsAcceptable("pending", new Date("2026-07-24T09:00:00Z"), now)).toBe(false);
    expect(invitationIsAcceptable("revoked", new Date("2026-07-24T11:00:00Z"), now)).toBe(false);
    expect(invitationIsAcceptable("accepted", new Date("2026-07-24T11:00:00Z"), now)).toBe(false);
  });

  it("uses the correct portal destination for each role", () => {
    expect(invitationDestination("STUDENT")).toBe("/login");
    expect(invitationDestination("FACULTY")).toBe("/admin/login");
    expect(invitationDestination("COLLEGE_ADMIN")).toBe("/admin/login");
    expect(invitationDestination("SUPER_ADMIN")).toBe("/super-admin/login");
  });
});
