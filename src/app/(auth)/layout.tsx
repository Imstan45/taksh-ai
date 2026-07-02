import { Brand } from "@/app/page";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen w-full grid-cols-1 overflow-hidden bg-[#07080d] text-white lg:grid-cols-[.9fr_1.1fr]">
      <div className="orb" />
      <section className="relative flex w-full min-w-0 flex-col px-6 py-7 sm:px-10 lg:px-16">
        <Brand />
        <div className="my-auto w-full max-w-md py-14">{children}</div>
        <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Taksh AI. Learn with purpose.</p>
      </section>
      <aside className="m-3 hidden overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,#5020a0_0%,#171020_38%,#0b0c12_100%)] p-12 lg:flex lg:flex-col lg:justify-end">
        <div className="max-w-xl">
          <p className="eyebrow">One journey. Built around you.</p>
          <blockquote className="mt-7 text-4xl font-medium leading-tight tracking-[-.035em]">Turn uncertainty into a clear path—and every practice session into progress.</blockquote>
          <p className="mt-6 text-zinc-400">Assess. Learn. Practice. Interview. Improve.</p>
        </div>
      </aside>
    </main>
  );
}
