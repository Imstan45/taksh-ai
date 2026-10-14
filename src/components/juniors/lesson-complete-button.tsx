"use client";
import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

export function LessonCompleteButton({lessonSlug,initialComplete}:{lessonSlug:string;initialComplete:boolean}){
  const [complete,setComplete]=useState(initialComplete); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function mark(){setBusy(true);setError("");const response=await fetch("/api/juniors/progress",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({lessonSlug,status:"completed",progressPercent:100})});setBusy(false);if(!response.ok){setError("Progress could not be saved. Please try again.");return}setComplete(true)}
  return <div className="js-complete"><button className="j-btn" disabled={busy||complete} onClick={mark}>{busy?<LoaderCircle className="js-spin"/>:<Check/>}{complete?"Lesson completed":"Mark lesson complete"}</button>{error&&<p role="status">{error}</p>}</div>
}
