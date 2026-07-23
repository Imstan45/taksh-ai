import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/auth";

export function DashboardShell({ name, email, role, children }: { name?: string | null; email?: string | null; role: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#08090e] p-4 text-white sm:p-8">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] p-4">
        <div><p className="font-semibold">Taksh AI</p><p className="text-xs text-zinc-500">{role.replaceAll("_", " ")}</p></div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link className="btn-ghost border border-white/10" href="/dashboard">Dashboard</Link>
          <Link className="btn-ghost border border-white/10" href="/student/courses">My courses</Link>
          <Link className="btn-ghost border border-white/10" href="/continue-learning">Continue learning</Link>
          <Link className="btn-ghost border border-white/10" href="/assessment">Assessment</Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="btn-ghost gap-2" type="submit"><LogOut className="size-4" /> Sign out</button>
          </form>
        </div>
      </nav>
      <section className="mx-auto max-w-6xl py-16">
        <div className="flex items-center gap-3 text-violet-400"><ShieldCheck className="size-5" /><span className="text-sm font-medium">Secure workspace</span></div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Welcome, {name?.split(" ")[0] ?? "learner"}.</h1>
        <p className="mt-3 text-zinc-400">{email}</p>
        <div className="mt-10">{children}</div>
      </section>
    </main>
  );
}
