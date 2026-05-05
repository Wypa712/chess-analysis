"use client";

import { useState } from "react";
import styles from "./GameView.module.css";

export type LlmGameAnalysisV1 = {
  version: 1;
  language: "uk";
  generalAssessment: string;
  opening: {
    summary: string;
    keyMistakes: string[];
  };
  middlegame: {
    summary: string;
    tacticalMisses: string[];
    positionalIssues: string[];
  };
  endgame: {
    reached: boolean;
    summary?: string;
  };
  criticalMoments: Array<{
    moveNumber: number;
    color?: "white" | "black";
    move?: string;
    description: string;
    recommendation: string;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: 1 | 2 | 3;
  }>;
};

export type LlmStatus = "idle" | "analyzing" | "done" | "error";

export function LlmAnalysis({
  view,
  hasEngineAnalysis,
  llmStatus,
  llmAnalysis,
  onAnalyze,
  onSeekMainline,
}: {
  view: "analysis" | "recommendations";
  hasEngineAnalysis: boolean;
  llmStatus: LlmStatus;
  llmAnalysis: LlmGameAnalysisV1 | null;
  onAnalyze: () => void;
  onSeekMainline: (ply: number) => void;
}) {
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});

  function togglePhase(key: string) {
    setOpenPhases((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const phaseConfigs = llmAnalysis
    ? [
        {
          key: "opening",
          label: "Дебют",
          summary: llmAnalysis.opening.summary,
          lists: [
            { title: "Помилки", items: llmAnalysis.opening.keyMistakes },
          ],
        },
        {
          key: "middlegame",
          label: "Мідлгейм",
          summary: llmAnalysis.middlegame.summary,
          lists: [
            { title: "Тактичні прорахунки", items: llmAnalysis.middlegame.tacticalMisses },
            { title: "Позиційні проблеми", items: llmAnalysis.middlegame.positionalIssues },
          ],
        },
        {
          key: "endgame",
          label: "Ендшпіль",
          summary: llmAnalysis.endgame.reached
            ? (llmAnalysis.endgame.summary ?? "Ендшпіль зіграно.")
            : "Ендшпіль у цій партії не настав.",
          lists: [],
        },
      ]
    : [];

  // ── Recommendations tab ────────────────────────────────────────────────────

  if (view === "recommendations") {
    if (llmStatus === "idle") {
      return (
        <div className={styles.llmEmptyState}>
          <span className={styles.llmEmptyIcon}>◈</span>
          <span className={styles.llmEmptyText}>
            Перейдіть на вкладку «Аналіз» і запустіть аналіз партії
          </span>
        </div>
      );
    }

    if (llmStatus === "analyzing") {
      return (
        <div className={styles.llmEmptyState}>
          <span className={styles.llmSpinner} />
          <span className={styles.llmEmptyText}>Аналізуємо…</span>
        </div>
      );
    }

    if (llmStatus === "error") {
      return (
        <div className={styles.llmEmptyState}>
          <span className={styles.llmEmptyIcon}>✕</span>
          <span className={styles.llmEmptyText}>
            Не вдалося отримати аналіз. Спробуйте ще раз.
          </span>
        </div>
      );
    }

    if (llmStatus === "done" && llmAnalysis && llmAnalysis.recommendations.length > 0) {
      return (
        <div className={styles.llmRecommendations}>
          {[...llmAnalysis.recommendations]
            .sort((a, b) => a.priority - b.priority)
            .map((rec, i) => (
              <div key={i} className={styles.llmRecommendationItem}>
                <span className={styles.llmRecommendationNum}>{i + 1}.</span>
                <div className={styles.llmRecommendationContent}>
                  <div className={styles.llmRecommendationTitle}>{rec.title}</div>
                  <div className={styles.llmRecommendationDesc}>{rec.description}</div>
                </div>
              </div>
            ))}
        </div>
      );
    }

    return null;
  }

  // ── Analysis tab ───────────────────────────────────────────────────────────

  return (
    <div className={styles.llmSection}>
      <div className={styles.llmSectionHeader}>
        {llmStatus === "idle" && (
          <button
            type="button"
            className={styles.llmAnalyzeBtn}
            onClick={onAnalyze}
          >
            Аналізувати партію
          </button>
        )}

        {llmStatus === "analyzing" && (
          <div className={styles.llmAnalyzingRow}>
            <span className={styles.llmSpinner} />
            Аналізуємо…
          </div>
        )}

        {llmStatus === "error" && (
          <button
            type="button"
            className={styles.llmAnalyzeBtn}
            onClick={onAnalyze}
          >
            Спробувати ще раз
          </button>
        )}

        {llmStatus === "done" && (
          <div className={styles.llmDoneRow}>
            <span className={styles.llmDoneCheck}>✓</span>
            <span className={styles.llmDoneLabel}>Аналіз готовий</span>
            <button
              type="button"
              className={styles.llmReanalyzeBtn}
              onClick={onAnalyze}
            >
              Повторний аналіз
            </button>
          </div>
        )}
      </div>

      {llmStatus === "idle" && !hasEngineAnalysis && (
        <div className={styles.llmWarning}>
          <span className={styles.llmWarningIcon}>⚠</span>
          <span>
            Stockfish-аналіз відсутній. Результат буде менш точним — без
            даних про ключові моменти та точність ходів.
          </span>
        </div>
      )}

      {llmStatus === "error" && (
        <div className={styles.llmWarning}>
          <span className={styles.llmWarningIcon}>✕</span>
          <span>Не вдалося отримати аналіз. Спробуйте ще раз.</span>
        </div>
      )}

      {llmStatus === "done" && llmAnalysis && (
        <div className={styles.llmBody}>
          <p className={styles.llmGeneralAssessment}>
            {llmAnalysis.generalAssessment}
          </p>

          {phaseConfigs.map((phase) => (
            <div key={phase.key} className={styles.llmPhaseAccordion}>
              <button
                type="button"
                className={styles.llmAccordionToggle}
                onClick={() => togglePhase(phase.key)}
                aria-expanded={!!openPhases[phase.key]}
              >
                <span className={styles.llmAccordionLabel}>{phase.label}</span>
                <span
                  className={`${styles.llmAccordionArrow} ${openPhases[phase.key] ? styles.llmAccordionArrowOpen : ""}`}
                >
                  ▸
                </span>
              </button>
              {openPhases[phase.key] && (
                <div className={styles.llmAccordionBody}>
                  <p className={styles.llmAccordionText}>{phase.summary}</p>
                  {phase.lists.map((list) =>
                    list.items.length > 0 ? (
                      <ul key={list.title} className={styles.llmAccordionList}>
                        {list.items.map((item, i) => (
                          <li key={i} className={styles.llmAccordionListItem}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null
                  )}
                </div>
              )}
            </div>
          ))}

          {llmAnalysis.criticalMoments.length > 0 && (
            <div className={styles.llmCriticalMoments}>
              <div className={styles.llmCriticalTitle}>Критичні моменти</div>
              {llmAnalysis.criticalMoments.slice(0, 3).map((cm, i) => (
                <div key={i} className={styles.llmCriticalRow}>
                  <button
                    type="button"
                    className={styles.llmCriticalMove}
                    onClick={() => {
                      const ply = cm.color === "black"
                        ? cm.moveNumber * 2 - 1
                        : cm.moveNumber * 2 - 2;
                      onSeekMainline(ply);
                    }}
                    title="Перейти до позиції"
                  >
                    {cm.moveNumber}.{cm.move ? ` ${cm.move}` : ""}
                  </button>
                  <span className={styles.llmCriticalDesc}>{cm.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
