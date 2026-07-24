"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RefreshCw, Save, Send, X } from "lucide-react";

type Asset = {
  id: string; course: string; module: string; topic: string; subtopic: string; title: string;
  status: "draft" | "in_review" | "approved" | "published" | "archived";
  content_version: number; content: Record<string, any>; created_at: string; updated_at: string;
};

export function ReviewWorkspace() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Asset | null>(null);
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/content-factory/content");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load review queue.");
    setAssets((data.assets || []).filter((asset: Asset) => asset.status !== "archived"));
  }
  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, []);
  const queue = useMemo(() => assets.filter((asset) => status === "all" ? ["draft","in_review","approved"].includes(asset.status) : asset.status === status), [assets, status]);
  const current = queue[index] || null;
  useEffect(() => { setDraft(current ? structuredClone(current) : null); }, [current]);

  function update(path: string[], value: unknown) {
    if (!draft) return;
    const next = structuredClone(draft);
    let target: any = next.content;
    for (const key of path.slice(0, -1)) target = target[key];
    target[path.at(-1)!] = value;
    if (path.join(".") === "identity.title") next.title = String(value);
    setDraft(next);
  }

  async function save(nextStatus?: Asset["status"], note = "Editorial changes saved") {
    if (!draft) return;
    if (nextStatus === "published" && !window.confirm("Publish this approved lesson to assigned student learning profiles? A version-history entry will be retained.")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/content-factory/content/${draft.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.content, status: nextStatus, changeNote: note, changeType: nextStatus || "edited" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update lesson.");
      setMessage(nextStatus ? `Lesson moved to ${nextStatus.replace("_", " ")}.` : "Draft saved.");
      await load();
      if (nextStatus === "published" || nextStatus === "draft") setIndex((value) => Math.max(0, Math.min(value, queue.length - 2)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally { setBusy(false); }
  }

  async function reject() {
    const reason = window.prompt("Rejection reason");
    if (!reason) return;
    await save("draft", `Rejected: ${reason}`);
  }

  async function regenerate() {
    if (!draft) return;
    const instruction = window.prompt("What should Gemini improve in the explanation?");
    if (!instruction) return;
    setBusy(true);
    try {
      const response = await fetch("/api/content-factory/regenerate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSection: "core_content", regenerationInstruction: instruction, existingContentJson: draft.content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Regeneration failed.");
      update(["core_content"], data.section);
      setMessage("Gemini returned a revised explanation. Review it, then save the draft.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Regeneration failed."); }
    finally { setBusy(false); }
  }

  if (!draft) return <EmptyQueue status={status} setStatus={setStatus} />;
  const content = draft.content;
  const objectives = content.learning_design?.learning_objectives || [];
  const examples = content.worked_examples || [];
  const mistakes = content.common_mistakes || [];
  const checkpoints = content.checkpoint_questions || [];
  return (
    <div className="space-y-5">
      {message && <div role="status" className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">{message}</div>}
      <section className="glass-card !p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs uppercase tracking-widest text-zinc-500">Sequential review</p><p className="mt-1 font-medium">{index + 1} of {queue.length} items · version {draft.content_version}</p></div>
          <div className="flex items-center gap-2">
            <select className="field !min-h-10 !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setIndex(0); }}><option value="all">Pending queue</option><option value="draft">Draft</option><option value="in_review">Under review</option><option value="approved">Approved</option></select>
            <button aria-label="Previous item" className="btn-ghost border border-white/10" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft className="size-4" /></button>
            <button aria-label="Next item" className="btn-ghost border border-white/10" disabled={index >= queue.length - 1} onClick={() => setIndex(index + 1)}><ArrowRight className="size-4" /></button>
          </div>
        </div>
        <div className="mt-4 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${queue.length ? (index + 1) / queue.length * 100 : 0}%` }} /></div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="glass-card min-w-0 space-y-7">
          <div className="border-b border-white/10 pb-5">
            <p className="text-xs text-violet-300">{draft.course} → {draft.module} → {draft.topic}</p>
            <label className="mt-4 block text-xs text-zinc-400">Lesson title<input className="field mt-2 text-lg font-semibold" value={content.identity?.title || ""} onChange={(e) => update(["identity","title"], e.target.value)} /></label>
          </div>
          <EditorSection title="Learning objectives">
            {objectives.map((item: any, i: number) => <textarea className="field min-h-20" key={item.objective_id || i} value={item.objective} onChange={(e) => update(["learning_design","learning_objectives",String(i),"objective"], e.target.value)} />)}
          </EditorSection>
          <EditorSection title="Explanation">
            {(["introduction","canonical_definition","why_it_matters","concept_explanation"] as const).map((key) => <label className="block text-xs capitalize text-zinc-400" key={key}>{key.replaceAll("_"," ")}<textarea className="field mt-2 min-h-28" value={content.core_content?.[key] || ""} onChange={(e) => update(["core_content",key], e.target.value)} /></label>)}
          </EditorSection>
          <EditorSection title="Worked examples">
            {examples.map((item: any, i: number) => <div className="rounded-xl border border-white/10 p-4" key={i}><input className="field font-medium" value={item.title} onChange={(e) => update(["worked_examples",String(i),"title"], e.target.value)} /><textarea className="field mt-3 min-h-24" value={item.question_or_scenario} onChange={(e) => update(["worked_examples",String(i),"question_or_scenario"], e.target.value)} /><textarea className="field mt-3 min-h-20" value={item.final_answer} onChange={(e) => update(["worked_examples",String(i),"final_answer"], e.target.value)} /></div>)}
          </EditorSection>
          <EditorSection title="Common mistakes">
            {mistakes.map((item: any, i: number) => <div className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2" key={i}><input className="field" value={item.title} onChange={(e) => update(["common_mistakes",String(i),"title"], e.target.value)} /><textarea className="field min-h-20" value={item.correction} onChange={(e) => update(["common_mistakes",String(i),"correction"], e.target.value)} /></div>)}
          </EditorSection>
          <EditorSection title="Practice and quiz questions">
            {checkpoints.map((item: any, i: number) => <div className="grid gap-3 rounded-xl border border-white/10 p-4" key={i}><textarea className="field min-h-20" value={item.question} onChange={(e) => update(["checkpoint_questions",String(i),"question"], e.target.value)} /><textarea className="field min-h-20" value={item.answer} onChange={(e) => update(["checkpoint_questions",String(i),"answer"], e.target.value)} /></div>)}
          </EditorSection>
          <EditorSection title="Summary and key takeaways">
            <textarea className="field min-h-28" value={content.revision_asset?.summary || ""} onChange={(e) => update(["revision_asset","summary"], e.target.value)} />
            <textarea className="field min-h-28" value={(content.revision_asset?.key_points || []).join("\n")} onChange={(e) => update(["revision_asset","key_points"], e.target.value.split("\n").filter(Boolean))} />
          </EditorSection>
        </section>
        <aside className="glass-card h-fit space-y-3 xl:sticky xl:top-6">
          <div className="mb-5"><span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-xs capitalize text-violet-200">{draft.status.replace("_"," ")}</span><p className="mt-3 text-xs text-zinc-500">Generated {new Date(draft.created_at).toLocaleDateString()} · Gemini</p></div>
          <button className="btn-ghost w-full gap-2 border border-white/10" disabled={busy} onClick={() => void save()}><Save className="size-4" />Save draft</button>
          {draft.status === "draft" && <button className="btn-primary w-full" disabled={busy} onClick={() => void save("in_review")}><Send className="size-4" />Send for review</button>}
          {draft.status === "in_review" && <button className="btn-primary w-full" disabled={busy} onClick={() => void save("approved")}><Check className="size-4" />Approve</button>}
          {draft.status === "in_review" && <button className="btn-ghost w-full gap-2 border border-red-400/20 text-red-300" disabled={busy} onClick={() => void reject()}><X className="size-4" />Reject</button>}
          <button className="btn-ghost w-full gap-2 border border-white/10" disabled={busy} onClick={() => void regenerate()}><RefreshCw className="size-4" />Request regeneration</button>
          {draft.status === "approved" && <button className="btn-primary w-full" disabled={busy} onClick={() => void save("published")}><Send className="size-4" />Publish</button>}
        </aside>
      </div>
    </div>
  );
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="space-y-3"><legend className="mb-3 text-lg font-semibold">{title}</legend>{children}</fieldset>;
}

function EmptyQueue({ status, setStatus }: { status: string; setStatus: (value: string) => void }) {
  return <section className="glass-card grid min-h-80 place-items-center text-center"><div><Check className="mx-auto size-9 text-emerald-400" /><h3 className="mt-4 text-xl font-semibold">Review queue is clear</h3><p className="mt-2 text-sm text-zinc-500">There are no items matching this queue.</p><select className="field mt-5" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Pending queue</option><option value="draft">Draft</option><option value="in_review">Under review</option><option value="approved">Approved</option></select></div></section>;
}
