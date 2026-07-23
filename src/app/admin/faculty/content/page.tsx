import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireFaculty } from "@/lib/admin-scope";

export default async function FacultyContentPage() {
  const { session,institutionId }=await requireFaculty();
  const assets=await prisma.$queryRaw<Array<{id:string;course:string;module:string;topic:string;subtopic:string;title:string;updated_at:Date}>>`
    SELECT asset.id,asset.course,asset.module,asset.topic,asset.subtopic,asset.title,asset.updated_at
    FROM public.taksh_content_assets asset JOIN public.institution_course_access access ON access.course=asset.course
      AND access.institution_id=${institutionId}::uuid AND access.active
    WHERE asset.status='published' ORDER BY asset.course,asset.module,asset.topic,asset.updated_at`;
  return <DashboardShell {...session.user}><section className="glass-card"><h2 className="text-xl font-semibold">Published teaching content</h2><p className="mt-2 text-sm text-zinc-400">Read-only content granted to your institution.</p><div className="mt-5 space-y-3">{assets.map((asset)=><article className="rounded-xl border border-white/10 p-4" key={asset.id}><b>{asset.title}</b><p className="text-sm text-zinc-400">{asset.course} · {asset.module} · {asset.topic} · {asset.subtopic}</p></article>)}</div></section></DashboardShell>;
}
