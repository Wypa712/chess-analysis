"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./SyncStatusBar.module.css";

const SESSION_KEY = "chess_sync_ts";

interface SyncResult {
  imported: number;
  skipped: number;
}

interface SyncStatusBarProps {
  onSynced?: () => void;
}

export function SyncStatusBar({ onSynced }: SyncStatusBarProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTs, setLastSyncTs] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Ref-based in-flight guard so `syncing` state is not needed in useCallback deps
  const syncingRef = useRef(false);
  const onSyncedRef = useRef(onSynced);
  useEffect(() => { onSyncedRef.current = onSynced; });

  // After the user manually syncs at least once, subsequent 429s show the wait message.
  // Before that, 429 is silently ignored (caused by the auto-sync on mount consuming the token).
  const hasManualSyncedRef = useRef(false);

  const runSync = useCallback(async (isManual = false) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        if (res.status === 429) {
          if (isManual && hasManualSyncedRef.current) {
            setError("Зачекайте перед наступною синхронізацією");
          }
          // else: silently ignore — auto-sync or first manual click after auto-sync
        } else {
          const data = await res.json().catch(() => ({}));
          setError((data as { error?: string }).error ?? "Помилка синхронізації");
        }
        return;
      }

      const data = await res.json();

      const now = new Date().toISOString();
      try { sessionStorage.setItem(SESSION_KEY, now); } catch { /* storage full */ }
      setLastSyncTs(now);
      setResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 });
      if (isManual) hasManualSyncedRef.current = true;
      if (data.imported > 0) onSyncedRef.current?.();
    } catch {
      if (isManual) setError("Не вдалося синхронізувати");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  // On mount: restore last timestamp for display, then always sync
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) setLastSyncTs(stored);
    } catch { /* storage unavailable */ }
    runSync();
  }, [runSync]);

  function formatTs(ts: string | null): string {
    if (!ts) return "ніколи";
    const d = new Date(ts);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (diffMin < 1) return "щойно";
    if (diffMin < 60) return `${diffMin} хв тому`;
    return d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className={styles.bar}>
      <div className={styles.left} aria-live="polite" aria-atomic="false">
        {syncing ? (
          <span className={styles.syncing}>
            <span className={styles.spinner} aria-hidden />
            Синхронізація…
          </span>
        ) : (
          <span className={styles.syncTime}>
            Оновлено:{" "}
            <span className={styles.syncTimeValue}>{formatTs(lastSyncTs)}</span>
          </span>
        )}
        {result && result.imported > 0 && !syncing && (
          <span className={styles.badge}>+{result.imported} нових</span>
        )}
        {error && <span className={styles.errorText}>{error}</span>}
      </div>

      <button
        className={styles.refreshBtn}
        onClick={() => runSync(true)}
        disabled={syncing}
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={syncing ? styles.spinIcon : undefined}
        >
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        Оновити
      </button>
    </div>
  );
}
