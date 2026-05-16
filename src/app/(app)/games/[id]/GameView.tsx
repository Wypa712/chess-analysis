"use client";

import { Chessboard } from "react-chessboard";
import type { Arrow, Square } from "react-chessboard/dist/chessboard/types";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RouteLoader } from "@/components/RouteLoader/RouteLoader";
import { parsePgn } from "@/lib/chess/pgn";
import { useExploreMode } from "@/hooks/useExploreMode";
import { useGameNavigation } from "@/hooks/useGameNavigation";
import { useStockfish } from "@/hooks/useStockfish";
import {
  evalToPawns,
  isEngineAnalysisJsonV1,
  type EngineAnalysisJsonV1,
  type EngineEval,
  type MoveClassification,
} from "@/lib/chess/engine-analysis";
import { type LlmStatus } from "./LlmAnalysis";
import { isLlmGameAnalysisV1, type LlmGameAnalysisV1 } from "@/lib/llm/types";
import { EvalSection } from "./EvalSection";
import { LlmTabsPanel } from "./LlmTabsPanel";
import {
  FirstIcon,
  PrevIcon,
  NextIcon,
  LastIcon,
  FlipIcon,
  ReturnToMainlineIcon,
  StockfishIcon,
} from "./icons";
import {
  PHASE_OPENING_END_PLY,
  PHASE_MIDDLEGAME_END_PLY,
  type MovePair,
  type GameData,
} from "./types";
import styles from "./GameView.module.css";

const MAX_BOARD_SIZE = 760;
const MIN_BOARD_SIZE = 200;
const EVAL_BAR_WIDTH = 24;
const BOARD_ROW_GAP = 10;
// Approximate combined height of fixed vertical chrome on desktop:
// app header (~56px) + bottom nav bar (~56px) + player badges 2×(~48px) +
// move-strip/nav controls row (~64px) + analyse-wrap (~52px) + gaps/padding (~16px) ≈ 290px
const DESKTOP_VERTICAL_CHROME = 290;

function snapBoardSize(size: number): number {
  const clamped = Math.min(Math.max(size, MIN_BOARD_SIZE), MAX_BOARD_SIZE);
  return Math.max(MIN_BOARD_SIZE, Math.floor(clamped / 8) * 8);
}

