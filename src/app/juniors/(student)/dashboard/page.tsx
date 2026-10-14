import Link from "next/link";
import { auth } from "@/auth";
import { ArrowRight, BookOpen, CalendarDays, Flame, Target } from "lucide-react";
import { getJuniorsProgress, juniorsSummary } from "@/lib/juniors-data";

export default async function JuniorsDashboard() {
  const session = await auth();
  const progress = await getJuniorsProgress(session!.user.id);
  const summary = juniorsSummary(progress);
  const firstName = (session!.user.name ?? "Student").split(" ")[0];
  return <div className="js-content">
    <header className="js-welcome"><div><span className="j-eyebrow">Student dashboard</span><h1>Welcome back, {firstName}</h1><p>{summary.completed.size ? "Keep your momentum going with the next concept." : "Choose a subject and complete your first focused lesson."}</p></div><Link className="j-btn" href="/juniors/learn">Continue learning <ArrowRight/></Link></header>
    <section className="js-stat-grid">
      <Stat icon={<Target/>} label="Selected examination" value="Not selected" note="Exam setup arrives next" />
      <Stat icon={<CalendarDays/>} label="Daily learning goal" value="1 lesson" note="A calm place to begin" />
      <Stat icon={<Flame/>} label="Current streak" value="—" note="Starts after daily activity" />
      <Stat icon={<BookOpen/>} label="Published lessons complete" value={`${summary.completed.size}/${summary.total}`} note={`${summary.percent}% complete`} />
    </section>
    <section className="js-panel"><div className="js-panel-head"><div><span className="j-eyebrow">Your learning</span><h2>Subject progress</h2></div><Link href="/juniors/learn">Browse curriculum →</Link></div>
      <div className="js-subject-progress">{["Mathematics","Physics","Chemistry"].map(subject => <div key={subject}><p><b>{subject}</b><span>No lesson completed yet</span></p><i><em style={{width:"0%"}}/></i></div>)}</div>
    </section>
    <section className="js-next"><div><span className="j-eyebrow">Recommended next activity</span><h2>Read quadratic roots</h2><p>Build a clean link between the discriminant and the nature of roots.</p></div><Link className="j-btn" href="/juniors/learn/mathematics/algebra">Start 12-minute lesson <ArrowRight/></Link></section>
  </div>;
}

function Stat({icon,label,value,note}:{icon:React.ReactNode;label:string;value:string;note:string}){return <article className="js-stat"><span>{icon}</span><small>{label}</small><strong>{value}</strong><p>{note}</p></article>}
