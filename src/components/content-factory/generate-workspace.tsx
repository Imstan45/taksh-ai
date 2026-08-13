"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, CircleDashed, LoaderCircle, Play, RefreshCw } from "lucide-react";

type CurriculumRow = { course: string; module: string; topic: string; subtopic: string };
type Asset = { id: string; course: string; module: string; topic: string; subtopic: string; status: string };
type QueueState = { current: number; total: number; completed: number; failed: number; label: string };
type FactoryConfig = { gemini: boolean; supabase: boolean; database: boolean; model?: string };
type FactorySettings = {
  default_model: string;
};

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
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<FactoryConfig>({ gemini: false, supabase: false, database: false });
  const [model, setModel] = useState("Taksh authored engine");

  async function load() {
    const [curriculumResponse, assetResponse, configResponse, settingsResponse] = await Promise.all([
      fetch("/api/content-factory/curriculum?all=true"),
      fetch("/api/content-factory/content"),
      fetch("/api/content-factory/config"),
      fetch("/api/content-factory/settings"),
    ]);
    const curriculum = await curriculumResponse.json();
    const content = await assetResponse.json();
    const configData = await configResponse.json();
    const settingsData = await settingsResponse.json();
    if (!curriculumResponse.ok) throw new Error(curriculum.error || "Unable to load syllabus.");
    if (!assetResponse.ok) throw new Error(content.error || "Unable to load generated content.");
    if (!configResponse.ok) throw new Error(configData.error || "Unable to check Content Factory configuration.");
    if (!settingsResponse.ok) throw new Error(settingsData.error || "Unable to load generation defaults.");
    setRows(curriculum.rows || []);
    setAssets(content.assets || []);
    setConfig(configData);
    const settings = settingsData.settings as FactorySettings | undefined;
    if (settings) {
      setModel("Taksh authored engine");
    }
  }

  useEffect(() => { void load().catch((error) => setNotice(error.message)).finally(() => setLoading(false)); }, []);

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

  async function syncCurriculum() {
    setBusy(true); setNotice("");
    try {
      let cursor=0,created=0,preserved=0,total=0,done=false;
      while(!done){
        setQueue({current:cursor,total:total||65,completed:created+preserved,failed:0,label:"Publishing authored curriculum"});
        const response=await fetch("/api/content-factory/curriculum/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cursor,batchSize:8})});
        const text=await response.text();
        const data=text?JSON.parse(text):{};
        if(!response.ok)throw new Error(data.error||"Curriculum sync failed.");
        cursor=data.nextCursor; total=data.total; created+=data.created; preserved+=data.preserved; done=data.done;
      }
      await load(); setNotice(`${total} lessons synced: ${created} published, ${preserved} existing lessons preserved.`);
    } catch(error){setNotice(error instanceof Error?error.message:"Curriculum sync failed.")} finally {setBusy(false)}
  }

  async function generateRows(targets: CurriculumRow[], regenerate = false) {
    if (!config.supabase || !config.database) {
      setNotice("Authoring is unavailable until Supabase and the content database are ready.");
      return;
    }
    const eligible = regenerate ? targets : targets.filter((row) => !assetMap.has(assetKey(row)));
    if (!eligible.length) return setNotice("Everything in this selection has already been generated.");
    if (!window.confirm(`Generate ${eligible.length} topic${eligible.length === 1 ? "" : "s"} in ${Math.ceil(eligible.length / 5)} estimated batch${eligible.length > 5 ? "es" : ""}? Existing content will be skipped.`)) return;
    setBusy(true);
    setQueue({ current: 0, total: eligible.length, completed: 0, failed: 0, label: "Starting…" });
    const failures: string[] = [];
    for (let index = 0; index < eligible.length; index += 1) {
      const row = eligible[index];
      setQueue((current) => ({ ...current, current: index + 1, label: row.subtopic }));
      try {
        const generation = await fetch("/api/content-factory/authored", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course: row.course, module: row.module, topic: row.topic, subtopic: row.subtopic }),
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
      } catch (error) {
        failures.push(`${row.subtopic}: ${error instanceof Error ? error.message : "Generation failed"}`);
        setQueue((current) => ({ ...current, failed: current.failed + 1 }));
      }
    }
    try { await load(); } catch (error) { failures.push(error instanceof Error ? error.message : "Unable to refresh the library"); }
    setBusy(false);
    if (!failures.length) setSelected(new Set());
    setNotice(failures.length
      ? `${eligible.length - failures.length} generated, ${failures.length} failed. ${failures.slice(0, 3).join(" | ")}`
      : `${eligible.length} teaching asset${eligible.length === 1 ? " was" : "s were"} generated and saved as drafts.`);
  }

  const selectedRows = filtered.filter((row) => selected.has(assetKey(row)));
  return (
    <div className="space-y-6">
      {notice && <div role="status" className="flex items-center justify-between rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
      {!loading && (!config.supabase || !config.database) && <div role="alert" className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Content Factory needs a working Supabase content database. Gemini is no longer required.</div>}
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
            <button className="btn-ghost border border-white/10" disabled={busy} onClick={()=>void syncCurriculum()}><RefreshCw className="size-4"/>Sync complete curriculum</button>
            <button className="btn-primary" disabled={loading || busy || !selectedRows.length} onClick={() => void generateRows(selectedRows)}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}{loading ? "Loading…" : busy ? "Generating…" : `Generate selected (${selectedRows.length})`}</button>
            <button className="btn-ghost border border-white/10" disabled={loading || busy || !filtered.length} onClick={() => void generateRows(filtered)}>{busy ? "Generation running…" : "Generate all remaining"}</button>
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
          <div><h3 className="font-semibold">Authored lesson recipe</h3><p className="mt-1 text-xs text-zinc-500">Fast, deterministic and reviewable · {model}</p></div>
          <ul className="space-y-3 text-sm text-zinc-300"><li>Compact 8–12 minute lesson</li><li>Concept, rules and method cards</li><li>Worked example with answer reveal</li><li>Common mistake and speed tip</li><li>Checkpoint and one-minute revision</li><li>Automatic mobile presentation</li></ul>
          <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-200">No AI key, prompt tuning or model wait is required. Every syllabus item produces the same reviewed Taksh structure.</p>
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
