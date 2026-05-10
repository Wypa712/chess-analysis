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

  const runSync = useCallback(async () => {
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
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Помилка синхронізації");
        return;
      }

      const data = await res.json();

      const now = new Date().toISOString();
      try { sessionStorage.setItem(SESSION_KEY, now); } catch { /* storage full */ }
      setLastSyncTs(now);
      setResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 });
      if (data.imported > 0) onSyncedRef.current?.();
    } catch {
      setError("Не вдалося синхронізувати");
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
        {error && (
          <span className={styles.syncHint}>
            Перевірте акаунти в налаштуваннях або оновіть сторінку.
          </span>
        )}
      </div>
    </div>
  );
}
