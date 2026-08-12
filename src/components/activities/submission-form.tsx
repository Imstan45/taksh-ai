"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export function SubmissionForm({ activityId, initialText = "", canResubmit = true }: { activityId: string; initialText?: string; canResubmit?: boolean }) {
  const router = useRouter(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const response=await fetch(`/api/student/activities/${activityId}/submit`,{method:"POST",body:new FormData(event.currentTarget)}); const payload=await response.json(); if(!response.ok)throw new Error(payload.error??"Submission failed."); setMessage(`Work ${payload.status === "late" ? "submitted late" : "submitted"} successfully.`); router.refresh(); }
    catch(error){setMessage(error instanceof Error?error.message:"Submission failed.");} finally{setBusy(false);}
  }
  if(!canResubmit)return <p className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-zinc-300">This submission is locked after grading.</p>;
  return <form className="space-y-4" onSubmit={submit}><textarea className="field min-h-40" name="textContent" defaultValue={initialText} placeholder="Write your answer here"/><label className="block text-sm text-zinc-300">Attachment <span className="text-zinc-500">(PDF, DOCX, TXT, PNG or JPEG; max 10 MB)</span><input className="field mt-2 pt-3" name="file" type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"/></label>{message&&<p role="status" className="rounded-xl border border-white/10 p-3 text-sm">{message}</p>}<button className="btn-primary" disabled={busy}>{busy&&<LoaderCircle className="size-4 animate-spin"/>}{busy?"Submitting…":"Submit work"}</button></form>;
}
