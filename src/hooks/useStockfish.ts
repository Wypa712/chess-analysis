"use client";

import { useRef } from "react";
import { Chess } from "chess.js";
import {
  STOCKFISH_DEPTH,
  STOCKFISH_ENGINE_NAME,
  STOCKFISH_ENGINE_VERSION,
  STOCKFISH_PROFILE_KEY,
  evalToCentipawns,
  type EngineAnalysisJsonV1,
  type EngineEval,
  type MoveClassification,
} from "@/lib/chess/engine-analysis";

export type { EngineAnalysisJsonV1, MoveClassification };

export type CandidateMove = {
  rank: number;
  eval: EngineEval;
  uci: string;
  san?: string;
};

type GamePosition = {
  fenBefore: string;
  fen: string;
  san: string;
  moveNumber: number;
  from: string;
  to: string;
  uci: string;
  color: "w" | "b";
};

type RawResult = {
  eval: EngineEval;
  bestMove?: {
    uci: string;
    san?: string;
  };
};

function sideToMove(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

function normalizeEval(
  score: EngineEval,
  fen: string
): EngineEval {
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

type TrackFn = (id: number) => number;
type ClearFn = (id: number) => void;

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
        const mpvMatch  = msg.match(/multipv (\d+)/);
        const cpMatch   = msg.match(/score cp (-?\d+)/);
        const mateMatch = msg.match(/score mate (-?\d+)/);
        const pvMatch   = msg.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);

        if (mpvMatch && pvMatch) {
          const rank = parseInt(mpvMatch[1], 10);
          const uci  = pvMatch[1];
          let score: EngineEval = { type: "cp", value: 0 };
          if (cpMatch)        score = { type: "cp",   value: parseInt(cpMatch[1], 10) };
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

function classify(cpLoss: number, playedBest: boolean): MoveClassification {
  if (playedBest) return "best";
  if (cpLoss <= 30) return "good";
  if (cpLoss <= 100) return "inaccuracy";
  if (cpLoss <= 300) return "mistake";
  return "blunder";
}

function evalToWhiteWinProbability(evalScore: EngineEval | undefined): number {
  const cp = Math.max(-1200, Math.min(1200, evalToCentipawns(evalScore)));
  return 100 / (1 + Math.exp(-0.00368208 * cp));
}

function calcWinProbabilityLoss(
  evalBefore: EngineEval | undefined,
  evalAfter: EngineEval | undefined,
  isWhite: boolean
): number {
  const before = evalToWhiteWinProbability(evalBefore);
  const after = evalToWhiteWinProbability(evalAfter);
  const loss = isWhite ? before - after : after - before;
  return Math.max(0, loss);
}

function calcAccuracy(winProbabilityLosses: number[]): number {
  if (winProbabilityLosses.length === 0) return 100;
  const avgLoss =
    winProbabilityLosses.reduce((a, b) => a + b, 0) /
    winProbabilityLosses.length;
  const raw = 103.1668 * Math.exp(-0.04354 * avgLoss) - 3.1669;
  return Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;
}

function keyMomentType(
  classification: MoveClassification
): EngineAnalysisJsonV1["keyMoments"][number]["type"] {
  if (classification === "blunder") return "blunder";
  if (classification === "mistake") return "turning_point";
  return "missed_tactic";
}

function keyMomentTitle(classification: MoveClassification): string {
  if (classification === "blunder") return "Груба помилка";
  if (classification === "mistake") return "Помилка";
  return "Різка зміна оцінки";
}

function keyMomentDesc(
  classification: MoveClassification,
  moveNum: number,
  color: "w" | "b",
  cpLoss: number
): string {
  const who = color === "w" ? "Білі" : "Чорні";
  const loss = Math.round(cpLoss);
  if (classification === "blunder") {
    return `${who} різко погіршили позицію на ${loss}cp (хід ${moveNum}).`;
  }
  if (classification === "mistake") {
    return `${who} втратили перевагу або захист на ${loss}cp (хід ${moveNum}).`;
  }
  return `${who} допустили помітну неточність на ${loss}cp (хід ${moveNum}).`;
}

function buildSummary(
  moves: EngineAnalysisJsonV1["moves"]
): EngineAnalysisJsonV1["summary"] {
  return {
    bestMoveCount: moves.filter((m) => m.classification === "best").length,
    goodMoveCount: moves.filter((m) => m.classification === "good").length,
    inaccuracyCount: moves.filter((m) => m.classification === "inaccuracy")
      .length,
    mistakeCount: moves.filter((m) => m.classification === "mistake").length,
    blunderCount: moves.filter((m) => m.classification === "blunder").length,
  };
}

export function useStockfish() {
  const gameWorkerRef = useRef<Worker | null>(null);
  const gameReadyRef = useRef(false);
  const exploreWorkerRef = useRef<Worker | null>(null);
  const exploreReadyRef = useRef(false);
  const exploreAbortRef = useRef<AbortController | null>(null);
  const timeoutsRef = useRef<Set<number>>(new Set());
  const analysisQueueRef = useRef<Promise<void>>(Promise.resolve());

  function trackTimeout(id: number) {
    timeoutsRef.current.add(id);
    return id;
  }

  function clearTrackedTimeout(id: number) {
    window.clearTimeout(id);
    timeoutsRef.current.delete(id);
  }

  function getGameWorker(): Worker {
    if (!gameWorkerRef.current) {
      gameWorkerRef.current = new Worker("/stockfish.js");
      gameReadyRef.current = false;
    }
    return gameWorkerRef.current;
  }

  function getExploreWorker(): Worker {
    if (!exploreWorkerRef.current) {
      exploreWorkerRef.current = new Worker("/stockfish.js");
      exploreReadyRef.current = false;
    }
    return exploreWorkerRef.current;
  }

  function cancelExploreWorker(force = false) {
    const hadActiveRequest = exploreAbortRef.current !== null;
    exploreAbortRef.current?.abort();
    exploreAbortRef.current = null;
    if (hadActiveRequest || force) {
      exploreWorkerRef.current?.terminate();
      exploreWorkerRef.current = null;
      exploreReadyRef.current = false;
    }
  }

  async function withAnalysisLock<T>(task: () => Promise<T>): Promise<T> {
    const previous = analysisQueueRef.current;
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    analysisQueueRef.current = previous
      .catch(() => undefined)
      .then(() => current);

    await previous.catch(() => undefined);

    try {
      return await task();
    } finally {
      release();
    }
  }

  async function analyzeGame(
    startFen: string,
    positions: GamePosition[],
    playerColor: "white" | "black",
    onProgress: (pct: number) => void
  ): Promise<EngineAnalysisJsonV1> {
    return withAnalysisLock(async () => {
      const worker = getGameWorker();

      if (!gameReadyRef.current) {
        await waitForInit(worker, trackTimeout, clearTrackedTimeout);
        gameReadyRef.current = true;
      }

      const fens = [startFen, ...positions.map((p) => p.fen)];
      const raw: RawResult[] = [];

      for (let i = 0; i < fens.length; i++) {
        raw.push(await analyzePosition(worker, fens[i], trackTimeout, clearTrackedTimeout));
        onProgress(Math.round(((i + 1) / fens.length) * 100));
      }

      const whiteWinProbabilityLosses: number[] = [];
      const blackWinProbabilityLosses: number[] = [];
      const keyMoments: EngineAnalysisJsonV1["keyMoments"] = [];

      const moves: EngineAnalysisJsonV1["moves"] = positions.map((pos, i) => {
        const evalBefore = raw[i].eval;
        const evalAfter = raw[i + 1].eval;
        const evalBeforeCp = evalToCentipawns(evalBefore);
        const evalAfterCp = evalToCentipawns(evalAfter);

        const isWhite = pos.color === "w";
        const cpLoss = isWhite
          ? Math.max(0, evalBeforeCp - evalAfterCp)
          : Math.max(0, evalAfterCp - evalBeforeCp);
        const winProbabilityLoss = calcWinProbabilityLoss(
          evalBefore,
          evalAfter,
          isWhite
        );
        const playedBest = pos.uci === raw[i].bestMove?.uci;
        const classification = classify(cpLoss, playedBest);
        const color = isWhite ? "white" : "black";

        if (isWhite) whiteWinProbabilityLosses.push(winProbabilityLoss);
        else blackWinProbabilityLosses.push(winProbabilityLoss);

        if (cpLoss >= 150) {
          keyMoments.push({
            ply: i + 1,
            moveNumber: pos.moveNumber,
            color,
            type: keyMomentType(classification),
            title: keyMomentTitle(classification),
            description: keyMomentDesc(
              classification,
              pos.moveNumber,
              pos.color,
              cpLoss
            ),
          });
        }

        return {
          ply: i + 1,
          moveNumber: pos.moveNumber,
          color,
          san: pos.san,
          uci: pos.uci,
          fenBefore: pos.fenBefore,
          fenAfter: pos.fen,
          evalBefore,
          evalAfter,
          bestMove: raw[i].bestMove,
          classification,
          centipawnLoss: Math.round(cpLoss),
          winProbabilityLoss: Math.round(winProbabilityLoss * 10) / 10,
        };
      });

      const whiteAccuracy = calcAccuracy(whiteWinProbabilityLosses);
      const blackAccuracy = calcAccuracy(blackWinProbabilityLosses);
      const playerAccuracy =
        playerColor === "white" ? whiteAccuracy : blackAccuracy;
      const opponentAccuracy =
        playerColor === "white" ? blackAccuracy : whiteAccuracy;

      return {
        version: 1,
        profileKey: STOCKFISH_PROFILE_KEY,
        engine: {
          name: STOCKFISH_ENGINE_NAME,
          version: STOCKFISH_ENGINE_VERSION,
          depth: STOCKFISH_DEPTH,
        },
        accuracy: {
          white: whiteAccuracy,
          black: blackAccuracy,
          player: playerAccuracy,
          opponent: opponentAccuracy,
        },
        summary: buildSummary(moves),
        moves,
        keyMoments,
        evalGraph: raw.map((result, i) => ({
          ply: i,
          eval: result.eval,
          bestMove: result.bestMove,
        })),
      };
    });
  }

  async function analyzeSinglePosition(
    fen: string
  ): Promise<{ eval: EngineEval; bestMove?: { uci: string; san?: string }; candidates: CandidateMove[] }> {
    cancelExploreWorker();

    const controller = new AbortController();
    exploreAbortRef.current = controller;
    const worker = getExploreWorker();

    try {
      if (!exploreReadyRef.current) {
        await waitForInit(
          worker,
          trackTimeout,
          clearTrackedTimeout,
          controller.signal
        );
        exploreReadyRef.current = true;
      }

      const result = await analyzePositionMultiPV(
        worker,
        fen,
        trackTimeout,
        clearTrackedTimeout,
        controller.signal
      );

      return {
        eval: result.eval,
        bestMove: result.bestMove,
        candidates: result.candidates ?? [],
      };
    } finally {
      if (exploreAbortRef.current === controller) {
        exploreAbortRef.current = null;
      }
    }
  }

  function terminate() {
    cancelExploreWorker(true);
    for (const id of timeoutsRef.current) window.clearTimeout(id);
    timeoutsRef.current.clear();
    gameWorkerRef.current?.terminate();
    gameWorkerRef.current = null;
    gameReadyRef.current = false;
    analysisQueueRef.current = Promise.resolve();
  }

  return { analyzeGame, analyzeSinglePosition, terminate };
}
