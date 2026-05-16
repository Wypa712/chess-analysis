"use client";

import { useCallback, useRef } from "react";

// Real chess sounds from Lichess (AGPL) — /public/sounds/*.ogg
// Priority order: gameOver > check > castle > capture > move

type PlayMoveSoundParams = {
  isCapture?: boolean;
  isCheck?: boolean;
  isCastle?: boolean;
  isGameOver?: boolean;
};

const SOUNDS = {
  move:     "/sounds/Move.ogg",
  capture:  "/sounds/Capture.ogg",
  check:    "/sounds/Check.ogg",    // sfx set — real file
  gameOver: "/sounds/Victory.ogg",  // sfx set — real file
} as const;

// Preload all sounds once at module level so first play is instant.
const cache: Record<string, HTMLAudioElement> = {};
if (typeof window !== "undefined") {
  for (const [key, src] of Object.entries(SOUNDS)) {
    const el = new Audio(src);
    el.preload = "auto";
    cache[key] = el;
  }
}

function playSound(key: keyof typeof SOUNDS) {
  const el = cache[key];
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {});
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useChessSound() {
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playMoveSound = useCallback(
    ({ isCapture, isCheck, isCastle, isGameOver }: PlayMoveSoundParams) => {
      if (pendingRef.current !== null) {
        clearTimeout(pendingRef.current);
        pendingRef.current = null;
      }
      pendingRef.current = setTimeout(() => {
        pendingRef.current = null;
        if (isGameOver)     playSound("gameOver");
        else if (isCheck)   playSound("check");
        else if (isCastle)  playSound("move");   // Lichess uses move sound for castle
        else if (isCapture) playSound("capture");
        else                playSound("move");
      }, 30);
    },
    []
  );

  return { playMoveSound };
}
