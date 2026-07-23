import { BookOpen, Building2, GraduationCap, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/auth";
import type { UserRole } from "@/types/roles";

const navigation: Record<UserRole, Array<{ href: string; label: string }>> = {
  STUDENT: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/student/courses", label: "My courses" },
    { href: "/continue-learning", label: "Continue learning" },
    { href: "/learning-style", label: "Learning style" },
    { href: "/assessment", label: "Assessment" },
    { href: "/student/assessments", label: "Assigned assessments" },
  ],
  FACULTY: [
    { href: "/admin", label: "Faculty workspace" },
    { href: "/admin/faculty/learners", label: "Learners" },
    { href: "/admin/faculty/content", label: "Teaching content" },
    { href: "/admin/faculty/assessments", label: "Assessments" },
  ],
  COLLEGE_ADMIN: [
    { href: "/admin", label: "College administration" },
    { href: "/admin/departments", label: "Departments" },
    { href: "/admin/academics", label: "Academics" },
    { href: "/admin/people", label: "People" },
    { href: "/admin/students", label: "Students" },
    { href: "/admin/courses", label: "Courses" },
  ],
  SUPER_ADMIN: [
    { href: "/super-admin", label: "Platform dashboard" },
    { href: "/super-admin/content-factory", label: "Content Factory" },
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
  const logoutTarget = role === "SUPER_ADMIN" ? "/super-admin/login" : role === "STUDENT" ? "/login" : "/admin/login";
  return (
    <main className="min-h-screen bg-[#08090e] p-4 text-white sm:p-8">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] p-4">
        <div><p className="font-semibold">Taksh AI</p><p className="text-xs text-zinc-500">{role.replaceAll("_", " ")}</p></div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {navigation[role].map((item) => <Link key={item.href} className="btn-ghost border border-white/10" href={item.href}>{item.label}</Link>)}
          <form action={async () => { "use server"; await signOut({ redirectTo: logoutTarget }); }}>
            <button className="btn-ghost gap-2" type="submit"><LogOut className="size-4" /> Sign out</button>
          </form>
        </div>
      </nav>
      <section className="mx-auto max-w-6xl py-16">
        <div className="flex items-center gap-3 text-violet-400"><RoleIcon className="size-5" /><span className="text-sm font-medium">Secure {role.replaceAll("_", " ").toLowerCase()} workspace</span></div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Welcome, {name?.split(" ")[0] ?? "user"}.</h1>
        <p className="mt-3 text-zinc-400">{email}</p>
        <div className="mt-10">{children}</div>
      </section>
    </main>
  );
}
