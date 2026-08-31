"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpenCheck, BrainCircuit, Building2, ClipboardList, CreditCard, Gauge, KeyRound, LifeBuoy, Menu, Package, Settings, ShieldCheck, Sparkles, Trophy, UserSearch, Users } from "lucide-react";

const items = [
  [Gauge, "Dashboard", "/super-admin"],
  [Building2, "Institutions", "/super-admin/institutions"],
  [Users, "Users & invitations", "/super-admin/users"],
  [UserSearch, "Candidate pipeline", "/super-admin/candidates"],
  [Package, "Products", "/super-admin/products"],
  [KeyRound, "Access", "/super-admin/access"],
  [CreditCard, "Payments", "/super-admin/payments"],
  [BookOpenCheck, "Course operations", "/super-admin/courses"],
  [Sparkles, "Campaigns", "/super-admin/campaigns"],
  [Trophy, "Sales Challenge", "/super-admin/sales-challenge"],
  [Users, "Sales Reps", "/super-admin/sales-reps"],
  [BrainCircuit, "Diagnostic bank", "/super-admin/diagnostic"],
  [BarChart3, "Analytics", "/super-admin/analytics"],
  [Sparkles, "Content Factory", "/superadmin/content-factory"],
  [ShieldCheck, "Governance", "/super-admin/governance"],
  [ClipboardList, "Audit history", "/super-admin/audit"],
  [LifeBuoy, "Support inbox", "/super-admin/support"],
  [Settings, "Settings", "/superadmin/content-factory/settings"],
] as const;

function Links({ pathname }: { pathname: string }) {
  return <>{items.map(([Icon,label,href]) => {
    const active = href === "/super-admin" ? pathname === href : pathname.startsWith(href);
    return <Link aria-current={active?"page":undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active?"bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/20":"text-zinc-400 hover:bg-white/5 hover:text-white"}`} href={href} key={href}><Icon className="size-4"/><span>{label}</span></Link>;
  })}</>;
}

export function SuperAdminNav() {
  const pathname = usePathname();
  return <>
    <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 rounded-2xl border border-white/10 bg-white/[.035] p-4 lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-2 pb-5"><b>Taksh AI</b><p className="mt-1 text-xs text-zinc-500">Platform operations</p></div>
      <nav className="mt-4 grid gap-1"><Links pathname={pathname}/></nav>
      <p className="mt-auto px-2 text-xs text-zinc-600">Super Admin workspace</p>
    </aside>
    <details className="mb-4 rounded-2xl border border-white/10 bg-white/[.035] p-3 lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2"><Menu className="size-4"/>Menu</summary>
      <nav className="mt-3 grid gap-1 border-t border-white/10 pt-3"><Links pathname={pathname}/></nav>
    </details>
  </>;
}
