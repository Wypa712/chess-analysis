"use client";

import { useRef } from "react";
import { Chess } from "chess.js";
import {
  STOCKFISH_DEPTH,
  type EngineEval,
} from "@/lib/chess/engine-analysis";

export type CandidateMove = {
  rank: number;
  eval: EngineEval;
  uci: string;
  san?: string;
};

export type GamePosition = {
  fenBefore: string;
  fen: string;
  san: string;
  moveNumber: number;
  from: string;
  to: string;
  uci: string;
  color: "w" | "b";
};

export type RawResult = {
  eval: EngineEval;
  bestMove?: {
    uci: string;
    san?: string;
  };
};

type TrackFn = (id: number) => number;
type ClearFn = (id: number) => void;

export type StockfishAnalysisWorker = {
  waitForReady: (signal?: AbortSignal) => Promise<void>;
  analyzePosition: (fen: string, signal?: AbortSignal) => Promise<RawResult>;
  terminate: () => void;
};

export type StockfishExploreWorker = {
  waitForReady: (signal?: AbortSignal) => Promise<void>;
  analyzePosition: (
    fen: string,
    signal?: AbortSignal
  ) => Promise<RawResult & { candidates?: CandidateMove[] }>;
  terminate: () => void;
};

function sideToMove(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

function normalizeEval(score: EngineEval, fen: string): EngineEval {
  const multiplier = sideToMove(fen) === "w" ? 1 : -1;
  return {
    type: score.type,
    value: score.value * multiplier,
  };
}

function bestMoveSan(fen: string, uci: string): string | undefined {
  if (uci.length < 4) return undefined;

  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
    return move?.san;
  } catch {
    return undefined;
  }
}

function waitForInit(
  worker: Worker,
  track: TrackFn,
  clear: ClearFn,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Stockfish initialization canceled"));
      return;
    }

    let uciOk = false;
    const timeout = track(window.setTimeout(() => {
      cleanup();
      reject(new Error("Stockfish initialization timed out"));
    }, 10000));

    const cleanup = () => {
      clear(timeout);
      worker.removeEventListener("message", handler);
      worker.removeEventListener("error", handleError);
      signal?.removeEventListener("abort", handleAbort);
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Stockfish worker failed to initialize"));
    };

    const handleAbort = () => {
      cleanup();
      reject(new Error("Stockfish initialization canceled"));
    };

    const handler = (e: MessageEvent<string>) => {
      if (e.data === "uciok" && !uciOk) {
        uciOk = true;
        worker.postMessage("isready");
      } else if (e.data === "readyok") {
        cleanup();
        resolve();
      }
    };

    worker.addEventListener("message", handler);
    worker.addEventListener("error", handleError);
    signal?.addEventListener("abort", handleAbort, { once: true });
    worker.postMessage("uci");
  });
}

