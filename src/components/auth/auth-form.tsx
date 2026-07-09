"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot" | "reset" | "verify";
const authPaths = new Set(["/login", "/signup", "/forgot-password", "/forgotpassword", "/reset-password", "/verify-email"]);

function safeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";

  try {
    const url = new URL(value, "http://taksh.local");
    if (authPaths.has(url.pathname)) return "/dashboard";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}

const copy = {
  login: ["Welcome back", "Continue your preparation journey."],
  signup: ["Create your account", "Your personalized placement journey starts here."],
  forgot: ["Forgot your password?", "We’ll send you a secure reset link."],
  reset: ["Choose a new password", "Use at least 10 characters with a number and symbol."],
  verify: ["Verify your email", "Securely activating your Taksh AI account."],
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string }>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(undefined);
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "login") {
        const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), rememberMe: form.get("rememberMe") === "on", redirect: false });
        if (result?.error) throw new Error("Incorrect credentials, or your email is not verified.");
        router.push(safeCallbackUrl(params.get("callbackUrl"))); router.refresh(); return;
      }
      if (mode === "reset") {
        const { error } = await createSupabaseBrowserClient().auth.updateUser({ password: String(form.get("password") ?? "") });
        if (error) throw new Error(error.message);
        setMessage({ type: "success", text: "Password updated. Sign in with your new password." });
        setTimeout(() => router.push("/login"), 1200);
        return;
      }
      const endpoint = mode === "signup" ? "register" : mode === "forgot" ? "forgot-password" : "verify-email";
      const body: Record<string, unknown> = {};
      form.forEach((value, key) => { body[key] = value; });
      if (mode === "verify") body.token = params.get("token") ?? "";
      const response = await fetch(`/api/auth/${endpoint}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Something went wrong");
      setMessage({ type: "success", text: payload.message ?? "Done" });
      if (mode === "verify") setTimeout(() => router.push("/login"), 1200);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to continue" });
    } finally { setBusy(false); }
  }

  const autoVerify = mode === "verify";
  return (
    <div>
      <p className="text-sm font-medium text-violet-400">{mode === "login" ? "Good to see you" : "Taksh AI account"}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{copy[mode][0]}</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{copy[mode][1]}</p>
      <form className="mt-8 space-y-5" onSubmit={submit}>
        {mode === "signup" && <Field label="Full name" name="name" placeholder="Your name" autoComplete="name" />}
        {["login", "signup", "forgot"].includes(mode) && <Field label="Email address" name="email" type="email" placeholder="you@college.edu" autoComplete="email" />}
        {["login", "signup", "reset"].includes(mode) && (
          <label className="block text-sm text-zinc-300">Password
            <span className="relative mt-2 block">
              <input className="field pr-12" name="password" type={show ? "text" : "password"} required minLength={mode === "login" ? 1 : 10} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="absolute right-3 top-3 text-zinc-500 hover:text-white">{show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>
            </span>
          </label>
        )}
        {mode === "login" && <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-zinc-400"><input name="rememberMe" type="checkbox" className="accent-violet-600" /> Remember me</label><Link className="text-violet-400 hover:text-violet-300" href="/forgot-password">Forgot password?</Link></div>}
        {message && <p role="status" className={`rounded-xl border px-4 py-3 text-sm ${message.type === "error" ? "border-red-500/20 bg-red-500/10 text-red-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}`}>{message.text}</p>}
        <button className="btn-primary w-full" disabled={busy} type="submit">{busy && <LoaderCircle className="size-4 animate-spin" />}{autoVerify ? "Verify email" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}</button>
      </form>
      {mode === "login" && <p className="mt-7 text-center text-sm text-zinc-500">New to Taksh AI? <Link className="text-violet-400" href="/signup">Create an account</Link></p>}
      {mode === "signup" && <p className="mt-7 text-center text-sm text-zinc-500">Already have an account? <Link className="text-violet-400" href="/login">Sign in</Link></p>}
      {["forgot", "reset"].includes(mode) && <p className="mt-7 text-center text-sm"><Link className="text-violet-400" href="/login">Back to sign in</Link></p>}
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...input } = props;
  return <label className="block text-sm text-zinc-300">{label}<input {...input} className="field mt-2" required /></label>;
}
