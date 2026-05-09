import React from "react";
import type { ExploreMove, TrailDragState } from "./types";
import styles from "./GameView.module.css";

const EVAL_BAR_WIDTH = 24;
const BOARD_ROW_GAP = 10;

interface ExplorePanelProps {
  exploreMode: boolean;
  explorationMoves: ExploreMove[];
  exploreAnalyzing: boolean;
  boardSize: number;
  moveTrailRef: React.RefObject<HTMLDivElement | null>;
  trailDragRef: React.MutableRefObject<TrailDragState>;
  onBreadcrumbClick: (i: number) => void;
  onExitExplore: () => void;
  onFinishTrailDrag: () => void;
}

export function ExplorePanel({
  exploreMode,
  explorationMoves,
  exploreAnalyzing,
  boardSize,
  moveTrailRef,
  trailDragRef,
  onBreadcrumbClick,
  onExitExplore,
  onFinishTrailDrag,
}: ExplorePanelProps) {
  return (
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
            onMouseUp={onFinishTrailDrag}
            onMouseLeave={onFinishTrailDrag}
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
                onClick={() => onBreadcrumbClick(i)}
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
            onClick={onExitExplore}
          >
            До партії
          </button>
        </div>
      )}
    </div>
  );
}
