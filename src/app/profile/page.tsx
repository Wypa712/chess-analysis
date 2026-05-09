import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProfileView } from "@/components/ProfileView/ProfileView";

export const metadata = { title: "Профіль — Chess Analysis" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session || !session.user) redirect("/auth/login");
  return <ProfileView user={session.user} />;
}
