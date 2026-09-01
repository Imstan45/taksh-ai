import Link from "next/link";
import { signOut } from "@/auth";

const links = [
  ["Overview", "/sales/dashboard#overview"],
  ["Referrals", "/sales/dashboard#referrals"],
  ["Performance", "/sales/dashboard#performance"],
  ["Challenge", "/sales/dashboard#challenge"],
  ["Profile", "/sales/dashboard#profile"],
] as const;

export function SalesPortalShell({ children, compact=false }: { children: React.ReactNode; compact?: boolean }) {
  return <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link className="flex items-center gap-3" href="/sales"><span className="grid size-8 place-items-center bg-zinc-950 text-sm font-semibold text-white">T</span><span><b className="block text-sm">Taksh AI</b><small className="block text-[11px] text-zinc-500">Sales Network</small></span></Link>
        {!compact&&<><nav className="hidden items-center gap-6 text-sm text-zinc-600 md:flex">{links.map(([label,href])=><Link className="hover:text-zinc-950" href={href} key={href}>{label}</Link>)}</nav><form action={async()=>{"use server";await signOut({redirectTo:"/sales/login"})}}><button className="text-sm font-medium text-zinc-600 hover:text-zinc-950">Sign out</button></form></>}
      </div>
    </header>
    {children}
  </main>;
}
