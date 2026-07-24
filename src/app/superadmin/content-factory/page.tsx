import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import ContentFactoryModule from "@/components/super-admin/content-factory-module";
import "@/app/content-factory.css";

export default async function ContentFactoryPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN" || session.user.accountStatus !== "active") {
    redirect("/super-admin/login");
  }
  return <DashboardShell {...session.user}><ContentFactoryModule /></DashboardShell>;
}
