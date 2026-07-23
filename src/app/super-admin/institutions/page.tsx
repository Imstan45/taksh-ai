import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { createInstitution, updateInstitutionStatus } from "../actions";

export default async function InstitutionsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/super-admin/login");
  const institutions = await prisma.$queryRaw<Array<{ id: string; name: string; slug: string; status: string }>>`
    SELECT id, name, slug, status FROM public.institutions ORDER BY name
  `;
  return (
    <DashboardShell {...session.user}>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form action={createInstitution} className="glass-card h-fit space-y-4">
          <h2 className="text-xl font-semibold">Add institution</h2>
          <input className="field" name="name" placeholder="Institution name" required />
          <input className="field" name="slug" placeholder="institution-slug" required />
          <button className="btn-primary w-full" type="submit">Save institution</button>
        </form>
        <section className="glass-card">
          <h2 className="text-xl font-semibold">Institutions</h2>
          <div className="mt-5 divide-y divide-white/10">
            {institutions.map((item) => <div className="flex items-center justify-between gap-4 py-4" key={item.id}><div><b>{item.name}</b><p className="text-sm text-zinc-500">{item.slug}</p></div><form action={updateInstitutionStatus} className="flex gap-2"><input type="hidden" name="institutionId" value={item.id} /><select className="field" name="status" defaultValue={item.status}>{["active","suspended","archived"].map((status) => <option value={status} key={status}>{status}</option>)}</select><button className="btn-ghost border border-white/10">Update</button></form></div>)}
            {!institutions.length && <p className="py-5 text-sm text-zinc-500">No institutions yet.</p>}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
