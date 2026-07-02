import { describe, expect, it } from "vitest";
import { profileCompletion } from "@/lib/profile/completion";
import { profileSchema } from "@/lib/profile/validation";

const valid = {
  phone: null, dateOfBirth: null, location: null, bio: null, linkedInUrl: null, githubUrl: null, portfolioUrl: null,
  careerGoal: null, targetRoles: [], targetCompanies: [], placementStatus: "PREPARING", expectedGraduationYear: null,
  education: [], skills: [], programmingLanguages: [], achievements: [], certificates: [], projects: [],
};

describe("student profile", () => {
  it("starts at zero completion", () => expect(profileCompletion(null)).toBe(0));
  it("scores all ten core signals", () => expect(profileCompletion({
    phone: "1", location: "x", bio: "x", careerGoal: "x", resumeUrl: "x",
    education: [{}], skills: [{}], programmingLanguages: [{}], projects: [{}], targetRoles: ["x"],
  })).toBe(100));
  it("accepts an empty initial profile", () => expect(profileSchema.safeParse(valid).success).toBe(true));
  it("rejects unsafe proficiency values", () => expect(profileSchema.safeParse({ ...valid, skills: [{ name: "TypeScript", level: 9 }] }).success).toBe(false));
  it("rejects non-http profile links", () => expect(profileSchema.safeParse({ ...valid, githubUrl: "javascript:alert(1)" }).success).toBe(false));
});
