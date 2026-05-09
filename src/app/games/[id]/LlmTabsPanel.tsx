import { evalToPawns, type EngineAnalysisJsonV1, type MoveClassification } from "@/lib/chess/engine-analysis";
import { LlmAnalysis, type LlmStatus } from "./LlmAnalysis";
import { type LlmGameAnalysisV1 } from "@/lib/llm/types";
import { type MovePair, type ExploreEvalResult } from "./types";
import styles from "./GameView.module.css";

const MATE_THRESHOLD_PAWNS = 50;

// ── Move classification metadata ───────────────────────────────────────────────

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

// ── LlmTabsPanel ──────────────────────────────────────────────────────────────

interface LlmTabsPanelProps {
  exploreMode: boolean;
  exploreAnalyzing: boolean;
  exploreEvalResult: ExploreEvalResult | null;
  activeTab: "moves" | "analysis" | "advice";
  onTabChange: (tab: "moves" | "analysis" | "advice") => void;
  movePairs: MovePair[];
  analysis: EngineAnalysisJsonV1 | null;
  currentMove: number;
  onSeekMainline: (i: number) => void;
  analysisState: "idle" | "loading" | "done" | "error";
  llmStatus: LlmStatus;
  llmError: string | null;
  llmAnalysis: LlmGameAnalysisV1 | null;
  llmOpenPhases: Record<string, boolean>;
  onAnalyze: () => void;
  onTogglePhase: (key: string) => void;
  openingName: string | null;
}

export function LlmTabsPanel({
  exploreMode,
  exploreAnalyzing,
  exploreEvalResult,
  activeTab,
  onTabChange,
  movePairs,
  analysis,
  currentMove,
  onSeekMainline,
  analysisState,
  llmStatus,
  llmError,
  llmAnalysis,
  llmOpenPhases,
  onAnalyze,
  onTogglePhase,
  openingName,
}: LlmTabsPanelProps) {
  return (
    <>
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
                const isMate = Math.abs(pawns) >= MATE_THRESHOLD_PAWNS;
                const mateVal = typeof c.eval?.value === "number" ? Math.abs(c.eval.value) : null;
                const evalStr = isMate
                  ? (mateVal !== null ? `M${mateVal}` : "?")
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

      {/* Tab bar */}
      <div className={styles.tabBar}>
        {(["moves", "analysis", "advice"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabItem} ${activeTab === tab ? styles.tabItemActive : ""}`}
            onClick={() => onTabChange(tab)}
          >
            {tab === "moves" ? "Ходи" : tab === "analysis" ? "Аналіз" : "Поради"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === "moves" && (
          <>
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
                        onClick={() => onSeekMainline(whiteIdx)}
                        aria-pressed={currentMove === whiteIdx}
                      >
                        <span className={styles.moveSan}>{pair.white}</span>
                        {whiteCls && <MoveClassBadge classification={whiteCls} />}
                      </button>
                      {pair.black !== undefined && (
                        <button
                          type="button"
                          className={`${styles.moveCell} ${currentMove === blackIdx ? styles.moveCellActive : ""}`}
                          onClick={() => onSeekMainline(blackIdx)}
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
            stockfishRunning={analysisState === "loading"}
            llmStatus={llmStatus}
            llmError={llmError}
            llmAnalysis={llmAnalysis}
            openPhases={llmOpenPhases}
            onAnalyze={onAnalyze}
            onSeekMainline={onSeekMainline}
            onTogglePhase={onTogglePhase}
          />
        )}

        {activeTab === "advice" && (
          <LlmAnalysis
            view="recommendations"
            hasEngineAnalysis={analysisState === "done"}
            stockfishRunning={analysisState === "loading"}
            llmStatus={llmStatus}
            llmError={llmError}
            llmAnalysis={llmAnalysis}
            openPhases={llmOpenPhases}
            onAnalyze={onAnalyze}
            onSeekMainline={onSeekMainline}
            onTogglePhase={onTogglePhase}
          />
        )}
      </div>

      {/* Opening footer — sticky bottom, visible on all tabs */}
      <div className={styles.openingFooter}>
        <span className={styles.openingLabel}>Дебют</span>
        <span className={styles.openingValue}>{openingName ?? "–"}</span>
      </div>
    </>
  );
}
