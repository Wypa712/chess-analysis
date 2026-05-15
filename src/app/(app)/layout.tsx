import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { QueryProvider } from "@/components/QueryProvider/QueryProvider";
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

  return (
    <QueryProvider>
      <AppShell user={session.user}>{children}</AppShell>
    </QueryProvider>
  );
}
