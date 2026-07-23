import { DashboardShell } from "@/components/dashboard-shell";
import { requireCollegeAdmin } from "@/lib/admin-scope";
import { prisma } from "@/lib/prisma";
import { updateInstitutionProfile } from "../actions";

type InstitutionRow = {
  name: string;
  slug: string;
  status: string;
  metadata: { contact?: { email?: string; phone?: string; address?: string } } | null;
};

export default async function InstitutionProfile() {
  const { session, institutionId } = await requireCollegeAdmin();
  const rows = await prisma.$queryRaw<InstitutionRow[]>`
    SELECT name,slug,status,metadata FROM public.institutions WHERE id=${institutionId}::uuid
  `;
  const institution = rows[0];
  return <DashboardShell {...session.user}><form action={updateInstitutionProfile} className="glass-card grid max-w-2xl gap-4">
    <h2 className="text-2xl font-semibold">Institution profile</h2>
    <p className="text-sm text-zinc-400">{institution.slug} · {institution.status}</p>
    <label>Name<input className="field mt-2" name="name" defaultValue={institution.name} required /></label>
    <label>Contact email<input className="field mt-2" name="email" type="email" defaultValue={institution.metadata?.contact?.email} /></label>
    <label>Phone<input className="field mt-2" name="phone" defaultValue={institution.metadata?.contact?.phone} /></label>
    <label>Address<textarea className="field mt-2" name="address" defaultValue={institution.metadata?.contact?.address} /></label>
    <button className="btn-primary">Save institution profile</button>
  </form></DashboardShell>;
}
