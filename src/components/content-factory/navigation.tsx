"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Settings, Sparkles, ScanText } from "lucide-react";

const items = [
  { href: "/superadmin/content-factory/generate", label: "Generate", icon: Sparkles },
  { href: "/superadmin/content-factory/review", label: "Review", icon: ScanText },
  { href: "/superadmin/content-factory/library", label: "Library", icon: Library },
];

export function ContentFactoryNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Content Factory workflow" className="flex flex-wrap items-center gap-2">
      {items.map(({ href, label, icon: Icon }) => (
        <Link href={href} key={href} className={`btn-ghost gap-2 border ${pathname === href ? "border-violet-400/50 bg-violet-500/15 text-violet-200" : "border-white/10"}`}>
          <Icon className="size-4" />{label}
        </Link>
      ))}
      <Link href="/superadmin/content-factory/settings" aria-label="Content Factory settings" className={`btn-ghost border ${pathname.endsWith("/settings") ? "border-violet-400/50 bg-violet-500/15" : "border-white/10"}`}>
        <Settings className="size-4" />
      </Link>
    </nav>
  );
}
