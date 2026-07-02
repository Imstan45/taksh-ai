CREATE TYPE "PlacementStatus" AS ENUM ('PREPARING', 'INTERNSHIP', 'PLACED', 'HIGHER_STUDIES', 'NOT_SEEKING');

CREATE TABLE "StudentProfile" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "phone" TEXT, "dateOfBirth" TIMESTAMP(3),
  "location" TEXT, "bio" TEXT, "linkedInUrl" TEXT, "githubUrl" TEXT, "portfolioUrl" TEXT,
  "careerGoal" TEXT, "targetRoles" TEXT[], "targetCompanies" TEXT[],
  "placementStatus" "PlacementStatus" NOT NULL DEFAULT 'PREPARING',
  "expectedGraduationYear" INTEGER, "resumeUrl" TEXT, "resumeKey" TEXT, "resumeName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Education" (
  "id" TEXT NOT NULL, "profileId" TEXT NOT NULL, "institution" TEXT NOT NULL, "degree" TEXT NOT NULL,
  "field" TEXT NOT NULL, "startYear" INTEGER NOT NULL, "endYear" INTEGER, "score" TEXT,
  CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Skill" (
  "id" TEXT NOT NULL, "profileId" TEXT NOT NULL, "name" TEXT NOT NULL, "level" INTEGER NOT NULL,
  CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProgrammingLanguage" (
  "id" TEXT NOT NULL, "profileId" TEXT NOT NULL, "name" TEXT NOT NULL, "level" INTEGER NOT NULL,
  CONSTRAINT "ProgrammingLanguage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Achievement" (
  "id" TEXT NOT NULL, "profileId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "achievedAt" TIMESTAMP(3),
  CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Certificate" (
  "id" TEXT NOT NULL, "profileId" TEXT NOT NULL, "name" TEXT NOT NULL, "issuer" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3), "credentialUrl" TEXT, CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Project" (
  "id" TEXT NOT NULL, "profileId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
  "technologies" TEXT[], "projectUrl" TEXT, "repositoryUrl" TEXT, "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");
CREATE INDEX "Education_profileId_idx" ON "Education"("profileId");
CREATE UNIQUE INDEX "Skill_profileId_name_key" ON "Skill"("profileId", "name");
CREATE UNIQUE INDEX "ProgrammingLanguage_profileId_name_key" ON "ProgrammingLanguage"("profileId", "name");
CREATE INDEX "Achievement_profileId_idx" ON "Achievement"("profileId");
CREATE INDEX "Certificate_profileId_idx" ON "Certificate"("profileId");
CREATE INDEX "Project_profileId_idx" ON "Project"("profileId");

ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Education" ADD CONSTRAINT "Education_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgrammingLanguage" ADD CONSTRAINT "ProgrammingLanguage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
