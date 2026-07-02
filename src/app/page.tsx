import Link from "next/link";
import { ArrowRight, BrainCircuit, ChartNoAxesCombined, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080d] text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Brand />
        <div className="flex items-center gap-3">
          <Link className="btn-ghost" href="/login">Sign in</Link>
          <Link className="btn-primary" href="/signup">Get started</Link>
        </div>
      </nav>
      <section className="relative mx-auto grid max-w-7xl gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.15fr_.85fr] lg:pt-28">
        <div className="orb" />
        <div className="relative">
          <p className="eyebrow">Built for placement success</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-.05em] sm:text-7xl">Your preparation, made brilliantly personal.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">Taksh AI finds the gaps, builds your roadmap, and coaches you from first assessment to final interview.</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link className="btn-primary group" href="/signup">Start preparing <ArrowRight className="size-4 transition group-hover:translate-x-1" /></Link>
            <Link className="btn-ghost border border-white/10" href="/login">I have an account</Link>
          </div>
        </div>
        <div className="relative grid gap-4 sm:grid-cols-2 lg:pt-10">
          {[
            [BrainCircuit, "Adaptive learning", "A roadmap that evolves with every answer."],
            [ChartNoAxesCombined, "Progress clarity", "Know what improved and what needs focus."],
            [ShieldCheck, "Secure by design", "Protected accounts and role-based access."],
          ].map(([Icon, title, body], index) => (
            <div className={`glass-card ${index === 2 ? "sm:col-span-2" : ""}`} key={String(title)}>
              <Icon className="size-6 text-violet-400" />
              <h2 className="mt-8 text-lg font-medium">{String(title)}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{String(body)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function Brand() {
  return <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-violet-600 shadow-lg shadow-violet-500/20"><BrainCircuit className="size-5" /></span>Taksh AI</Link>;
}
