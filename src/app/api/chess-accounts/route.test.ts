import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};
vi.mock("@/db", () => ({ db: mockDb }));

vi.mock("@/db/schema", () => ({
  chessAccounts: {
    id: "id",
    platform: "platform",
    username: "username",
    normalizedUsername: "normalized_username",
    lastSyncedAt: "last_synced_at",
    createdAt: "created_at",
    userId: "user_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_a: unknown, _b: unknown) => "eq"),
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/chess-accounts", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/chess-accounts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects Lichess usernames with invalid characters before external lookup", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ platform: "lichess", username: "user-name!" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Lichess");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects Chess.com usernames with hyphens before external lookup", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ platform: "chess_com", username: "user-name" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Chess.com");
    expect(fetch).not.toHaveBeenCalled();
  });
});
