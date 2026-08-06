import { redirect } from "next/navigation";

export default async function SuperAdminLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const callbackUrl = (await searchParams).callbackUrl || "/super-admin";
  redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
