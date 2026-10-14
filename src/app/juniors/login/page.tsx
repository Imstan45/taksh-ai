import { Suspense } from "react";
import { JuniorsAuthCard } from "@/components/juniors/auth-card";
export default function Login(){return <section className="j-auth-wrap"><Suspense><JuniorsAuthCard mode="login"/></Suspense></section>}
