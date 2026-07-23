import { requireCollegeAdmin } from "@/lib/admin-scope";
export async function GET(){await requireCollegeAdmin();return new Response("First Name,Last Name,Email,Department,Batch,Roll Number\nAda,Lovelace,ada@example.edu,CSE,2026-A,CSE-001\n",{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":'attachment; filename="taksh-student-import.csv"'}})}
