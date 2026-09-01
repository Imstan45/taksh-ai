"use client";

import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";

type Message = { type: "error" | "success"; text: string };

export function SalesLoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(undefined);
    const form = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), rememberMe: form.get("rememberMe") === "on", redirect: false });
      if (result?.error) throw new Error("Incorrect email or password.");
      const session = await getSession();
      if (session?.user.role !== "SALES_REP") throw new Error("This sign-in is only for Sales Rep accounts.");
      router.push(session.user.accountStatus === "active" ? "/sales/dashboard" : "/sales/pending");
      router.refresh();
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to sign in." }); }
    finally { setBusy(false); }
  }
  return <form className="mt-8 space-y-4" onSubmit={submit}>
    <SalesField label="Email address" name="email" type="email" autoComplete="email" placeholder="you@organization.com" />
    <SalesField label="Password" name="password" type="password" autoComplete="current-password" />
    <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-zinc-600"><input name="rememberMe" type="checkbox" className="accent-violet-700"/>Remember me</label><Link className="font-medium text-violet-700" href="/forgot-password">Forgot password?</Link></div>
    <SalesMessage message={message}/>
    <button className="sales-primary-button w-full" disabled={busy}>{busy&&<LoaderCircle className="size-4 animate-spin"/>}Sign in</button>
  </form>;
}

export function SalesRegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(undefined);
    const form = new FormData(event.currentTarget);
    try {
      const payload = Object.fromEntries(form.entries());
      const response = await fetch("/api/auth/sales-register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Application could not be submitted.");
      const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false });
      if (result?.error) throw new Error("Application submitted. Sign in to view its status.");
      router.push("/sales/pending"); router.refresh();
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to continue." }); }
    finally { setBusy(false); }
  }
  return <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
    <SalesField label="Full name" name="fullName" autoComplete="name" placeholder="Your full name" />
    <SalesField label="Email address" name="email" type="email" autoComplete="email" placeholder="you@organization.com" />
    <SalesField label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" />
    <SalesField label="College / Organization" name="organization" autoComplete="organization" placeholder="Organization name" />
    <SalesField label="City" name="city" autoComplete="address-level2" placeholder="Your city" />
    <SalesField label="Approximate student / network reach" name="networkReach" type="number" min={1} max={1000000} placeholder="e.g. 500" />
    <SalesField label="Password" name="password" type="password" minLength={10} autoComplete="new-password" hint="10+ characters with uppercase, lowercase, number and symbol" />
    <SalesField label="Confirm password" name="confirmPassword" type="password" minLength={10} autoComplete="new-password" />
    <div className="sm:col-span-2"><SalesMessage message={message}/><button className="sales-primary-button mt-2 w-full" disabled={busy}>{busy&&<LoaderCircle className="size-4 animate-spin"/>}Submit application</button><p className="mt-4 text-center text-xs leading-5 text-zinc-500">Applications are reviewed by Taksh AI. Registration does not provide immediate Sales Rep access.</p></div>
  </form>;
}

function SalesMessage({ message }: { message?: Message }) { return message ? <p role="status" className={`mb-3 border px-3 py-2 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message.text}</p> : null; }
function SalesField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className="block text-sm font-medium text-zinc-800">{label}<input {...props} className="sales-field mt-2" required/>{hint&&<small className="mt-1.5 block font-normal text-zinc-500">{hint}</small>}</label>;
}
