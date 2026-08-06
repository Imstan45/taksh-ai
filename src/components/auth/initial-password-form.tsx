"use client";

import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { LoaderCircle } from "lucide-react";

export function InitialPasswordForm() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || ""), confirmation = String(form.get("confirmation") || "");
    if (password !== confirmation) { setError("Passwords do not match."); setBusy(false); return; }
    try {
      const response = await fetch("/api/auth/change-initial-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Password could not be changed.");
      await signOut({ callbackUrl: "/login?passwordChanged=1" });
    } catch (error) { setError(error instanceof Error ? error.message : "Password could not be changed."); setBusy(false); }
  }
  return <form className="space-y-5" onSubmit={submit}><div><h1 className="text-3xl font-semibold">Create your private password</h1><p className="mt-3 text-sm leading-6 text-zinc-400">This is your first login. Replace the temporary college password before continuing.</p></div><label className="block text-sm text-zinc-300">New password<input className="field mt-2" name="password" type="password" minLength={10} autoComplete="new-password" required/></label><label className="block text-sm text-zinc-300">Confirm new password<input className="field mt-2" name="confirmation" type="password" minLength={10} autoComplete="new-password" required/></label><p className="text-xs leading-5 text-zinc-500">Use 10–128 characters with uppercase, lowercase, a number and a symbol.</p>{error&&<p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}<button className="btn-primary w-full" disabled={busy}>{busy&&<LoaderCircle className="size-4 animate-spin"/>}{busy?"Updating password…":"Save password and continue"}</button></form>;
}
