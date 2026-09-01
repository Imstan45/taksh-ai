import { auth, signOut } from "@/auth";
import { SalesPortalShell } from "@/components/sales/sales-portal-shell";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const statusCopy={
  pending:["Application under review","Your Sales Rep application has been received. Taksh AI will review your details before enabling referral access."],
  suspended:["Account suspended","Your Sales Rep access is currently suspended. Referral analytics and sharing are unavailable while the account is under review."],
  rejected:["Application not approved","Your Sales Rep application was not approved at this time. Contact Taksh AI support if you believe details need to be reviewed."],
} as const;

export default async function SalesPendingPage(){
  const session=await auth();if(!session?.user||session.user.role!=="SALES_REP")redirect("/sales/login");
  const rep=(await prisma.$queryRaw<Array<{full_name:string;email:string;status:string;created_at:Date}>>`select full_name,email,status,created_at from public.sales_reps where user_id=${session.user.id}::uuid`)[0];
  if(!rep)redirect("/sales/register");if(rep.status==="active")redirect("/sales/dashboard");
  const status=(rep.status in statusCopy?rep.status:"pending") as keyof typeof statusCopy,[title,description]=statusCopy[status];
  return <SalesPortalShell compact><div className="mx-auto grid min-h-[calc(100vh-65px)] max-w-4xl place-items-center px-5 py-12"><section className="w-full border border-zinc-200 bg-white p-7 shadow-sm sm:p-10"><div className="flex flex-col justify-between gap-8 sm:flex-row"><div><span className={`sales-status-badge sales-status-${status}`}>{status}</span><h1 className="mt-5 text-3xl font-semibold tracking-[-.03em]">{title}</h1><p className="mt-4 max-w-2xl leading-7 text-zinc-600">{description}</p></div><div className="shrink-0 border-l border-zinc-200 pl-6 text-sm"><p className="text-zinc-500">Applicant</p><b className="mt-1 block">{rep.full_name}</b><p className="mt-1 text-zinc-600">{rep.email}</p><p className="mt-4 text-xs text-zinc-500">Submitted {rep.created_at.toLocaleDateString("en-IN")}</p></div></div><div className="mt-10 border-t border-zinc-200 pt-6"><p className="text-sm text-zinc-600">You can return here after signing in to check the latest status.</p><form className="mt-4" action={async()=>{"use server";await signOut({redirectTo:"/sales/login"})}}><button className="sales-secondary-button">Sign out</button></form></div></section></div></SalesPortalShell>;
}
