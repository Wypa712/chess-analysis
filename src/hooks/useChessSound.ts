"use client";

import { useCallback, useEffect, useRef } from "react";

// Synthesised chess sounds via Web Audio API — no external dependency needed.
// Priority order: gameOver > check > castle > capture > move  (D-13)
//
// Debounce: each playMoveSound call cancels a pending timeout so rapid
// navigation does not accumulate queued sounds  (T-14-03).
//
// Single shared AudioContext per hook instance — avoids browser limit on
// concurrent contexts (Chrome: 6) during rapid navigation.

type PlayMoveSoundParams = {
  isCapture?: boolean;
  isCheck?: boolean;
  isCastle?: boolean;
  isGameOver?: boolean;
};

/** Play a short synthesised tone using Web Audio API. */
function playTone(
  ctx: AudioContext,
  notes: { freq: number; startAt: number; duration: number; gain?: number }[]
) {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.18, ctx.currentTime);
  masterGain.connect(ctx.destination);

  for (const { freq, startAt, duration, gain = 1 } of notes) {
    const osc = ctx.createOscillator();
    const ampGain = ctx.createGain();
    osc.connect(ampGain);
    ampGain.connect(masterGain);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);

    const t0 = ctx.currentTime + startAt;
    ampGain.gain.setValueAtTime(0, t0);
    ampGain.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    ampGain.gain.linearRampToValueAtTime(0, t0 + duration);

    osc.start(t0);
    osc.stop(t0 + duration + 0.01);
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────────

export function useChessSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pendingRef.current !== null) clearTimeout(pendingRef.current);
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  function getOrCreateCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
      }
      if (ctxRef.current.state === "suspended") {
        ctxRef.current.resume().catch(() => {});
      }
      return ctxRef.current;
    } catch {
      return null;
    }
  }

  const playMoveSound = useCallback(
    ({ isCapture, isCheck, isCastle, isGameOver }: PlayMoveSoundParams) => {
      if (pendingRef.current !== null) {
        clearTimeout(pendingRef.current);
        pendingRef.current = null;
      }

      pendingRef.current = setTimeout(() => {
        pendingRef.current = null;
        const ctx = getOrCreateCtx();
        if (!ctx) return;

        // Priority: gameOver > check > castle > capture > move
        if (isGameOver) {
          playTone(ctx, [
            { freq: 523, startAt: 0,    duration: 0.12 },
            { freq: 440, startAt: 0.13, duration: 0.12 },
            { freq: 349, startAt: 0.26, duration: 0.18 },
          ]);
        } else if (isCheck) {
          playTone(ctx, [
            { freq: 1046, startAt: 0,    duration: 0.07 },
            { freq: 1318, startAt: 0.07, duration: 0.07 },
            { freq: 1046, startAt: 0.14, duration: 0.09 },
          ]);
        } else if (isCastle) {
          playTone(ctx, [
            { freq: 700, startAt: 0,   duration: 0.06 },
            { freq: 750, startAt: 0.1, duration: 0.06 },
          ]);
        } else if (isCapture) {
          playTone(ctx, [
            { freq: 440,  startAt: 0,    duration: 0.05 },
            { freq: 330,  startAt: 0.04, duration: 0.07 },
            { freq: 220,  startAt: 0.09, duration: 0.1  },
          ]);
        } else {
          playTone(ctx, [
            { freq: 880, startAt: 0,    duration: 0.06 },
            { freq: 660, startAt: 0.06, duration: 0.08 },
          ]);
        }
      }, 30);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { playMoveSound };
}
