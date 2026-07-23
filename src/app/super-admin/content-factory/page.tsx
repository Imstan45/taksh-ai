import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function ContentFactoryPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/super-admin/login");
  const contentFactoryUrl = process.env.NEXT_PUBLIC_CONTENT_FACTORY_URL;

  return (
    <DashboardShell {...session.user}>
      <section className="glass-card max-w-3xl">
        <Sparkles className="size-8 text-violet-400" />
        <h2 className="mt-6 text-3xl font-semibold">Taksh Content Factory</h2>
        <p className="mt-3 leading-7 text-zinc-400">
          Generate curriculum in sequence, review Gemini-created teaching assets, and publish approved lessons to student learning profiles.
        </p>
        {contentFactoryUrl ? (
          <Link className="btn-primary mt-7 inline-flex" href={contentFactoryUrl} target="_blank" rel="noreferrer">
            Open Content Factory <ExternalLink className="size-4" />
          </Link>
        ) : (
          <p className="mt-7 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Set NEXT_PUBLIC_CONTENT_FACTORY_URL to the Git-deployed Content Factory URL.
          </p>
        )}
      </section>
    </DashboardShell>
  );
}
