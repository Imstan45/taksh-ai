"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronLeft, FlaskConical, Gauge, LogOut, Menu, Sigma, Waves } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

const items = [
  ["Dashboard", "/juniors/dashboard", Gauge],
  ["My learning", "/juniors/learn", BookOpen],
  ["Mathematics", "/juniors/learn/mathematics/algebra", Sigma],
  ["Physics", "/juniors/learn/physics/mechanics", Waves],
  ["Chemistry", "/juniors/learn/chemistry/physical-chemistry", FlaskConical],
] as const;

export function JuniorsStudentShell({ children, name }: { children: React.ReactNode; name: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const path = usePathname();
  return <div className={`js-app ${collapsed ? "is-collapsed" : ""}`}>
    <button className="js-mobile-toggle" onClick={() => setMobile(!mobile)} aria-label="Open learning navigation"><Menu /></button>
    <aside className={`js-sidebar ${mobile ? "is-open" : ""}`}>
      <div className="js-side-head"><Link href="/juniors" className="js-logo"><span>J</span><b>Taksh Juniors</b></Link><button onClick={() => setCollapsed(!collapsed)} aria-label="Collapse sidebar"><ChevronLeft /></button></div>
      <nav>{items.map(([label, href, Icon]) => <Link onClick={() => setMobile(false)} className={path === href ? "active" : ""} href={href} key={href}><Icon/><span>{label}</span></Link>)}</nav>
      <div className="js-side-foot"><div className="js-avatar">{name.slice(0,1).toUpperCase()}</div><span><b>{name}</b><small>Student</small></span><button onClick={() => signOut({ callbackUrl: "/juniors" })} aria-label="Sign out"><LogOut/></button></div>
    </aside>
    <main className="js-main">{children}</main>
  </div>;
}
