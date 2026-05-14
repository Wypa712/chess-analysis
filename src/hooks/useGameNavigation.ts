"use client";

import { useCallback, useState } from "react";

function clampMove(index: number, totalMoves: number): number {
  return Math.min(Math.max(index, -1), Math.max(-1, totalMoves - 1));
}

export function useGameNavigation({ totalMoves }: { totalMoves: number }) {
  const [currentMove, setCurrentMove] = useState(-1);

  const goFirst = useCallback(() => {
    setCurrentMove(-1);
  }, []);

  const goPrev = useCallback(() => {
    setCurrentMove((move) => clampMove(move - 1, totalMoves));
  }, [totalMoves]);

  const goNext = useCallback(() => {
    setCurrentMove((move) => clampMove(move + 1, totalMoves));
  }, [totalMoves]);

  const goLast = useCallback(() => {
    setCurrentMove(clampMove(totalMoves - 1, totalMoves));
  }, [totalMoves]);

  const goToMove = useCallback((index: number) => {
    setCurrentMove(clampMove(index, totalMoves));
  }, [totalMoves]);

  return {
    currentMove,
    goFirst,
    goPrev,
    goNext,
    goLast,
    goToMove,
    resetToStart: goFirst,
  };
}
