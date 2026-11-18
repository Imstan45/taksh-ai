import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";

type Rep = { id: string; full_name: string; email: string; college: string | null; network_reach: number | null; referral_code: string | null; visits: bigint; registrations: bigint; paid: bigint; revenue: bigint; refunds: bigint };

export default async function SalesManagerReps({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SALES_MANAGER") redirect("/login?callbackUrl=/sales-manager/sales-reps");
  const filters = await searchParams, q = filters.q?.trim() ?? "";
  const reps = await prisma.$queryRaw<Rep[]>`
    select rep.id,rep.full_name,rep.email,rep.college,rep.network_reach,rep.referral_code,
      coalesce(a.visits,0)::bigint visits,coalesce(a.registrations,0)::bigint registrations,
      coalesce(s.paid,0)::bigint paid,coalesce(s.revenue,0)::bigint revenue,coalesce(s.refunds,0)::bigint refunds
    from public.sales_reps rep
    left join lateral(select sum(total_visits) visits,count(*) filter(where registered_user_id is not null) registrations from public.sales_referral_attributions where sales_rep_id=rep.id and validity_status='valid') a on true
    left join lateral(select count(*) filter(where status<>'refunded') paid,coalesce(sum(amount_in_paise-refunded_amount_in_paise),0) revenue,count(*) filter(where status='refunded') refunds from public.referral_sales where sales_rep_id=rep.id) s on true
    where rep.status='active' and (${q}='' or rep.full_name ilike ${`%${q}%`} or rep.email ilike ${`%${q}%`} or coalesce(rep.referral_code,'') ilike ${`%${q}%`})
    order by rep.full_name`;
  const totals = reps.reduce((sum, rep) => ({ visits: sum.visits + Number(rep.visits), registrations: sum.registrations + Number(rep.registrations), paid: sum.paid + Number(rep.paid), refunds: sum.refunds + Number(rep.refunds), revenue: sum.revenue + Number(rep.revenue) }), { visits: 0, registrations: 0, paid: 0, refunds: 0, revenue: 0 });

  return <DashboardShell {...session.user}>
    <header><p className="text-sm text-violet-300">Growth operations</p><h2 className="mt-2 text-3xl font-semibold">Active Sales Reps</h2><p className="mt-2 text-zinc-400">Referral and verified sales performance for active reps.</p></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[["Active reps", reps.length], ["Referral visits", totals.visits.toLocaleString("en-IN")], ["Registrations", totals.registrations.toLocaleString("en-IN")], ["Paid sales", totals.paid.toLocaleString("en-IN")], ["Net revenue · refunds", `₹${(totals.revenue / 100).toLocaleString("en-IN")} · ${totals.refunds}`]].map(([label, value]) => <article className="rounded-xl border border-white/10 p-4" key={String(label)}><p className="text-sm text-zinc-400">{label}</p><b className="mt-2 block text-xl">{value}</b></article>)}</section>
    <form className="mt-6 flex flex-wrap gap-3"><input className="field max-w-sm" name="q" placeholder="Search name, email or code" defaultValue={q}/><button className="rounded-lg border border-white/10 px-4">Filter</button></form>
    <section className="mt-5 overflow-x-auto rounded-xl border border-zinc-800"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-white/5 text-zinc-400"><tr><th className="p-4">Sales Rep</th><th>Referral code</th><th>Visits</th><th>Registrations</th><th>Paid</th><th>Refunds</th><th>Net revenue</th><th>Conversion</th></tr></thead><tbody>{reps.map(rep => { const registrations = Number(rep.registrations), paid = Number(rep.paid), conversion = registrations ? paid / registrations * 100 : 0; return <tr className="border-t border-zinc-800" key={rep.id}><td className="p-4"><Link className="font-semibold text-violet-300 hover:underline" href={`/sales-manager/sales-reps/${rep.id}`}>{rep.full_name}</Link><small className="block text-zinc-500">{rep.email}{rep.college ? ` · ${rep.college}` : ""}{rep.network_reach ? ` · reach ${rep.network_reach.toLocaleString("en-IN")}` : ""}</small></td><td className="font-mono text-xs">{rep.referral_code ?? "—"}</td><td>{Number(rep.visits).toLocaleString("en-IN")}</td><td>{registrations.toLocaleString("en-IN")}</td><td>{paid.toLocaleString("en-IN")}</td><td>{Number(rep.refunds).toLocaleString("en-IN")}</td><td>₹{(Number(rep.revenue) / 100).toLocaleString("en-IN")}</td><td>{conversion.toFixed(1)}%</td></tr>; })}</tbody></table>{!reps.length && <p className="p-6 text-center text-zinc-400">No active Sales Reps match this search.</p>}</section>
  </DashboardShell>;
}
