import { describe, it, expect } from 'vitest';
import {
  isEngineAnalysisJsonV1,
  evalToCentipawns,
  evalToPawns,
  STOCKFISH_PROFILE_KEY,
  STOCKFISH_ENGINE_NAME,
  type EngineAnalysisJsonV1,
} from './engine-analysis';

// ── Fixture factory ───────────────────────────────────────────────────────────

function makeValidAnalysis(
  overrides: Partial<EngineAnalysisJsonV1> = {}
): EngineAnalysisJsonV1 {
  return {
    version: 1,
    profileKey: STOCKFISH_PROFILE_KEY,
    engine: { name: STOCKFISH_ENGINE_NAME, depth: 15 },
    accuracy: { white: 85.5, black: 72.3, player: 85.5, opponent: 72.3 },
    summary: {
      bestMoveCount: 20,
      goodMoveCount: 10,
      inaccuracyCount: 3,
      mistakeCount: 1,
      blunderCount: 0,
    },
    moves: [
      {
        ply: 1,
        moveNumber: 1,
        color: 'white',
        san: 'e4',
        fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        evalBefore: { type: 'cp', value: 20 },
        evalAfter: { type: 'cp', value: 30 },
        classification: 'best',
      },
    ],
    keyMoments: [],
    evalGraph: [
      { ply: 1, eval: { type: 'cp', value: 30 } },
    ],
    ...overrides,
  };
}

// ── isEngineAnalysisJsonV1 ────────────────────────────────────────────────────

describe('isEngineAnalysisJsonV1', () => {
  it('validates a correct analysis object', () => {
    expect(isEngineAnalysisJsonV1(makeValidAnalysis())).toBe(true);
  });

  it('validates analysis with empty moves and keyMoments arrays', () => {
    const v = makeValidAnalysis({ moves: [], keyMoments: [], evalGraph: [] });
    expect(isEngineAnalysisJsonV1(v)).toBe(true);
  });

  it('validates optional engine fields (version, timeMsPerPosition)', () => {
    const v = makeValidAnalysis({
      engine: {
        name: STOCKFISH_ENGINE_NAME,
        version: '16',
        depth: 15,
        timeMsPerPosition: 200,
      },
    });
    expect(isEngineAnalysisJsonV1(v)).toBe(true);
  });

  it('validates move with all optional fields present', () => {
    const v = makeValidAnalysis({
      moves: [
        {
          ply: 2,
          moveNumber: 1,
          color: 'black',
          san: 'e5',
          uci: 'e7e5',
          fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          evalBefore: { type: 'cp', value: 30 },
          evalAfter: { type: 'cp', value: 15 },
          bestMove: { san: 'e5', uci: 'e7e5' },
          classification: 'best',
          centipawnLoss: 0,
          winProbabilityLoss: 0,
          principalVariation: ['e5', 'Nf3'],
        },
      ],
    });
    expect(isEngineAnalysisJsonV1(v)).toBe(true);
  });

  it('validates keyMoments with all valid types', () => {
    const types: EngineAnalysisJsonV1['keyMoments'][0]['type'][] = [
      'turning_point', 'missed_tactic', 'blunder', 'critical_defense',
    ];
    for (const type of types) {
      const v = makeValidAnalysis({
        keyMoments: [{
          ply: 10, moveNumber: 5, color: 'white',
          type, title: 'Title', description: 'Desc',
        }],
      });
      expect(isEngineAnalysisJsonV1(v)).toBe(true);
    }
  });

  it('validates all move classifications', () => {
    const classifications: EngineAnalysisJsonV1['moves'][0]['classification'][] = [
      'brilliant', 'best', 'good', 'inaccuracy', 'mistake', 'blunder',
    ];
    for (const classification of classifications) {
      const v = makeValidAnalysis({
        moves: [{ ...makeValidAnalysis().moves[0], classification }],
      });
      expect(isEngineAnalysisJsonV1(v)).toBe(true);
    }
  });

  it('validates mate eval type', () => {
    const v = makeValidAnalysis({
      moves: [
        { ...makeValidAnalysis().moves[0], evalAfter: { type: 'mate', value: 3 } },
      ],
    });
    expect(isEngineAnalysisJsonV1(v)).toBe(true);
  });

  it('rejects null and undefined', () => {
    expect(isEngineAnalysisJsonV1(null)).toBe(false);
    expect(isEngineAnalysisJsonV1(undefined)).toBe(false);
  });

  it('rejects non-object values', () => {
    expect(isEngineAnalysisJsonV1('string')).toBe(false);
    expect(isEngineAnalysisJsonV1(42)).toBe(false);
    expect(isEngineAnalysisJsonV1([])).toBe(false);
  });

  it('rejects wrong version', () => {
    expect(isEngineAnalysisJsonV1({ ...makeValidAnalysis(), version: 2 })).toBe(false);
  });

  it('rejects wrong profileKey', () => {
    expect(isEngineAnalysisJsonV1({ ...makeValidAnalysis(), profileKey: 'wrong-key' })).toBe(false);
  });

  it('rejects wrong engine name', () => {
    expect(isEngineAnalysisJsonV1({
      ...makeValidAnalysis(),
      engine: { name: 'lc0' },
    })).toBe(false);
  });

  it('rejects non-finite accuracy values', () => {
    expect(isEngineAnalysisJsonV1({
      ...makeValidAnalysis(),
      accuracy: { white: NaN, black: 72, player: 85, opponent: 72 },
    })).toBe(false);
  });

  it('rejects missing accuracy fields', () => {
    expect(isEngineAnalysisJsonV1({
      ...makeValidAnalysis(),
      accuracy: { white: 85, black: 72 },
    })).toBe(false);
  });

  it('rejects non-array moves', () => {
    expect(isEngineAnalysisJsonV1({ ...makeValidAnalysis(), moves: 'not array' })).toBe(false);
  });

  it('rejects move with invalid classification', () => {
    const v = makeValidAnalysis({
      moves: [{ ...makeValidAnalysis().moves[0], classification: 'perfect' as never }],
    });
    expect(isEngineAnalysisJsonV1(v)).toBe(false);
  });

  it('rejects move with invalid eval type', () => {
    const v = makeValidAnalysis({
      moves: [{ ...makeValidAnalysis().moves[0], evalBefore: { type: 'pawn', value: 1 } as never }],
    });
    expect(isEngineAnalysisJsonV1(v)).toBe(false);
  });

  it('rejects move with non-finite centipawnLoss', () => {
    const v = makeValidAnalysis({
      moves: [{ ...makeValidAnalysis().moves[0], centipawnLoss: Infinity }],
    });
    expect(isEngineAnalysisJsonV1(v)).toBe(false);
  });

  it('rejects move with bestMove missing uci', () => {
    const v = makeValidAnalysis({
      moves: [{ ...makeValidAnalysis().moves[0], bestMove: { san: 'e4' } as never }],
    });
    expect(isEngineAnalysisJsonV1(v)).toBe(false);
  });

  it('rejects keyMoment with invalid type', () => {
    const v = makeValidAnalysis({
      keyMoments: [{
        ply: 1, moveNumber: 1, color: 'white',
        type: 'great_move' as never,
        title: 'T', description: 'D',
      }],
    });
    expect(isEngineAnalysisJsonV1(v)).toBe(false);
  });

  it('rejects keyMoment with invalid color', () => {
    const v = makeValidAnalysis({
      keyMoments: [{
        ply: 1, moveNumber: 1, color: 'red' as never,
        type: 'blunder', title: 'T', description: 'D',
      }],
    });
    expect(isEngineAnalysisJsonV1(v)).toBe(false);
  });

  it('rejects evalGraph point with invalid eval', () => {
    const v = makeValidAnalysis({
      evalGraph: [{ ply: 1, eval: { type: 'pawns', value: 1 } as never }],
    });
    expect(isEngineAnalysisJsonV1(v)).toBe(false);
  });

  it('rejects evalGraph point with bestMove missing uci', () => {
    const v = makeValidAnalysis({
      evalGraph: [{ ply: 1, bestMove: { san: 'e4' } as never }],
    });
    expect(isEngineAnalysisJsonV1(v)).toBe(false);
  });
});

