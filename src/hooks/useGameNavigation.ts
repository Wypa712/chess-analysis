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
    setCurrentMove((prev) => {
      if (prev !== -1) onSoundTrigger?.(-1);
      return -1;
    });
  }, [onSoundTrigger]);

  // No sound on backward navigation — playing the "arriving" move sound in
  // reverse direction is semantically misleading (WR-03).
  const goPrev = useCallback(() => {
    setCurrentMove((move) => clampMove(move - 1, totalMoves));
  }, [totalMoves]);

  const goNext = useCallback(() => {
    setCurrentMove((move) => {
      const next = clampMove(move + 1, totalMoves);
      if (next !== move) onSoundTrigger?.(next);
      return next;
    });
  }, [totalMoves, onSoundTrigger]);

  const goLast = useCallback(() => {
    setCurrentMove((prev) => {
      const next = clampMove(totalMoves - 1, totalMoves);
      if (prev !== next) onSoundTrigger?.(next);
      return next;
    });
  }, [totalMoves, onSoundTrigger]);

  const goToMove = useCallback((index: number) => {
    const next = clampMove(index, totalMoves);
    setCurrentMove((prev) => {
      if (prev !== next) onSoundTrigger?.(next);
      return next;
    });
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
