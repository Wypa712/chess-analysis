import { describe, it, expect, vi } from 'vitest';

// The importer module imports @/db at module level — mock it to avoid Neon connection attempt
vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/db/schema', () => ({ games: {} }));

import { mapSpeed, buildTimeControl, buildPgn, normalizeLichessGame } from './lichess';

// ── Minimal LichessGame factory ───────────────────────────────────────────────
// LichessGame type is module-private, so we define a compatible shape here.

type LichessPlayerMinimal = {
  user?: { name: string; id: string };
  rating?: number;
  ratingDiff?: number;
};

type LichessClockMinimal = { initial: number; increment: number };

type LichessGameMinimal = {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: { white: LichessPlayerMinimal; black: LichessPlayerMinimal };
  winner?: 'white' | 'black';
  opening?: { eco: string; name: string; ply: number };
  moves?: string;
  clock?: LichessClockMinimal;
};

function makeGame(overrides: Partial<LichessGameMinimal> = {}): LichessGameMinimal {
  return {
    id: 'AbCdEfGh',
    rated: true,
    variant: 'standard',
    speed: 'blitz',
    perf: 'blitz',
    createdAt: 1700000000000,
    lastMoveAt: 1700000300000,
    status: 'mate',
    players: {
      white: { user: { name: 'PlayerA', id: 'playera' }, rating: 1500 },
      black: { user: { name: 'PlayerB', id: 'playerb' }, rating: 1480 },
    },
    moves: 'e4 e5 Nf3 Nc6',
    ...overrides,
  };
}

// ── mapSpeed ─────────────────────────────────────────────────────────────────

describe('mapSpeed', () => {
  it('maps known speed values', () => {
    expect(mapSpeed('ultraBullet')).toBe('bullet');
    expect(mapSpeed('bullet')).toBe('bullet');
    expect(mapSpeed('blitz')).toBe('blitz');
    expect(mapSpeed('rapid')).toBe('rapid');
    expect(mapSpeed('classical')).toBe('classical');
    expect(mapSpeed('correspondence')).toBe('correspondence');
  });

  it('returns unknown for unrecognized speeds', () => {
    expect(mapSpeed('hyperbullet')).toBe('unknown');
    expect(mapSpeed('')).toBe('unknown');
    expect(mapSpeed('arbitrary')).toBe('unknown');
  });
});

// ── buildTimeControl ─────────────────────────────────────────────────────────

describe('buildTimeControl', () => {
  it('builds clock string when clock present', () => {
    const game = makeGame({ clock: { initial: 300, increment: 3 } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildTimeControl(game as any)).toBe('300+3');
  });

  it('returns "correspondence" for correspondence without clock', () => {
    const game = makeGame({ speed: 'correspondence', clock: undefined });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildTimeControl(game as any)).toBe('correspondence');
  });

  it('returns "-" when no clock and not correspondence', () => {
    const game = makeGame({ speed: 'blitz', clock: undefined });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildTimeControl(game as any)).toBe('-');
  });

  it('uses clock increment 0 correctly', () => {
    const game = makeGame({ clock: { initial: 60, increment: 0 } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildTimeControl(game as any)).toBe('60+0');
  });
});

// ── buildPgn ─────────────────────────────────────────────────────────────────

