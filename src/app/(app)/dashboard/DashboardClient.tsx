"use client";

import { useCallback, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { SyncStatusBar, type SyncStatusBarHandle } from "@/components/SyncStatusBar/SyncStatusBar";
import { GamesList } from "@/components/GamesList/GamesList";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
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
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const queryClient = useQueryClient();

  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const syncBarRef = useRef<SyncStatusBarHandle>(null);

  const handleSummary = useCallback(
    (s: DashboardSummary, loading: boolean) => {
      setSummary(s);
      setSummaryLoading(loading);
    },
    []
  );

  const handleSynced = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["games", userId] });
  }, [queryClient, userId]);

  const triggerSync = useCallback(() => {
    syncBarRef.current?.runSync();
  }, []);

  const { containerRef, indicatorStyle, isReady } = usePullToRefresh(triggerSync);

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
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* @keyframes for pull-to-refresh spinner */}
      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Pull-to-refresh indicator */}
      <div
        style={{
          ...indicatorStyle,
          position: "absolute",
          zIndex: 50,
          borderRadius: "50%",
          background: "var(--color-bg3)",
          border: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          pointerEvents: "none",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle
            cx="10"
            cy="10"
            r="7"
            stroke="var(--color-teal-soft)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="22 22"
            style={{
              animation: isReady ? "ptr-spin 0.8s linear infinite" : "none",
              transformOrigin: "center",
            }}
          />
        </svg>
      </div>

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
          <SyncStatusBar ref={syncBarRef} onSynced={handleSynced} />
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

        <GamesList userId={userId} onSummary={handleSummary} />
      </div>
    </div>
  );
}
