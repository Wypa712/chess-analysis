"use client";

import { Chessboard } from "react-chessboard";
import type { Arrow, Square } from "react-chessboard/dist/chessboard/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { parsePgn } from "@/lib/chess/pgn";
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
import { ExplorePanel } from "./ExplorePanel";
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
  type ExploreMove,
  type GameData,
  type TrailDragState,
  type ExploreEvalResult,
} from "./types";
import styles from "./GameView.module.css";

const MAX_BOARD_SIZE = 760;
const EVAL_BAR_WIDTH = 24;
const BOARD_ROW_GAP = 10;
const DESKTOP_BOARD_AREA_RATIO = 0.52;
const DESKTOP_VERTICAL_CHROME = 290;

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
  const exploreAnalysisRequestRef = useRef(0);
  const moveTrailRef = useRef<HTMLDivElement>(null);
  const trailDragRef = useRef<TrailDragState>({
    active: false,
    moved: false,
    suppressClick: false,
    startX: 0,
    scrollLeft: 0,
  });

  const [boardSize, setBoardSize] = useState(MAX_BOARD_SIZE);
  const [currentMove, setCurrentMove] = useState(-1);
  const [flipped, setFlipped] = useState(false);
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [loadingPct, setLoadingPct] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<EngineAnalysisJsonV1 | null>(null);
  const [exploreMode, setExploreMode] = useState(false);
  const [explorationChess, setExplorationChess] = useState<Chess | null>(null);
  const [explorationMoves, setExplorationMoves] = useState<ExploreMove[]>([]);
  const [exploreEvalResult, setExploreEvalResult] = useState<ExploreEvalResult | null>(null);
  const [exploreAnalyzing, setExploreAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"moves" | "analysis" | "advice">("moves");
  const [llmStatus, setLlmStatus] = useState<LlmStatus>("idle");
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmAnalysis, setLlmAnalysis] = useState<LlmGameAnalysisV1 | null>(null);
  const [llmOpenPhases, setLlmOpenPhases] = useState<Record<string, boolean>>({});

  const { analyzeGame, analyzeSinglePosition, terminate } = useStockfish();

  const parsed = useMemo(() => parsePgn(game.pgn), [game.pgn]);
  const totalMoves = parsed?.positions.length ?? 0;

  // Load cached engine analysis on mount
  useEffect(() => {
    fetch(`/api/games/${game.id}/engine-analysis`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.analysis && isEngineAnalysisJsonV1(data.analysis)) {
          setAnalysis(data.analysis);
          setAnalysisState("done");
        }
      })
      .catch(() => {});
  }, [game.id]);

  // Load cached LLM analysis on mount
  useEffect(() => {
    fetch(`/api/games/${game.id}/analyze`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.analysis && isLlmGameAnalysisV1(data.analysis)) {
          setLlmAnalysis(data.analysis);
          setLlmStatus("done");
        }
      })
      .catch(() => {});
  }, [game.id]);

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
      [pos.from]: { background: "rgba(255, 255, 0, 0.35)" },
      [pos.to]: { background: "rgba(255, 255, 0, 0.5)" },
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
          `rgba(61, 122, 53, ${opacities[i] ?? 0.28})`,
        ] as Arrow);
    }
    const bm = currentPositionBestMove;
    if (!bm?.uci || bm.uci.length < 4) return [];
    return [[
      bm.uci.slice(0, 2) as Square,
      bm.uci.slice(2, 4) as Square,
      "rgba(61, 122, 53, 0.85)",
    ]];
  }, [exploreMode, exploreEvalResult, currentPositionBestMove]);

  const currentMoveTo =
    currentMove >= 0 && parsed ? parsed.positions[currentMove]?.to : null;

  const getMainlineFen = useCallback(() => {
    if (!parsed) return "start";
    return currentMove === -1
      ? (parsed.startFen ?? "start")
      : (parsed.positions[currentMove]?.fen ?? "start");
  }, [currentMove, parsed]);

  const handleExitExplore = useCallback(() => {
    exploreAnalysisRequestRef.current += 1;
    setExploreMode(false);
    setExplorationChess(null);
    setExplorationMoves([]);
    setExploreEvalResult(null);
    setExploreAnalyzing(false);
  }, []);

  const exitExploreIfActive = useCallback(() => {
    if (exploreMode) handleExitExplore();
  }, [exploreMode, handleExitExplore]);

  const seekMainline = useCallback((moveIndex: number) => {
    exitExploreIfActive();
    setCurrentMove(moveIndex);
  }, [exitExploreIfActive]);

  const goFirst = () => seekMainline(-1);
  const goPrev  = () => { exitExploreIfActive(); setCurrentMove((m) => Math.max(-1, m - 1)); };
  const goNext  = () => { exitExploreIfActive(); setCurrentMove((m) => Math.min(totalMoves - 1, m + 1)); };
  const goLast  = () => seekMainline(totalMoves - 1);

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
        exitExploreIfActive();
        setCurrentMove((m) => Math.max(-1, m - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        exitExploreIfActive();
        setCurrentMove((m) => Math.min(totalMoves - 1, m + 1));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [totalMoves, exitExploreIfActive]);

  useEffect(() => {
    const trail = moveTrailRef.current;
    if (trail) trail.scrollLeft = trail.scrollWidth;
  }, [explorationMoves]);

  useEffect(() => {
    const layoutEl = layoutRef.current;
    const boardAreaEl = boardAreaRef.current;
    if (!layoutEl || !boardAreaEl) return;

    const compute = () => {
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      const style = getComputedStyle(boardAreaEl);
      const paddingX =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const layoutWidth = layoutEl.clientWidth;
      const containerWidth = isMobile
        ? layoutWidth
        : layoutWidth * DESKTOP_BOARD_AREA_RATIO;
      const availableW =
        containerWidth - paddingX - EVAL_BAR_WIDTH - BOARD_ROW_GAP;
      const availableH = layoutEl.clientHeight - DESKTOP_VERTICAL_CHROME;
      const size = isMobile
        ? Math.min(Math.max(availableW, 200), MAX_BOARD_SIZE)
        : Math.min(Math.max(Math.min(availableW, availableH), 200), MAX_BOARD_SIZE);
      setBoardSize(size);
    };

    const observer = new ResizeObserver(compute);
    observer.observe(layoutEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLlmAnalyze = useCallback(async () => {
    setLlmStatus("analyzing");
    setLlmError(null);
    try {
      const res = await fetch(`/api/games/${game.id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.analysis || !isLlmGameAnalysisV1(data.analysis)) {
        setLlmError(data?.error ?? null);
        setLlmStatus("error");
        return;
      }
      setLlmAnalysis(data.analysis);
      setLlmStatus("done");
    } catch {
      setLlmError("Мережева помилка. Спробуйте ще раз.");
      setLlmStatus("error");
    }
  }, [game.id]);

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
      const response = await fetch(`/api/games/${game.id}/engine-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: result }),
      });
      if (!response.ok) {
        throw new Error("Не вдалося зберегти Stockfish-аналіз.");
      }
      setAnalysis(result);
      setAnalysisState("done");
      if (llmStatus === "idle") void handleLlmAnalyze();
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Не вдалося завершити Stockfish-аналіз."
      );
      setAnalysisState("error");
    }
  }, [analyzeGame, parsed, game.id, game.color, exitExploreIfActive, handleLlmAnalyze]);

  const runExploreAnalysis = useCallback(async (fen: string) => {
    const requestId = ++exploreAnalysisRequestRef.current;
    setExploreEvalResult(null);
    setExploreAnalyzing(true);
    try {
      const result = await analyzeSinglePosition(fen);
      if (exploreAnalysisRequestRef.current === requestId) {
        setExploreEvalResult(result);
      }
    } catch {
      // Keep explore mode usable even if a speculative engine call fails.
    } finally {
      if (exploreAnalysisRequestRef.current === requestId) {
        setExploreAnalyzing(false);
      }
    }
  }, [analyzeSinglePosition]);

  function handleBreadcrumbClick(moveIndex: number) {
    if (trailDragRef.current.suppressClick) return;
    if (!parsed) return;
    const baseFen = getMainlineFen();
    const chess = new Chess(baseFen === "start" ? undefined : baseFen);
    const movesToReplay = explorationMoves.slice(0, moveIndex + 1);
    for (const m of movesToReplay) {
      chess.move({ from: m.from, to: m.to, promotion: "q" });
    }
    setExplorationChess(chess);
    setExplorationMoves(movesToReplay);
    void runExploreAnalysis(chess.fen());
  }

  function handleExploreDrop(sourceSquare: string, targetSquare: string): boolean {
    if (!parsed) return false;
    const sourceFen = explorationChess?.fen() ?? getMainlineFen();
    const chessCopy = new Chess(sourceFen === "start" ? undefined : sourceFen);
    let move: ReturnType<Chess["move"]>;
    try {
      move = chessCopy.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      return false;
    }
    const newMove: ExploreMove = {
      san: move.san,
      from: move.from,
      to: move.to,
      uci: `${move.from}${move.to}${move.promotion ?? ""}`,
    };
    setExplorationChess(chessCopy);
    setExplorationMoves((prev) => (exploreMode ? [...prev, newMove] : [newMove]));
    setExploreMode(true);
    void runExploreAnalysis(chessCopy.fen());
    return true;
  }

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
        [exploreLastMove.from]: { background: "rgba(255, 255, 0, 0.35)" },
        [exploreLastMove.to]:   { background: "rgba(255, 255, 0, 0.5)" },
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

  function finishTrailDrag() {
    const drag = trailDragRef.current;
    if (drag.moved) {
      drag.suppressClick = true;
      window.setTimeout(() => {
        trailDragRef.current.suppressClick = false;
      }, 0);
    }
    drag.active = false;
    drag.moved = false;
    if (moveTrailRef.current) moveTrailRef.current.style.cursor = "";
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

        <ExplorePanel
          exploreMode={exploreMode}
          explorationMoves={explorationMoves}
          exploreAnalyzing={exploreAnalyzing}
          boardSize={boardSize}
          moveTrailRef={moveTrailRef}
          trailDragRef={trailDragRef}
          onBreadcrumbClick={handleBreadcrumbClick}
          onExitExplore={handleExitExplore}
          onFinishTrailDrag={finishTrailDrag}
        />

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
              onPieceDrop={parsed ? handleExploreDrop : undefined}
              customSquareStyles={displaySquareStyles}
              customArrows={bestMoveArrow}
              customBoardStyle={{
                borderRadius: "4px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              }}
              customDarkSquareStyle={{ backgroundColor: "#2d5a27" }}
              customLightSquareStyle={{ backgroundColor: "#d4e8d0" }}
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

        <div className={styles.navControls}>
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
            disabled={currentMove === -1}
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
          <div className={styles.navDivider} />
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Перевернути дошку"
            onClick={() => setFlipped((f) => !f)}
          >
            <FlipIcon />
          </button>
          <div className={styles.navDivider} />
          <button
            type="button"
            className={`${styles.navBtn} ${exploreMode ? styles.navBtnActive : ""}`}
            onClick={handleExitExplore}
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
          {analysisState === "done" && (
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
          analysis={analysis}
          currentMove={currentMove}
          onSeekMainline={seekMainline}
          analysisState={analysisState}
          llmStatus={llmStatus}
          llmError={llmError}
          llmAnalysis={llmAnalysis}
          llmOpenPhases={llmOpenPhases}
          onAnalyze={handleLlmAnalyze}
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
  value: number;
  boardSize: number;
  active: boolean;
  pending: boolean;
}) {
  const clamped = Math.max(-5, Math.min(5, value));
  const whitePct = active ? 50 + (clamped / 5) * 45 : 50;
  const isMate = Math.abs(value) >= 50;
  const labelText = pending
    ? "..."
    : active
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
  best:       { symbol: "★",  color: "#4a8a40", bg: "#5fa854", label: "Найкращий" },
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
