import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE /api/chess-accounts/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const deleted = await db
    .delete(chessAccounts)
    .where(
      and(eq(chessAccounts.id, id), eq(chessAccounts.userId, userId))
    )
    .returning({ id: chessAccounts.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
