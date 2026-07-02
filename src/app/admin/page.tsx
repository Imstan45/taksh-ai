import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
export default async function Page() {
  const session = await auth();
  if (!session?.user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/dashboard");
  return <DashboardShell {...session.user}><div className="glass-card">College administration access confirmed.</div></DashboardShell>;
}
