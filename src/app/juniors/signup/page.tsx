import { Suspense } from "react";
import { JuniorsAuthCard } from "@/components/juniors/auth-card";
export default function Signup(){return <section className="j-auth-wrap"><Suspense><JuniorsAuthCard mode="signup"/></Suspense></section>}
