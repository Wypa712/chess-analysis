import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock('@/auth', () => ({ auth: mockAuth }));

const mockDb = {
  select: vi.fn(),
  selectDistinctOn: vi.fn(),
  insert: vi.fn(),
};
vi.mock('@/db', () => ({ db: mockDb }));

vi.mock('@/db/schema', () => ({
  games: {},
  chessAccounts: {},
  groupAnalyses: {},
  engineAnalyses: {},
  gameAnalyses: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_a: unknown, _b: unknown) => 'eq'),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((x: unknown) => x),
  sql: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock('groq-sdk', () => ({
  default: vi.fn(function MockGroq() {
    return { chat: { completions: { create: vi.fn() } } };
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body?: unknown): NextRequest {
  if (body !== undefined) {
    return new NextRequest('http://localhost/api/analysis/group', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new NextRequest('http://localhost/api/analysis/group');
}

function setupSelectChain(returnValue: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
  };
  mockDb.select.mockReturnValue(chain);
  return chain;
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe('GET /api/analysis/group', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import('./route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns null analysis when no cached group analysis exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    setupSelectChain([]);
    const { GET } = await import('./route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysis).toBeNull();
  });

  it('returns null when stored data fails schema validation', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    setupSelectChain([{ id: 'row-1', analysisJson: { invalid: true } }]);
    const { GET } = await import('./route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysis).toBeNull();
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe('POST /api/analysis/group', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import('./route');
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 400 when too few explicit gameIds provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    setupSelectChain([]); // no rate-limit rows
    const { POST } = await import('./route');
    const validUuids = ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'];
    const res = await POST(makeRequest({ gameIds: validUuids })); // 2 < MIN_GAMES=5
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('5');
  });

  it('returns 400 when too many explicit gameIds provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    setupSelectChain([]);
    const { POST } = await import('./route');
    // 31 UUIDs > MAX_GAMES=30
    const tooMany = Array.from({ length: 31 }, (_, i) =>
      `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`
    );
    const res = await POST(makeRequest({ gameIds: tooMany }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid UUID format in gameIds', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    setupSelectChain([]);
    const { POST } = await import('./route');
    const invalidIds = Array.from({ length: 5 }, (_, i) => `not-a-uuid-${i}`);
    const res = await POST(makeRequest({ gameIds: invalidIds }));
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate-limited', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    // Rate-limit check returns a row
    setupSelectChain([{ id: 'rate-limit-row' }]);
    const { POST } = await import('./route');
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
  });

  it('returns 400 when auto-selected games are fewer than MIN_GAMES', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    let callCount = 0;
    const chain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([]); // no rate-limit rows
        return Promise.resolve([{ id: 'g1' }, { id: 'g2' }]); // only 2 games
      }),
    };
    mockDb.select.mockReturnValue(chain);
    const { POST } = await import('./route');
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('5');
  });
});
