import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import Link from "next/link";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <DashboardShell {...session.user}><div className="glass-card"><h2 className="text-lg font-medium">Build your learner profile</h2><p className="mt-2 text-sm text-zinc-400">Give Taksh AI the context it needs to personalize your preparation.</p><Link className="btn-primary mt-6" href="/profile">Complete profile</Link></div></DashboardShell>;
}
