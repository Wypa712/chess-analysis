"use client";

import { useGameAnalysis } from "@/hooks/useGameAnalysis";
import {
  useStockfishWorker,
  type CandidateMove,
  type GamePosition,
  type RawResult,
} from "@/hooks/useStockfishWorker";
import type {
  EngineAnalysisJsonV1,
  MoveClassification,
} from "@/lib/chess/engine-analysis";

export type {
  CandidateMove,
  EngineAnalysisJsonV1,
  GamePosition,
  MoveClassification,
  RawResult,
};

export function useStockfish() {
  const workerFactory = useStockfishWorker();
  return useGameAnalysis(workerFactory);
}
