import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/super-admin/login");
  return <DashboardShell {...session.user}><div className="glass-card">Platform administration access confirmed.</div></DashboardShell>;
}
