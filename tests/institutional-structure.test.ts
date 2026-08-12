import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("college institutional structure", () => {
  const migration = readFileSync("supabase/migrations/202608110001_institutional_semesters.sql", "utf8");
  const actions = readFileSync("src/app/admin/actions.ts", "utf8");
  const academics = readFileSync("src/app/admin/academics/page.tsx", "utf8");

  it("adds tenant-scoped semesters without duplicating sections", () => {
    expect(migration).toContain("create table if not exists public.semesters");
    expect(migration).toContain("academic_year_id uuid not null");
    expect(migration).toContain("alter table public.academic_batches");
    expect(migration).toContain("add column if not exists semester_id");
    expect(migration).toContain("alter table public.semesters enable row level security");
    expect(migration).toContain("semesters_scoped_read");
    expect(migration).not.toContain("create table if not exists public.sections");
  });

  it("guards cross-institution year and semester relationships", () => {
    expect(migration).toContain("semesters_institution_guard");
    expect(migration).toContain("academic_batches_semester_guard");
    expect(migration).toContain("Semester belongs to another institution");
  });

  it("requires a semester when an admin creates a section or batch", () => {
    expect(actions).toContain('formData.get("semesterId")');
    expect(actions).toContain("semester.id=${semesterId}::uuid");
    expect(academics).toContain('name="semesterId" required');
    expect(academics).toContain("Sections / batches");
  });

  it("supports a minimal faculty teaching scope", () => {
    expect(migration).toContain("add column if not exists course text");
    expect(actions).toContain("INSERT INTO public.faculty_assignments");
    expect(actions).toContain("Course is not available to your institution.");
  });
});
