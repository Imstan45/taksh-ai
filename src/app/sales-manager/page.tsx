import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function SalesManagerHome() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SALES_MANAGER") redirect("/login?callbackUrl=/sales-manager");

  return <DashboardShell {...session.user}>
    <h2 className="text-3xl font-semibold">Sales Manager</h2>
    <p className="mt-2 text-zinc-400">View payment submissions and active sales rep performance.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <Link className="rounded-xl border border-white/10 p-5 hover:bg-white/5" href="/sales-manager/payments"><b>Payments</b><p className="mt-2 text-sm text-zinc-400">View payment submissions and their status.</p></Link>
      <Link className="rounded-xl border border-white/10 p-5 hover:bg-white/5" href="/sales-manager/sales-reps"><b>Sales Reps</b><p className="mt-2 text-sm text-zinc-400">Review active rep referral and sales performance.</p></Link>
    </div>
  </DashboardShell>;
}