function calcPhaseAccuracy(
  moves: EngineAnalysisJsonV1["moves"],
  color: "white" | "black",
  fromPly: number,
  toPly: number
): number | null {
  const losses = moves
    .filter(
      (m) =>
        m.color === color &&
        m.ply >= fromPly &&
        m.ply < toPly &&
        m.winProbabilityLoss !== undefined
    )
    .map((m) => m.winProbabilityLoss!);
  if (losses.length === 0) return null;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
  const raw = 103.1668 * Math.exp(-0.04354 * avgLoss) - 3.1669;
  return Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function GameView({ game }: { game: GameData }) {
  const userColor = game.color;
  const opponentColor = userColor === "white" ? "black" : "white";

  const layoutRef = useRef<HTMLDivElement>(null);
  const boardAreaRef = useRef<HTMLDivElement>(null);
  const activeTokenRef = useRef<HTMLButtonElement>(null);

  const queryClient = useQueryClient();

  const [boardSize, setBoardSize] = useState(MAX_BOARD_SIZE);
  const [isMobile, setIsMobile] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [loadingPct, setLoadingPct] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"moves" | "analysis" | "advice">("moves");
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmOpenPhases, setLlmOpenPhases] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      setActiveTab("analysis");
    }
  }, []);

  // useQuery for GET engine analysis (staleTime Infinity — results never change once computed)
  const {
    data: engineAnalysisData,
    isPending: enginePending,
    isError: engineIsError,
  } = useQuery({
    queryKey: ['engine-analysis', game.id],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/games/${game.id}/engine-analysis`, { signal });
      if (!r.ok) throw new Error("Не вдалося завантажити аналіз двигуна");
      const d = await r.json();
      return (d?.analysis && isEngineAnalysisJsonV1(d.analysis)) ? d.analysis as EngineAnalysisJsonV1 : null;
    },
    staleTime: Infinity,
    retry: 1,
  });

  // useQuery for GET LLM analysis (staleTime Infinity — results never change once computed)
  const {
    data: llmAnalysisData,
    isPending: llmPending,
  } = useQuery({
    queryKey: ['llm-analysis', game.id],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/games/${game.id}/analyze`, { signal });
      if (!r.ok) return null;
      const d = await r.json();
      return (d?.analysis && isLlmGameAnalysisV1(d.analysis)) ? d.analysis as LlmGameAnalysisV1 : null;
    },
    staleTime: Infinity,
    retry: 0,
  });

  const analysis = engineAnalysisData ?? null;
  // Keep the first render stable between server and client.
  // The query results are synchronized in effects immediately after mount.
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [llmStatus, setLlmStatus] = useState<LlmStatus>("idle");
  const [llmAnalysis, setLlmAnalysis] = useState<LlmGameAnalysisV1 | null>(null);

  // Sync analysisState when engineAnalysisData arrives from cache/network
  useEffect(() => {
    if (engineAnalysisData) setAnalysisState("done");
    else if (engineIsError) setAnalysisState("error");
  }, [engineAnalysisData, engineIsError]);

  // Sync llmStatus and llmAnalysis when llmAnalysisData arrives from cache/network
  useEffect(() => {
    if (llmAnalysisData) {
      setLlmAnalysis(llmAnalysisData);
      setLlmStatus("done");
    }
  }, [llmAnalysisData]);

  const { analyzeGame, analyzeSinglePosition, terminate } = useStockfish();

  const parsed = useMemo(() => parsePgn(game.pgn), [game.pgn]);
  const totalMoves = parsed?.positions.length ?? 0;
  const {
    currentMove,
    goFirst: goFirstMainline,
    goPrev: goPrevMainline,
    goNext: goNextMainline,
    goLast: goLastMainline,
    goToMove,
  } = useGameNavigation({ totalMoves });

  const movePairs = useMemo<MovePair[]>(() => {
    if (!parsed) return [];
    const pairs: MovePair[] = [];
    for (const pos of parsed.positions) {
      if (pos.color === "w") {
        pairs.push({ num: pos.moveNumber, white: pos.san });
      } else {
        if (pairs.length === 0) {
          pairs.push({ num: pos.moveNumber, white: undefined, black: pos.san });
        } else {
          pairs[pairs.length - 1].black = pos.san;
        }
      }
    }
    return pairs;
  }, [parsed]);

  const boardFen =
    currentMove === -1
      ? (parsed?.startFen ?? "start")
      : (parsed?.positions[currentMove]?.fen ?? "start");

  const lastMoveSquares = useMemo(() => {
    if (currentMove < 0 || !parsed) return {};
    const pos = parsed.positions[currentMove];
    if (!pos) return {};
    return {
      [pos.from]: { background: "rgba(109, 174, 219, 0.24)" },
      [pos.to]: { background: "rgba(79, 183, 162, 0.38)" },
    };
  }, [currentMove, parsed]);

  const currentMoveAnalysis =
    analysis && currentMove >= 0 ? analysis.moves[currentMove] : null;

  const phaseAccuracy = useMemo(() => {
    if (!analysis) return null;
    const phases = [
      { from: 1,                        to: PHASE_OPENING_END_PLY },
      { from: PHASE_OPENING_END_PLY,    to: PHASE_MIDDLEGAME_END_PLY },
      { from: PHASE_MIDDLEGAME_END_PLY, to: Infinity },
    ];
    return phases.map((p) => ({
      white: calcPhaseAccuracy(analysis.moves, "white", p.from, p.to),
      black: calcPhaseAccuracy(analysis.moves, "black", p.from, p.to),
    }));
  }, [analysis]);

  const boardOrientation = flipped ? opponentColor : userColor;

  const getMainlineFen = useCallback(() => {
    if (!parsed) return "start";
    return currentMove === -1
      ? (parsed.startFen ?? "start")
      : (parsed.positions[currentMove]?.fen ?? "start");
  }, [currentMove, parsed]);

  const {
    exploreMode,
    explorationChess,
    explorationMoves,
    exploreEvalResult,
    exploreAnalyzing,
    exitExploreMode,
    handleBoardDrop,
    stepExploreBackward,
  } = useExploreMode({
    getMainlineFen,
    analyzeSinglePosition,
  });

  const currentPositionBestMove = useMemo(() => {
    if (!analysis) return null;
    const positionIndex = currentMove + 1;
    return (
      analysis.evalGraph[positionIndex]?.bestMove ??
      (currentMove < 0
        ? analysis.moves[0]?.bestMove
        : analysis.moves[currentMove + 1]?.bestMove) ??
      null
    );
  }, [analysis, currentMove]);

  const bestMoveArrow = useMemo<Arrow[]>(() => {
    if (exploreMode) {
      if (!exploreEvalResult) return [];
      const opacities = [0.85, 0.50, 0.28];
      return exploreEvalResult.candidates
        .filter((c) => c.uci.length >= 4)
        .slice(0, 3)
        .map((c, i) => [
          c.uci.slice(0, 2) as Square,
          c.uci.slice(2, 4) as Square,
          `rgba(79, 183, 162, ${opacities[i] ?? 0.28})`,
        ] as Arrow);
    }
    const bm = currentPositionBestMove;
    if (!bm?.uci || bm.uci.length < 4) return [];
    return [[
      bm.uci.slice(0, 2) as Square,
      bm.uci.slice(2, 4) as Square,
      "rgba(79, 183, 162, 0.85)",
    ]];
  }, [exploreMode, exploreEvalResult, currentPositionBestMove]);

  const currentMoveTo =
    currentMove >= 0 && parsed ? parsed.positions[currentMove]?.to : null;

  const exitExploreIfActive = useCallback(() => {
    if (exploreMode) exitExploreMode();
  }, [exploreMode, exitExploreMode]);

  const seekMainline = useCallback((moveIndex: number) => {
    exitExploreIfActive();
    goToMove(moveIndex);
  }, [exitExploreIfActive, goToMove]);

  const goFirst = () => {
    exitExploreIfActive();
    goFirstMainline();
  };
  const goPrev  = () => {
    if (stepExploreBackward()) return;
    goPrevMainline();
  };
  const goNext  = () => { exitExploreIfActive(); goNextMainline(); };
  const goLast  = () => {
    exitExploreIfActive();
    goLastMainline();
  };

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.contentEditable === "true" ||
        target.getAttribute("role") === "textbox"
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (stepExploreBackward()) return;
        goPrevMainline();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        exitExploreIfActive();
        goNextMainline();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [exitExploreIfActive, goNextMainline, goPrevMainline, stepExploreBackward]);

  useEffect(() => {
    if (activeTokenRef.current) {
      activeTokenRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentMove]);

  useLayoutEffect(() => {
    const layoutEl = layoutRef.current;
    const boardAreaEl = boardAreaRef.current;
    if (!layoutEl || !boardAreaEl) return;

    const compute = () => {
      const mobile = window.matchMedia("(max-width: 768px)").matches;
      setIsMobile(mobile);
      const style = getComputedStyle(boardAreaEl);
      const paddingX =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const availableW = mobile
        ? boardAreaEl.clientWidth - paddingX
        : boardAreaEl.clientWidth - paddingX - EVAL_BAR_WIDTH - BOARD_ROW_GAP;
      const availableH = layoutEl.clientHeight - DESKTOP_VERTICAL_CHROME;
      const rawSize = mobile ? availableW : Math.min(availableW, availableH);
      const size = snapBoardSize(rawSize);
      setBoardSize((prev) => (prev === size ? prev : size));
    };

    const observer = new ResizeObserver(compute);
    observer.observe(layoutEl);
    observer.observe(boardAreaEl);
    compute();
    return () => observer.disconnect();
  // re-run after initial fetches complete so refs are attached to real layout
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enginePending, llmPending]);

  useEffect(() => {
    return () => terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLlmAnalyze = useCallback(async () => {
    setLlmStatus("analyzing");
    setLlmError(null);
    try {
      const res = await fetch(`/api/games/${game.id}/analyze`, { method: "POST" });
      if (!res.ok) {
        let msg: string;
        if (res.status === 429) {
          msg = "Аналіз недоступний — ліміт запитів вичерпано. Зачекайте 30 секунд.";
        } else if (res.status === 503) {
          msg = "Сервіс аналізу тимчасово недоступний. Спробуйте пізніше.";
        } else {
          msg = "Помилка сервера — спробуйте пізніше";
        }
        setLlmError(msg);
        setLlmStatus("error");
        return;
      }
      const data = await res.json();
      if (!data?.analysis || !isLlmGameAnalysisV1(data.analysis)) {
        setLlmError("Помилка сервера — спробуйте пізніше");
        setLlmStatus("error");
        return;
      }
      setLlmAnalysis(data.analysis);
      setLlmStatus("done");
      // Update React Query cache directly — avoids re-fetch since staleTime Infinity
      queryClient.setQueryData(['llm-analysis', game.id], data.analysis);
    } catch {
      setLlmError("Не вдалося отримати відповідь. Перевірте з'єднання.");
      setLlmStatus("error");
    }
  }, [game.id, queryClient]);

  const handleStartAnalysis = useCallback(async () => {
    if (!parsed) return;
    exitExploreIfActive();
    setAnalysisState("loading");
    setLoadingPct(0);
    setAnalysisError(null);
    try {
      const result = await analyzeGame(
        parsed.startFen,
        parsed.positions,
        game.color,
        (pct) => setLoadingPct(pct)
      );
      // Show the result immediately so a save failure degrades gracefully
      // instead of clearing a valid in-memory analysis.
      // Update React Query cache now so analysis renders immediately (before POST completes)
      queryClient.setQueryData(['engine-analysis', game.id], result);
      setAnalysisState("done");
      try {
        const response = await fetch(`/api/games/${game.id}/engine-analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis: result }),
        });
        if (!response.ok) console.warn("[GameView] Failed to persist analysis");
      } catch (saveErr) {
        console.warn("[GameView] Save failed:", saveErr);
      }
      if (llmStatus !== "analyzing") await handleLlmAnalyze();
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Не вдалося завершити Stockfish-аналіз."
      );
      setAnalysisState("error");
    }
  }, [analyzeGame, parsed, game.id, game.color, exitExploreIfActive, llmStatus, handleLlmAnalyze, queryClient]);

  const resultLabel =
    game.result === "win"
      ? "Перемога"
      : game.result === "loss"
        ? "Поразка"
        : "Нічия";

  const displayFen = exploreMode && explorationChess
    ? explorationChess.fen()
    : boardFen;

  const exploreLastMove = explorationMoves[explorationMoves.length - 1];
  const displaySquareStyles = exploreMode && exploreLastMove
    ? {
        [exploreLastMove.from]: { background: "rgba(109, 174, 219, 0.24)" },
        [exploreLastMove.to]:   { background: "rgba(79, 183, 162, 0.38)" },
      }
    : lastMoveSquares;

  const mainlineEvalValue =
    analysis && currentMove >= 0
      ? evalToPawns(analysis.moves[currentMove]?.evalAfter)
      : evalToPawns(analysis?.evalGraph[0]?.eval);

  const evalValue =
    exploreMode
      ? exploreEvalResult
        ? evalToPawns(exploreEvalResult.eval)
        : mainlineEvalValue
      : mainlineEvalValue;
  const evalActive = exploreMode ? !!exploreEvalResult : !!analysis;
  const evalPending = exploreMode && exploreAnalyzing && !exploreEvalResult;

  const evalWhitePercent = useMemo(() => {
    if (evalValue === null || evalValue === undefined) return 50;
    const clamped = Math.max(-10, Math.min(10, evalValue));
    return 50 + clamped * 5;
  }, [evalValue]);

  const evalDisplayStr = useMemo(() => {
    if (evalValue === null || evalValue === undefined) return "–";
    if (Math.abs(evalValue) >= 50) return evalValue > 0 ? `M${Math.abs(evalValue)}` : `-M${Math.abs(evalValue)}`;
    const sign = evalValue > 0 ? "+" : "";
    return `${sign}${evalValue.toFixed(2)}`;
  }, [evalValue]);

  if (enginePending || llmPending) {
    return <RouteLoader text="Завантажуємо партію…" />;
  }

  return (
    <div className={styles.layout} ref={layoutRef}>
      {/* ── Left: board area ── */}
      <div className={styles.boardArea} ref={boardAreaRef}>
        <PlayerBadge
          name={game.opponent}
          rating={game.opponentRating}
          color={opponentColor}
          accuracy={analysis?.accuracy[opponentColor === "white" ? "white" : "black"]}
          mistakes={analysis ? countClassifications(analysis, opponentColor, "mistake") : undefined}
          blunders={analysis ? countClassifications(analysis, opponentColor, "blunder") : undefined}
        />

        {isMobile && (
          <div className={styles.evalBarHorizontalWrap}>
            <div className={styles.evalBarHorizontal}>
              <div
                className={styles.evalBarHorizontalWhite}
                style={{ width: evalActive ? `${Math.round(evalWhitePercent)}%` : "50%" }}
              />
              <div className={styles.evalBarHorizontalBlack} />
            </div>
            <span className={styles.evalBarHorizontalLabel}>
              {evalActive ? evalDisplayStr : "–"}
            </span>
          </div>
        )}

        <div className={styles.boardRow}>
          <EvalBar
            value={evalValue}
            boardSize={boardSize}
            active={evalActive}
            pending={evalPending}
          />
          <div className={styles.boardWrapper} style={{ width: boardSize, height: boardSize }}>
            <Chessboard
              id="game-board"
              position={displayFen}
              boardWidth={boardSize}
              boardOrientation={boardOrientation}
              arePiecesDraggable={!!parsed}
              onPieceDrop={parsed ? handleBoardDrop : undefined}
              customSquareStyles={displaySquareStyles}
              customArrows={bestMoveArrow}
              customBoardStyle={{
                borderRadius: "4px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              }}
              customDarkSquareStyle={{ backgroundColor: "var(--color-board-dark)" }}
              customLightSquareStyle={{ backgroundColor: "var(--color-board-light)" }}
            />
            {!exploreMode && currentMoveAnalysis && currentMoveTo && (
              <MoveOverlayIcon
                square={currentMoveTo}
                classification={currentMoveAnalysis.classification}
                boardSize={boardSize}
                whiteOnBottom={boardOrientation === "white"}
              />
            )}
          </div>
        </div>
        <PlayerBadge
          name="Ви"
          rating={game.playerRating}
          color={userColor}
          accuracy={analysis?.accuracy[userColor === "white" ? "white" : "black"]}
          mistakes={analysis ? countClassifications(analysis, userColor, "mistake") : undefined}
          blunders={analysis ? countClassifications(analysis, userColor, "blunder") : undefined}
        />

        {isMobile && movePairs.length > 0 && (
          <div className={styles.moveStrip}>
            {movePairs.map((pair) => {
              const whiteIdx = (pair.num - 1) * 2;
              const blackIdx = whiteIdx + 1;
              return (
                <div key={pair.num} className={styles.movePairGroup}>
                  <span className={styles.moveStripNum}>{pair.num}.</span>
                  {pair.white && (
                    <button
                      type="button"
                      ref={currentMove === whiteIdx ? activeTokenRef : null}
                      className={`${styles.moveStripToken} ${currentMove === whiteIdx ? styles.moveStripTokenActive : ""}`}
                      onClick={() => seekMainline(whiteIdx)}
                      aria-pressed={currentMove === whiteIdx}
                    >
                      {pair.white}
                    </button>
                  )}
                  {pair.black !== undefined && (
                    <button
                      type="button"
                      ref={currentMove === blackIdx ? activeTokenRef : null}
                      className={`${styles.moveStripToken} ${currentMove === blackIdx ? styles.moveStripTokenActive : ""}`}
                      onClick={() => seekMainline(blackIdx)}
                      aria-pressed={currentMove === blackIdx}
                    >
                      {pair.black}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.navControls}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Перевернути дошку"
            onClick={() => setFlipped((f) => !f)}
          >
            <FlipIcon />
          </button>
          <div className={styles.navDivider} />
          <div className={styles.navMoveGroup}>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Перший хід"
              onClick={goFirst}
              disabled={currentMove === -1}
            >
              <FirstIcon />
            </button>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Попередній хід"
              onClick={goPrev}
              disabled={exploreMode ? explorationMoves.length === 0 : currentMove === -1}
            >
              <PrevIcon />
            </button>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Наступний хід"
              onClick={goNext}
              disabled={currentMove === totalMoves - 1}
            >
              <NextIcon />
            </button>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Останній хід"
              onClick={goLast}
              disabled={currentMove === totalMoves - 1}
            >
              <LastIcon />
            </button>
          </div>
          <div className={styles.navDivider} />
          <button
            type="button"
            className={`${styles.navBtn} ${exploreMode ? styles.navBtnActive : ""}`}
            onClick={exitExploreMode}
            disabled={!exploreMode}
            aria-label="Повернутися до основної лінії"
            title={
              exploreMode
                ? "Повернутися до основної лінії"
                : "Зробіть хід на дошці, щоб створити варіант"
            }
          >
            <ReturnToMainlineIcon />
          </button>
        </div>

        <div className={styles.analyzeWrap}>
          {analysisState === "idle" && (
            <button
              type="button"
              className={styles.analyzeBtn}
              onClick={handleStartAnalysis}
            >
              <StockfishIcon />
              Запустити аналіз
            </button>
          )}
          {analysisState === "loading" && (
            <div className={styles.analyzeProgress}>
              <div className={styles.analyzeProgressLabel}>
                <StockfishIcon />
                Аналіз партії… {loadingPct}%
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${loadingPct}%` }}
                />
              </div>
            </div>
          )}
          {analysisState === "done" && llmStatus === "analyzing" && (
            <div className={styles.analyzeProgress}>
              <div className={styles.analyzeProgressLabel}>
                <StockfishIcon />
                Готуємо поради…
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: "100%" }} />
              </div>
            </div>
          )}
          {analysisState === "done" && llmStatus === "idle" && (
            <button
              type="button"
              className={styles.analyzeBtn}
              onClick={handleLlmAnalyze}
            >
              <StockfishIcon />
              Завершити аналіз
            </button>
          )}
          {analysisState === "done" && llmStatus === "error" && (
            <div className={styles.analyzeError}>
              <span>{llmError ?? "Не вдалося отримати LLM-поради"}</span>
              <button
                type="button"
                className={styles.rerunBtn}
                onClick={handleLlmAnalyze}
              >
                Спробувати ще
              </button>
            </div>
          )}
          {analysisState === "done" && llmStatus === "done" && (
            <div className={styles.analyzeDone}>
              <span className={styles.analyzeDoneCheck}>✓</span>
              Аналіз готовий
              <button
                type="button"
                className={styles.rerunBtn}
                onClick={handleStartAnalysis}
              >
                Повторити
              </button>
            </div>
          )}
          {analysisState === "error" && (
            <div className={styles.analyzeError}>
              <span>{analysisError ?? "Аналіз не завершився"}</span>
              <button
                type="button"
                className={styles.rerunBtn}
                onClick={handleStartAnalysis}
              >
                Спробувати ще
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: analysis panel ── */}
      <div className={styles.analysisPanel}>
        <EvalSection
          game={game}
          analysis={analysis}
          currentMove={currentMove}
          userColor={userColor}
          phaseAccuracy={phaseAccuracy}
          onSeek={seekMainline}
          resultLabel={resultLabel}
        />

        <LlmTabsPanel
          exploreMode={exploreMode}
          exploreAnalyzing={exploreAnalyzing}
          exploreEvalResult={exploreEvalResult}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          movePairs={movePairs}
          currentMove={currentMove}
          onSeekMainline={seekMainline}
          analysisState={analysisState}
          llmStatus={llmStatus}
          llmError={llmError}
          llmAnalysis={llmAnalysis}
          llmOpenPhases={llmOpenPhases}
          onTogglePhase={(key) => setLlmOpenPhases((prev) => ({ ...prev, [key]: !prev[key] }))}
          openingName={game.openingName}
        />
      </div>
    </div>
  );
}

// ── EvalBar ────────────────────────────────────────────────────────────────────

function EvalBar({
  value,
  boardSize,
  active,
  pending,
}: {
  value: number | null;
  boardSize: number;
  active: boolean;
  pending: boolean;
}) {
  const clamped = value !== null ? Math.max(-5, Math.min(5, value)) : 0;
  const whitePct = active && value !== null ? 50 + (clamped / 5) * 45 : 50;
  const isMate = value !== null && Math.abs(value) >= 50;
  const labelText = pending
    ? "..."
    : active && value !== null
    ? isMate ? "M" : Math.abs(value).toFixed(1)
    : null;

  return (
    <div
      className={`${styles.evalBarWrap} ${pending ? styles.evalBarPending : ""}`}
      style={{ height: boardSize }}
      title="Оцінка позиції"
    >
      <div className={styles.evalBar}>
        <div className={styles.evalBarBlack} />
        <div className={styles.evalBarWhite} style={{ height: `${whitePct}%` }} />
      </div>
      {labelText && (
        <div className={styles.evalBarValueLabel}>{labelText}</div>
      )}
    </div>
  );
}

// ── Board overlay icon ─────────────────────────────────────────────────────────

const CLASS_META: Record<
  MoveClassification,
  { symbol: string; color: string; bg: string; label: string }
> = {
  brilliant:  { symbol: "!!", color: "#2f7f7a", bg: "#39a39a", label: "Блискуче" },
  best:       { symbol: "★",  color: "#2f7f7a", bg: "#4fb7a2", label: "Найкращий" },
  good:       { symbol: "✓",  color: "#7a9a3a", bg: "#96bc4b", label: "Добре" },
  inaccuracy: { symbol: "?!", color: "#a07820", bg: "#c49b2d", label: "Неточність" },
  mistake:    { symbol: "?",  color: "#a85520", bg: "#d07030", label: "Зівок" },
  blunder:    { symbol: "??", color: "#902828", bg: "#c04040", label: "Груба помилка" },
};

function squareToTopRight(
  square: string,
  boardSize: number,
  whiteOnBottom: boolean
): { left: number; top: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10) - 1;
  const sq = boardSize / 8;
  const col = whiteOnBottom ? file : 7 - file;
  const row = whiteOnBottom ? 7 - rank : rank;
  return { left: (col + 1) * sq, top: row * sq };
}

