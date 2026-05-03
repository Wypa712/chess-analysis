"use client";

import { Chessboard } from "react-chessboard";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./GameView.module.css";

const MAX_BOARD_SIZE = 700;
const EVAL_BAR_WIDTH = 24;
const BOARD_ROW_GAP = 10;
const ANALYSIS_PANEL_MIN_WIDTH = 280;
const LAYOUT_GAP = 24;

type MovePair = { num: number; white: string; black?: string };

const SAMPLE_MOVES: MovePair[] = [
  { num: 1, white: "e4", black: "e5" },
  { num: 2, white: "Nf3", black: "Nc6" },
  { num: 3, white: "Bb5", black: "a6" },
  { num: 4, white: "Ba4", black: "Nf6" },
  { num: 5, white: "O-O", black: "Be7" },
  { num: 6, white: "Re1", black: "b5" },
  { num: 7, white: "Bb3", black: "d6" },
  { num: 8, white: "c3", black: "O-O" },
  { num: 9, white: "h3", black: "Nb8" },
  { num: 10, white: "d4", black: "Nbd7" },
];

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

export function GameView({ game }: { game: GameData }) {
  const userColor = game.color;
  const opponentColor = userColor === "white" ? "black" : "white";

  const layoutRef = useRef<HTMLDivElement>(null);
  const boardAreaRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(MAX_BOARD_SIZE);
  const [currentMove, setCurrentMove] = useState(-1);

  useEffect(() => {
    const layoutEl = layoutRef.current;
    const boardAreaEl = boardAreaRef.current;
    if (!layoutEl || !boardAreaEl) return;

    const compute = () => {
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      const style = getComputedStyle(boardAreaEl);
      const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const layoutWidth = layoutEl.clientWidth;

      const containerWidth = isMobile
        ? layoutWidth
        : layoutWidth - ANALYSIS_PANEL_MIN_WIDTH - LAYOUT_GAP;

      const available = containerWidth - paddingX - EVAL_BAR_WIDTH - BOARD_ROW_GAP;
      setBoardSize(Math.min(Math.max(available, 200), MAX_BOARD_SIZE));
    };

    const observer = new ResizeObserver(compute);
    observer.observe(layoutEl);
    return () => observer.disconnect();
  }, []);

  const resultLabel =
    game.result === "win"
      ? "Перемога"
      : game.result === "loss"
        ? "Поразка"
        : "Нічия";

  return (
    <div className={styles.layout} ref={layoutRef}>
      {/* ── Left: board area ── */}
      <div className={styles.boardArea} ref={boardAreaRef}>
        <PlayerBadge
          name={game.opponent}
          rating={game.opponentRating}
          color={opponentColor}
        />

        <div className={styles.boardRow}>
          <div
            className={styles.evalBarPlaceholder}
            style={{ height: boardSize }}
            title="Eval bar — Фаза 4"
          />
          <Chessboard
            id="game-board"
            position="start"
            boardWidth={boardSize}
            boardOrientation={userColor}
            arePiecesDraggable={false}
            customBoardStyle={{
              borderRadius: "4px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}
            customDarkSquareStyle={{ backgroundColor: "#2d5a27" }}
            customLightSquareStyle={{ backgroundColor: "#d4e8d0" }}
          />
        </div>

        <PlayerBadge
          name="Ви"
          rating={game.playerRating}
          color={userColor}
        />

        <div className={styles.navControls}>
          <button type="button" className={styles.navBtn} aria-label="Перший хід">
            <FirstIcon />
          </button>
          <button type="button" className={styles.navBtn} aria-label="Попередній хід">
            <PrevIcon />
          </button>
          <button type="button" className={styles.navBtn} aria-label="Наступний хід">
            <NextIcon />
          </button>
          <button type="button" className={styles.navBtn} aria-label="Останній хід">
            <LastIcon />
          </button>
          <div className={styles.navDivider} />
          <button type="button" className={styles.navBtn} aria-label="Перевернути дошку">
            <FlipIcon />
          </button>
        </div>
      </div>

      {/* ── Right: analysis panel ── */}
      <div className={styles.analysisPanel}>
        {/* Header */}
        <div className={styles.panelHeader}>
          <Link href="/dashboard" className={styles.backLink}>
            <PrevIcon size={11} />
            Назад
          </Link>
          <h1 className={styles.gameTitle}>
            Ви — {game.opponent}
          </h1>
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
          <div
            className={styles.evalChartPlaceholder}
            title="Граф оцінки — Фаза 4"
          />
        </div>

        {/* Accuracy strip */}
        <div className={styles.accuracyStrip}>
          {[
            { label: "Точність Б.", value: "–" },
            { label: "Точність Ч.", value: "–" },
            { label: "Помилки", value: "–" },
            { label: "Грубих", value: "–" },
          ].map((cell) => (
            <div key={cell.label} className={styles.accuracyCell}>
              <span className={styles.accuracyValue}>{cell.value}</span>
              <span className={styles.accuracyLabel}>{cell.label}</span>
            </div>
          ))}
        </div>

        {/* Moves */}
        <div className={styles.movesSection}>
          <div className={styles.movesLabel}>Ходи</div>
          <div className={styles.movesList}>
            {SAMPLE_MOVES.map((pair) => {
              const whiteIdx = (pair.num - 1) * 2;
              const blackIdx = whiteIdx + 1;
              return (
                <div key={pair.num} className={styles.movePair}>
                  <span className={styles.moveNum}>{pair.num}.</span>
                  <span
                    className={`${styles.moveCell} ${currentMove === whiteIdx ? styles.moveCellActive : ""}`}
                    onClick={() => setCurrentMove(whiteIdx)}
                  >
                    {pair.white}
                  </span>
                  {pair.black && (
                    <span
                      className={`${styles.moveCell} ${currentMove === blackIdx ? styles.moveCellActive : ""}`}
                      onClick={() => setCurrentMove(blackIdx)}
                    >
                      {pair.black}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Opening footer */}
        <div className={styles.openingFooter}>
          <span className={styles.openingLabel}>Дебют</span>
          <span className={styles.openingValue}>
            {game.openingName ?? "–"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlayerBadge({
  name,
  rating,
  color,
}: {
  name: string;
  rating: number | null;
  color: "white" | "black";
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
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function FirstIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 20L9 12l10-8v16z M5 19V5" />
    </svg>
  );
}

function PrevIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function LastIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4l10 8-10 8V4z M19 5v14" />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 16V4m0 0L3 8m4-4l4 4 M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
