import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";

type Sale = { id: string; paid_at: Date; product: string; amount: number; refunded: number; status: string; provider: string; customer: string };

export default async function SalesManagerRepDetail({ params }: { params: Promise<{ repId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SALES_MANAGER") redirect("/login?callbackUrl=/sales-manager/sales-reps");
  const { repId } = await params;
  const rep = (await prisma.$queryRaw<Array<{ full_name: string; email: string; phone: string | null; college: string | null; city: string | null; referral_code: string | null; joined_at: Date | null }>>`select full_name,email,phone,college,city,referral_code,joined_at from public.sales_reps where id=${repId}::uuid and status='active'`)[0];
  if (!rep) notFound();
  const [metrics, sales] = await Promise.all([
    prisma.$queryRaw<Array<{ visits: bigint; registrations: bigint }>>`select coalesce(sum(total_visits),0)::bigint visits,count(*) filter(where registered_user_id is not null)::bigint registrations from public.sales_referral_attributions where sales_rep_id=${repId}::uuid and validity_status='valid'`,
    prisma.$queryRaw<Sale[]>`select sale.id,sale.paid_at,coalesce(product.name,sale.product_type,'Taksh product') product,sale.amount_in_paise amount,sale.refunded_amount_in_paise refunded,sale.status,sale.provider,'Customer #'||upper(substr(md5(sale.referred_user_id::text),1,4)) customer from public.referral_sales sale left join public.products product on product.id=sale.product_id where sale.sales_rep_id=${repId}::uuid order by sale.paid_at desc`,
  ]);
  const stat = metrics[0] ?? { visits: 0n, registrations: 0n };

  return <DashboardShell {...session.user}>
    <Link className="text-sm text-violet-300 hover:underline" href="/sales-manager/sales-reps">← Active Sales Reps</Link>
    <h2 className="mt-3 text-3xl font-semibold">{rep.full_name}</h2><p className="mt-2 text-zinc-400">{rep.email} · {rep.phone ?? "No phone"} · {rep.college ?? "No college"} · {rep.city ?? "No city"}</p>
    <p className="mt-2 text-sm text-zinc-300">Referral code: <b>{rep.referral_code ?? "—"}</b>{rep.joined_at && <> · Active since {rep.joined_at.toLocaleDateString("en-IN")}</>}</p>
    <section className="mt-6 grid gap-3 sm:grid-cols-2"><article className="rounded-xl border border-white/10 p-4"><p className="text-sm text-zinc-400">Referral visits</p><b className="mt-2 block text-xl">{Number(stat.visits).toLocaleString("en-IN")}</b></article><article className="rounded-xl border border-white/10 p-4"><p className="text-sm text-zinc-400">Registrations</p><b className="mt-2 block text-xl">{Number(stat.registrations).toLocaleString("en-IN")}</b></article></section>
    <section className="mt-6 overflow-hidden rounded-xl border border-zinc-800"><h3 className="border-b border-zinc-800 p-5 font-semibold">Referral sales and refunds</h3><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-white/5 text-zinc-400"><tr><th className="p-4">Date</th><th>Customer</th><th>Product</th><th>Provider</th><th>Gross</th><th>Refunded</th><th>Status</th></tr></thead><tbody>{sales.map(sale => <tr className="border-t border-zinc-800" key={sale.id}><td className="p-4">{sale.paid_at.toLocaleString("en-IN")}</td><td>{sale.customer}</td><td>{sale.product}</td><td className="capitalize">{sale.provider.replaceAll("_", " ")}</td><td>₹{(sale.amount / 100).toLocaleString("en-IN")}</td><td>₹{(sale.refunded / 100).toLocaleString("en-IN")}</td><td className="capitalize">{sale.status.replaceAll("_", " ")}</td></tr>)}</tbody></table>{!sales.length && <p className="p-5 text-zinc-400">No referral sales recorded yet.</p>}</div></section>
  </DashboardShell>;
}
