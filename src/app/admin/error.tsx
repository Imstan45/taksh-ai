"use client";

import Link from "next/link";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#08090e] p-6 text-white">
    <section className="glass-card max-w-lg text-center">
      <h1 className="text-2xl font-semibold">The admin request could not be completed</h1>
      <p className="mt-3 text-zinc-400">Your session may have expired, your institution access may have changed, or the requested operation failed.</p>
      <div className="mt-6 flex justify-center gap-3"><button className="btn-primary" onClick={reset}>Try again</button><Link className="btn-ghost" href="/admin/login">Return to admin login</Link></div>
    </section>
  </main>;
}
