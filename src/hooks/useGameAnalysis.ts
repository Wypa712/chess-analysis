"use client";

import { useRef } from "react";
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
import type {
  GamePosition,
  RawResult,
  StockfishAnalysisWorker,
  StockfishExploreWorker,
  useStockfishWorker,
} from "@/hooks/useStockfishWorker";

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

type StockfishWorkerFactory = ReturnType<typeof useStockfishWorker>;

export function useGameAnalysis(workerFactory: StockfishWorkerFactory) {
  const gameWorkerRef = useRef<StockfishAnalysisWorker | null>(null);
  const exploreWorkerRef = useRef<StockfishExploreWorker | null>(null);
  const exploreAbortRef = useRef<AbortController | null>(null);
  const analysisQueueRef = useRef<Promise<void>>(Promise.resolve());

  function getGameWorker(): StockfishAnalysisWorker {
    if (!gameWorkerRef.current) {
      gameWorkerRef.current = workerFactory.createAnalysisWorker();
    }
    return gameWorkerRef.current;
  }

  function getExploreWorker(): StockfishExploreWorker {
    if (!exploreWorkerRef.current) {
      exploreWorkerRef.current = workerFactory.createExploreWorker();
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
      await worker.waitForReady();

      const fens = [startFen, ...positions.map((p) => p.fen)];
      const raw: RawResult[] = [];

      for (let i = 0; i < fens.length; i++) {
        raw.push(await worker.analyzePosition(fens[i]));
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

  async function analyzeSinglePosition(fen: string) {
    cancelExploreWorker();

    const controller = new AbortController();
    exploreAbortRef.current = controller;
    const worker = getExploreWorker();

    try {
      await worker.waitForReady(controller.signal);
      const result = await worker.analyzePosition(fen, controller.signal);

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
    workerFactory.clearTimers();
    gameWorkerRef.current?.terminate();
    gameWorkerRef.current = null;
    analysisQueueRef.current = Promise.resolve();
  }

  return { analyzeGame, analyzeSinglePosition, terminate };
}
