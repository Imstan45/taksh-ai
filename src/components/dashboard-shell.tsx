import { BookOpen, Building2, GraduationCap, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/auth";
import type { UserRole } from "@/types/roles";
import { SuperAdminNav } from "@/components/super-admin/super-admin-nav";

const navigation: Record<UserRole, Array<{ href: string; label: string }>> = {
  STUDENT: [
    { href: "/dashboard", label: "Home" },
    { href: "/student/courses", label: "My Learning" },
    { href: "/assessment", label: "Practice" },
    { href: "/programs", label: "Programs" },
    { href: "/profile", label: "Profile" },
  ],
  FACULTY: [
    { href: "/admin", label: "Faculty workspace" },
    { href: "/admin/students/onboard", label: "Add students" },
    { href: "/admin/faculty/learners", label: "Students" },
    { href: "/admin/faculty/activities", label: "Activities" },
    { href: "/admin/faculty/content", label: "Teaching content" },
    { href: "/admin/faculty/assessments", label: "Assessments" },
    { href: "/admin/faculty/reports", label: "Reports" },
    { href: "/notifications", label: "Notifications" },
  ],
  COLLEGE_ADMIN: [
    { href: "/admin", label: "College administration" },
    { href: "/admin/institution", label: "Institution" },
    { href: "/admin/departments", label: "Departments" },
    { href: "/admin/academics", label: "Academics" },
    { href: "/admin/people", label: "People" },
    { href: "/admin/students", label: "Students" },
    { href: "/admin/students/onboard", label: "Add students" },
    { href: "/admin/courses", label: "Courses" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/notifications", label: "Notifications" },
  ],
  SUPER_ADMIN: [
    { href: "/super-admin", label: "Platform dashboard" },
      { href: "/superadmin/content-factory", label: "Content Factory" },
    { href: "/super-admin/audit", label: "Audit history" },
  ],
};

const roleIcon = {
  STUDENT: GraduationCap,
  FACULTY: BookOpen,
  COLLEGE_ADMIN: Building2,
  SUPER_ADMIN: Sparkles,
} satisfies Record<UserRole, typeof ShieldCheck>;

export function DashboardShell({ name, email, role, children }: { name?: string | null; email?: string | null; role: UserRole; children: React.ReactNode }) {
  const RoleIcon = roleIcon[role];
  return (
    <main className="min-h-screen bg-[#08090e] p-4 text-white sm:p-6">
      <div className={role==="SUPER_ADMIN"?"mx-auto flex max-w-[1500px] items-start gap-6":""}>
      {role==="SUPER_ADMIN"&&<SuperAdminNav/>}
      <div className="min-w-0 flex-1">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] p-4">
        <div><p className="font-semibold">Taksh AI</p><p className="text-xs text-zinc-500">{role.replaceAll("_", " ")}</p></div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {role!=="SUPER_ADMIN"&&navigation[role].map((item) => <Link key={item.href} prefetch={false} className="btn-ghost border border-white/10" href={item.href}>{item.label}</Link>)}
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="btn-ghost gap-2" type="submit"><LogOut className="size-4" /> Sign out</button>
          </form>
        </div>
      </nav>
      <section className="mx-auto max-w-6xl py-10 sm:py-14">
        {role!=="STUDENT"&&<><div className="flex items-center gap-3 text-violet-400"><RoleIcon className="size-5" /><span className="text-sm font-medium">Secure {role.replaceAll("_", " ").toLowerCase()} workspace</span></div><h1 className="mt-5 text-4xl font-semibold tracking-tight">Welcome, {name?.split(" ")[0] ?? "user"}.</h1><p className="mt-3 text-zinc-400">{email}</p></>}
        <div className={role==="STUDENT"?"":"mt-10"}>{children}</div>
      </section>
      </div></div>
    </main>
  );
}
