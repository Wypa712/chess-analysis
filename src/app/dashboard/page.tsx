"use client";

import { useState, useCallback } from "react";
import { ImportForm } from "@/components/ImportForm/ImportForm";
import { GamesList } from "@/components/GamesList/GamesList";
import styles from "./page.module.css";

type DashboardSummary = {
  total: number;
  wins: number;
  draws: number;
  losses: number;
};

const EMPTY_SUMMARY: DashboardSummary = {
  total: 0,
  wins: 0,
  draws: 0,
  losses: 0,
};

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const handleSummary = useCallback(
    (s: DashboardSummary, loading: boolean) => {
      setSummary(s);
      setSummaryLoading(loading);
    },
    []
  );

  const stats = [
    { label: "Партій", value: summary.total, tone: styles.statTotal },
    { label: "Перемог", value: summary.wins, tone: styles.statWin },
    { label: "Нічиїх", value: summary.draws, tone: styles.statDraw },
    { label: "Поразок", value: summary.losses, tone: styles.statLoss },
  ];

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>Привіт</h1>
          <p className={styles.subtitle}>
            Імпортуй партії, відфільтруй останні результати і переходь до аналізу.
          </p>
        </div>
      </section>

      <section className={styles.statsGrid} aria-label="Статистика партій">
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <div className={`${styles.statMark} ${stat.tone}`} />
            <p className={styles.statValue}>
              {summaryLoading ? "..." : stat.value}
            </p>
            <p className={styles.statLabel}>{stat.label}</p>
          </div>
        ))}
      </section>

      <ImportForm onImported={() => setRefreshKey((k) => k + 1)} />

      <GamesList refreshKey={refreshKey} onSummary={handleSummary} />
    </div>
  );
}
