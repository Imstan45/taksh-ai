import Link from "next/link";
import { BookOpen } from "lucide-react";

const nav=[["Home","/juniors"],["Curriculum","/juniors/learn"],["Exam Practice","/juniors/exams"],["How It Works","/juniors#how-it-works"],["Pricing","/juniors/pricing"]];

export function JuniorsShell({children}:{children:React.ReactNode}){
  return <div className="juniors-page"><header className="juniors-header"><div className="juniors-container juniors-nav"><Link href="/juniors" className="juniors-brand"><span><BookOpen/></span>Taksh <b>Juniors</b></Link><nav>{nav.map(([label,href])=><Link key={label} href={href}>{label}</Link>)}</nav><div className="juniors-actions"><Link className="j-btn j-btn-ghost" href="/juniors/login">Log in</Link><Link className="j-btn" href="/juniors/signup">Get started</Link></div><details className="juniors-mobile"><summary>Menu</summary><div>{nav.map(([label,href])=><Link key={label} href={href}>{label}</Link>)}<Link href="/juniors/login">Log in</Link><Link href="/juniors/signup">Get started</Link></div></details></div></header><main>{children}</main><footer className="juniors-footer"><div className="juniors-container"><div><b>Taksh AI Juniors</b><p>Powered by Taksh AI</p></div><nav><a href="https://takshai.in">takshai.in</a><Link href="/juniors#about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link></nav></div></footer></div>
}
