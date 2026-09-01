import Link from "next/link";
import { auth } from "@/auth";
import { SalesPortalShell } from "@/components/sales/sales-portal-shell";

export default async function SalesLandingPage(){
  const session=await auth();
  const destination=session?.user.role==="SALES_REP"?(session.user.accountStatus==="active"?"/sales/dashboard":"/sales/pending"):"/sales/login";
  return <SalesPortalShell compact><div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
    <div className="grid gap-12 border-b border-zinc-200 pb-16 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
      <section><p className="text-sm font-semibold text-violet-700">Partner operations</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-.04em] sm:text-6xl">Taksh AI Sales Network</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">Track your referrals, conversions and performance from one place.</p><div className="mt-8 flex flex-wrap gap-3"><Link className="sales-primary-button" href="/sales/register">Register as Sales Rep</Link><Link className="sales-secondary-button" href={destination}>{session?.user.role==="SALES_REP"?"Open portal":"Sign in"}</Link></div></section>
      <aside className="border-l-2 border-violet-700 pl-5 text-sm leading-6 text-zinc-600"><b className="block text-zinc-950">One trusted system</b><p className="mt-2">Sales activity is connected to Taksh registrations, diagnostics and verified payments. No separate student or payment records.</p></aside>
    </div>
    <section className="grid gap-px border border-zinc-200 bg-zinc-200 sm:grid-cols-3"><div className="bg-white p-6"><b>Referral attribution</b><p className="mt-2 text-sm leading-6 text-zinc-600">A stable partner link tracks valid registrations through the existing Taksh journey.</p></div><div className="bg-white p-6"><b>Verified performance</b><p className="mt-2 text-sm leading-6 text-zinc-600">Conversions and revenue appear only after a payment is verified.</p></div><div className="bg-white p-6"><b>Controlled access</b><p className="mt-2 text-sm leading-6 text-zinc-600">Every application is reviewed by a Taksh Super Admin before activation.</p></div></section>
  </div></SalesPortalShell>;
}
