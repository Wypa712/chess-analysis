import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock('@/auth', () => ({ auth: mockAuth }));

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
};
vi.mock('@/db', () => ({ db: mockDb }));

vi.mock('@/db/schema', () => ({
  games: {},
  chessAccounts: {},
  gameAnalyses: {},
  engineAnalyses: {},
  llmRequestLocks: { lockKey: 'lock_key', userId: 'user_id', expiresAt: 'expires_at' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_a: unknown, _b: unknown) => 'eq'),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((x: unknown) => x),
  sql: vi.fn(),
  inArray: vi.fn(),
}));

// Mock Groq at module level so route-level client construction is also mocked
// Must use regular function (not arrow) so it can be called with `new`
const mockGroqCreate = vi.fn();
vi.mock('groq-sdk', () => ({
  default: vi.fn(function MockGroq() {
    return { chat: { completions: { create: mockGroqCreate } } };
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function setupDbChain(returnValue: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnValue),
    onConflictDoNothing: vi.fn().mockReturnThis(),
  };
  mockDb.select.mockReturnValue(chain);
  mockDb.insert.mockReturnValue(chain);
  return chain;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/games/[id]/analyze', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import('./route');
    const res = await GET(makeRequest('http://localhost'), makeParams(VALID_UUID));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 for invalid UUID', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    const { GET } = await import('./route');
    const res = await GET(makeRequest('http://localhost'), makeParams('not-a-uuid'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when game not owned by user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    setupDbChain([]); // game not found
    const { GET } = await import('./route');
    const res = await GET(makeRequest('http://localhost'), makeParams(VALID_UUID));
    expect(res.status).toBe(404);
  });

  it('returns null analysis when no cached analysis exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    // First call: getOwnedGame returns a game
    // Subsequent calls: no cached analysis
    let callCount = 0;
    const chain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([{ id: VALID_UUID, pgn: '1. e4 e5', result: 'win', color: 'white', opponent: 'Bob', openingName: null, timeControl: '300+3', timeControlCategory: 'blitz', moveCount: 20, playerRating: 1500, opponentRating: 1480 }]);
        return Promise.resolve([]);
      }),
    };
    mockDb.select.mockReturnValue(chain);
    const { GET } = await import('./route');
    const res = await GET(makeRequest('http://localhost'), makeParams(VALID_UUID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysis).toBeNull();
  });

  it('returns cached analysis when it exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    const fakeAnalysis = { version: 1, language: 'uk' };
    let callCount = 0;
    const chain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([{ id: VALID_UUID }]);
        return Promise.resolve([{ analysisJson: fakeAnalysis }]);
      }),
    };
    mockDb.select.mockReturnValue(chain);
    const { GET } = await import('./route');
    const res = await GET(makeRequest('http://localhost'), makeParams(VALID_UUID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysis).toEqual(fakeAnalysis);
  });
});

describe('POST /api/games/[id]/analyze', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = 'test-key';
    mockDb.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  });

  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import('./route');
    const res = await POST(makeRequest('http://localhost'), makeParams(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it('returns 404 for invalid UUID', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    const { POST } = await import('./route');
    const res = await POST(makeRequest('http://localhost'), makeParams('invalid-id'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when game not owned', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    setupDbChain([]);
    const { POST } = await import('./route');
    const res = await POST(makeRequest('http://localhost'), makeParams(VALID_UUID));
    expect(res.status).toBe(404);
  });

  it('returns 429 when rate-limited', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    let callCount = 0;
    const chain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([{ id: VALID_UUID }]); // game found
        return Promise.resolve([{ id: 'rate-limit-row' }]); // rate limit hit
      }),
    };
    mockDb.select.mockReturnValue(chain);
    const { POST } = await import('./route');
    const res = await POST(makeRequest('http://localhost'), makeParams(VALID_UUID));
    expect(res.status).toBe(429);
  });

  it('returns 200 with persisted analysis on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const fakeAnalysis = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Solid game overall.',
      opening: { summary: 'Standard e4 e5 opening.', keyMistakes: [] },
      middlegame: { summary: 'Active play.', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: false },
      criticalMoments: [],
      recommendations: [
        { title: 'Improve endgame', description: 'Study basic endgames.', priority: 1 },
        { title: 'Tactics training', description: 'Solve puzzles daily.', priority: 2 },
      ],
    };

    let selectCallCount = 0;
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return Promise.resolve([{
            id: VALID_UUID,
            pgn: '1. e4 e5',
            result: 'win',
            color: 'white',
            opponent: 'Bob',
            openingName: null,
            timeControl: '300+3',
            timeControlCategory: 'blitz',
            moveCount: 20,
            playerRating: 1500,
            opponentRating: 1480,
          }]);
        }
        return Promise.resolve([]); // no rate-limit rows; no cached engine analysis
      }),
    };
    mockDb.select.mockReturnValue(selectChain);

    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(fakeAnalysis) } }],
      usage: { prompt_tokens: 100, completion_tokens: 200 },
    });

    const lockInsertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ lockKey: 'lock' }]),
    };
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ analysisJson: fakeAnalysis }]),
    };
    mockDb.insert
      .mockReturnValueOnce(lockInsertChain)
      .mockReturnValueOnce(insertChain);

    const { POST } = await import('./route');
    const res = await POST(makeRequest('http://localhost'), makeParams(VALID_UUID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysis).toEqual(fakeAnalysis);
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
