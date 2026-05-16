"use client";

import { useCallback, useEffect, useRef } from "react";

// Percussion-style chess sounds via filtered white noise — mimics wooden piece
// on wooden board.  Priority order: gameOver > check > castle > capture > move.
// Debounce (30 ms) prevents queued sounds during rapid navigation.
// Single shared AudioContext per hook instance to stay within browser limit.

type PlayMoveSoundParams = {
  isCapture?: boolean;
  isCheck?: boolean;
  isCastle?: boolean;
  isGameOver?: boolean;
};

type NoiseLayer = {
  startAt: number;
  duration: number;
  freq: number;
  q: number;
  gain: number;
};

function playNoise(ctx: AudioContext, layers: NoiseLayer[]) {
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  for (const { startAt, duration, freq, q, gain } of layers) {
    const bufferSize = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;

    const amp = ctx.createGain();
    const t0 = ctx.currentTime + startAt;
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    source.start(t0);
    source.stop(t0 + duration + 0.01);
  }
}

// ── Sound recipes ────────────────────────────────────────────────────────────

function soundMove(ctx: AudioContext) {
  playNoise(ctx, [
    { startAt: 0,    duration: 0.055, freq: 3500, q: 1.5, gain: 0.50 },
    { startAt: 0,    duration: 0.060, freq:  700, q: 2.0, gain: 0.18 },
  ]);
}

function soundCapture(ctx: AudioContext) {
  playNoise(ctx, [
    { startAt: 0,    duration: 0.080, freq: 2000, q: 1.0, gain: 0.60 },
    { startAt: 0,    duration: 0.100, freq:  400, q: 1.5, gain: 0.35 },
  ]);
}

function soundCheck(ctx: AudioContext) {
  // Move click + two short high-freq accents
  playNoise(ctx, [
    { startAt: 0,    duration: 0.055, freq: 3500, q: 1.5, gain: 0.50 },
    { startAt: 0,    duration: 0.060, freq:  700, q: 2.0, gain: 0.18 },
    { startAt: 0.08, duration: 0.030, freq: 5500, q: 0.8, gain: 0.30 },
    { startAt: 0.14, duration: 0.030, freq: 5500, q: 0.8, gain: 0.20 },
  ]);
}

function soundCastle(ctx: AudioContext) {
  // Two piece-place clicks with a short offset
  playNoise(ctx, [
    { startAt: 0,    duration: 0.055, freq: 3500, q: 1.5, gain: 0.50 },
    { startAt: 0,    duration: 0.060, freq:  700, q: 2.0, gain: 0.18 },
    { startAt: 0.13, duration: 0.055, freq: 3500, q: 1.5, gain: 0.40 },
    { startAt: 0.13, duration: 0.060, freq:  700, q: 2.0, gain: 0.14 },
  ]);
}

function soundGameEnd(ctx: AudioContext) {
  // Heavy final thud + deep resonance
  playNoise(ctx, [
    { startAt: 0,    duration: 0.120, freq: 1200, q: 1.0, gain: 0.70 },
    { startAt: 0,    duration: 0.250, freq:  250, q: 1.5, gain: 0.50 },
  ]);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

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
        if (isGameOver)       soundGameEnd(ctx);
        else if (isCheck)     soundCheck(ctx);
        else if (isCastle)    soundCastle(ctx);
        else if (isCapture)   soundCapture(ctx);
        else                  soundMove(ctx);
      }, 30);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { playMoveSound };
}
