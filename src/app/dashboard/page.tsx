import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <DashboardShell {...session.user}><div className="glass-card"><h2 className="text-lg font-medium">Your account is ready</h2><p className="mt-2 text-sm text-zinc-400">Student Profile is the next module in the Taksh AI roadmap.</p></div></DashboardShell>;
}
