import { auth } from "@/auth";
import { JuniorsStudentShell } from "@/components/juniors/student-shell";
import { redirect } from "next/navigation";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/juniors/login?callbackUrl=/juniors/dashboard");
  return <JuniorsStudentShell name={session.user.name ?? "Student"}>{children}</JuniorsStudentShell>;
}
