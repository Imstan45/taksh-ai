import { redirect } from "next/navigation";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const callbackUrl = (await searchParams).callbackUrl || "/admin";
  redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
