import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";
import { createInstitution, updateInstitutionStatus } from "../actions";
import Link from "next/link";

export default async function InstitutionsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/super-admin/login");
  const institutions = await prisma.$queryRaw<Array<{ id:string;name:string;slug:string;status:string;institution_type:"school"|"college" }>>`
    SELECT id,name,slug,status,institution_type FROM public.institutions ORDER BY name`;
  return <DashboardShell {...session.user}><div className="grid gap-6 lg:grid-cols-[360px_1fr]">
    <ActionFeedbackForm action={createInstitution} successMessage="Institution saved successfully." pendingMessage="Saving institution…" className="glass-card h-fit space-y-4">
      <h2 className="text-xl font-semibold">Add institution</h2>
      <input className="field" name="name" placeholder="Institution name" required/>
      <input className="field" name="slug" placeholder="institution-slug" required/>
      <select className="field" name="institutionType" required><option value="">Institution type</option><option value="school">School / entrance preparation</option><option value="college">College / graduation</option></select>
      <p className="text-xs text-zinc-500">Schools receive EAPCET and JEE content. Colleges receive Logical Reasoning and English content.</p>
      <button className="btn-primary w-full">Save institution</button>
    </ActionFeedbackForm>
    <section className="glass-card"><h2 className="text-xl font-semibold">Institutions</h2><div className="mt-5 divide-y divide-white/10">
      {institutions.map(item=><div className="flex flex-wrap items-center justify-between gap-4 py-4" key={item.id}>
        <div><Link className="font-semibold hover:text-violet-300" href={`/super-admin/institutions/${item.id}`}>{item.name}</Link><p className="text-sm text-zinc-500">{item.slug} · {item.institution_type==="school"?"School / entrance preparation":"College / graduation"}</p></div>
        <ActionFeedbackForm action={updateInstitutionStatus} successMessage={`${item.name} updated successfully.`} pendingMessage="Updating institution…" className="flex flex-wrap gap-2">
          <input type="hidden" name="institutionId" value={item.id}/>
          <select className="field" name="institutionType" defaultValue={item.institution_type}><option value="school">School</option><option value="college">College</option></select>
          <select className="field" name="status" defaultValue={item.status}>{["active","suspended","archived"].map(status=><option value={status} key={status}>{status}</option>)}</select>
          <button className="btn-ghost border border-white/10">Update</button>
        </ActionFeedbackForm>
      </div>)}
      {!institutions.length&&<p className="py-5 text-sm text-zinc-500">No institutions yet.</p>}
    </div></section>
  </div></DashboardShell>;
}
