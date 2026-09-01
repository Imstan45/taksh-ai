import Link from "next/link";
import { auth } from "@/auth";
import { SalesLoginForm } from "@/components/sales/sales-auth-form";
import { SalesPortalShell } from "@/components/sales/sales-portal-shell";
import { redirect } from "next/navigation";

export default async function SalesLoginPage(){const session=await auth();if(session?.user.role==="SALES_REP")redirect(session.user.accountStatus==="active"?"/sales/dashboard":"/sales/pending");return <SalesPortalShell compact><div className="mx-auto grid min-h-[calc(100vh-65px)] max-w-5xl place-items-center px-5 py-12"><section className="w-full max-w-md border border-zinc-200 bg-white p-7 shadow-sm sm:p-9"><p className="text-sm font-semibold text-violet-700">Taksh AI Sales Network</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.03em]">Sales Rep sign in</h1><p className="mt-3 text-sm leading-6 text-zinc-600">Access your application status, referral performance and verified conversions.</p><SalesLoginForm/><p className="mt-7 border-t border-zinc-200 pt-5 text-center text-sm text-zinc-500">New to the network? <Link className="font-medium text-violet-700" href="/sales/register">Register as Sales Rep</Link></p></section></div></SalesPortalShell>}
