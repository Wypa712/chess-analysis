"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./LinkedAccountCard.module.css";

interface LinkedAccountCardProps {
  id: string;
  platform: "chess_com" | "lichess";
  username: string;
  lastSyncedAt: string | null;
  onRemove: (id: string) => void;
}

function formatLastSync(ts: string | null): string {
  if (!ts) return "ніколи";
  const d = new Date(ts);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "щойно";
  if (diffMin < 60) return `${diffMin} хв тому`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} год тому`;
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

export function LinkedAccountCard({
  id,
  platform,
  username,
  lastSyncedAt,
  onRemove,
}: LinkedAccountCardProps) {
  const [removing, setRemoving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  async function handleRemoveConfirm() {
    setConfirming(false);
    setRemoving(true);
    setRemoveError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const timerId = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(`/api/chess-accounts/${id}`, {
        method: "DELETE",
        signal: controller.signal,
      });
      if (!res.ok) {
        setRemoveError("Не вдалося видалити акаунт");
        return;
      }
      onRemove(id);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setRemoveError("Час очікування вичерпано");
      } else {
        console.error("[LinkedAccountCard] remove failed:", err);
        setRemoveError("Не вдалося видалити акаунт");
      }
    } finally {
      clearTimeout(timerId);
      abortRef.current = null;
      setRemoving(false);
    }
  }

  const platformLabel = platform === "chess_com" ? "Chess.com" : "Lichess";

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <span className={styles.platform}>{platformLabel}</span>
        <span className={styles.username}>{username}</span>
        <span className={styles.sync}>Синхронізовано: {formatLastSync(lastSyncedAt)}</span>
        {removeError && <span className={styles.removeError}>{removeError}</span>}
      </div>
      {confirming ? (
        <div className={styles.confirmRow}>
          <button
            className={styles.cancelBtn}
            onClick={() => setConfirming(false)}
          >
            Ні
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleRemoveConfirm}
          >
            Видалити
          </button>
        </div>
      ) : (
        <button
          className={styles.removeBtn}
          onClick={() => setConfirming(true)}
          disabled={removing}
          title="Видалити акаунт"
          aria-label={`Видалити ${username}`}
        >
          {removing ? "…" : "×"}
        </button>
      )}
    </div>
  );
}
