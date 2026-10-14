import type { Metadata } from "next";
import { JuniorsShell } from "@/components/juniors/juniors-shell";
import "./juniors.css";

export const metadata:Metadata={title:"Taksh AI Juniors",description:"AI-powered MPC learning and exam preparation for JEE Main, TG EAPCET, and AP EAPCET.",openGraph:{title:"Taksh AI Juniors",description:"Your Next Rank Starts Here.",images:["/juniors/og.png"]},twitter:{card:"summary_large_image",title:"Taksh AI Juniors",description:"Your Next Rank Starts Here.",images:["/juniors/og.png"]}};
export default function JuniorsLayout({children}:{children:React.ReactNode}){return <JuniorsShell>{children}</JuniorsShell>}