function analyzePosition(
  worker: Worker,
  fen: string,
  track: TrackFn,
  clear: ClearFn,
  signal?: AbortSignal
): Promise<RawResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Stockfish position analysis canceled"));
      return;
    }

    let latestScore: EngineEval = { type: "cp", value: 0 };
    const timeout = track(window.setTimeout(() => {
      cleanup();
      reject(new Error("Stockfish position analysis timed out"));
    }, 60000));

    const cleanup = () => {
      clear(timeout);
      worker.removeEventListener("message", handler);
      worker.removeEventListener("error", handleError);
      signal?.removeEventListener("abort", handleAbort);
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Stockfish worker failed during analysis"));
    };

    const handleAbort = () => {
      cleanup();
      reject(new Error("Stockfish position analysis canceled"));
    };

    const handler = (e: MessageEvent<string>) => {
      const msg = e.data;

      if (msg.startsWith("info") && msg.includes("score")) {
        const cpMatch = msg.match(/score cp (-?\d+)/);
        const mateMatch = msg.match(/score mate (-?\d+)/);
        if (cpMatch) {
          latestScore = {
            type: "cp",
            value: parseInt(cpMatch[1], 10),
          };
        } else if (mateMatch) {
          latestScore = {
            type: "mate",
            value: parseInt(mateMatch[1], 10),
          };
        }
      }

      if (msg.startsWith("bestmove")) {
        cleanup();
        const uci = msg.split(" ")[1] ?? "";
        const normalizedEval = normalizeEval(latestScore, fen);

        if (!uci || uci === "(none)") {
          resolve({ eval: normalizedEval });
          return;
        }

        resolve({
          eval: normalizedEval,
          bestMove: {
            uci,
            san: bestMoveSan(fen, uci),
          },
        });
      }
    };

    worker.addEventListener("message", handler);
    worker.addEventListener("error", handleError);
    signal?.addEventListener("abort", handleAbort, { once: true });
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${STOCKFISH_DEPTH}`);
  });
}

const EXPLORE_MULTI_PV = 3;

function analyzePositionMultiPV(
  worker: Worker,
  fen: string,
  track: TrackFn,
  clear: ClearFn,
  signal?: AbortSignal
): Promise<RawResult & { candidates?: CandidateMove[] }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Stockfish MultiPV analysis canceled"));
      return;
    }

    const latestByRank = new Map<number, { eval: EngineEval; uci: string }>();

    const timeout = track(window.setTimeout(() => {
      cleanup();
      reject(new Error("Stockfish MultiPV timed out"));
    }, 60000));

    const cleanup = () => {
      clear(timeout);
      worker.removeEventListener("message", handler);
      worker.removeEventListener("error", handleError);
      signal?.removeEventListener("abort", handleAbort);
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Stockfish worker failed during MultiPV analysis"));
    };

    const handleAbort = () => {
      cleanup();
      reject(new Error("Stockfish MultiPV analysis canceled"));
    };

    const handler = (e: MessageEvent<string>) => {
      const msg = e.data;

      if (msg.startsWith("info") && msg.includes("multipv") && msg.includes("score")) {
        const mpvMatch = msg.match(/multipv (\d+)/);
        const cpMatch = msg.match(/score cp (-?\d+)/);
        const mateMatch = msg.match(/score mate (-?\d+)/);
        const pvMatch = msg.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);

        if (mpvMatch && pvMatch) {
          const rank = parseInt(mpvMatch[1], 10);
          const uci = pvMatch[1];
          let score: EngineEval = { type: "cp", value: 0 };
          if (cpMatch) score = { type: "cp", value: parseInt(cpMatch[1], 10) };
          else if (mateMatch) score = { type: "mate", value: parseInt(mateMatch[1], 10) };
          latestByRank.set(rank, { eval: score, uci });
        }
      }

      if (msg.startsWith("bestmove")) {
        cleanup();

        if (latestByRank.size === 0) {
          resolve({ eval: { type: "cp", value: 0 } });
          return;
        }

        const rank1 = latestByRank.get(1);
        const normalizedRank1Eval = normalizeEval(
          rank1?.eval ?? { type: "cp", value: 0 },
          fen
        );

        const candidates: CandidateMove[] = Array.from(latestByRank.entries())
          .sort(([a], [b]) => a - b)
          .map(([rank, c]) => ({
            rank,
            eval: normalizeEval(c.eval, fen),
            uci: c.uci,
            san: bestMoveSan(fen, c.uci),
          }));

        resolve({
          eval: normalizedRank1Eval,
          bestMove: rank1
            ? { uci: rank1.uci, san: bestMoveSan(fen, rank1.uci) }
            : undefined,
          candidates,
        });
      }
    };

    worker.addEventListener("message", handler);
    worker.addEventListener("error", handleError);
    signal?.addEventListener("abort", handleAbort, { once: true });

    worker.postMessage(`setoption name MultiPV value ${EXPLORE_MULTI_PV}`);
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${STOCKFISH_DEPTH}`);
  });
}

export function useStockfishWorker() {
  const timeoutsRef = useRef<Set<number>>(new Set());

  function trackTimeout(id: number) {
    timeoutsRef.current.add(id);
    return id;
  }

  function clearTrackedTimeout(id: number) {
    window.clearTimeout(id);
    timeoutsRef.current.delete(id);
  }

  function createAnalysisWorker(): StockfishAnalysisWorker {
    const worker = new Worker("/stockfish.js");
    // Use a shared promise so concurrent callers share one initialization call
    // rather than each sending their own `uci` command to the worker.
    let readyPromise: Promise<void> | null = null;

    return {
      waitForReady: async (signal?: AbortSignal) => {
        if (!readyPromise) {
          readyPromise = waitForInit(worker, trackTimeout, clearTrackedTimeout, signal);
        }
        await readyPromise;
      },
      analyzePosition: (fen: string, signal?: AbortSignal) =>
        analyzePosition(worker, fen, trackTimeout, clearTrackedTimeout, signal),
      terminate: () => worker.terminate(),
    };
  }

  function createExploreWorker(): StockfishExploreWorker {
    const worker = new Worker("/stockfish.js");
    // Use a shared promise so concurrent callers share one initialization call
    // rather than each sending their own `uci` command to the worker.
    let readyPromise: Promise<void> | null = null;

    return {
      waitForReady: async (signal?: AbortSignal) => {
        if (!readyPromise) {
          readyPromise = waitForInit(worker, trackTimeout, clearTrackedTimeout, signal);
        }
        await readyPromise;
      },
      analyzePosition: (fen: string, signal?: AbortSignal) =>
        analyzePositionMultiPV(worker, fen, trackTimeout, clearTrackedTimeout, signal),
      terminate: () => worker.terminate(),
    };
  }

  function clearTimers() {
    for (const id of timeoutsRef.current) window.clearTimeout(id);
    timeoutsRef.current.clear();
  }

  return { createAnalysisWorker, createExploreWorker, clearTimers };
}
