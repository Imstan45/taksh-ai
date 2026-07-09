import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { AptitudeAssessment } from "@/components/assessment/aptitude-assessment";

export default async function AssessmentPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <DashboardShell {...session.user}>
      <AptitudeAssessment />
    </DashboardShell>
  );
}
