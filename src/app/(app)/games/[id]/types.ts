import type { EngineEval } from "@/lib/chess/engine-analysis";
import type { CandidateMove } from "@/hooks/useStockfish";

export const PHASE_OPENING_END_PLY = 21;
export const PHASE_MIDDLEGAME_END_PLY = 61;

export type MovePair = { num: number; white?: string; black?: string };

export type ExploreMove = { san: string; from: string; to: string; uci: string };

export type GameData = {
  id: string;
  pgn: string;
  result: "win" | "loss" | "draw";
  color: "white" | "black";
  opponent: string;
  opponentRating: number | null;
  playerRating: number | null;
  openingName: string | null;
  timeControl: string | null;
  playedAt: string;
  moveCount: number;
};

export type TrailDragState = {
  active: boolean;
  moved: boolean;
  suppressClick: boolean;
  startX: number;
  scrollLeft: number;
};

export type ExploreEvalResult = {
  eval: EngineEval;
  bestMove?: { uci: string; san?: string };
  candidates: CandidateMove[];
};
