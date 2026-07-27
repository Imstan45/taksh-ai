export type InstitutionType = "school" | "college";
export type CourseAudience = InstitutionType | "all";

export function courseAudience(course: string): CourseAudience {
  const normalized = course.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/\b(eapcet|eamcet|jee|joint entrance)\b/.test(normalized)) return "school";
  if (/\b(logical reasoning|english|verbal ability|communication skills)\b/.test(normalized)) return "college";
  return "all";
}

export function institutionCanAccessCourse(institutionType: InstitutionType, course: string) {
  const audience = courseAudience(course);
  return audience === "all" || audience === institutionType;
}

export function institutionTypeLabel(type: InstitutionType) {
  return type === "school" ? "School / entrance preparation" : "College / graduation";
}
