import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfile } from "@/lib/profile/service";
import { ProfileEditor } from "@/components/profile/profile-editor";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/profile");
  const result = await getProfile(session.user.id);
  return <ProfileEditor user={{ name: session.user.name ?? "", email: session.user.email ?? "" }} initial={JSON.parse(JSON.stringify(result))} />;
}
