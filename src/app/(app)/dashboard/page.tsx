import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[dashboard] failed to load chess accounts:", msg);
    throw error;
  }

  if (accounts.length === 0) {
    redirect("/onboarding");
  }

  return <DashboardClient userId={session.user.id} />;
}
