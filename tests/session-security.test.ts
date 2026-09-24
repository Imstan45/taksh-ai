import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("account session security", () => {
  it("invalidates older JWT sessions when authorization version changes", () => {
    const auth = readFileSync("src/auth.ts", "utf8");
    expect(auth).toContain("data.authorization_version !== token.authorizationVersion");
    expect(auth).toContain("token.sessionInvalidated = true");
    expect(auth).toContain('loginUrl.searchParams.set("reason", "session-revoked")');
  });

  it("revokes every session and records the security event", () => {
    const action = readFileSync("src/app/security/actions.ts", "utf8");
    expect(action).toContain("authorization_version = authorization_version + 1");
    expect(action).toContain("security.sessions_revoked");
    expect(action).toContain('scope: "all_devices"');
    expect(action).toContain('signOut({ redirectTo: "/login?signedOutAllDevices=1" })');
  });
});
