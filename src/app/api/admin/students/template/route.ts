import { requireCollegeAdmin } from "@/lib/admin-scope";
export async function GET(){await requireCollegeAdmin();return new Response("name,email,student_id,department,academic_year,semester,section\nAda Lovelace,ada@example.edu,CSE-001,CSE,2026-2027,Semester 1,A\n",{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":'attachment; filename="taksh-student-import.csv"'}})}
