import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};
vi.mock("@/db", () => ({ db: mockDb }));

vi.mock("@/db/schema", () => ({
  chessAccounts: { id: "chess_account_id", userId: "user_id" },
  engineAnalyses: {
    gameId: "game_id",
    profileKey: "profile_key",
  },
  games: {
    id: "game_id",
    chessAccountId: "chess_account_id",
    pgn: "pgn",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn((_a: unknown, _b: unknown) => "eq"),
}));

vi.mock("@/lib/chess/engine-analysis", () => ({
  STOCKFISH_DEPTH: 13,
  STOCKFISH_ENGINE_NAME: "Stockfish",
  STOCKFISH_ENGINE_VERSION: "16",
  STOCKFISH_PROFILE_KEY: "default",
  isEngineAnalysisJsonV1: vi.fn(),
}));

vi.mock("@/lib/chess/pgn", () => ({
  parsePgn: vi.fn(),
}));

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function setupOwnedGame() {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: VALID_UUID, pgn: "1. e4 e5" }]),
  });
}

describe("POST /api/games/[id]/engine-analysis", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    setupOwnedGame();
  });

  it("rejects payloads over 500 KB before parsing JSON", async () => {
    const json = vi.fn();
    const req = {
      headers: new Headers({ "content-length": String(500 * 1024 + 1) }),
      json,
    } as unknown as NextRequest;

    const { POST } = await import("./route");
    const res = await POST(req, makeParams(VALID_UUID));

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({ error: "Payload too large" });
    expect(json).not.toHaveBeenCalled();
  });
});
