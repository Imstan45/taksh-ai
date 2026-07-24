"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck, TestTube2 } from "lucide-react";

type Config = { gemini: boolean; supabase: boolean; database: boolean; model?: string };

export function SettingsWorkspace() {
  const [config, setConfig] = useState<Config>({ gemini: false, supabase: false, database: false });
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ connected: boolean; model: string; responseTime: number; message?: string } | null>(null);
  const [settings, setSettings] = useState({
    default_model: "gemini-3.6-flash", default_teaching_style: "Concept-first and practical",
    default_difficulty: "Intermediate", default_language: "English", default_content_depth: "Detailed",
    default_batch_size: 5, auto_save_drafts: true, require_manual_approval: true,
  });
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void fetch("/api/content-factory/config").then((r) => r.json()).then(setConfig);
    void fetch("/api/content-factory/settings").then((r) => r.json()).then((data) => data.settings && setSettings(data.settings));
  }, []);
  async function test() {
    setTesting(true);
    const response = await fetch("/api/content-factory/config/test", { method: "POST" });
    setResult(await response.json());
    setTesting(false);
  }
  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch("/api/content-factory/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const data = await response.json();
      setSaved(response.ok ? "Defaults saved successfully." : data.error || "Settings could not be saved.");
    } catch { setSaved("Settings could not be saved. Please try again."); }
    finally { setSaving(false); }
  }
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
    <section className="glass-card">
      <div className="flex items-start gap-4"><div className="rounded-xl bg-violet-500/15 p-3"><ShieldCheck className="size-6 text-violet-300" /></div><div><h3 className="text-xl font-semibold">Gemini Integration</h3><p className="mt-1 text-sm text-zinc-500">Secure server-side generation through the Vercel environment.</p></div></div>
      <dl className="mt-7 grid gap-4 sm:grid-cols-2">
        <Setting label="Status" value={config.gemini ? "Connected" : "Not configured"} good={config.gemini} />
        <Setting label="Environment" value="Vercel environment" />
        <Setting label="API key" value="••••••••••••••••" />
        <Setting label="Model" value={config.model || "gemini-3.6-flash"} />
        <Setting label="Supabase" value={config.supabase ? "Connected" : "Not configured"} good={config.supabase} />
        <Setting label="Content database" value={config.database ? "Ready" : "Unavailable"} good={config.database} />
      </dl>
      <div className="mt-7 flex flex-wrap items-center gap-3"><button className="btn-primary" disabled={testing} onClick={() => void test()}>{testing ? <LoaderCircle className="size-4 animate-spin" /> : <TestTube2 className="size-4" />}Test connection</button>{result && <p role="status" className={`text-sm ${result.connected ? "text-emerald-300" : "text-red-300"}`}>{result.connected ? `Connected to ${result.model} in ${result.responseTime} ms` : result.message || "Connection failed"}</p>}</div>
    </section>
    <aside className="glass-card h-fit space-y-4">
      <h3 className="font-semibold">Generation defaults</h3>
      <p className="text-sm leading-6 text-zinc-500">Stored in Supabase. Credentials remain deployment-owned.</p>
      <label className="block text-xs text-zinc-400">Model<select className="field mt-2" value={settings.default_model} onChange={(e) => setSettings({ ...settings, default_model: e.target.value })}><option value="gemini-3.6-flash">Gemini 3.6 Flash</option><option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</option><option value="gemini-flash-latest">Gemini Flash Latest</option></select></label>
      {(["default_teaching_style","default_difficulty","default_language","default_content_depth"] as const).map((key) => <label className="block text-xs capitalize text-zinc-400" key={key}>{key.replaceAll("_"," ")}<input className="field mt-2" value={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} /></label>)}
      <label className="block text-xs text-zinc-400">Default batch size<input className="field mt-2" type="number" min="1" max="25" value={settings.default_batch_size} onChange={(e) => setSettings({ ...settings, default_batch_size: Number(e.target.value) })} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.auto_save_drafts} onChange={(e) => setSettings({ ...settings, auto_save_drafts: e.target.checked })} />Auto-save generated drafts</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.require_manual_approval} onChange={(e) => setSettings({ ...settings, require_manual_approval: e.target.checked })} />Require manual approval</label>
      <button className="btn-primary w-full" disabled={saving} onClick={() => void saveSettings()}>{saving && <LoaderCircle className="size-4 animate-spin" />}{saving ? "Saving defaults…" : "Save defaults"}</button>
      {saved && <p className="text-xs text-violet-200">{saved}</p>}
    </aside>
  </div>;
}

function Setting({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return <div className="rounded-xl border border-white/10 bg-black/10 p-4"><dt className="text-xs text-zinc-500">{label}</dt><dd className={`mt-2 font-medium ${good ? "text-emerald-300" : ""}`}>{value}</dd></div>;
}
