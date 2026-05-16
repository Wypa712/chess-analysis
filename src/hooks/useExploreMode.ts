"use client";

import { useCallback, useRef, useState } from "react";
import { Chess } from "chess.js";

import type {
  ExploreEvalResult,
  ExploreMove,
} from "@/app/(app)/games/[id]/types";

type UseExploreModeOptions = {
  getMainlineFen: () => string;
  analyzeSinglePosition: (fen: string) => Promise<ExploreEvalResult>;
  onEnterExplore?: () => void;
  onExitExplore?: () => void;
  onExploreMove?: (san: string, isCapture: boolean, isCheck: boolean, isCastle: boolean, isGameOver: boolean) => void;
};

export function useExploreMode({
  getMainlineFen,
  analyzeSinglePosition,
  onEnterExplore,
  onExitExplore,
  onExploreMove,
}: UseExploreModeOptions) {
  const exploreAnalysisRequestRef = useRef(0);
  const [exploreMode, setExploreMode] = useState(false);
  const [explorationChess, setExplorationChess] = useState<Chess | null>(null);
  const [explorationMoves, setExplorationMoves] = useState<ExploreMove[]>([]);
  const [exploreEvalResult, setExploreEvalResult] =
    useState<ExploreEvalResult | null>(null);
  const [exploreAnalyzing, setExploreAnalyzing] = useState(false);

  const runExploreAnalysis = useCallback(async (fen: string) => {
    const requestId = ++exploreAnalysisRequestRef.current;
    setExploreEvalResult(null);
    setExploreAnalyzing(true);
    try {
      const result = await analyzeSinglePosition(fen);
      if (exploreAnalysisRequestRef.current === requestId) {
        setExploreEvalResult(result);
      }
    } catch {
      // Keep explore mode usable even if a speculative engine call fails.
    } finally {
      if (exploreAnalysisRequestRef.current === requestId) {
        setExploreAnalyzing(false);
      }
    }
  }, [analyzeSinglePosition]);

  const exitExploreMode = useCallback(() => {
    exploreAnalysisRequestRef.current += 1;
    setExploreMode(false);
    setExplorationChess(null);
    setExplorationMoves([]);
    setExploreEvalResult(null);
    setExploreAnalyzing(false);
    onExitExplore?.();
  }, [onExitExplore]);

  const enterExploreMode = useCallback(() => {
    const baseFen = getMainlineFen();
    const chess = new Chess(baseFen === "start" ? undefined : baseFen);
    setExploreMode(true);
    setExplorationChess(chess);
    setExplorationMoves([]);
    onEnterExplore?.();
    void runExploreAnalysis(chess.fen());
  }, [getMainlineFen, onEnterExplore, runExploreAnalysis]);

  const replayExploreMoves = useCallback((movesToReplay: ExploreMove[]) => {
    if (movesToReplay.length === 0) {
      exitExploreMode();
      return;
    }

    const baseFen = getMainlineFen();
    const chess = new Chess(baseFen === "start" ? undefined : baseFen);
    for (const move of movesToReplay) {
      // D-09: queen-only promotion - see separate fix.
      chess.move({ from: move.from, to: move.to, promotion: "q" });
    }

    setExploreMode(true);
    setExplorationChess(chess);
    setExplorationMoves(movesToReplay);
    onEnterExplore?.();
    void runExploreAnalysis(chess.fen());
  }, [exitExploreMode, getMainlineFen, onEnterExplore, runExploreAnalysis]);

  const stepExploreBackward = useCallback(() => {
    if (!exploreMode) return false;
    replayExploreMoves(explorationMoves.slice(0, -1));
    return true;
  }, [exploreMode, explorationMoves, replayExploreMoves]);

  const handleBoardDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    const sourceFen = explorationChess?.fen() ?? getMainlineFen();
    const chessCopy = new Chess(sourceFen === "start" ? undefined : sourceFen);
    let move: ReturnType<Chess["move"]>;
    try {
      // D-09: queen-only promotion - see separate fix.
      move = chessCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
    } catch {
      return false;
    }

    const newMove: ExploreMove = {
      san: move.san,
      from: move.from,
      to: move.to,
      uci: `${move.from}${move.to}${move.promotion ?? ""}`,
    };

    // Determine sound parameters from move result
    const flags = move.flags;
    const isCapture = flags.includes("c") || flags.includes("e"); // capture or en-passant
    const isCastle = flags.includes("k") || flags.includes("q"); // kingside or queenside
    const isCheck = chessCopy.isCheck();
    const isGameOver = chessCopy.isGameOver();
    onExploreMove?.(move.san, isCapture, isCheck, isCastle, isGameOver);

    setExplorationChess(chessCopy);
    setExplorationMoves((prev) => (exploreMode ? [...prev, newMove] : [newMove]));
    setExploreMode(true);
    onEnterExplore?.();
    void runExploreAnalysis(chessCopy.fen());
    return true;
  }, [
    explorationChess,
    exploreMode,
    getMainlineFen,
    onEnterExplore,
    onExploreMove,
    runExploreAnalysis,
  ]);

  return {
    exploreMode,
    explorationChess,
    explorationMoves,
    exploreEvalResult,
    exploreAnalyzing,
    enterExploreMode,
    exitExploreMode,
    handleBoardDrop,
    runExploreAnalysis,
    stepExploreBackward,
  };
}
