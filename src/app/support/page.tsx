import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { SupportForm } from "@/components/support/support-form";

export default async function SupportPage(){
  const session=await auth();if(!session?.user)redirect("/login?callbackUrl=/support");
  return <DashboardShell {...session.user}><SupportForm/></DashboardShell>;
}
