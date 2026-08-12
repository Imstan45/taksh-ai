import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { StudentOnboarding } from "@/components/admin/student-onboarding";

export default async function StudentOnboardingPage() {
  const session = await auth();
  if (!session?.user || !["COLLEGE_ADMIN", "FACULTY"].includes(session.user.role)) redirect("/login?callbackUrl=/admin/students/onboard");
  return <DashboardShell {...session.user}><StudentOnboarding/></DashboardShell>;
}
