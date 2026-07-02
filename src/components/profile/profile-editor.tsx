"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, Award, BookOpen, BriefcaseBusiness, Check, Code2, FileText, LoaderCircle, Plus, Save, Target, Trash2, UserRound } from "lucide-react";

type Row = Record<string, string | number | null | string[]>;
type Profile = {
  phone: string | null; dateOfBirth: string | null; location: string | null; bio: string | null;
  linkedInUrl: string | null; githubUrl: string | null; portfolioUrl: string | null;
  careerGoal: string | null; targetRoles: string[]; targetCompanies: string[];
  placementStatus: "PREPARING" | "INTERNSHIP" | "PLACED" | "HIGHER_STUDIES" | "NOT_SEEKING";
  expectedGraduationYear: number | null; resumeUrl: string | null; resumeName: string | null;
  education: Row[]; skills: Row[]; programmingLanguages: Row[]; achievements: Row[]; certificates: Row[]; projects: Row[];
};
type Initial = { profile: Profile | null; completion: number };

const blank: Profile = {
  phone: null, dateOfBirth: null, location: null, bio: null, linkedInUrl: null, githubUrl: null, portfolioUrl: null,
  careerGoal: null, targetRoles: [], targetCompanies: [], placementStatus: "PREPARING", expectedGraduationYear: null,
  resumeUrl: null, resumeName: null, education: [], skills: [], programmingLanguages: [], achievements: [], certificates: [], projects: [],
};
const dateOnly = (value: unknown) => typeof value === "string" && value ? value.slice(0, 10) : null;
const cleanInitial = (value: Profile | null): Profile => {
  if (!value) return blank;
  return {
    ...blank, ...value, dateOfBirth: dateOnly(value.dateOfBirth),
    achievements: value.achievements.map((row) => ({ ...row, achievedAt: dateOnly(row.achievedAt) })),
    certificates: value.certificates.map((row) => ({ ...row, issuedAt: dateOnly(row.issuedAt) })),
    projects: value.projects.map((row) => ({ ...row, startedAt: dateOnly(row.startedAt), completedAt: dateOnly(row.completedAt) })),
  };
};

