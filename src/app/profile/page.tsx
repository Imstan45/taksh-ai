import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfile } from "@/lib/profile/service";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { EmployerConsent } from "@/components/profile/employer-consent";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/profile");
  const result = await getProfile(session.user.id);
  const readiness=(await prisma.$queryRaw<Array<{employer_sharing_consent:boolean}>>`select employer_sharing_consent from public.candidate_readiness where user_id=${session.user.id}::uuid`)[0];
  return <><ProfileEditor user={{ name: session.user.name ?? "", email: session.user.email ?? "" }} initial={JSON.parse(JSON.stringify(result))} /><EmployerConsent initial={readiness?.employer_sharing_consent??false}/></>;
}
