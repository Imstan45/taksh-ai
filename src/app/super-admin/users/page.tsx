import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { updateUserAccess } from "../actions";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/super-admin/login");
  const [users, institutions] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; email: string; role: string; institution_id: string | null }>>`
      SELECT u.id, u.email, r.role::text, r.institution_id
      FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id
      ORDER BY u.email
    `,
    prisma.$queryRaw<Array<{ id: string; name: string }>>`SELECT id, name FROM public.institutions WHERE active = true ORDER BY name`,
  ]);
  return (
    <DashboardShell {...session.user}>
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
            </form>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
