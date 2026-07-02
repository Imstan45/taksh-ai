import { z } from "zod";

const optionalUrl = z.union([
  z.null(),
  z.literal(""),
  z.url().max(500).refine((value) => value.startsWith("https://") || value.startsWith("http://"), "Use an HTTP or HTTPS URL"),
]).transform((value) => value || null);
const level = z.number().int().min(1).max(5);
const year = z.number().int().min(1950).max(2100);

export const profileSchema = z.object({
  phone: z.string().trim().max(20).nullable(),
  dateOfBirth: z.iso.date().nullable(),
  location: z.string().trim().max(120).nullable(),
  bio: z.string().trim().max(500).nullable(),
  linkedInUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  careerGoal: z.string().trim().max(500).nullable(),
  targetRoles: z.array(z.string().trim().min(1).max(80)).max(20),
  targetCompanies: z.array(z.string().trim().min(1).max(80)).max(20),
  placementStatus: z.enum(["PREPARING", "INTERNSHIP", "PLACED", "HIGHER_STUDIES", "NOT_SEEKING"]),
  expectedGraduationYear: year.nullable(),
  education: z.array(z.object({
    institution: z.string().trim().min(2).max(150),
    degree: z.string().trim().min(2).max(100),
    field: z.string().trim().min(2).max(100),
    startYear: year,
    endYear: year.nullable(),
    score: z.string().trim().max(30).nullable(),
  })).max(10),
  skills: z.array(z.object({ name: z.string().trim().min(1).max(60), level })).max(50),
  programmingLanguages: z.array(z.object({ name: z.string().trim().min(1).max(60), level })).max(30),
  achievements: z.array(z.object({
    title: z.string().trim().min(2).max(150),
    description: z.string().trim().max(500).nullable(),
    achievedAt: z.iso.date().nullable(),
  })).max(30),
  certificates: z.array(z.object({
    name: z.string().trim().min(2).max(150),
    issuer: z.string().trim().min(2).max(150),
    issuedAt: z.iso.date().nullable(),
    credentialUrl: optionalUrl,
  })).max(30),
  projects: z.array(z.object({
    title: z.string().trim().min(2).max(150),
    description: z.string().trim().min(10).max(1000),
    technologies: z.array(z.string().trim().min(1).max(60)).max(30),
    projectUrl: optionalUrl,
    repositoryUrl: optionalUrl,
    startedAt: z.iso.date().nullable(),
    completedAt: z.iso.date().nullable(),
  })).max(30),
});

export type ProfileInput = z.infer<typeof profileSchema>;
