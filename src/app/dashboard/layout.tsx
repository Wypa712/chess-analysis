import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { db } from "@/db";
import { chessAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  let accounts: { id: string }[] = [];
  try {
    accounts = await db
      .select({ id: chessAccounts.id })
      .from(chessAccounts)
      .where(eq(chessAccounts.userId, session.user.id))
      .limit(1);
  } catch {
    redirect("/error");
  }

  if (accounts.length === 0) {
    redirect("/onboarding");
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
