"use client";

import { useCallback, useState } from "react";
import { SyncStatusBar } from "@/components/SyncStatusBar/SyncStatusBar";
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

export function DashboardClient() {
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
    // Hide the entire dashboard until the first GamesList fetch resolves.
    // The full-screen spinner during the initial load is already provided by
    // dashboard/loading.tsx (Next.js Suspense boundary). Rendering a second
    // RouteLoader here caused a visible double-spinner flicker: the Suspense
    // loader would disappear as the Server Component resolved, then the client
    // would immediately mount its own identical full-screen spinner, making the
    // loader appear to restart. Using visibility:hidden keeps layout stable and
    // avoids any flash of zeroed stat cards while staying imperceptible to the
    // user (the content area is behind the AppShell until the Suspense loader
    // is gone anyway).
    <div
      style={summaryLoading ? { visibility: "hidden" } : undefined}
      className={styles.container}
    >
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>Дашборд</h1>
          <p className={styles.subtitle}>
            Ваші партії та статистика. Нові партії підтягуються автоматично.
          </p>
        </div>
        <SyncStatusBar onSynced={() => setRefreshKey((k) => k + 1)} />
      </section>

      <section className={styles.statsGrid} aria-label="Статистика партій">
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <div className={`${styles.statMark} ${stat.tone}`} />
            <p className={styles.statValue}>{stat.value}</p>
            <p className={styles.statLabel}>{stat.label}</p>
          </div>
        ))}
      </section>

      <GamesList refreshKey={refreshKey} onSummary={handleSummary} />
    </div>
  );
}
