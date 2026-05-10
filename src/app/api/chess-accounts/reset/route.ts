import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

// DELETE /api/chess-accounts/reset — dev-only: delete all user's chess accounts
export async function DELETE() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db
      .delete(chessAccounts)
      .where(eq(chessAccounts.userId, session.user.id));
  } catch (err) {
    console.error("[chess-accounts/reset] DB delete failed:", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
