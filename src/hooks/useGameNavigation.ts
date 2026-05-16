"use client";

import { useCallback, useState } from "react";

function clampMove(index: number, totalMoves: number): number {
  return Math.min(Math.max(index, -1), Math.max(-1, totalMoves - 1));
}

type UseGameNavigationOptions = {
  totalMoves: number;
  onSoundTrigger?: (newMoveIndex: number) => void;
};

export function useGameNavigation({ totalMoves, onSoundTrigger }: UseGameNavigationOptions) {
  const [currentMove, setCurrentMove] = useState(-1);

  const goFirst = useCallback(() => {
    setCurrentMove(-1);
    onSoundTrigger?.(-1);
  }, [onSoundTrigger]);

  const goPrev = useCallback(() => {
    setCurrentMove((move) => {
      const next = clampMove(move - 1, totalMoves);
      onSoundTrigger?.(next);
      return next;
    });
  }, [totalMoves, onSoundTrigger]);

  const goNext = useCallback(() => {
    setCurrentMove((move) => {
      const next = clampMove(move + 1, totalMoves);
      onSoundTrigger?.(next);
      return next;
    });
  }, [totalMoves, onSoundTrigger]);

  const goLast = useCallback(() => {
    const next = clampMove(totalMoves - 1, totalMoves);
    setCurrentMove(next);
    onSoundTrigger?.(next);
  }, [totalMoves, onSoundTrigger]);

  const goToMove = useCallback((index: number) => {
    const next = clampMove(index, totalMoves);
    setCurrentMove(next);
    onSoundTrigger?.(next);
  }, [totalMoves, onSoundTrigger]);

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