// ── evalToCentipawns ──────────────────────────────────────────────────────────

describe('evalToCentipawns', () => {
  it('returns cp value directly', () => {
    expect(evalToCentipawns({ type: 'cp', value: 150 })).toBe(150);
  });

  it('returns negative cp value', () => {
    expect(evalToCentipawns({ type: 'cp', value: -300 })).toBe(-300);
  });

  it('returns 0 for cp 0', () => {
    expect(evalToCentipawns({ type: 'cp', value: 0 })).toBe(0);
  });

  it('returns 10000 for positive mate', () => {
    expect(evalToCentipawns({ type: 'mate', value: 3 })).toBe(10000);
  });

  it('returns -10000 for negative mate', () => {
    expect(evalToCentipawns({ type: 'mate', value: -2 })).toBe(-10000);
  });

  it('returns 10000 for mate value 0 (treated as non-negative)', () => {
    expect(evalToCentipawns({ type: 'mate', value: 0 })).toBe(10000);
  });

  it('returns 0 for undefined', () => {
    expect(evalToCentipawns(undefined)).toBe(0);
  });
});

// ── evalToPawns ───────────────────────────────────────────────────────────────

describe('evalToPawns', () => {
  it('converts centipawns to pawns', () => {
    expect(evalToPawns({ type: 'cp', value: 100 })).toBe(1);
    expect(evalToPawns({ type: 'cp', value: 250 })).toBe(2.5);
    expect(evalToPawns({ type: 'cp', value: -150 })).toBe(-1.5);
  });

  it('converts mate to 100 pawns', () => {
    expect(evalToPawns({ type: 'mate', value: 1 })).toBe(100);
    expect(evalToPawns({ type: 'mate', value: -1 })).toBe(-100);
  });

  it('returns 0 for undefined', () => {
    expect(evalToPawns(undefined)).toBe(0);
  });
});
