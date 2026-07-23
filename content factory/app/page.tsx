"use client";

import { useEffect, useMemo, useState } from "react";

type AssetStatus = "draft" | "in_review" | "approved" | "published" | "archived";
type AssetRecord = {
  id: string;
  course: string;
  module: string;
  topic: string;
  subtopic: string;
  title: string;
  difficulty: string;
  status: AssetStatus;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type FormState = {
  course: string;
  module: string;
  topic: string;
  subtopic: string;
  targetAudience: string;
  difficulty: string;
  explanationDepth: string;
  examContext: string;
  exampleCount: number;
  mistakeCount: number;
  includeMethod: boolean;
  includeMemoryAid: boolean;
  includePlacementTips: boolean;
  includeCheckpoints: boolean;
  sourceName: string;
  sourceAuthor: string;
  sourcePublisher: string;
  sourceEdition: string;
  sourceType: string;
  sourceNotes: string;
  additionalInstructions: string;
};

const initialForm: FormState = {
  course: "Logical Reasoning",
  module: "Analytical Reasoning",
  topic: "Direction Sense",
  subtopic: "Distance and final direction",
  targetAudience: "Undergraduate students preparing for placements",
  difficulty: "Intermediate",
  explanationDepth: "Comprehensive",
  examContext: "Campus placement aptitude tests",
  exampleCount: 3,
  mistakeCount: 4,
  includeMethod: true,
  includeMemoryAid: true,
  includePlacementTips: true,
  includeCheckpoints: true,
  sourceName: "",
  sourceAuthor: "",
  sourcePublisher: "",
  sourceEdition: "",
  sourceType: "Administrator notes",
  sourceNotes: "",
  additionalInstructions: "",
};

const previewSections = [
  ["learning_design", "Learning design", "Objectives, prerequisites and study time"],
  ["core_content", "Core content", "Definition, explanation and key terms"],
  ["principles", "Principles", "Rules and important distinctions"],
  ["application_method", "Application method", "A reliable solving strategy"],
  ["worked_examples", "Worked examples", "Original, step-by-step examples"],
  ["common_mistakes", "Common mistakes", "Misconceptions and corrections"],
  ["checkpoint_questions", "Checkpoints", "Questions, answers and explanations"],
  ["remediation", "Remediation", "A simpler route through the concept"],
  ["revision_asset", "Revision asset", "Summary and one-minute review"],
] as const;

function sampleAsset(form: FormState) {
  return {
    identity: {
      course: form.course,
      module: form.module,
      topic: form.topic,
      subtopic: form.subtopic,
      title: form.subtopic,
      slug: form.subtopic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      target_audience: form.targetAudience,
      difficulty: form.difficulty,
      explanation_depth: form.explanationDepth,
      exam_context: form.examContext,
    },
    learning_design: {
      learning_objectives: [
        { objective_id: "LO1", objective: `Identify the information needed to solve ${form.subtopic}.`, skill_level: "identify" },
        { objective_id: "LO2", objective: `Apply a reliable method to solve ${form.subtopic} questions.`, skill_level: "apply" },
      ],
      prerequisites: [{ title: "Foundation knowledge", description: `Basic familiarity with ${form.topic}.`, importance: "Supports accurate application." }],
      estimated_learning_minutes: 30,
    },
    core_content: {
      introduction: `This preview shows how a complete teaching asset for ${form.subtopic} will be organised.`,
      canonical_definition: `Connect a Gemini API key and select Generate asset to create the full academically grounded definition.`,
      why_it_matters: `The concept supports success in ${form.examContext}.`,
      concept_explanation: "The generated version will contain an independent, reusable explanation at the selected depth.",
      key_terms: [{ term: form.subtopic, definition: "Generated with the complete canonical prompt.", example: "A subject-specific example will appear here." }],
    },
    principles: { rules: [], important_distinctions: [] },
    application_method: { method_title: "Structured solving method", method_overview: "Generated when connected.", steps: [], use_when: "", do_not_use_when: "", faster_method: null },
    worked_examples: [],
    usage_comparisons: [],
    common_mistakes: [],
    memory_support: { memory_aid: "", mental_model: "", quick_recall_note: "" },
    placement_support: { question_identification_signals: [], time_management_tip: "", exam_traps: [], interview_relevance: "" },
    checkpoint_questions: [],
    remediation: { likely_confusion: "", simplified_explanation: "", simple_example: "", prerequisite_to_review: "", next_recommended_step: "" },
    revision_asset: { summary: `Revision preview for ${form.subtopic}.`, key_points: [], one_minute_revision: "", final_checklist: [] },
    quality_metadata: {
      content_origin: "original_ai_draft",
      review_status: "pending_human_review",
      copyright_review_status: "pending",
      prompt_version: "taksh-content-master-v1",
      generated_by: "gemini",
      sections_not_applicable: [],
    },
  };
}

export default function Home() {
  const [screen, setScreen] = useState<"create" | "library" | "settings">("create");
  const [form, setForm] = useState(initialForm);
  const [apiKey, setApiKey] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [model, setModel] = useState("gemini-3.6-flash");
  const [generationMode, setGenerationMode] = useState<"batch" | "single">("batch");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [activeSection, setActiveSection] = useState("core_content");
  const [view, setView] = useState<"structured" | "json">("structured");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [config, setConfig] = useState({ gemini: false, supabase: false });
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jsonDraft, setJsonDraft] = useState("");
  const [regenerationInstruction, setRegenerationInstruction] = useState("");
  const [curriculum, setCurriculum] = useState({
    courses: [initialForm.course],
    modules: [initialForm.module],
    topics: [initialForm.topic],
    subtopics: [initialForm.subtopic],
  });
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, completed: 0, failed: 0, label: "" });

  useEffect(() => {
    const savedGemini = localStorage.getItem("taksh_gemini_key") || "";
    const savedUrl = localStorage.getItem("taksh_supabase_url") || "";
    const savedAnonKey = localStorage.getItem("taksh_supabase_anon_key") || "";
    setApiKey(savedGemini);
    setSupabaseUrl(savedUrl);
    setSupabaseAnonKey(savedAnonKey);
    void loadConfiguration(savedGemini, savedUrl, savedAnonKey);
    void loadAssets("", "all", savedUrl, savedAnonKey);
    void loadCurriculum(initialForm.course, initialForm.module, initialForm.topic, savedUrl, savedAnonKey);
  }, []);

  function supabaseHeaders(url = supabaseUrl, key = supabaseAnonKey) {
    return url && key ? { "x-supabase-url": url, "x-supabase-key": key } : {};
  }

  async function loadCurriculum(course = "", module = "", topic = "", url = supabaseUrl, key = supabaseAnonKey) {
    setCurriculumLoading(true);
    try {
      const params = new URLSearchParams();
      if (course) params.set("course", course);
      if (module) params.set("module", module);
      if (topic) params.set("topic", topic);
      const response = await fetch(`/api/curriculum?${params}`, { headers: supabaseHeaders(url, key) });
      const data = await response.json();
      if (response.ok && data.configured && data.courses?.length) {
        setCurriculum({
          courses: data.courses,
          modules: data.modules,
          topics: data.topics,
          subtopics: data.subtopics,
        });
      }
    } finally {
      setCurriculumLoading(false);
    }
  }

  function chooseCourse(course: string) {
    setForm((current) => ({ ...current, course, module: "", topic: "", subtopic: "" }));
    void loadCurriculum(course, "", "");
  }

  function chooseModule(module: string) {
    setForm((current) => ({ ...current, module, topic: "", subtopic: "" }));
    void loadCurriculum(form.course, module, "");
  }

  function chooseTopic(topic: string) {
    setForm((current) => ({ ...current, topic, subtopic: "" }));
    void loadCurriculum(form.course, form.module, topic);
  }

  async function loadConfiguration(gemini = apiKey, url = supabaseUrl, key = supabaseAnonKey) {
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const environment = await response.json();
        setConfig({
          gemini: environment.gemini || Boolean(gemini),
          supabase: environment.supabase || Boolean(url && key),
        });
      }
    } catch {
      // The connection indicators remain off when configuration cannot be read.
    }
  }

  async function loadAssets(nextSearch = search, nextStatus = statusFilter, url = supabaseUrl, key = supabaseAnonKey) {
    try {
      const params = new URLSearchParams();
      if (nextSearch) params.set("search", nextSearch);
      if (nextStatus !== "all") params.set("status", nextStatus);
      const response = await fetch(`/api/content?${params}`, { headers: supabaseHeaders(url, key) });
      const data = await response.json();
      if (response.ok) setAssets(data.assets || []);
    } catch {
      // An unconfigured Supabase project should not block local generation.
    }
  }

  const progress = useMemo(() => {
    const required = [form.course, form.module, form.topic, form.subtopic, form.targetAudience, form.examContext];
    return Math.round((required.filter(Boolean).length / required.length) * 100);
  }, [form]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generate() {
    if (!config.gemini && !apiKey.trim()) {
      setError("Gemini is not connected. Add GEMINI_API_KEY in Settings or use a temporary key below.");
      return;
    }
    if (!form.course || !form.module || !form.topic || !form.subtopic) {
      setError("Complete the course hierarchy before generating.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, model, input: form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed.");
      setResult(data.content);
      setJsonDraft(JSON.stringify(data.content, null, 2));
      setActiveSection("core_content");
      if (config.supabase) {
        const saveResponse = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...supabaseHeaders() },
          body: JSON.stringify({ content: data.content, status: "draft" }),
        });
        const saved = await saveResponse.json();
        if (saveResponse.ok) {
          setSelectedAsset(saved.asset);
          setNotice("Generated and saved to the content library as a draft.");
          await loadAssets();
        } else {
          setNotice("Generated successfully, but could not be saved to Supabase.");
        }
      } else {
        setNotice("Generated successfully. Connect Supabase to save it permanently.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runCurriculumLoop() {
    if (!config.gemini && !apiKey.trim()) {
      setError("Gemini is not connected. Add GEMINI_API_KEY in Settings.");
      return;
    }
    if (!config.supabase) {
      setError("Supabase must be connected so each generated asset can be saved before the loop continues.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const curriculumResponse = await fetch("/api/curriculum?all=true", { headers: supabaseHeaders() });
      const curriculumData = await curriculumResponse.json();
      if (!curriculumResponse.ok) throw new Error(curriculumData.error || "Could not load the curriculum.");
      const rows = (curriculumData.rows || []) as Array<{ course: string; module: string; topic: string; subtopic: string }>;
      if (!rows.length) throw new Error("No active curriculum rows were found in Supabase.");

      const existing = new Set(assets.map((asset) => [asset.course, asset.module, asset.topic, asset.subtopic].join("|||")));
      let completed = 0;
      let failed = 0;
      setBatchProgress({ current: 0, total: rows.length, completed, failed, label: "Preparing curriculum run" });

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const key = [row.course, row.module, row.topic, row.subtopic].join("|||");
        if (existing.has(key)) {
          completed += 1;
          setBatchProgress({ current: index + 1, total: rows.length, completed, failed, label: `Skipped existing: ${row.subtopic}` });
          continue;
        }
        setBatchProgress({ current: index + 1, total: rows.length, completed, failed, label: `${row.topic} → ${row.subtopic}` });
        try {
          const generationResponse = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey, model, input: { ...form, ...row } }),
          });
          const generated = await generationResponse.json();
          if (!generationResponse.ok) throw new Error(generated.error || "Generation failed.");
          const saveResponse = await fetch("/api/content", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...supabaseHeaders() },
            body: JSON.stringify({ content: generated.content, status: "draft" }),
          });
          const saved = await saveResponse.json();
          if (!saveResponse.ok) throw new Error(saved.error || "Saving failed.");
          completed += 1;
          existing.add(key);
          setResult(generated.content);
          setJsonDraft(JSON.stringify(generated.content, null, 2));
          setSelectedAsset(saved.asset);
        } catch {
          failed += 1;
        }
        setBatchProgress({ current: index + 1, total: rows.length, completed, failed, label: `${row.topic} → ${row.subtopic}` });
      }
      await loadAssets();
      setNotice(`Curriculum run finished: ${completed} completed or already present, ${failed} failed.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Curriculum run failed.");
    } finally {
      setBusy(false);
    }
  }

  function loadPreview() {
    const sample = sampleAsset(form);
    setResult(sample);
    setJsonDraft(JSON.stringify(sample, null, 2));
    setError("");
  }

  function openAsset(asset: AssetRecord) {
    setSelectedAsset(asset);
    setResult(asset.content);
    setJsonDraft(JSON.stringify(asset.content, null, 2));
    setForm((current) => ({
      ...current,
      course: asset.course,
      module: asset.module,
      topic: asset.topic,
      subtopic: asset.subtopic,
      difficulty: asset.difficulty,
      targetAudience: String((asset.content.identity as any)?.target_audience || current.targetAudience),
      explanationDepth: String((asset.content.identity as any)?.explanation_depth || current.explanationDepth),
      examContext: String((asset.content.identity as any)?.exam_context || current.examContext),
    }));
    setScreen("create");
    setNotice(`Opened “${asset.title}” from the library.`);
  }

  async function saveAsset(status?: AssetStatus) {
    if (!selectedAsset) {
      setError("Generate and save an asset before updating it.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let content = result;
      if (view === "json") {
        try {
          content = JSON.parse(jsonDraft);
          setResult(content);
        } catch {
          throw new Error("The edited JSON is invalid. Correct it before saving.");
        }
      }
      const response = await fetch(`/api/content/${selectedAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...supabaseHeaders() },
        body: JSON.stringify({
          content,
          status: status || selectedAsset.status,
          changeType: status ? "status_changed" : "edited",
          changeNote: status ? `Status changed to ${status}` : "Academic content edited",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed.");
      setSelectedAsset(data.asset);
      setNotice(status ? `Asset moved to ${status.replace("_", " ")}.` : "Changes saved as a new version.");
      await loadAssets();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function regenerateSection() {
    if (!result || !activeSection) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          model,
          selectedSection: activeSection,
          regenerationInstruction,
          existingContentJson: result,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Section regeneration failed.");
      const updated = { ...result, [activeSection]: data.section };
      setResult(updated);
      setJsonDraft(JSON.stringify(updated, null, 2));
      setNotice(`${activeSection.replace(/_/g, " ")} regenerated. Review it, then save.`);
      setRegenerationInstruction("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Section regeneration failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form.subtopic.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "taksh-content"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveConnections() {
    const cleanUrl = supabaseUrl.trim().replace(/\/$/, "");
    const cleanAnonKey = supabaseAnonKey.trim();
    const cleanGemini = apiKey.trim();
    setSupabaseUrl(cleanUrl);
    setSupabaseAnonKey(cleanAnonKey);
    setApiKey(cleanGemini);
    localStorage.setItem("taksh_gemini_key", cleanGemini);
    localStorage.setItem("taksh_supabase_url", cleanUrl);
    localStorage.setItem("taksh_supabase_anon_key", cleanAnonKey);
    setConfig({ gemini: Boolean(cleanGemini), supabase: Boolean(cleanUrl && cleanAnonKey) });
    setNotice("Connections saved in this browser. Checking Supabase curriculum…");
    await Promise.all([
      loadAssets("", "all", cleanUrl, cleanAnonKey),
      loadCurriculum(initialForm.course, initialForm.module, initialForm.topic, cleanUrl, cleanAnonKey),
    ]);
    setScreen("create");
  }

  function clearConnections() {
    localStorage.removeItem("taksh_gemini_key");
    localStorage.removeItem("taksh_supabase_url");
    localStorage.removeItem("taksh_supabase_anon_key");
    setApiKey("");
    setSupabaseUrl("");
    setSupabaseAnonKey("");
    setConfig({ gemini: false, supabase: false });
    setAssets([]);
    setNotice("Saved browser connections removed.");
  }

  const selectedContent = result?.[activeSection];

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Taksh Content Factory home">
          <span className="brand-mark">T</span>
          <span>Taksh <b>Content Factory</b></span>
        </a>
        <nav className="main-nav" aria-label="Primary navigation">
          <button className={screen === "create" ? "active" : ""} onClick={() => setScreen("create")}>Create</button>
          <button className={screen === "library" ? "active" : ""} onClick={() => { setScreen("library"); void loadAssets(); }}>Library <span>{assets.length}</span></button>
          <button className={screen === "settings" ? "active" : ""} onClick={() => setScreen("settings")}>Settings</button>
        </nav>
        <div className="header-meta">
          <span className={`status-dot ${config.gemini && config.supabase ? "connected" : ""}`}><i /> {config.gemini && config.supabase ? "Connected" : "Setup required"}</span>
          <div className="avatar">SA</div>
        </div>
      </header>

      {screen === "create" && <>
      <section className="hero">
        <div>
          <p className="eyebrow">Academic asset builder</p>
          <h1>Build knowledge that<br /><em>keeps teaching.</em></h1>
          <p className="hero-copy">Create original, structured teaching assets that can power lessons, revision, practice and assessment.</p>
        </div>
        <div className="hero-note">
          <span className="spark">✦</span>
          <div><b>Canonical by design</b><p>Every output follows the permanent Taksh academic framework.</p></div>
        </div>
      </section>
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}

      <div className="workspace">
        <aside className="builder">
          <div className="panel-heading">
            <div><span className="step">01</span><h2>Define the lesson</h2></div>
            <span className="completion">{progress}% complete</span>
          </div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>

          <fieldset>
            <legend>Generation mode</legend>
            <div className="mode-switch">
              <button className={generationMode === "batch" ? "active" : ""} onClick={() => setGenerationMode("batch")}><b>Curriculum loop</b><small>Generate every stored subtopic automatically</small></button>
              <button className={generationMode === "single" ? "active" : ""} onClick={() => setGenerationMode("single")}><b>Single asset</b><small>Generate or test one selected subtopic</small></button>
            </div>
          </fieldset>

          {generationMode === "single" ? <fieldset>
            <legend>Curriculum hierarchy</legend>
            <div className="curriculum-path">
              <span className={form.course ? "done" : "active"}>1</span><i />
              <span className={form.module ? "done" : form.course ? "active" : ""}>2</span><i />
              <span className={form.topic ? "done" : form.module ? "active" : ""}>3</span><i />
              <span className={form.subtopic ? "done" : form.topic ? "active" : ""}>4</span>
            </div>
            <label>1. Course<select value={form.course} onChange={(e) => chooseCourse(e.target.value)} disabled={curriculumLoading}>
              <option value="">Select a course</option>{curriculum.courses.map((item) => <option key={item}>{item}</option>)}
            </select></label>
            <label>2. Module<select value={form.module} onChange={(e) => chooseModule(e.target.value)} disabled={!form.course || curriculumLoading}>
              <option value="">Select a module</option>{curriculum.modules.map((item) => <option key={item}>{item}</option>)}
            </select></label>
            <div className="field-row">
              <label>3. Topic<select value={form.topic} onChange={(e) => chooseTopic(e.target.value)} disabled={!form.module || curriculumLoading}>
                <option value="">Select a topic</option>{curriculum.topics.map((item) => <option key={item}>{item}</option>)}
              </select></label>
              <label>4. Subtopic<select value={form.subtopic} onChange={(e) => setField("subtopic", e.target.value)} disabled={!form.topic || curriculumLoading}>
                <option value="">Select a subtopic</option>{curriculum.subtopics.map((item) => <option key={item}>{item}</option>)}
              </select></label>
            </div>
            <p className="field-help">Each selection filters the next level. The hierarchy is managed once in Supabase.</p>
          </fieldset> : <div className="loop-summary">
            <span className="loop-icon">↻</span>
            <div><b>Automatic curriculum run</b><p>The app loads every active hierarchy row from Supabase, generates its complete teaching asset, saves it, then continues to the next subtopic. Existing assets are skipped.</p></div>
          </div>}

          <fieldset>
            <legend>Learner & context</legend>
            <label>Target audience<input value={form.targetAudience} onChange={(e) => setField("targetAudience", e.target.value)} /></label>
            <div className="field-row">
              <label>Difficulty<select value={form.difficulty} onChange={(e) => setField("difficulty", e.target.value)}><option>Foundation</option><option>Intermediate</option><option>Advanced</option></select></label>
              <label>Depth<select value={form.explanationDepth} onChange={(e) => setField("explanationDepth", e.target.value)}><option>Concise</option><option>Standard</option><option>Comprehensive</option></select></label>
            </div>
            <label>Placement or examination context<input value={form.examContext} onChange={(e) => setField("examContext", e.target.value)} /></label>
          </fieldset>

          <fieldset>
            <legend>Asset composition</legend>
            <div className="field-row">
              <label>Worked examples<input type="number" min="1" max="10" value={form.exampleCount} onChange={(e) => setField("exampleCount", Number(e.target.value))} /></label>
              <label>Common mistakes<input type="number" min="1" max="10" value={form.mistakeCount} onChange={(e) => setField("mistakeCount", Number(e.target.value))} /></label>
            </div>
            <div className="checks">
              {([
                ["includeMethod", "Solving method"],
                ["includeMemoryAid", "Memory aid"],
                ["includePlacementTips", "Placement tips"],
                ["includeCheckpoints", "Checkpoint questions"],
              ] as const).map(([key, label]) => (
                <label className="check" key={key}><input type="checkbox" checked={form[key]} onChange={(e) => setField(key, e.target.checked)} /><span>{label}</span></label>
              ))}
            </div>
          </fieldset>

          <details>
            <summary>Reference material & administrator notes <span>Optional</span></summary>
            <div className="details-body">
              <div className="field-row">
                <label>Source name<input value={form.sourceName} onChange={(e) => setField("sourceName", e.target.value)} /></label>
                <label>Author<input value={form.sourceAuthor} onChange={(e) => setField("sourceAuthor", e.target.value)} /></label>
              </div>
              <label>Reference notes<textarea value={form.sourceNotes} onChange={(e) => setField("sourceNotes", e.target.value)} placeholder="Coverage guidance only — source wording will not be reproduced." /></label>
              <label>Additional instructions<textarea value={form.additionalInstructions} onChange={(e) => setField("additionalInstructions", e.target.value)} /></label>
            </div>
          </details>

          <fieldset className="connection">
            <legend>Gemini connection</legend>
            {config.gemini ? <p className="connected-copy">● Gemini API is connected through the web app settings.</p> : <p>Open Settings and paste your Gemini API key.</p>}
              <label>Model<select value={model} onChange={(e) => setModel(e.target.value)}><option value="gemini-3.6-flash">Gemini 3.6 Flash — recommended</option><option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite — lower cost</option><option value="gemini-flash-latest">Gemini Flash Latest — rolling alias</option></select></label>
          </fieldset>

          {error && <div className="error" role="alert">{error}</div>}
          {busy && generationMode === "batch" && batchProgress.total > 0 && <div className="batch-status">
            <div><b>{batchProgress.current} / {batchProgress.total}</b><span>{batchProgress.label}</span></div>
            <div className="batch-bar"><i style={{ width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%` }} /></div>
            <small>{batchProgress.completed} completed · {batchProgress.failed} failed</small>
          </div>}
          <div className="actions">
            <button className="secondary" onClick={loadPreview}>Load sample</button>
            <button className="primary" onClick={generationMode === "batch" ? runCurriculumLoop : generate} disabled={busy}>{busy ? <><span className="spinner" />{generationMode === "batch" ? "Running curriculum…" : "Creating asset…"}</> : <>{generationMode === "batch" ? "Generate full curriculum" : "Generate teaching asset"} <span>→</span></>}</button>
          </div>
        </aside>

        <section className="preview">
          <div className="preview-top">
            <div>
              <span className="step dark">02</span>
              <div><p className="eyebrow">Structured output</p><h2>{result ? form.subtopic : "Your teaching asset"}</h2></div>
            </div>
            {result && <button className="download" onClick={downloadJson}>↓ Export JSON</button>}
          </div>

          {!result ? (
            <div className="empty">
              <div className="orb"><span>✦</span></div>
              <h3>Ready when you are.</h3>
              <p>Complete the lesson definition, connect Gemini and generate a reusable academic asset.</p>
              <div className="schema-chips"><span>Objectives</span><span>Principles</span><span>Examples</span><span>Checkpoints</span><span>Revision</span></div>
              <button onClick={loadPreview}>Explore with sample data</button>
            </div>
          ) : (
            <div className="result">
              <div className="result-tabs">
                <button className={view === "structured" ? "active" : ""} onClick={() => setView("structured")}>Structured view</button>
                <button className={view === "json" ? "active" : ""} onClick={() => setView("json")}>JSON</button>
                <span className="review-badge">{selectedAsset?.status?.replace("_", " ") || "unsaved draft"}</span>
              </div>
              {view === "json" ? (
                <textarea className="json-editor" value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} aria-label="Editable content JSON" />
              ) : (
                <div className="structured">
                  <nav>
                    {previewSections.map(([key, label, description]) => (
                      <button key={key} className={activeSection === key ? "active" : ""} onClick={() => setActiveSection(key)}>
                        <span>{label}</span><small>{description}</small>
                      </button>
                    ))}
                  </nav>
                  <article>
                    <div className="article-label">{previewSections.find(([key]) => key === activeSection)?.[1]}</div>
                    <JsonContent value={selectedContent} />
                    <div className="regenerate-box">
                      <label>Regeneration instruction<textarea value={regenerationInstruction} onChange={(event) => setRegenerationInstruction(event.target.value)} placeholder="Optional: explain what should be improved in this section." /></label>
                      <button onClick={regenerateSection} disabled={busy}>↻ Regenerate this section</button>
                    </div>
                  </article>
                </div>
              )}
              {selectedAsset && <div className="review-actions">
                <button onClick={() => saveAsset()} disabled={busy}>Save new version</button>
                <button onClick={() => saveAsset("in_review")} disabled={busy}>Send for review</button>
                <button onClick={() => saveAsset("approved")} disabled={busy}>Approve</button>
                <button className="publish-action" onClick={() => saveAsset("published")} disabled={busy}>Publish content</button>
              </div>}
            </div>
          )}
        </section>
      </div>
      </>}

      {screen === "library" && <section className="library-page">
        <div className="page-title">
          <div><p className="eyebrow">Canonical knowledge base</p><h1>Content library</h1><p>Search, review and manage every generated teaching asset.</p></div>
          <button className="primary compact" onClick={() => setScreen("create")}>+ New teaching asset</button>
        </div>
        <div className="library-toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && loadAssets()} placeholder="Search course, topic or subtopic…" />
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); void loadAssets(search, event.target.value); }}>
            <option value="all">All statuses</option><option value="draft">Draft</option><option value="in_review">In review</option><option value="approved">Approved</option><option value="published">Published</option><option value="archived">Archived</option>
          </select>
          <button onClick={() => loadAssets()}>Search</button>
        </div>
        {!config.supabase ? <div className="setup-empty"><b>Connect Supabase to activate the library.</b><p>Open Settings for the required environment variables and database setup.</p><button onClick={() => setScreen("settings")}>Open Settings</button></div> :
        assets.length === 0 ? <div className="setup-empty"><b>No assets found.</b><p>Generate your first teaching asset or adjust the filters.</p></div> :
        <div className="asset-table">
          <div className="asset-row asset-head"><span>Teaching asset</span><span>Hierarchy</span><span>Difficulty</span><span>Status</span><span>Updated</span></div>
          {assets.map((asset) => <button className="asset-row" key={asset.id} onClick={() => openAsset(asset)}>
            <span><b>{asset.title}</b><small>{asset.subtopic}</small></span>
            <span>{asset.course}<small>{asset.module} · {asset.topic}</small></span>
            <span>{asset.difficulty}</span>
            <span><i className={`status-pill ${asset.status}`}>{asset.status.replace("_", " ")}</i></span>
            <span>{new Date(asset.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
          </button>)}
        </div>}
      </section>}

      {screen === "settings" && <section className="settings-page">
        <div className="page-title"><div><p className="eyebrow">Application setup</p><h1>Connections</h1><p>Add these values to the app environment. Secrets never appear in generated content.</p></div></div>
        <div className="settings-grid">
          <article><div className={`connection-icon ${config.gemini ? "ok" : ""}`}>G</div><div className="connection-form"><h2>Gemini API</h2><p>Powers full asset generation and focused section regeneration.</p><label>Gemini API key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste Gemini API key" autoComplete="off" /></label><span className="connection-state">{config.gemini ? "● Saved in this browser" : "○ Not configured"}</span></div></article>
          <article><div className={`connection-icon ${config.supabase ? "ok" : ""}`}>S</div><div className="connection-form"><h2>Supabase</h2><p>Stores canonical assets, review states and immutable version history.</p><label>Supabase project URL<input value={supabaseUrl} onChange={(event) => setSupabaseUrl(event.target.value)} placeholder="https://your-project.supabase.co" /></label><label>Supabase anon key<input type="password" value={supabaseAnonKey} onChange={(event) => setSupabaseAnonKey(event.target.value)} placeholder="Paste anon key" autoComplete="off" /></label><span className="connection-state">{config.supabase ? "● Saved in this browser" : "○ Not configured"}</span></div></article>
        </div>
        <div className="connection-actions"><button className="secondary" onClick={clearConnections}>Clear saved values</button><button className="primary" onClick={saveConnections}>Save & connect <span>→</span></button></div>
        <div className="setup-guide">
          <span className="step">01</span><div><h3>Create the Supabase tables</h3><p>Run the included <code>supabase/schema.sql</code> file once in the Supabase SQL editor. It also creates the cascading curriculum table and starter hierarchy.</p></div>
          <span className="step">02</span><div><h3>Paste the three connection values above</h3><p>Choose “Save & connect”. The values stay only in this browser’s local storage and are not written into the source files.</p></div>
          <span className="step">03</span><div><h3>Start the curriculum loop</h3><p>Return to Create and select “Generate full curriculum”. Each completed asset will automatically appear in the library.</p></div>
        </div>
        <div className="security-note"><b>Deployment note</b><p>The supplied anon-key policies are intended for this private admin app. If the app becomes public, add Supabase authentication and user-based RLS before exposing it.</p></div>
      </section>}
      <footer><span>Taksh AI · Content Factory</span><span>Original AI draft · Human review required</span></footer>
    </main>
  );
}

function JsonContent({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <p className="muted">Not applicable to this asset.</p>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return <p>{String(value)}</p>;
  if (Array.isArray(value)) {
    if (!value.length) return <p className="muted">This sample section will be completed by Gemini during generation.</p>;
    return <div className="cards">{value.map((item, index) => <div className="content-card" key={index}><JsonContent value={item} /></div>)}</div>;
  }
  return <div>{Object.entries(value as Record<string, unknown>).map(([key, item]) => (
    <section className="content-block" key={key}>
      <h3>{key.replace(/_/g, " ")}</h3>
      <JsonContent value={item} />
    </section>
  ))}</div>;
}
