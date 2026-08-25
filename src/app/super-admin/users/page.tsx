import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { inviteUser, resendInvitation, revokeInvitation, updateCareerStarterAccess, updateUserAccess, updateUserStatus } from "../actions";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?:string; status?: string; role?: string; institution?: string; page?:string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login?callbackUrl=/super-admin/users");
  const filters = await searchParams;
  const page=Math.max(1,Number(filters.page)||1),limit=50,offset=(page-1)*limit;
  const [users, institutions, invitations] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; email: string; role: string; institution_id: string | null; account_status: string; paid_access:boolean }>>`
      SELECT u.id, u.email, r.role::text, r.institution_id, r.account_status, exists(select 1 from public.entitlements e where e.user_id=u.id and e.status='active' and e.expires_at>now()) paid_access
      FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id
      WHERE (${filters.q??""}='' OR u.email ILIKE ${`%${filters.q??""}%`})
        AND (${filters.role??""}='' OR r.role::text=${filters.role??""})
        AND (${filters.status??""}='' OR r.account_status=${filters.status??""})
        AND (${filters.institution??""}='' OR r.institution_id=${filters.institution||null}::uuid)
      ORDER BY u.email LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.$queryRaw<Array<{ id: string; name: string; institution_type: string }>>`SELECT id, name, institution_type FROM public.institutions WHERE status = 'active' ORDER BY name`,
    prisma.$queryRaw<Array<{ id: string; email: string; role: string; institution_id: string | null; institution_name: string | null; status: string; expires_at: Date }>>`
      SELECT invitation.id, invitation.email, invitation.role::text, invitation.institution_id,
        institution.name AS institution_name,
        CASE WHEN invitation.status = 'pending' AND invitation.expires_at <= now() THEN 'expired' ELSE invitation.status END AS status,
        invitation.expires_at
      FROM public.invitations invitation
      LEFT JOIN public.institutions institution ON institution.id = invitation.institution_id
      WHERE (${filters.status ?? ""} = '' OR
        CASE WHEN invitation.status = 'pending' AND invitation.expires_at <= now() THEN 'expired' ELSE invitation.status END = ${filters.status ?? ""})
        AND (${filters.role ?? ""} = '' OR invitation.role::text = ${filters.role ?? ""})
        AND (${filters.institution ?? ""} = '' OR invitation.institution_id = nullif(${filters.institution ?? ""}, '')::uuid)
      ORDER BY invitation.created_at DESC
    `,
  ]);
  return (
    <DashboardShell {...session.user}>
      <ActionFeedbackForm action={inviteUser} successMessage="Invitation sent successfully." pendingMessage="Sending invitation…" className="glass-card mb-6 grid gap-3 md:grid-cols-[1fr_180px_220px_auto]">
        <input className="field" name="email" type="email" placeholder="Invite email" required />
        <select className="field" name="role" required><option value="STUDENT">Student</option><option value="FACULTY">Faculty</option><option value="COLLEGE_ADMIN">College Admin</option></select>
        <select className="field" name="institutionId" required><option value="">Choose institution</option>{institutions.map((item) => <option value={item.id} key={item.id}>{item.name} ({item.institution_type})</option>)}</select>
        <button className="btn-primary">Send invitation</button>
      </ActionFeedbackForm>
      <section className="glass-card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Invitations</h2>
          <form className="flex flex-wrap gap-2">
            <select className="field" name="status" defaultValue={filters.status ?? ""}><option value="">All statuses</option>{["pending", "accepted", "expired", "revoked"].map((status) => <option key={status}>{status}</option>)}</select>
            <select className="field" name="role" defaultValue={filters.role ?? ""}><option value="">All roles</option>{["STUDENT", "FACULTY", "COLLEGE_ADMIN"].map((role) => <option key={role}>{role.replaceAll("_", " ")}</option>)}</select>
            <select className="field" name="institution" defaultValue={filters.institution ?? ""}><option value="">All institutions</option>{institutions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
            <button className="btn-ghost" type="submit">Filter</button>
          </form>
        </div>
        <div className="mt-5 space-y-3">
          {invitations.length === 0 && <p className="text-sm text-zinc-500">No invitations match these filters.</p>}
          {invitations.map((invitation) => <div className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-[1fr_160px_1fr_120px_auto] md:items-center" key={invitation.id}>
            <div><b>{invitation.email}</b><p className="text-xs text-zinc-500">Expires {invitation.expires_at.toLocaleString()}</p></div>
            <span>{invitation.role.replaceAll("_", " ")}</span><span>{invitation.institution_name ?? "Platform"}</span>
            <span className="capitalize">{invitation.status}</span>
            <form className="flex gap-2"><input type="hidden" name="invitationId" value={invitation.id} />
              {(invitation.status === "pending" || invitation.status === "expired") && <button className="btn-ghost" formAction={resendInvitation}>Resend</button>}
              {invitation.status === "pending" && <button className="btn-ghost" formAction={revokeInvitation}>Revoke</button>}
            </form>
          </div>)}
        </div>
      </section>
      <section className="glass-card">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Platform users</h2><form className="flex flex-wrap gap-2"><input className="field max-w-64" name="q" placeholder="Search email" defaultValue={filters.q??""}/><select className="field max-w-48" name="role" defaultValue={filters.role??""}><option value="">All roles</option>{["STUDENT","FACULTY","COLLEGE_ADMIN","SUPER_ADMIN"].map(role=><option key={role}>{role}</option>)}</select><select className="field max-w-52" name="institution" defaultValue={filters.institution??""}><option value="">All institutions</option>{institutions.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select><button className="btn-ghost">Filter</button></form></div>
        <div className="mt-5 space-y-3">
          {users.map((user) => <div className="rounded-xl border border-white/10 p-4" key={user.id}>
            <ActionFeedbackForm action={updateUserAccess} successMessage={`${user.email} access updated successfully.`} pendingMessage="Updating user institution…" className="grid gap-3 md:grid-cols-[1fr_180px_220px_auto] md:items-center">
              <input type="hidden" name="userId" value={user.id}/>
              <div><b>{user.email}</b><p className="text-xs text-zinc-500">{user.id}</p></div>
              <select className="field" name="role" defaultValue={user.role}>{["STUDENT","FACULTY","COLLEGE_ADMIN","SUPER_ADMIN"].map(role=><option value={role} key={role}>{role.replaceAll("_"," ")}</option>)}</select>
              <select className="field" name="institutionId" defaultValue={user.institution_id??""}><option value="">No institution</option>{institutions.map(item=><option value={item.id} key={item.id}>{item.name} ({item.institution_type})</option>)}</select>
              <button className="btn-primary">Update assignment</button>
            </ActionFeedbackForm>
            <ActionFeedbackForm action={updateUserStatus} successMessage={`${user.email} status updated successfully.`} pendingMessage="Updating account status…" confirmMessage={`${user.account_status==="active"?"Suspend":"Reactivate"} ${user.email}?`} className="mt-3 flex justify-end">
              <input type="hidden" name="userId" value={user.id}/><button name="status" value={user.account_status==="active"?"suspended":"active"} className="btn-ghost border border-white/10">{user.account_status==="active"?"Suspend account":"Reactivate account"}</button>
            </ActionFeedbackForm>
            {user.role==="STUDENT"&&<ActionFeedbackForm action={updateCareerStarterAccess} successMessage={`${user.email} Career Starter access updated.`} pendingMessage="Updating paid test access…" className="mt-3 flex items-center justify-end gap-3">
              <input type="hidden" name="userId" value={user.id}/><span className="text-xs text-zinc-500">Admin PAID test control · no transaction</span><button name="enabled" value={user.paid_access?"false":"true"} className="btn-ghost border border-white/10">{user.paid_access?"Remove test access":"Mark PAID for testing"}</button>
            </ActionFeedbackForm>}
          </div>)}
        </div>
        <div className="mt-5 flex justify-between"><span className="text-sm text-zinc-500">Page {page}</span><div className="flex gap-2">{page>1&&<a className="btn-ghost" href={`?q=${encodeURIComponent(filters.q??"")}&role=${encodeURIComponent(filters.role??"")}&institution=${encodeURIComponent(filters.institution??"")}&page=${page-1}`}>Previous</a>}{users.length===limit&&<a className="btn-ghost" href={`?q=${encodeURIComponent(filters.q??"")}&role=${encodeURIComponent(filters.role??"")}&institution=${encodeURIComponent(filters.institution??"")}&page=${page+1}`}>Next</a>}</div></div>
      </section>
    </DashboardShell>
  );
}
