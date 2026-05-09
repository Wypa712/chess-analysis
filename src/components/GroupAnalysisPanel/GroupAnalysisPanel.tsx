"use client";

import { useState } from "react";
import styles from "./GroupAnalysisPanel.module.css";
import type { GroupAnalysisJsonV1 } from "@/lib/llm/types";

type Props = {
  analysis: GroupAnalysisJsonV1;
  gameCount: number;
  createdAt: string;
  onReanalyze?: () => void;
  reanalyzing?: boolean;
};

export function GroupAnalysisPanel({ analysis, gameCount, createdAt, onReanalyze, reanalyzing }: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const createdAtDate = new Date(createdAt);
  const formattedDate = !isNaN(createdAtDate.getTime())
    ? createdAtDate.toLocaleDateString("uk-UA")
    : "—";

  function toggle(key: string) {
    setOpenSections(p => ({ ...p, [key]: !p[key] }));
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Груповий аналіз · {gameCount} партій</h3>
        <span className={styles.date}>{formattedDate}</span>
        {onReanalyze && (
          <button type="button" className={styles.reanalyzeBtn} onClick={onReanalyze} disabled={reanalyzing}>
            {reanalyzing ? "Аналізуємо…" : "Повторити"}
          </button>
        )}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Повторювані закономірності</h4>
        <ol className={styles.patternList}>
          {analysis.patterns.map((p, i) => <li key={i}>{p}</li>)}
        </ol>
      </div>

      <WeaknessAccordion
        title="Тактичні слабкості"
        items={analysis.tacticalWeaknesses}
        open={!!openSections["tactical"]}
        onToggle={() => toggle("tactical")}
      />

      <WeaknessAccordion
        title="Стратегічні слабкості"
        items={analysis.strategicWeaknesses}
        open={!!openSections["strategic"]}
        onToggle={() => toggle("strategic")}
      />

      {analysis.openingAssessment.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Оцінка дебютів</h4>
          <ul className={styles.openingList}>
            {analysis.openingAssessment.map((o, i) => (
              <li key={i} className={styles.openingItem}>
                <strong>{o.openingName}</strong>
                <span className={styles.openingIssue}>{o.issue}</span>
                <span className={styles.openingRec}>{o.recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>План дій</h4>
        <div className={styles.actionPlanGrid}>
          {analysis.actionPlan.map((a, i) => (
            <div key={i} className={styles.actionCard}>
              <span className={`${styles.priorityBadge} ${styles[`priority${a.priority}`] ?? styles.priorityDefault ?? ""}`}>
                {a.priority}
              </span>
              <strong className={styles.actionFocus}>{a.focus}</strong>
              <p className={styles.actionSuggestion}>{a.practiceSuggestion}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WeaknessAccordion({ title, items, open, onToggle }: {
  title: string;
  items: GroupAnalysisJsonV1["tacticalWeaknesses"];
  open: boolean;
  onToggle: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className={styles.accordion}>
      <button type="button" className={styles.accordionHeader} onClick={onToggle} aria-expanded={open}>
        <span>{title}</span>
        <span className={styles.accordionIcon}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul className={styles.weaknessList}>
          {items.map((w, i) => (
            <li key={i} className={styles.weaknessItem}>
              <strong className={styles.weaknessTheme}>{w.theme}</strong>
              <span className={styles.weaknessEvidence}>{w.evidence}</span>
              <span className={styles.weaknessAdvice}>{w.advice}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
