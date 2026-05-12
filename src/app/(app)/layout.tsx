import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { redirect } from "next/navigation";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
