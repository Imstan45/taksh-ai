import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { ContentFactoryNavigation } from "@/components/content-factory/navigation";

export default async function ContentFactoryLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN" || session.user.accountStatus !== "active") {
    redirect("/super-admin/login");
  }
  return (
    <DashboardShell {...session.user}>
      <div className="mb-8">
        <p className="eyebrow">AI curriculum operations</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Content Factory</h2>
            <p className="mt-2 text-sm text-zinc-400">Generate, review and publish structured learning content.</p>
          </div>
          <ContentFactoryNavigation />
        </div>
      </div>
      {children}
    </DashboardShell>
  );
}
