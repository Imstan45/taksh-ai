"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, Grid2X2, List, Search, Send } from "lucide-react";

type Asset = { id: string; course: string; module: string; topic: string; subtopic: string; title: string; difficulty: string; status: string; content_version: number; created_by?: string; reviewed_by?: string; published_by?: string; updated_at: string };

export function LibraryWorkspace() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch("/api/content-factory/content");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load library.");
    setAssets(data.assets || []);
  }
  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, []);
  const filtered = useMemo(() => assets.filter((asset) =>
    (status === "all" || asset.status === status) &&
    (!search || [asset.title,asset.course,asset.module,asset.topic,asset.subtopic].some((value) => value.toLowerCase().includes(search.toLowerCase())))
  ), [assets, search, status]);
  const count = (value: string) => assets.filter((asset) => asset.status === value).length;

  async function archive(asset: Asset) {
    if (!window.confirm(`Archive “${asset.title}”?`)) return;
    const response = await fetch(`/api/content-factory/content/${asset.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived", changeNote: "Archived from Content Library" }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Lesson archived." : data.error || "Archive failed.");
    if (response.ok) await load();
  }

  return <div className="space-y-6">
    {message && <div role="status" className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm">{message}</div>}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {[["Total",assets.length],["Published",count("published")],["Draft",count("draft")],["Under review",count("in_review")],["Archived",count("archived")]].map(([label,value]) => <div className="glass-card !p-4" key={String(label)}><p className="text-xs text-zinc-500">{label}</p><strong className="mt-2 block text-2xl">{value}</strong></div>)}
    </section>
    <section className="glass-card !p-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-zinc-500" /><input className="field !pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses, modules and lessons…" /></label>
        <select className="field md:!w-48" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{["draft","in_review","approved","published","archived"].map((value) => <option key={value} value={value}>{value.replace("_"," ")}</option>)}</select>
        <div className="flex gap-2"><button aria-label="Grid view" onClick={() => setView("grid")} className={`btn-ghost border ${view === "grid" ? "border-violet-400/40 bg-violet-500/10" : "border-white/10"}`}><Grid2X2 className="size-4" /></button><button aria-label="List view" onClick={() => setView("list")} className={`btn-ghost border ${view === "list" ? "border-violet-400/40 bg-violet-500/10" : "border-white/10"}`}><List className="size-4" /></button></div>
      </div>
    </section>
    <section className={view === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
      {filtered.map((asset) => <article className="glass-card flex flex-col" key={asset.id}>
        <div className="flex items-start justify-between gap-3"><span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] capitalize text-zinc-300">{asset.status.replace("_"," ")}</span><span className="text-xs text-zinc-500">v{asset.content_version}</span></div>
        <p className="mt-5 text-xs text-violet-300">{asset.course} → {asset.module}</p>
        <h3 className="mt-2 text-lg font-semibold">{asset.title}</h3>
        <p className="mt-2 text-sm text-zinc-500">{asset.topic} → {asset.subtopic}</p>
        <div className="mt-auto pt-6 text-xs text-zinc-600">Updated {new Date(asset.updated_at).toLocaleDateString()}</div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <Link className="btn-ghost border border-white/10" href="/superadmin/content-factory/review">Preview / edit</Link>
          {asset.status === "published" && <Link className="btn-ghost gap-2 border border-white/10" href="/super-admin/courses"><Send className="size-3.5" />Assign</Link>}
          {asset.status === "published" && <button className="btn-ghost gap-2 border border-white/10" onClick={() => void archive(asset)}><Archive className="size-3.5" />Archive</button>}
        </div>
      </article>)}
      {!filtered.length && <div className="glass-card col-span-full grid min-h-72 place-items-center text-center text-zinc-500"><div><Search className="mx-auto mb-3 size-7" /><p>No learning modules match these filters.</p></div></div>}
    </section>
  </div>;
}
