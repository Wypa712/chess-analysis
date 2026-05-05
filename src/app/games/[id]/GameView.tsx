"use client";

import { Chessboard } from "react-chessboard";
import type { Arrow, Square } from "react-chessboard/dist/chessboard/types";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { parsePgn } from "@/lib/chess/pgn";
import { useStockfish } from "@/hooks/useStockfish";
import type { CandidateMove } from "@/hooks/useStockfish";
import {
  evalToPawns,
  isEngineAnalysisJsonV1,
  type EngineAnalysisJsonV1,
  type EngineEval,
  type MoveClassification,
} from "@/lib/chess/engine-analysis";
import { LlmAnalysis, type LlmGameAnalysisV1, type LlmStatus } from "./LlmAnalysis";
import styles from "./GameView.module.css";

const MOCK_LLM_ANALYSIS: LlmGameAnalysisV1 = {
  version: 1,
  language: "uk",
  generalAssessment:
    "Партія показала хорошу гру у дебюті, але в мідлгеймі виникли проблеми з координацією фігур. Вирішальна помилка відбулась на 22-му ході, після якої позиція стала програшною.",
  opening: {
    summary:
      "Дебют зіграно впевнено — ви дотримувались принципів розвитку і контролю центру. Перші 10 ходів пройшли без суттєвих відхилень від теорії.",
    keyMistakes: [
      "Хід 7...h6 витратив темп без очевидної необхідності.",
      "На 9-му ході краще було розвинути коня на f6, а не відразу атакувати пішака.",
    ],
  },
  middlegame: {
    summary:
      "Мідлгейм виявився найскладнішою частиною партії. Після рокіровки виникла напружена позиція, де кожен хід мав велике значення.",
    tacticalMisses: [
      "На 18-му ході пропущена тактична комбінація з жертвою коня.",
      "Хід 22...Rxd4 був грубим прорахунком — ферзь противника отримав вирішальне поле.",
    ],
    positionalIssues: [
      "Слон на f8 так і не зіграв активної ролі протягом партії.",
      "Пішаки ферзевого флангу стали слабкістю після розміну на c5.",
    ],
  },
  endgame: { reached: false },
  criticalMoments: [
    {
      moveNumber: 18,
      color: "white",
      move: "Nxe5",
      description: "Противник пропустив виграшну жертву коня. Після Nxe5 ваша позиція ставала переможною.",
      recommendation: "Тренуйте розпізнавання жертв фігур на відкритих вертикалях.",
    },
    {
      moveNumber: 22,
      color: "black",
      move: "Rxd4",
      description: "Цей хід поставив ферзя противника на ідеальне поле e7 з подвійним ударом.",
      recommendation: "Перед взяттям матеріалу завжди перевіряйте відповіді суперника.",
    },
  ],
  recommendations: [
    {
      title: "Тактика: жертви фігур",
      description: "Регулярно розв'язуйте задачі на жертви фігур — особливо коня і слона за пішаки у відкритих позиціях.",
      priority: 1,
    },
    {
      title: "Розрахунок варіантів",
      description: "Перед кожним взяттям матеріалу прораховуйте мінімум 2 відповіді суперника.",
      priority: 1,
    },
    {
      title: "Активність слонів",
      description: "Стежте, щоб обидва слони мали відкриті діагоналі. Пасивний слон f8 суттєво ослабив вашу гру.",
      priority: 2,
    },
  ],
};

const MAX_BOARD_SIZE = 760;
const EVAL_BAR_WIDTH = 24;
const BOARD_ROW_GAP = 10;
const DESKTOP_BOARD_AREA_RATIO = 0.52;
const DESKTOP_VERTICAL_CHROME = 290;

type MovePair = { num: number; white: string; black?: string };
type ExploreMove = { san: string; from: string; to: string; uci: string };

type GameData = {
  id: string;
  pgn: string;
  result: "win" | "loss" | "draw";
  color: "white" | "black";
  opponent: string;
  opponentRating: number | null;
  playerRating: number | null;
  openingName: string | null;
  timeControl: string | null;
  playedAt: string;
  moveCount: number;
};

