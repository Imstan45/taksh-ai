"use client";

import { FormEvent, useState } from "react";
import { LifeBuoy, LoaderCircle } from "lucide-react";

export function SupportForm() {
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[reference,setReference]=useState(""),[emailed,setEmailed]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");setReference("");
    const form=event.currentTarget,data=new FormData(form);
    try{
      const response=await fetch("/api/support",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({category:data.get("category"),subject:data.get("subject"),message:data.get("message")})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error??"Support request could not be submitted.");
      setReference(payload.ticketNumber);setEmailed(Boolean(payload.emailed));form.reset();
    }catch(caught){setError(caught instanceof Error?caught.message:"Support request could not be submitted.");}finally{setBusy(false)}
  }
  return <section className="glass-card mx-auto max-w-2xl">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-violet-500/15 p-3 text-violet-300"><LifeBuoy className="size-5"/></span><div><h2 className="text-2xl font-semibold">How can we help?</h2><p className="mt-1 text-sm text-zinc-400">Send a short description and we’ll review it.</p></div></div>
    {reference?<div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4" role="status"><b>Request received — {reference}</b><p className="mt-1 text-sm text-emerald-100/80">{emailed?"Our support inbox has been notified.":"It is saved in the Super Admin support inbox."}</p></div>:null}
    <form className="mt-6 grid gap-4" onSubmit={submit}>
      <label className="grid gap-2 text-sm">Category<select className="field" name="category" required><option value="account">Account or login</option><option value="payment">Payment</option><option value="course">Course or learning</option><option value="assessment">Assessment</option><option value="institution">College or institution</option><option value="technical">Technical issue</option><option value="other">Other</option></select></label>
      <label className="grid gap-2 text-sm">Subject<input className="field" name="subject" maxLength={120} minLength={3} required placeholder="What do you need help with?"/></label>
      <label className="grid gap-2 text-sm">Message<textarea className="field min-h-36 resize-y" name="message" maxLength={3000} minLength={10} required placeholder="Tell us what happened and what you expected."/></label>
      {error?<p className="text-sm text-red-300" role="alert">{error}</p>:null}
      <button className="btn-primary justify-center" disabled={busy}>{busy?<LoaderCircle className="size-4 animate-spin"/>:null}{busy?"Sending…":"Send support request"}</button>
    </form>
  </section>;
}
