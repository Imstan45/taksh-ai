"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, UserPlus, XCircle } from "lucide-react";

type Result = { email: string; ok: boolean; reason?: string };

export function StudentOnboarding() {
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setResults([]);
    try {
      const response = await fetch("/api/admin/students/onboard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ emails }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Students could not be added.");
      setResults(data.results || []);
      if (data.created) setEmails("");
    } catch (error) { setError(error instanceof Error ? error.message : "Students could not be added."); }
    finally { setBusy(false); }
  }
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
    <form className="glass-card" onSubmit={submit}>
      <div className="flex items-start gap-3"><UserPlus className="mt-1 size-6 text-violet-300"/><div><h2 className="text-2xl font-semibold">Add students</h2><p className="mt-2 text-sm text-zinc-400">Paste up to 200 email addresses, separated by spaces, commas, semicolons or new lines.</p></div></div>
      <textarea className="field mt-6 min-h-72 font-mono text-sm" value={emails} onChange={(event) => setEmails(event.target.value)} placeholder={'student1@college.edu\nstudent2@college.edu'} required />
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      <button className="btn-primary mt-5" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin"/> : <UserPlus className="size-4"/>}{busy ? "Creating accounts…" : "Create student accounts"}</button>
    </form>
    <aside className="glass-card h-fit"><h3 className="font-semibold">First login</h3><ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-zinc-400"><li>Students sign in with their email and <code className="text-violet-200">welcome2026</code>.</li><li>Taksh immediately requires a new private password.</li><li>They cannot open the student workspace until the password is changed.</li><li>No invitation email is sent.</li></ol></aside>
    {results.length > 0 && <section className="glass-card lg:col-span-2"><h3 className="font-semibold">Onboarding results</h3><div className="mt-4 divide-y divide-white/10">{results.map((result) => <div className="flex items-center gap-3 py-3" key={result.email}>{result.ok ? <CheckCircle2 className="size-5 text-emerald-400"/> : <XCircle className="size-5 text-red-400"/>}<div><b>{result.email}</b><p className="text-xs text-zinc-500">{result.ok ? "Account created" : result.reason}</p></div></div>)}</div></section>}
  </div>;
}