const PHASE_OPENING_END_PLY    = 21;
const PHASE_MIDDLEGAME_END_PLY  = 61;

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
  const trailDragRef = useRef({
    active: false,
    moved: false,
    suppressClick: false,
    startX: 0,
    scrollLeft: 0,
  });
  const [boardSize, setBoardSize] = useState(MAX_BOARD_SIZE);
  const [currentMove, setCurrentMove] = useState(-1);
  const [flipped, setFlipped] = useState(false);
  const [analysisState, setAnalysisState] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [loadingPct, setLoadingPct] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<EngineAnalysisJsonV1 | null>(null);
  const [exploreMode, setExploreMode] = useState(false);
  const [explorationChess, setExplorationChess] = useState<Chess | null>(null);
  const [explorationMoves, setExplorationMoves] = useState<ExploreMove[]>([]);
  const [exploreEvalResult, setExploreEvalResult] = useState<{
    eval: EngineEval;
    bestMove?: { uci: string; san?: string };
    candidates: CandidateMove[];
  } | null>(null);
  const [exploreAnalyzing, setExploreAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"moves" | "analysis" | "advice">("moves");
  const [llmStatus, setLlmStatus] = useState<LlmStatus>("idle");
  const [llmAnalysis, setLlmAnalysis] = useState<LlmGameAnalysisV1 | null>(null);

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

  const movePairs = useMemo<MovePair[]>(() => {
    if (!parsed) return [];
    const pairs: MovePair[] = [];
    for (const pos of parsed.positions) {
      if (pos.color === "w") {
        pairs.push({ num: pos.moveNumber, white: pos.san });
      } else {
        pairs[pairs.length - 1].black = pos.san;
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

  // Destination square of current move — for overlay icon
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

      // Vertical: subtract player badges, reserved explore slot, nav, analyze,
      // gaps and padding to keep the board stable when explore mode appears.
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
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Не вдалося завершити Stockfish-аналіз."
      );
      setAnalysisState("error");
    }
  }, [analyzeGame, parsed, game.id, game.color, exitExploreIfActive]);

  const handleLlmAnalyze = useCallback(() => {
    setLlmStatus("analyzing");
    setTimeout(() => {
      setLlmAnalysis(MOCK_LLM_ANALYSIS);
      setLlmStatus("done");
    }, 2000);
  }, []);

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
          mistakes={
            analysis
              ? countClassifications(analysis, opponentColor, "mistake")
              : undefined
          }
          blunders={
            analysis
              ? countClassifications(analysis, opponentColor, "blunder")
              : undefined
          }
        />

        <div
          className={styles.exploreSlot}
          aria-hidden={!exploreMode}
          style={{ maxWidth: EVAL_BAR_WIDTH + BOARD_ROW_GAP + boardSize }}
        >
          {exploreMode && (
            <div className={styles.exploreBreadcrumb}>
              <span className={styles.exploreBreadcrumbLabel}>Варіант</span>
              <div
                ref={moveTrailRef}
                className={styles.exploreMoveTrail}
                onWheel={(e) => {
                  e.preventDefault();
                  const el = moveTrailRef.current;
                  if (el) el.scrollLeft += e.deltaY + e.deltaX;
                }}
                onMouseDown={(e) => {
                  const el = moveTrailRef.current;
                  if (!el) return;
                  trailDragRef.current = {
                    active: true,
                    moved: false,
                    suppressClick: false,
                    startX: e.pageX - el.offsetLeft,
                    scrollLeft: el.scrollLeft,
                  };
                  el.style.cursor = "grabbing";
                }}
                onMouseMove={(e) => {
                  const drag = trailDragRef.current;
                  const el = moveTrailRef.current;
                  if (!drag.active || !el) return;
                  const delta = e.pageX - el.offsetLeft - drag.startX;
                  if (Math.abs(delta) > 4) drag.moved = true;
                  if (drag.moved) {
                    e.preventDefault();
                    el.scrollLeft = drag.scrollLeft - delta;
                  }
                }}
                onMouseUp={finishTrailDrag}
                onMouseLeave={finishTrailDrag}
                onClickCapture={(e) => {
                  if (!trailDragRef.current.suppressClick) return;
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {explorationMoves.map((m, i) => (
                  <button
                    key={i}
                    type="button"
                    className={styles.exploreBreadcrumbMove}
                    onClick={() => handleBreadcrumbClick(i)}
                  >
                    {m.san}
                  </button>
                ))}
              </div>
              {exploreAnalyzing && (
                <span className={styles.exploreAnalyzing}>…</span>
              )}
              <button
                type="button"
                className={styles.exploreExitBtn}
                onClick={handleExitExplore}
              >
                До партії
              </button>
            </div>
          )}
        </div>

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
            {/* Move quality overlay icon on destination square */}
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
          mistakes={
            analysis
              ? countClassifications(analysis, userColor, "mistake")
              : undefined
          }
          blunders={
            analysis
              ? countClassifications(analysis, userColor, "blunder")
              : undefined
          }
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

        {/* Analysis button */}
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
        {/* Header — always visible */}
        <div className={styles.panelHeader}>
          <Link href="/dashboard" className={styles.backLink}>
            <PrevIcon size={11} />
            Назад
          </Link>
          <h1 className={styles.gameTitle}>Ви — {game.opponent}</h1>
          <div className={styles.gameMeta}>
            {game.openingName ?? "Дебют невідомий"}
            {game.timeControl ? ` · ${game.timeControl}` : ""}
            {" · "}
            {formatDate(game.playedAt)}
          </div>
          <div className={styles.resultRow}>
            <span className={`${styles.resultBadge} ${styles[game.result]}`}>
              {resultLabel}
            </span>
            <span className={styles.moveCount}>{game.moveCount} ходів</span>
          </div>
          <EvalChart
            evals={analysis ? analysis.evalGraph.map((p) => evalToPawns(p.eval)) : []}
            currentIndex={currentMove + 1}
            onSeek={(i) => seekMainline(i - 1)}
            keyMoments={analysis?.keyMoments}
            phaseAccuracy={phaseAccuracy}
            userColor={userColor}
          />
        </div>

        {/* Explore candidates — visible only in explore mode */}
        {exploreMode && (
          <div className={styles.exploreCandidatesPanel}>
            <span className={styles.exploreCandidatesTitle}>
              {exploreAnalyzing ? "Аналізую…" : "Кандидати"}
            </span>
            {!exploreAnalyzing && exploreEvalResult && exploreEvalResult.candidates.length > 0 ? (
              <div className={styles.exploreCandidatesList}>
                {exploreEvalResult.candidates.slice(0, 3).map((c, i) => {
                  const pawns = evalToPawns(c.eval);
                  const sign  = pawns > 0 ? "+" : "";
                  const isMate = Math.abs(pawns) >= 50;
                  const evalStr = isMate
                    ? `M${Math.abs(c.eval.value)}`
                    : `${sign}${pawns.toFixed(2)}`;
                  return (
                    <div key={c.uci} className={styles.exploreCandidateRow}>
                      <span className={styles.exploreCandidateRank}>{i + 1}.</span>
                      <span className={styles.exploreCandidateSan}>
                        {c.san ?? c.uci}
                      </span>
                      <span
                        className={styles.exploreCandidateEval}
                        style={{ color: pawns >= 0 ? "rgba(232,220,200,0.8)" : "var(--color-text-faded)" }}
                      >
                        {evalStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : !exploreAnalyzing ? (
              <span className={styles.exploreCandidatesEmpty}>Зробіть хід</span>
            ) : null}
          </div>
        )}

        {/* Accuracy strip — always visible */}
        <div className={styles.accuracyStrip}>
          {[
            {
              label: "Точність Б.",
              value: analysis ? `${analysis.accuracy.white}%` : "–",
              color: analysis ? "var(--color-text)" : undefined,
            },
            {
              label: "Точність Ч.",
              value: analysis ? `${analysis.accuracy.black}%` : "–",
              color: analysis ? "var(--color-text-muted)" : undefined,
            },
            {
              label: "Помилки",
              value: analysis ? String(analysis.summary.mistakeCount) : "–",
              color: analysis ? "var(--color-warning)" : undefined,
            },
            {
              label: "Грубих",
              value: analysis ? String(analysis.summary.blunderCount) : "–",
              color: analysis ? "var(--color-danger)" : undefined,
            },
          ].map((cell) => (
            <div key={cell.label} className={styles.accuracyCell}>
              <span
                className={styles.accuracyValue}
                style={cell.color ? { color: cell.color } : undefined}
              >
                {cell.value}
              </span>
              <span className={styles.accuracyLabel}>{cell.label}</span>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className={styles.tabBar}>
          {(["moves", "analysis", "advice"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles.tabItem} ${activeTab === tab ? styles.tabItemActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "moves" ? "Ходи" : tab === "analysis" ? "Аналіз" : "Поради"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className={styles.tabContent}>
          {activeTab === "moves" && (
            <>
              {/* Moves list */}
              <div className={styles.movesSection}>
                <div className={styles.movesList}>
                  {movePairs.map((pair) => {
                    const whiteIdx = (pair.num - 1) * 2;
                    const blackIdx = whiteIdx + 1;
                    const whiteCls = analysis?.moves[whiteIdx]?.classification;
                    const blackCls = pair.black !== undefined ? analysis?.moves[blackIdx]?.classification : undefined;
                    return (
                      <div key={pair.num} className={styles.movePair}>
                        <span className={styles.moveNum}>{pair.num}.</span>
                        <button
                          type="button"
                          className={`${styles.moveCell} ${currentMove === whiteIdx ? styles.moveCellActive : ""}`}
                          onClick={() => seekMainline(whiteIdx)}
                          aria-pressed={currentMove === whiteIdx}
                        >
                          <span className={styles.moveSan}>{pair.white}</span>
                          {whiteCls && <MoveClassBadge classification={whiteCls} />}
                        </button>
                        {pair.black !== undefined && (
                          <button
                            type="button"
                            className={`${styles.moveCell} ${currentMove === blackIdx ? styles.moveCellActive : ""}`}
                            onClick={() => seekMainline(blackIdx)}
                            aria-pressed={currentMove === blackIdx}
                          >
                            <span className={styles.moveSan}>{pair.black}</span>
                            {blackCls && <MoveClassBadge classification={blackCls} />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </>
          )}

          {activeTab === "analysis" && (
            <LlmAnalysis
              view="analysis"
              hasEngineAnalysis={analysisState === "done"}
              llmStatus={llmStatus}
              llmAnalysis={llmAnalysis}
              onAnalyze={handleLlmAnalyze}
              onSeekMainline={seekMainline}
            />
          )}

          {activeTab === "advice" && (
            <LlmAnalysis
              view="recommendations"
              hasEngineAnalysis={analysisState === "done"}
              llmStatus={llmStatus}
              llmAnalysis={llmAnalysis}
              onAnalyze={handleLlmAnalyze}
              onSeekMainline={seekMainline}
            />
          )}
        </div>

        {/* Opening footer — sticky bottom, visible on all tabs */}
        <div className={styles.openingFooter}>
          <span className={styles.openingLabel}>Дебют</span>
          <span className={styles.openingValue}>{game.openingName ?? "–"}</span>
        </div>
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

// ── EvalChart ─────────────────────────────────────────────────────────────────

const CHART_W = 320;
const CHART_H = 80;
const AXIS_W = 28;
const CHART_CONTENT_W = CHART_W - AXIS_W;

const CHART_PADDING = 5; // vertical breathing room so extremes don't clip

function evalToChartY(pawns: number): number {
  const usable = CHART_H - 2 * CHART_PADDING;
  const pct = 1 / (1 + Math.exp(-0.55 * pawns));
  return CHART_PADDING + (1 - pct) * usable;
}

function smoothCurvePath(pts: Array<[number, number]>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  const d: string[] = [`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
  }
  return d.join(" ");
}

function EvalChart({
  evals,
  currentIndex,
  onSeek,
  keyMoments = [],
  phaseAccuracy = null,
  userColor = "white",
}: {
  evals: number[];
  currentIndex: number;
  onSeek: (i: number) => void;
  keyMoments?: EngineAnalysisJsonV1["keyMoments"];
  phaseAccuracy?: Array<{ white: number | null; black: number | null }> | null;
  userColor?: "white" | "black";
}) {
  const uid = useId();
  const n = evals.length;
  const zeroY = CHART_H / 2;

  if (n < 2) {
    return (
      <div
        className={styles.evalChartEmpty}
        title="Граф оцінки — запустіть аналіз"
      />
    );
  }

  const pts: Array<[number, number]> = evals.map((e, i) => [
    AXIS_W + (i / (n - 1)) * CHART_CONTENT_W,
    evalToChartY(e),
  ]);

  const linePath = smoothCurvePath(pts);
  const fillPath =
    linePath +
    ` L${pts[n - 1][0].toFixed(1)},${zeroY} L${pts[0][0].toFixed(1)},${zeroY} Z`;

  const curX =
    currentIndex >= 0 && currentIndex < n
      ? AXIS_W + (currentIndex / (n - 1)) * CHART_CONTENT_W
      : -1;
  const curY =
    currentIndex >= 0 && currentIndex < n
      ? evalToChartY(evals[currentIndex])
      : zeroY;

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const chartX = svgX - AXIS_W;
    if (chartX < 0) return;
    const idx = Math.round((chartX / CHART_CONTENT_W) * (n - 1));
    onSeek(Math.max(0, Math.min(n - 1, idx)));
  }

  const axisValues = [-1, 0, 1] as const;

  return (
    <div className={styles.evalChartWrap}>
      <svg
        width={CHART_W}
        height={CHART_H}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className={styles.evalChartSvg}
        onClick={handleClick}
      >
        <defs>
          <clipPath id={`${uid}-above`}>
            <rect x={AXIS_W} y="0" width={CHART_CONTENT_W} height={zeroY} />
          </clipPath>
          <clipPath id={`${uid}-below`}>
            <rect x={AXIS_W} y={zeroY} width={CHART_CONTENT_W} height={CHART_H - zeroY} />
          </clipPath>
        </defs>
        {/* Background */}
        <rect width={CHART_W} height={CHART_H} fill="var(--color-bg3)" />
        {/* Y-axis gridlines + labels */}
        {axisValues.map((pawnVal) => {
          const y = evalToChartY(pawnVal);
          const label = pawnVal > 0 ? `+${pawnVal}` : String(pawnVal);
          return (
            <g key={pawnVal}>
              <line
                x1={AXIS_W}
                y1={y}
                x2={CHART_W}
                y2={y}
                stroke={pawnVal === 0 ? "var(--color-border)" : "rgba(255,255,255,0.12)"}
                strokeWidth={1}
              />
              <text
                x={AXIS_W - 3}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={7}
                fontFamily="var(--font-mono)"
                fill="rgba(255,255,255,0.55)"
              >
                {label}
              </text>
            </g>
          );
        })}
        {/* White advantage fill */}
        <path
          d={fillPath}
          fill="rgba(232,220,200,0.75)"
          clipPath={`url(#${uid}-above)`}
        />
        {/* Black advantage fill */}
        <path
          d={fillPath}
          fill="rgba(20,20,20,0.85)"
          clipPath={`url(#${uid}-below)`}
        />
        {/* Eval line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-green-lt)"
          strokeWidth={1.5}
        />
        {/* Phase dividers */}
        {n >= 2 && [PHASE_OPENING_END_PLY, PHASE_MIDDLEGAME_END_PLY]
          .filter((divPly) => divPly < n)
          .map((divPly) => {
            const x = AXIS_W + (divPly / (n - 1)) * CHART_CONTENT_W;
            return (
              <line
                key={divPly}
                x1={x} y1={0}
                x2={x} y2={CHART_H}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
            );
          })
        }
        {/* Key moment dots */}
        {keyMoments.map((km) => {
          if (km.ply >= n) return null;
          const kx = AXIS_W + (km.ply / (n - 1)) * CHART_CONTENT_W;
          const ky = evalToChartY(evals[km.ply] ?? 0);
          const dotColor = km.type === "blunder" ? "#d44c4c" : "#e07b39";
          return (
            <g key={km.ply}>
              <circle
                cx={kx}
                cy={ky}
                r={10}
                fill="transparent"
                style={{ cursor: "pointer" }}
              />
              <circle
                cx={kx}
                cy={ky}
                r={2.5}
                fill={dotColor}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={0.5}
                style={{ pointerEvents: "none" }}
              />
            </g>
          );
        })}
        {/* Current position indicator */}
        {curX >= 0 && (
          <>
            <line
              x1={curX}
              y1={0}
              x2={curX}
              y2={CHART_H}
              stroke="var(--color-green-mid)"
              strokeWidth={1.5}
              strokeDasharray="3,2"
            />
            <circle
              cx={curX}
              cy={curY}
              r={4}
              fill="var(--color-green)"
              stroke="var(--color-green-pl)"
              strokeWidth={1.5}
            />
          </>
        )}
      </svg>
      {phaseAccuracy && n >= 2 && (() => {
        const fmt = (v: number | null) => v !== null ? `${v}%` : "–";
        const oppColor = userColor === "white" ? "black" : "white";
        const phases = ["Дебют", "Мідл", "Кінець"] as const;
        return (
          <div className={styles.phaseAccuracyGrid}>
            {/* header row: empty cell + phase labels */}
            <div />
            {phases.map(label => (
              <div key={label} className={styles.phaseAccuracyHeader}>{label}</div>
            ))}
            {/* user row */}
            <div className={styles.phaseAccuracyPlayer}>
              <span className={`${styles.phaseDot} ${userColor === "white" ? styles.phaseDotLight : styles.phaseDotDark}`} />
              <span className={styles.phasePlayerLabel}>Ви</span>
            </div>
            {phaseAccuracy.map((pa, i) => (
              <div key={i} className={`${styles.phaseAccuracyVal} ${styles.phaseAccuracyValUser}`}>
                {fmt(pa?.[userColor] ?? null)}
              </div>
            ))}
            {/* opponent row */}
            <div className={styles.phaseAccuracyPlayer}>
              <span className={`${styles.phaseDot} ${oppColor === "white" ? styles.phaseDotLight : styles.phaseDotDark}`} />
              <span className={styles.phasePlayerLabel}>Суп.</span>
            </div>
            {phaseAccuracy.map((pa, i) => (
              <div key={i} className={`${styles.phaseAccuracyVal} ${styles.phaseAccuracyValOpp}`}>
                {fmt(pa?.[oppColor] ?? null)}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

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

// ── Board overlay icon ─────────────────────────────────────────────────────────

function squareToTopRight(
  square: string,
  boardSize: number,
  whiteOnBottom: boolean
): { left: number; top: number } {
  const file = square.charCodeAt(0) - 97; // a=0..h=7
  const rank = parseInt(square[1], 10) - 1; // 1=0..8=7
  const sq = boardSize / 8;
  const col = whiteOnBottom ? file : 7 - file;
  const row = whiteOnBottom ? 7 - rank : rank;
  // anchor at top-right corner of the square
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

function MoveClassBadge({ classification }: { classification: MoveClassification }) {
  const meta = CLASS_META[classification];
  if (!meta) return null;
  return (
    <span
      className={styles.moveClassBadge}
      style={{ "--badge-bg": meta.bg } as React.CSSProperties}
      title={meta.label}
    >
      {meta.symbol}
    </span>
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

// ── Icons ──────────────────────────────────────────────────────────────────────

function FirstIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 20L9 12l10-8v16z M5 19V5" />
    </svg>
  );
}

function PrevIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function LastIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4l10 8-10 8V4z M19 5v14" />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4 M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function ReturnToMainlineIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14l-4-4 4-4" />
      <path d="M5 10h9a5 5 0 0 1 0 10h-2" />
    </svg>
  );
}

function StockfishIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

// ── Utils ──────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function countClassifications(
  analysis: EngineAnalysisJsonV1,
  color: "white" | "black",
  classification: MoveClassification
) {
  return analysis.moves.filter(
    (move) => move.color === color && move.classification === classification
  ).length;
}
