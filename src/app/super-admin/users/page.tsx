import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { inviteUser, resendInvitation, revokeInvitation, updateUserAccess, updateUserStatus } from "../actions";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ status?: string; role?: string; institution?: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/super-admin/login");
  const filters = await searchParams;
  const [users, institutions, invitations] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; email: string; role: string; institution_id: string | null; account_status: string }>>`
      SELECT u.id, u.email, r.role::text, r.institution_id, r.account_status
      FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id
      ORDER BY u.email
    `,
    prisma.$queryRaw<Array<{ id: string; name: string }>>`SELECT id, name FROM public.institutions WHERE status = 'active' ORDER BY name`,
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
        <select className="field" name="institutionId" required><option value="">Choose institution</option>{institutions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
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
        <h2 className="text-xl font-semibold">Platform users</h2>
        <div className="mt-5 space-y-3">
          {users.map((user) => (
            <form action={updateUserAccess} className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-[1fr_180px_220px_auto] md:items-center" key={user.id}>
              <input type="hidden" name="userId" value={user.id} />
              <div><b>{user.email}</b><p className="text-xs text-zinc-500">{user.id}</p></div>
              <select className="field" name="role" defaultValue={user.role}>{["STUDENT", "FACULTY", "COLLEGE_ADMIN", "SUPER_ADMIN"].map((role) => <option value={role} key={role}>{role.replaceAll("_", " ")}</option>)}</select>
              <select className="field" name="institutionId" defaultValue={user.institution_id ?? ""}><option value="">No institution</option>{institutions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
              <button className="btn-primary" type="submit">Update</button>
              <div className="md:col-span-4 flex justify-end"><button formAction={updateUserStatus} name="status" value={user.account_status === "active" ? "suspended" : "active"} className="btn-ghost border border-white/10" type="submit">{user.account_status === "active" ? "Suspend account" : "Reactivate account"}</button></div>
            </form>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