describe('buildPgn', () => {
  it('generates valid PGN headers', () => {
    const game = makeGame({
      winner: 'white',
      opening: { eco: 'C50', name: 'Italian Game', ply: 8 },
      clock: { initial: 300, increment: 3 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgn = buildPgn(game as any);

    expect(pgn).toContain('[White "PlayerA"]');
    expect(pgn).toContain('[Black "PlayerB"]');
    expect(pgn).toContain('[Result "1-0"]');
    expect(pgn).toContain('[ECO "C50"]');
    expect(pgn).toContain('[Opening "Italian Game"]');
    expect(pgn).toContain('[TimeControl "300+3"]');
  });

  it('generates 0-1 for black winner', () => {
    const game = makeGame({ winner: 'black' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgn = buildPgn(game as any);
    expect(pgn).toContain('[Result "0-1"]');
    expect(pgn).toContain('0-1');
  });

  it('generates draw result when no winner', () => {
    const game = makeGame({ status: 'draw', winner: undefined });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgn = buildPgn(game as any);
    expect(pgn).toContain('[Result "1/2-1/2"]');
    expect(pgn).toContain('1/2-1/2');
  });

  it('generates * result for unknown termination', () => {
    const game = makeGame({ status: 'started', winner: undefined });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgn = buildPgn(game as any);
    expect(pgn).toContain('[Result "*"]');
    expect(pgn.trim()).toMatch(/\*$/);
  });

  it('formats move list with move numbers', () => {
    const game = makeGame({ moves: 'e4 e5 Nf3 Nc6', winner: 'white' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgn = buildPgn(game as any);
    expect(pgn).toContain('1. e4 e5');
    expect(pgn).toContain('2. Nf3 Nc6');
  });

  it('sanitizes quotes and backslashes in player names', () => {
    const game = makeGame({
      players: {
        white: { user: { name: 'Player"A', id: 'playera' }, rating: 1500 },
        black: { user: { name: 'Player\\B', id: 'playerb' }, rating: 1480 },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgn = buildPgn(game as any);
    expect(pgn).toContain("[White \"Player'A\"]");
    expect(pgn).toContain('[Black "Player/B"]');
  });

  it('uses ? for missing player names', () => {
    const game = makeGame({
      players: {
        white: { rating: 1500 },
        black: { rating: 1480 },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgn = buildPgn(game as any);
    expect(pgn).toContain('[White "?"]');
    expect(pgn).toContain('[Black "?"]');
  });
});

// ── normalizeLichessGame ──────────────────────────────────────────────────────

describe('normalizeLichessGame', () => {
  it('returns null for aborted games', () => {
    const game = makeGame({ status: 'aborted' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(normalizeLichessGame(game as any, 'acc1', 'playera')).toBeNull();
  });

  it('returns null when username does not match either player', () => {
    const game = makeGame();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(normalizeLichessGame(game as any, 'acc1', 'stranger')).toBeNull();
  });

  it('correctly sets color to white', () => {
    const game = makeGame({ winner: 'white' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeLichessGame(game as any, 'acc1', 'playera');
    expect(result?.color).toBe('white');
    expect(result?.result).toBe('win');
  });

  it('correctly sets color to black', () => {
    const game = makeGame({ winner: 'black' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeLichessGame(game as any, 'acc1', 'playerb');
    expect(result?.color).toBe('black');
    expect(result?.result).toBe('win');
  });

  it('detects draw when no winner', () => {
    const game = makeGame({ status: 'draw', winner: undefined });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeLichessGame(game as any, 'acc1', 'playera');
    expect(result?.result).toBe('draw');
  });

  it('detects loss when opponent wins', () => {
    const game = makeGame({ winner: 'black' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeLichessGame(game as any, 'acc1', 'playera');
    expect(result?.result).toBe('loss');
  });

  it('sets correct platform game id and sourceUrl', () => {
    const game = makeGame({ id: 'XyZ12345' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeLichessGame(game as any, 'acc1', 'playera');
    expect(result?.platformGameId).toBe('XyZ12345');
    expect(result?.sourceUrl).toBe('https://lichess.org/XyZ12345');
  });

  it('counts moves correctly', () => {
    const game = makeGame({ moves: 'e4 e5 Nf3 Nc6' }); // 4 half-moves = 2 full moves
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeLichessGame(game as any, 'acc1', 'playera');
    expect(result?.moveCount).toBe(2);
  });

  it('sets opponent name to AI for bot games', () => {
    const game = makeGame({
      players: {
        white: { user: { name: 'PlayerA', id: 'playera' }, rating: 1500 },
        black: { rating: 1000 }, // no user (AI/bot)
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeLichessGame(game as any, 'acc1', 'playera');
    expect(result?.opponent).toBe('AI');
  });

  it('sets opening name from game', () => {
    const game = makeGame({
      opening: { eco: 'B20', name: 'Sicilian Defense', ply: 2 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeLichessGame(game as any, 'acc1', 'playera');
    expect(result?.openingName).toBe('Sicilian Defense');
  });

  it('sets openingName to null when no opening', () => {
    const game = makeGame({ opening: undefined });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeLichessGame(game as any, 'acc1', 'playera');
    expect(result?.openingName).toBeNull();
  });
});
