import { useId, useMemo } from "react";
import {
  evalToPawns,
  type EngineAnalysisJsonV1,
} from "@/lib/chess/engine-analysis";
import { type GameData } from "./types";
import styles from "./GameView.module.css";

// ── EvalChart constants ────────────────────────────────────────────────────────

const CHART_W = 320;
const CHART_H = 80;
const AXIS_W = 28;
const CHART_CONTENT_W = CHART_W - AXIS_W;
const CHART_PADDING = 5;

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

// ── EvalChart ─────────────────────────────────────────────────────────────────

function EvalChart({
  evals,
  currentIndex,
  onSeek,
  keyMoments = [],
}: {
  evals: number[];
  currentIndex: number;
  onSeek: (i: number) => void;
  keyMoments?: EngineAnalysisJsonV1["keyMoments"];
}) {
  const uid = useId();
  const n = evals.length;
  const zeroY = CHART_H / 2;

  const { pts, linePath, fillPath } = useMemo(() => {
    if (n < 2) return { pts: [], linePath: "", fillPath: "" };
    const p: Array<[number, number]> = evals.map((e, i) => [
      AXIS_W + (i / (n - 1)) * CHART_CONTENT_W,
      evalToChartY(e),
    ]);
    const lp = smoothCurvePath(p);
    const fp = lp + ` L${p[n - 1][0].toFixed(1)},${zeroY} L${p[0][0].toFixed(1)},${zeroY} Z`;
    return { pts: p, linePath: lp, fillPath: fp };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evals]);

  if (n < 2) {
    return (
      <div
        className={styles.evalChartEmpty}
        title="Граф оцінки — запустіть аналіз"
      />
    );
  }

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

  function handleKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    const cur = currentIndex >= 0 ? currentIndex : 0;
    const LARGE_STEP = Math.max(1, Math.round(n / 10));
    let next: number | null = null;
    if (e.key === "ArrowRight") next = cur + 1;
    else if (e.key === "ArrowLeft") next = cur - 1;
    else if (e.key === "PageDown") next = cur + LARGE_STEP;
    else if (e.key === "PageUp") next = cur - LARGE_STEP;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next !== null) {
      e.preventDefault();
      onSeek(Math.max(0, Math.min(n - 1, next)));
    }
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
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Графік оцінки партії"
        aria-valuemin={0}
        aria-valuemax={n - 1}
        aria-valuenow={currentIndex >= 0 ? currentIndex : 0}
        aria-valuetext={currentIndex >= 0 ? `Хід ${currentIndex}` : "Початок"}
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
          stroke="var(--color-teal-soft)"
          strokeWidth={1.5}
        />
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
              stroke="var(--color-info)"
              strokeWidth={1.5}
              strokeDasharray="3,2"
            />
            <circle
              cx={curX}
              cy={curY}
              r={4}
              fill="var(--color-teal)"
              stroke="var(--color-info-soft)"
              strokeWidth={1.5}
            />
          </>
        )}
      </svg>
    </div>
  );
}

// ── EvalSection ────────────────────────────────────────────────────────────────

interface EvalSectionProps {
  game: GameData;
  analysis: EngineAnalysisJsonV1 | null;
  currentMove: number;
  userColor: "white" | "black";
  phaseAccuracy: Array<{ white: number | null; black: number | null }> | null;
  onSeek: (i: number) => void;
  resultLabel: string;
}

export function EvalSection({
  game,
  analysis,
  currentMove,
  onSeek,
  resultLabel,
}: EvalSectionProps) {
  return (
    <>
      {/* Header — always visible */}
      <div className={styles.panelHeader}>
        <h1 className={styles.gameTitle}>Ви — {game.opponent}</h1>
        <div className={styles.resultRow}>
          <span className={`${styles.resultBadge} ${styles[game.result]}`}>
            {resultLabel}
          </span>
          <span className={styles.moveCount}>{game.moveCount} ходів</span>
        </div>
        <EvalChart
          evals={analysis ? analysis.evalGraph.map((p) => evalToPawns(p.eval) ?? 0) : []}
          currentIndex={currentMove + 1}
          onSeek={(i) => onSeek(i - 1)}
          keyMoments={analysis?.keyMoments}
        />
      </div>

      {/* Accuracy strip — always visible */}
      <div className={styles.accuracyStrip}>
        {[
          {
            label: "Точність",
            value: analysis ? `${analysis.accuracy.player}%` : "–",
            color: analysis ? "var(--color-text)" : undefined,
          },
          {
            label: "Суперник",
            value: analysis ? `${analysis.accuracy.opponent}%` : "–",
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
    </>
  );
}
