"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, CircleDashed, LoaderCircle, Play, RefreshCw } from "lucide-react";

type CurriculumRow = { course: string; module: string; topic: string; subtopic: string };
type Asset = { id: string; course: string; module: string; topic: string; subtopic: string; status: string };
type QueueState = { current: number; total: number; completed: number; failed: number; label: string };

const assetKey = (row: CurriculumRow) => [row.course, row.module, row.topic, row.subtopic].join("::");

export function GenerateWorkspace() {
  const [rows, setRows] = useState<CurriculumRow[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [course, setCourse] = useState("");
  const [module, setModule] = useState("");
  const [topic, setTopic] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<QueueState>({ current: 0, total: 0, completed: 0, failed: 0, label: "" });
  const [notice, setNotice] = useState("");
  const [options, setOptions] = useState({
    teachingStyle: "Concept-first and practical",
    difficulty: "Intermediate",
    targetAudience: "Undergraduate engineering students",
    language: "English",
    depth: "Detailed",
    examples: true,
    workedExamples: true,
    practice: true,
    quiz: true,
    summary: true,
    takeaways: true,
    mistakes: true,
    applications: true,
  });

  async function load() {
    const [curriculumResponse, assetResponse] = await Promise.all([
      fetch("/api/content-factory/curriculum?all=true"),
      fetch("/api/content-factory/content"),
    ]);
    const curriculum = await curriculumResponse.json();
    const content = await assetResponse.json();
    if (!curriculumResponse.ok) throw new Error(curriculum.error || "Unable to load syllabus.");
    setRows(curriculum.rows || []);
    setAssets(content.assets || []);
  }

  useEffect(() => { void load().catch((error) => setNotice(error.message)); }, []);

  const assetMap = useMemo(() => new Map(assets.map((asset) => [assetKey(asset), asset])), [assets]);
  const filtered = useMemo(() => rows.filter((row) =>
    (!course || row.course === course) && (!module || row.module === module) && (!topic || row.topic === topic)
  ), [rows, course, module, topic]);
  const courses = [...new Set(rows.map((row) => row.course))];
  const modules = [...new Set(rows.filter((row) => !course || row.course === course).map((row) => row.module))];
  const topics = [...new Set(rows.filter((row) => (!course || row.course === course) && (!module || row.module === module)).map((row) => row.topic))];
  const generated = rows.filter((row) => assetMap.has(assetKey(row)));
  const published = rows.filter((row) => assetMap.get(assetKey(row))?.status === "published");
  const review = rows.filter((row) => assetMap.get(assetKey(row))?.status === "in_review");
  const remaining = rows.length - generated.length;
  const completion = rows.length ? Math.round((generated.length / rows.length) * 100) : 0;

  function toggle(row: CurriculumRow) {
    const key = assetKey(row);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function generateRows(targets: CurriculumRow[], regenerate = false) {
    const eligible = regenerate ? targets : targets.filter((row) => !assetMap.has(assetKey(row)));
    if (!eligible.length) return setNotice("Everything in this selection has already been generated.");
    if (!window.confirm(`Generate ${eligible.length} topic${eligible.length === 1 ? "" : "s"} in ${Math.ceil(eligible.length / 5)} estimated batch${eligible.length > 5 ? "es" : ""}? Existing content will be skipped.`)) return;
    setBusy(true);
    setQueue({ current: 0, total: eligible.length, completed: 0, failed: 0, label: "Starting…" });
    for (let index = 0; index < eligible.length; index += 1) {
      const row = eligible[index];
      setQueue((current) => ({ ...current, current: index + 1, label: row.subtopic }));
      try {
        const generation = await fetch("/api/content-factory/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: {
            course: row.course, module: row.module, topic: row.topic, subtopic: row.subtopic,
            targetAudience: options.targetAudience, difficulty: options.difficulty, explanationDepth: options.depth,
            examContext: `${options.teachingStyle}; output language: ${options.language}; include practice: ${options.practice}; include quiz: ${options.quiz}; include summary: ${options.summary}; include key takeaways: ${options.takeaways}; include real-world applications: ${options.applications}`,
            exampleCount: options.workedExamples ? 3 : options.examples ? 1 : 0,
            mistakeCount: options.mistakes ? 5 : 0, includeMethod: true, includeMemoryAid: true,
            includePlacementTips: options.applications, includeCheckpoints: options.quiz,
          }}),
        });
        const generatedContent = await generation.json();
        if (!generation.ok) throw new Error(generatedContent.error || "Generation failed.");
        const existing = assetMap.get(assetKey(row));
        const save = await fetch(regenerate && existing ? `/api/content-factory/content/${existing.id}` : "/api/content-factory/content", {
          method: regenerate && existing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: generatedContent.content, changeType: "regenerated", changeNote: "Regenerated from syllabus coverage" }),
        });
        if (!save.ok) throw new Error((await save.json()).error || "Draft could not be saved.");
        setQueue((current) => ({ ...current, completed: current.completed + 1 }));
      } catch {
        setQueue((current) => ({ ...current, failed: current.failed + 1 }));
      }
    }
    await load();
    setBusy(false);
    setSelected(new Set());
    setNotice("Generation run finished. New teaching assets were saved as drafts.");
  }

  const selectedRows = filtered.filter((row) => selected.has(assetKey(row)));
  return (
    <div className="space-y-6">
      {notice && <div role="status" className="flex items-center justify-between rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Syllabus topics", rows.length], ["Generated", generated.length], ["Needs review", review.length],
          ["Published", published.length], ["Failed", queue.failed], ["Remaining", remaining],
        ].map(([label, value]) => <div className="glass-card !p-4" key={String(label)}><p className="text-xs text-zinc-500">{label}</p><strong className="mt-2 block text-2xl">{value}</strong></div>)}
      </section>
      <section className="glass-card">
        <div className="flex items-center justify-between gap-4"><div><h3 className="font-semibold">Syllabus coverage</h3><p className="mt-1 text-sm text-zinc-500">{completion}% of active syllabus topics have content</p></div><strong className="text-violet-300">{completion}%</strong></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-all" style={{ width: `${completion}%` }} /></div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="glass-card min-w-0">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-zinc-400">Course<select className="field mt-2" value={course} onChange={(e) => { setCourse(e.target.value); setModule(""); setTopic(""); }}><option value="">All courses</option>{courses.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="text-xs text-zinc-400">Unit / module<select className="field mt-2" value={module} onChange={(e) => { setModule(e.target.value); setTopic(""); }}><option value="">All units</option>{modules.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="text-xs text-zinc-400">Topic<select className="field mt-2" value={topic} onChange={(e) => setTopic(e.target.value)}><option value="">All topics</option>{topics.map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy || !selectedRows.length} onClick={() => void generateRows(selectedRows)}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}{busy ? "Generating…" : `Generate selected (${selectedRows.length})`}</button>
            <button className="btn-ghost border border-white/10" disabled={busy} onClick={() => void generateRows(filtered)}>{busy ? "Generation running…" : "Generate all remaining"}</button>
            <button className="btn-ghost border border-white/10" disabled={busy || selectedRows.length !== 1 || !assetMap.has(assetKey(selectedRows[0]))} onClick={() => void generateRows(selectedRows, true)}><RefreshCw className="size-4" />Regenerate selected</button>
          </div>
          {busy && <div className="mt-5 rounded-xl border border-violet-400/20 bg-violet-500/10 p-4"><div className="flex justify-between text-sm"><span className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" />{queue.label}</span><span>{queue.current}/{queue.total}</span></div><div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${queue.total ? queue.current / queue.total * 100 : 0}%` }} /></div><p className="mt-2 text-xs text-zinc-400">{queue.completed} completed · {queue.failed} failed · {queue.total - queue.current} queued</p></div>}
          <div className="mt-6 max-h-[620px] overflow-auto rounded-xl border border-white/10">
            {filtered.map((row) => {
              const asset = assetMap.get(assetKey(row));
              return <label key={assetKey(row)} className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/5 p-4 last:border-0 hover:bg-white/[.025]">
                <input type="checkbox" checked={selected.has(assetKey(row))} onChange={() => toggle(row)} />
                <span className="min-w-0"><b className="block truncate text-sm">{row.subtopic}</b><small className="mt-1 block truncate text-zinc-500">{row.course} → {row.module} → {row.topic}</small></span>
                <StatusBadge status={asset?.status || "not_generated"} />
              </label>;
            })}
            {!filtered.length && <div className="p-10 text-center text-sm text-zinc-500"><CircleDashed className="mx-auto mb-3 size-7" />No syllabus items match these filters.</div>}
          </div>
        </section>
        <aside className="glass-card h-fit space-y-4">
          <div><h3 className="font-semibold">Generation defaults</h3><p className="mt-1 text-xs text-zinc-500">Applied to this generation run.</p></div>
          {(["teachingStyle","difficulty","targetAudience","language","depth"] as const).map((key) => <label className="block text-xs capitalize text-zinc-400" key={key}>{key.replace(/([A-Z])/g, " $1")}<input className="field mt-2" value={options[key]} onChange={(e) => setOptions({ ...options, [key]: e.target.value })} /></label>)}
          <div className="grid gap-2 pt-2">
            {(["examples","workedExamples","practice","quiz","summary","takeaways","mistakes","applications"] as const).map((key) => <label className="flex items-center gap-2 text-sm text-zinc-300" key={key}><input type="checkbox" checked={options[key]} onChange={(e) => setOptions({ ...options, [key]: e.target.checked })} />Include {key.replace(/([A-Z])/g, " $1").toLowerCase()}</label>)}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const good = ["generated","approved","published"].includes(status);
  const label = status === "draft" ? "Generated" : status === "in_review" ? "Needs review" : status.replaceAll("_", " ");
  const Icon = good ? CheckCircle2 : status === "not_generated" ? CircleDashed : AlertCircle;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] capitalize ${good ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-zinc-400"}`}><Icon className="size-3" />{label}</span>;
}
