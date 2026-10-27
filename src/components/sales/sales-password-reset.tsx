"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SalesForgotPasswordForm() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); try { const response = await fetch("/api/auth/sales-forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setMessage(payload.message); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to send reset link."); } finally { setBusy(false); } }
  return <form className="mt-8 space-y-5" onSubmit={submit}><label className="block text-sm font-medium text-zinc-800">Email address<input className="sales-field mt-2" value={email} onChange={event=>setEmail(event.target.value)} type="email" autoComplete="email" required /></label>{message&&<p role="status" className="border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">{message}</p>}<button className="sales-primary-button w-full" disabled={busy}>{busy&&<LoaderCircle className="size-4 animate-spin"/>}Send reset link</button><p className="text-center text-sm text-zinc-500"><Link className="text-violet-700" href="/sales/login">Back to Sales Rep sign in</Link></p></form>;
}

export function SalesResetPasswordForm() {
  const router = useRouter(); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); try { const { error } = await createSupabaseBrowserClient().auth.updateUser({ password }); if (error) throw error; setMessage("Password updated. Redirecting to Sales Rep sign in…"); window.setTimeout(()=>router.replace("/sales/login"),1000); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update password."); } finally { setBusy(false); } }
  return <form className="mt-8 space-y-5" onSubmit={submit}><label className="block text-sm font-medium text-zinc-800">New password<input className="sales-field mt-2" value={password} onChange={event=>setPassword(event.target.value)} type="password" autoComplete="new-password" minLength={10} required /></label><p className="text-xs text-zinc-500">Use at least 10 characters, including uppercase, lowercase, number and symbol.</p>{message&&<p role="status" className="border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">{message}</p>}<button className="sales-primary-button w-full" disabled={busy}>{busy&&<LoaderCircle className="size-4 animate-spin"/>}Update password</button></form>;
}
