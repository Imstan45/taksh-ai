import Link from "next/link";
import { auth } from "@/auth";

export const metadata = { title: "Free Placement Readiness Assessment | Taksh AI" };

export default async function PlacementReadiness() {
  const session = await auth();
  const destination = session?.user ? "/diagnostic" : `/signup?next=${encodeURIComponent("/diagnostic")}`;
  return <main className="min-h-screen bg-[#f7f7f8] px-5 py-12 text-zinc-950"><section className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-7 sm:p-10"><p className="text-sm font-semibold text-violet-700">Free Taksh AI assessment</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">Placement Readiness Assessment</h1><p className="mt-5 leading-7 text-zinc-600">Measure quantitative aptitude, logical reasoning, English and your selected technical track across 40 questions.</p><ul className="mt-7 space-y-3 text-sm text-zinc-700"><li>40 questions with a 45-minute server-controlled timer</li><li>Choose Python, Java, ServiceNow or General IT</li><li>Your answers save automatically</li><li>Receive a readiness score and skill breakdown at no cost</li></ul><div className="mt-7 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-zinc-700">Taksh learning purchases are optional and do not affect employment eligibility or assessment outcomes.</div><Link className="mt-8 inline-flex rounded-lg bg-violet-700 px-6 py-3 font-semibold text-white" href={destination}>{session?.user?"Continue to assessment":"Create account and continue"}</Link></section></main>;
}