export function ProfileEditor({ user, initial }: { user: { name: string; email: string }; initial: Initial }) {
  const [draft, setDraft] = useState(() => cleanInitial(initial.profile));
  const [completion, setCompletion] = useState(initial.completion);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateRow = (key: keyof Profile, index: number, field: string, value: string | number | null | string[]) =>
    setDraft((current) => ({ ...current, [key]: (current[key] as Row[]).map((row, i) => i === index ? { ...row, [field]: value } : row) }));
  const addRow = (key: keyof Profile, row: Row) => setDraft((current) => ({ ...current, [key]: [...(current[key] as Row[]), row] }));
  const removeRow = (key: keyof Profile, index: number) => setDraft((current) => ({ ...current, [key]: (current[key] as Row[]).filter((_, i) => i !== index) }));

  async function save() {
    setSaving(true); setMessage(undefined);
    const response = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    const data = await response.json() as { error?: string; completion?: number };
    setSaving(false);
    if (!response.ok) return setMessage(data.error ?? "Unable to save profile");
    setCompletion(data.completion ?? completion); setMessage("Profile saved");
  }
  async function upload() {
    const file = fileRef.current?.files?.[0]; if (!file) return;
    setUploading(true); setMessage(undefined);
    const body = new FormData(); body.set("resume", file);
    const response = await fetch("/api/profile/resume", { method: "POST", body });
    const data = await response.json() as { error?: string; url?: string; name?: string };
    setUploading(false);
    if (!response.ok) return setMessage(data.error ?? "Unable to upload resume");
    setDraft((current) => ({ ...current, resumeUrl: data.url ?? null, resumeName: data.name ?? file.name }));
    setMessage("Resume uploaded");
  }

  return (
    <main className="min-h-screen bg-[#08090e] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08090e]/85 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link className="btn-ghost -ml-3 gap-2" href="/dashboard"><ArrowLeft className="size-4" /> Dashboard</Link>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Save profile</button>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[260px_1fr]">
        <aside>
          <div className="glass-card sticky top-24">
            <div className="grid size-14 place-items-center rounded-2xl bg-violet-600 text-xl font-semibold">{user.name.slice(0, 1).toUpperCase()}</div>
            <h1 className="mt-4 text-xl font-semibold">{user.name}</h1><p className="mt-1 truncate text-sm text-zinc-500">{user.email}</p>
            <div className="mt-7 flex items-center justify-between text-sm"><span className="text-zinc-400">Profile strength</span><strong>{completion}%</strong></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${completion}%` }} /></div>
            <p className="mt-4 text-xs leading-5 text-zinc-500">Complete your profile for sharper recommendations and interview feedback.</p>
          </div>
        </aside>
        <div className="space-y-6">
          <div><p className="eyebrow">Student profile</p><h2 className="mt-4 text-3xl font-semibold tracking-tight">Tell Taksh what you’re building toward.</h2></div>
          {message && <div role="status" className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-200"><Check className="size-4" />{message}</div>}
          <Section icon={UserRound} title="Personal details" note="The essentials used to personalize your experience.">
            <Grid>
              <Input label="Phone" value={draft.phone} onChange={(v) => set("phone", v)} />
              <Input label="Location" value={draft.location} onChange={(v) => set("location", v)} />
              <Input type="date" label="Date of birth" value={draft.dateOfBirth} onChange={(v) => set("dateOfBirth", v)} />
              <Input type="number" label="Graduation year" value={draft.expectedGraduationYear} onChange={(v) => set("expectedGraduationYear", v ? Number(v) : null)} />
            </Grid>
            <TextArea label="Short bio" value={draft.bio} onChange={(v) => set("bio", v)} />
            <Grid>
              <Input label="LinkedIn URL" value={draft.linkedInUrl} onChange={(v) => set("linkedInUrl", v)} />
              <Input label="GitHub URL" value={draft.githubUrl} onChange={(v) => set("githubUrl", v)} />
              <Input label="Portfolio URL" value={draft.portfolioUrl} onChange={(v) => set("portfolioUrl", v)} />
              <label className="text-sm text-zinc-300">Placement status<select className="field mt-2" value={draft.placementStatus} onChange={(e) => set("placementStatus", e.target.value as Profile["placementStatus"])}>{["PREPARING","INTERNSHIP","PLACED","HIGHER_STUDIES","NOT_SEEKING"].map((v) => <option value={v} key={v}>{v.replaceAll("_"," ")}</option>)}</select></label>
            </Grid>
          </Section>
          <Section icon={BookOpen} title="Education" note="Add your current and previous qualifications.">
            {draft.education.map((row, i) => <RowCard key={i} onRemove={() => removeRow("education", i)}><Grid><Input label="Institution" value={row.institution} onChange={(v) => updateRow("education", i, "institution", v)} /><Input label="Degree" value={row.degree} onChange={(v) => updateRow("education", i, "degree", v)} /><Input label="Field" value={row.field} onChange={(v) => updateRow("education", i, "field", v)} /><Input type="number" label="Start year" value={row.startYear} onChange={(v) => updateRow("education", i, "startYear", Number(v))} /><Input type="number" label="End year" value={row.endYear} onChange={(v) => updateRow("education", i, "endYear", v ? Number(v) : null)} /><Input label="CGPA / score" value={row.score} onChange={(v) => updateRow("education", i, "score", v)} /></Grid></RowCard>)}
            <AddButton onClick={() => addRow("education", { institution:"",degree:"",field:"",startYear:new Date().getFullYear(),endYear:null,score:null })}>Add education</AddButton>
          </Section>
          <Section icon={Code2} title="Skills & programming" note="Rate yourself from 1 (learning) to 5 (advanced).">
            <TagEditor label="Skills" rows={draft.skills} onChange={(rows) => set("skills", rows)} />
            <TagEditor label="Programming languages" rows={draft.programmingLanguages} onChange={(rows) => set("programmingLanguages", rows)} />
          </Section>
          <Section icon={Target} title="Career goals" note="Help the learning engine aim at the right opportunities.">
            <TextArea label="Career goal" value={draft.careerGoal} onChange={(v) => set("careerGoal", v)} />
            <Grid><CommaInput label="Target roles" values={draft.targetRoles} onChange={(v) => set("targetRoles", v)} /><CommaInput label="Target companies" values={draft.targetCompanies} onChange={(v) => set("targetCompanies", v)} /></Grid>
          </Section>
          <Section icon={BriefcaseBusiness} title="Projects" note="Show what you have shipped.">
            {draft.projects.map((row, i) => <RowCard key={i} onRemove={() => removeRow("projects", i)}><Grid><Input label="Project title" value={row.title} onChange={(v) => updateRow("projects",i,"title",v)} /><Input label="Repository URL" value={row.repositoryUrl} onChange={(v) => updateRow("projects",i,"repositoryUrl",v)} /></Grid><TextArea label="Description" value={row.description} onChange={(v) => updateRow("projects",i,"description",v)} /><CommaInput label="Technologies" values={row.technologies as string[]} onChange={(v) => updateRow("projects",i,"technologies",v)} /></RowCard>)}
            <AddButton onClick={() => addRow("projects",{title:"",description:"",technologies:[],projectUrl:null,repositoryUrl:null,startedAt:null,completedAt:null})}>Add project</AddButton>
          </Section>
          <Section icon={Award} title="Achievements & certificates" note="Capture milestones and verified learning.">
            {draft.achievements.map((row,i) => <RowCard key={`a${i}`} onRemove={() => removeRow("achievements",i)}><Grid><Input label="Achievement" value={row.title} onChange={(v) => updateRow("achievements",i,"title",v)} /><Input type="date" label="Date" value={row.achievedAt} onChange={(v) => updateRow("achievements",i,"achievedAt",v)} /></Grid><TextArea label="Description" value={row.description} onChange={(v) => updateRow("achievements",i,"description",v)} /></RowCard>)}
            <AddButton onClick={() => addRow("achievements",{title:"",description:null,achievedAt:null})}>Add achievement</AddButton>
            {draft.certificates.map((row,i) => <RowCard key={`c${i}`} onRemove={() => removeRow("certificates",i)}><Grid><Input label="Certificate" value={row.name} onChange={(v) => updateRow("certificates",i,"name",v)} /><Input label="Issuer" value={row.issuer} onChange={(v) => updateRow("certificates",i,"issuer",v)} /><Input type="date" label="Issued" value={row.issuedAt} onChange={(v) => updateRow("certificates",i,"issuedAt",v)} /><Input label="Credential URL" value={row.credentialUrl} onChange={(v) => updateRow("certificates",i,"credentialUrl",v)} /></Grid></RowCard>)}
            <AddButton onClick={() => addRow("certificates",{name:"",issuer:"",issuedAt:null,credentialUrl:null})}>Add certificate</AddButton>
          </Section>
          <Section icon={FileText} title="Resume" note="PDF only, up to 5 MB. Stored privately.">
            {draft.resumeName && <p className="mb-4 text-sm text-emerald-400">Current: {draft.resumeName}</p>}
            <div className="flex flex-wrap items-center gap-3"><input ref={fileRef} className="field max-w-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-1 file:text-white" type="file" accept="application/pdf" /><button className="btn-primary" onClick={upload} disabled={uploading}>{uploading && <LoaderCircle className="size-4 animate-spin" />}Upload resume</button></div>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ icon: Icon, title, note, children }: { icon: typeof UserRound; title: string; note: string; children: React.ReactNode }) {
  return <section className="glass-card"><div className="mb-6 flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-400"><Icon className="size-5" /></span><div><h3 className="font-medium">{title}</h3><p className="mt-1 text-sm text-zinc-500">{note}</p></div></div><div className="space-y-4">{children}</div></section>;
}
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
function Input({ label, value, onChange, type = "text" }: { label: string; value: unknown; onChange: (value: string) => void; type?: string }) { return <label className="text-sm text-zinc-300">{label}<input className="field mt-2" type={type} value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value)} /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: unknown; onChange: (value: string) => void }) { return <label className="block text-sm text-zinc-300">{label}<textarea className="field mt-2 min-h-24 resize-y" value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value)} /></label>; }
function CommaInput({ label, values = [], onChange }: { label: string; values?: string[]; onChange: (value: string[]) => void }) { return <Input label={`${label} (comma separated)`} value={values.join(", ")} onChange={(v) => onChange(v.split(",").map((x) => x.trim()).filter(Boolean))} />; }
function RowCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) { return <div className="relative rounded-xl border border-white/10 bg-black/20 p-4"><button aria-label="Remove item" onClick={onRemove} className="absolute right-3 top-3 text-zinc-500 hover:text-red-400"><Trash2 className="size-4" /></button><div className="pr-8">{children}</div></div>; }
function AddButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) { return <button className="btn-ghost gap-2 border border-white/10" onClick={onClick}><Plus className="size-4" />{children}</button>; }
function TagEditor({ label, rows, onChange }: { label: string; rows: Row[]; onChange: (rows: Row[]) => void }) {
  return <div><div className="mb-2 text-sm text-zinc-300">{label}</div><div className="space-y-2">{rows.map((row,i) => <div key={i} className="grid grid-cols-[1fr_100px_40px] gap-2"><input className="field" value={String(row.name ?? "")} onChange={(e) => onChange(rows.map((r,j) => j === i ? {...r,name:e.target.value}:r))} placeholder="Name" /><input aria-label={`${label} proficiency`} className="field" type="number" min="1" max="5" value={Number(row.level ?? 3)} onChange={(e) => onChange(rows.map((r,j) => j === i ? {...r,level:Number(e.target.value)}:r))} /><button aria-label={`Remove ${label}`} onClick={() => onChange(rows.filter((_,j) => j !== i))} className="text-zinc-500 hover:text-red-400"><Trash2 className="mx-auto size-4" /></button></div>)}</div><AddButton onClick={() => onChange([...rows,{name:"",level:3}])}>Add {label.toLowerCase()}</AddButton></div>;
}