function MoveOverlayIcon({
  square,
  classification,
  boardSize,
  whiteOnBottom,
}: {
  square: string;
  classification: MoveClassification;
  boardSize: number;
  whiteOnBottom: boolean;
}) {
  const meta = CLASS_META[classification];
  if (!meta) return null;
  const { left, top } = squareToTopRight(square, boardSize, whiteOnBottom);
  return (
    <div
      className={styles.boardOverlayIcon}
      style={{ left, top, "--icon-color": meta.color, "--icon-bg": meta.bg } as React.CSSProperties}
      title={meta.label}
    >
      {meta.symbol}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PlayerBadge({
  name,
  rating,
  color,
  accuracy,
  mistakes,
  blunders,
}: {
  name: string;
  rating: number | null;
  color: "white" | "black";
  accuracy?: number;
  mistakes?: number;
  blunders?: number;
}) {
  return (
    <div className={styles.playerBadge}>
      <div
        className={`${styles.playerIcon} ${
          color === "white" ? styles.playerIconWhite : styles.playerIconBlack
        }`}
      >
        {color === "white" ? "♔" : "♚"}
      </div>
      <div className={styles.playerInfo}>
        <span className={styles.playerName}>{name}</span>
        {rating !== null && (
          <span className={styles.playerRating}>{rating}</span>
        )}
      </div>
      {accuracy !== undefined && (
        <div className={styles.playerStats}>
          <span className={styles.playerAccuracy}>{accuracy}%</span>
          {!!mistakes && (
            <span className={styles.playerMistakes}>?×{mistakes}</span>
          )}
          {!!blunders && (
            <span className={styles.playerBlunders}>??×{blunders}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Utils ──────────────────────────────────────────────────────────────────────

function countClassifications(
  analysis: EngineAnalysisJsonV1,
  color: "white" | "black",
  classification: MoveClassification
) {
  return analysis.moves.filter(
    (move) => move.color === color && move.classification === classification
  ).length;
}
