export const STOCKFISH_PROFILE_KEY = "default-v1";
export const STOCKFISH_ENGINE_NAME = "stockfish";
export const STOCKFISH_ENGINE_VERSION = "16";
export const STOCKFISH_DEPTH = 13;

export type MoveClassification =
  | "brilliant"
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type EngineEval = {
  type: "cp" | "mate";
  value: number;
};

export type EngineAnalysisJsonV1 = {
  version: 1;
  profileKey: typeof STOCKFISH_PROFILE_KEY;
  engine: {
    name: typeof STOCKFISH_ENGINE_NAME;
    version?: string;
    depth?: number;
    timeMsPerPosition?: number;
  };
  accuracy: {
    white: number;
    black: number;
    player: number;
    opponent: number;
  };
  summary: {
    bestMoveCount: number;
    goodMoveCount: number;
    inaccuracyCount: number;
    mistakeCount: number;
    blunderCount: number;
  };
  moves: Array<{
    ply: number;
    moveNumber: number;
    color: "white" | "black";
    san: string;
    uci?: string;
    fenBefore: string;
    fenAfter: string;
    evalBefore?: EngineEval;
    evalAfter?: EngineEval;
    bestMove?: {
      san?: string;
      uci: string;
    };
    classification: MoveClassification;
    centipawnLoss?: number;
    winProbabilityLoss?: number;
    principalVariation?: string[];
  }>;
  keyMoments: Array<{
    ply: number;
    moveNumber: number;
    color: "white" | "black";
    type: "turning_point" | "missed_tactic" | "blunder" | "critical_defense";
    title: string;
    description: string;
  }>;
  evalGraph: Array<{
    ply: number;
    eval?: EngineEval;
    bestMove?: {
      san?: string;
      uci: string;
    };
  }>;
};

const CLASSIFICATIONS = new Set<MoveClassification>([
  "brilliant",
  "best",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isEval(value: unknown): value is EngineEval {
  if (!isRecord(value)) return false;
  return (
    (value.type === "cp" || value.type === "mate") &&
    isFiniteNumber(value.value)
  );
}

function isOptionalEval(value: unknown): value is EngineEval | undefined {
  return value === undefined || isEval(value);
}

function isColor(value: unknown): value is "white" | "black" {
  return value === "white" || value === "black";
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

export function isEngineAnalysisJsonV1(
  value: unknown
): value is EngineAnalysisJsonV1 {
  if (!isRecord(value)) return false;
  if (value.version !== 1 || value.profileKey !== STOCKFISH_PROFILE_KEY) {
    return false;
  }

  if (!isRecord(value.engine) || value.engine.name !== STOCKFISH_ENGINE_NAME) {
    return false;
  }
  if (
    value.engine.version !== undefined &&
    typeof value.engine.version !== "string"
  ) {
    return false;
  }
  if (
    value.engine.depth !== undefined &&
    !isFiniteNumber(value.engine.depth)
  ) {
    return false;
  }
  if (
    value.engine.timeMsPerPosition !== undefined &&
    !isFiniteNumber(value.engine.timeMsPerPosition)
  ) {
    return false;
  }

  if (!isRecord(value.accuracy)) return false;
  for (const key of ["white", "black", "player", "opponent"] as const) {
    if (!isFiniteNumber(value.accuracy[key])) return false;
  }

  if (!isRecord(value.summary)) return false;
  for (const key of [
    "bestMoveCount",
    "goodMoveCount",
    "inaccuracyCount",
    "mistakeCount",
    "blunderCount",
  ] as const) {
    if (!isFiniteNumber(value.summary[key])) return false;
  }

  if (!Array.isArray(value.moves) || !Array.isArray(value.keyMoments)) {
    return false;
  }
  if (!Array.isArray(value.evalGraph)) return false;

  for (const move of value.moves) {
    if (!isRecord(move)) return false;
    if (
      !isFiniteNumber(move.ply) ||
      !isFiniteNumber(move.moveNumber) ||
      !isColor(move.color) ||
      typeof move.san !== "string" ||
      typeof move.fenBefore !== "string" ||
      typeof move.fenAfter !== "string" ||
      !CLASSIFICATIONS.has(move.classification as MoveClassification) ||
      !isOptionalEval(move.evalBefore) ||
      !isOptionalEval(move.evalAfter)
    ) {
      return false;
    }
    if (move.uci !== undefined && typeof move.uci !== "string") return false;
    if (
      move.centipawnLoss !== undefined &&
      !isFiniteNumber(move.centipawnLoss)
    ) {
      return false;
    }
    if (
      move.winProbabilityLoss !== undefined &&
      !isFiniteNumber(move.winProbabilityLoss)
    ) {
      return false;
    }
    if (!isOptionalStringArray(move.principalVariation)) return false;
    if (move.bestMove !== undefined) {
      if (!isRecord(move.bestMove) || typeof move.bestMove.uci !== "string") {
        return false;
      }
      if (
        move.bestMove.san !== undefined &&
        typeof move.bestMove.san !== "string"
      ) {
        return false;
      }
    }
  }

  for (const moment of value.keyMoments) {
    if (!isRecord(moment)) return false;
    if (
      !isFiniteNumber(moment.ply) ||
      !isFiniteNumber(moment.moveNumber) ||
      !isColor(moment.color) ||
      typeof moment.title !== "string" ||
      typeof moment.description !== "string" ||
      ![
        "turning_point",
        "missed_tactic",
        "blunder",
        "critical_defense",
      ].includes(String(moment.type))
    ) {
      return false;
    }
  }

  for (const point of value.evalGraph) {
    if (!isRecord(point)) return false;
    if (!isFiniteNumber(point.ply) || !isOptionalEval(point.eval)) return false;
    if (point.bestMove !== undefined) {
      if (!isRecord(point.bestMove) || typeof point.bestMove.uci !== "string") {
        return false;
      }
      if (
        point.bestMove.san !== undefined &&
        typeof point.bestMove.san !== "string"
      ) {
        return false;
      }
    }
  }

  return true;
}

export function evalToCentipawns(evalScore: EngineEval | undefined): number {
  if (!evalScore) return 0;
  if (evalScore.type === "cp") return evalScore.value;
  return evalScore.value >= 0 ? 10000 : -10000;
}

export function evalToPawns(evalScore: EngineEval | undefined): number | null {
  if (!evalScore) return null;
  return evalToCentipawns(evalScore) / 100;
}
