"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Database, Feather, ShieldCheck } from "lucide-react";

type Config={supabase:boolean;database:boolean};
export function SettingsWorkspace(){
  const[config,setConfig]=useState<Config>();const[error,setError]=useState("");
  useEffect(()=>{fetch("/api/content-factory/config").then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Readiness check failed.");setConfig(data)}).catch(caught=>setError(caught instanceof Error?caught.message:"Readiness check failed."))},[]);
  return <div className="grid gap-6 lg:grid-cols-2">
    <section className="glass-card"><div className="flex items-start gap-4"><div className="rounded-xl bg-emerald-500/15 p-3"><Feather className="size-6 text-emerald-300"/></div><div><h3 className="text-xl font-semibold">Taksh authored engine</h3><p className="mt-1 text-sm text-zinc-400">Deterministic, fast and independent of external AI models.</p></div></div><div className="mt-6 grid gap-3">{["Reviewed curriculum source","Consistent compact lesson recipe","Immediate generation with no model latency","Original Taksh explanations and examples","Block-ready mobile delivery"].map(item=><p className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm" key={item}><CheckCircle2 className="size-4 text-emerald-300"/>{item}</p>)}</div></section>
    <section className="glass-card"><div className="flex items-start gap-4"><div className="rounded-xl bg-violet-500/15 p-3"><Database className="size-6 text-violet-300"/></div><div><h3 className="text-xl font-semibold">Publishing readiness</h3><p className="mt-1 text-sm text-zinc-400">Only the Taksh content database is required.</p></div></div>{error?<p role="alert" className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>:<div className="mt-6 space-y-3"><Status label="Supabase connection" ready={config?.supabase}/><Status label="Content database" ready={config?.database}/><Status label="External AI dependency" ready detail="Not required"/></div>}<div className="mt-6 flex gap-3 rounded-xl border border-white/10 p-4"><ShieldCheck className="size-5 shrink-0 text-violet-300"/><p className="text-sm leading-6 text-zinc-400">Generated lessons remain versioned, reviewable and reversible. Existing published content is preserved during curriculum sync.</p></div></section>
  </div>
}
function Status({label,ready,detail}:{label:string;ready?:boolean;detail?:string}){return <div className="flex items-center justify-between rounded-xl border border-white/10 p-4"><span>{label}</span><strong className={ready?"text-emerald-300":"text-amber-300"}>{detail??(ready?"Ready":"Checking…")}</strong></div>}
