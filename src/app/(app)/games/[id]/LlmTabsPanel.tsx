import { LlmAnalysis, type LlmStatus } from "./LlmAnalysis";
import { type LlmGameAnalysisV1 } from "@/lib/llm/types";
import { type MovePair, type ExploreEvalResult } from "./types";
import styles from "./GameView.module.css";

// ── LlmTabsPanel ──────────────────────────────────────────────────────────────

interface LlmTabsPanelProps {
  exploreMode: boolean;
  exploreAnalyzing: boolean;
  exploreEvalResult: ExploreEvalResult | null;
  activeTab: "moves" | "analysis" | "advice";
  onTabChange: (tab: "moves" | "analysis" | "advice") => void;
  movePairs: MovePair[];
  currentMove: number;
  onSeekMainline: (i: number) => void;
  analysisState: "idle" | "loading" | "done" | "error";
  llmStatus: LlmStatus;
  llmError: string | null;
  llmAnalysis: LlmGameAnalysisV1 | null;
  llmOpenPhases: Record<string, boolean>;
  onTogglePhase: (key: string) => void;
  openingName: string | null;
}

export function LlmTabsPanel({
  exploreAnalyzing,
  activeTab,
  onTabChange,
  movePairs,
  currentMove,
  onSeekMainline,
  analysisState,
  llmStatus,
  llmError,
  llmAnalysis,
  llmOpenPhases,
  onTogglePhase,
  openingName,
}: LlmTabsPanelProps) {
  return (
    <>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        {(["moves", "analysis", "advice"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            data-tab={tab}
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
                      </button>
                      {pair.black !== undefined && (
                        <button
                          type="button"
                          className={`${styles.moveCell} ${currentMove === blackIdx ? styles.moveCellActive : ""}`}
                          onClick={() => onSeekMainline(blackIdx)}
                          aria-pressed={currentMove === blackIdx}
                        >
                          <span className={styles.moveSan}>{pair.black}</span>
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
