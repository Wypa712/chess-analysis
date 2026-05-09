import { describe, it, expect, vi } from 'vitest';

// The importer module imports @/db at module level — mock it to avoid Neon connection attempt
vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/db/schema', () => ({ games: {} }));

import {
  mapTimeClass,
  extractPlatformGameId,
  extractOpeningFromPgn,
  extractResultFromPlayerResult,
  countMovesFromPgn,
} from './chessdotcom';

// ── mapTimeClass ──────────────────────────────────────────────────────────────

describe('mapTimeClass', () => {
  it('maps known time classes', () => {
    expect(mapTimeClass('bullet')).toBe('bullet');
    expect(mapTimeClass('blitz')).toBe('blitz');
    expect(mapTimeClass('rapid')).toBe('rapid');
    expect(mapTimeClass('classical')).toBe('classical');
    expect(mapTimeClass('daily')).toBe('correspondence');
  });

  it('returns unknown for unrecognized time class', () => {
    expect(mapTimeClass('hyperbullet')).toBe('unknown');
    expect(mapTimeClass('')).toBe('unknown');
    expect(mapTimeClass('unknown_format')).toBe('unknown');
  });
});

// ── extractPlatformGameId ─────────────────────────────────────────────────────

describe('extractPlatformGameId', () => {
  it('extracts live game id', () => {
    expect(extractPlatformGameId('https://www.chess.com/game/live/12345678')).toBe('12345678');
  });

  it('extracts daily game id', () => {
    expect(extractPlatformGameId('https://www.chess.com/game/daily/98765432')).toBe('98765432');
  });

  it('throws when URL path does not match live/daily pattern', () => {
    expect(() => extractPlatformGameId('https://www.chess.com/game/other/12345'))
      .toThrow('Cannot extract game ID from URL: https://www.chess.com/game/other/12345');
  });

  it('throws for unrecognized URL format', () => {
    expect(() => extractPlatformGameId('https://lichess.org/AbCdEfGh'))
      .toThrow(/Cannot extract game ID from URL/);
  });
});

// ── extractOpeningFromPgn ─────────────────────────────────────────────────────

describe('extractOpeningFromPgn', () => {
  it('extracts opening from ECOUrl header', () => {
    const pgn = `[ECOUrl "https://www.chess.com/openings/Kings-Gambit-Accepted"]
[White "PlayerA"]

1. e4 e5 2. f4 exf4 1-0`;
    expect(extractOpeningFromPgn(pgn)).toBe('Kings Gambit Accepted');
  });

  it('capitalizes words from ECOUrl slug', () => {
    const pgn = `[ECOUrl "https://www.chess.com/openings/ruy-lopez-open-variation"]`;
    expect(extractOpeningFromPgn(pgn)).toBe('Ruy Lopez Open Variation');
  });

  it('falls back to Opening header when ECOUrl is absent', () => {
    const pgn = `[Opening "Sicilian Defense"]
[White "A"]
1. e4 c5 1-0`;
    expect(extractOpeningFromPgn(pgn)).toBe('Sicilian Defense');
  });

  it('prefers ECOUrl over Opening when both present', () => {
    const pgn = `[ECOUrl "https://www.chess.com/openings/Italian-Game"]
[Opening "Old name"]`;
    expect(extractOpeningFromPgn(pgn)).toBe('Italian Game');
  });

  it('returns null when neither ECOUrl nor Opening present', () => {
    const pgn = '[White "PlayerA"]\n\n1. e4 e5 1-0';
    expect(extractOpeningFromPgn(pgn)).toBeNull();
  });
});

// ── extractResultFromPlayerResult ─────────────────────────────────────────────

describe('extractResultFromPlayerResult', () => {
  it('maps win', () => {
    expect(extractResultFromPlayerResult('win')).toBe('win');
  });

  it('maps all draw reasons to draw', () => {
    const drawReasons = ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'];
    for (const reason of drawReasons) {
      expect(extractResultFromPlayerResult(reason)).toBe('draw');
    }
  });

  it('maps loss reasons to loss', () => {
    expect(extractResultFromPlayerResult('timeout')).toBe('loss');
    expect(extractResultFromPlayerResult('resigned')).toBe('loss');
    expect(extractResultFromPlayerResult('checkmated')).toBe('loss');
    expect(extractResultFromPlayerResult('abandoned')).toBe('loss');
  });

  it('returns loss for unknown result strings', () => {
    expect(extractResultFromPlayerResult('')).toBe('loss');
    expect(extractResultFromPlayerResult('unknown_result')).toBe('loss');
  });
});

// ── countMovesFromPgn ─────────────────────────────────────────────────────────

describe('countMovesFromPgn', () => {
  it('counts moves correctly for a short game', () => {
    // Scholar's mate: 4 moves total, but white plays 4 and black plays 3 = 4 full moves
    const pgn = `[White "A"][Black "B"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;
    expect(countMovesFromPgn(pgn)).toBe(4);
  });

  it('counts moves for even number of half-moves', () => {
    const pgn = `[White "A"]

1. e4 e5 1/2-1/2`;
    expect(countMovesFromPgn(pgn)).toBe(1);
  });

  it('counts correctly when black makes last move', () => {
    // 3 plies = 2 full moves (ceil(3/2) = 2)
    const pgn = `[White "A"]

1. e4 e5 2. Nf3 0-1`;
    expect(countMovesFromPgn(pgn)).toBe(2);
  });

  it('returns 0 for PGN with no moves', () => {
    const pgn = `[White "A"][Black "B"]\n\n*`;
    expect(countMovesFromPgn(pgn)).toBe(0);
  });

  it('ignores PGN headers and result token', () => {
    const pgn = `[Event "Test"][Site "Chess.com"][Date "2024.01.01"]
[White "A"][Black "B"][Result "1-0"]

1. d4 d5 2. c4 c6 1-0`;
    expect(countMovesFromPgn(pgn)).toBe(2);
  });
});
