"use client";

import { useState } from "react";
import styles from "./AccountForm.module.css";

type Platform = "lichess" | "chess_com";

export type LinkedAccount = {
  id: string;
  platform: Platform;
  username: string;
  lastSyncedAt: string | null;
};

interface AccountFormProps {
  onSuccess: (account: LinkedAccount) => void;
}

export function AccountForm({ onSuccess }: AccountFormProps) {
  const [platform, setPlatform] = useState<Platform>("lichess");
  const [usernames, setUsernames] = useState<Record<Platform, string>>({
    lichess: "",
    chess_com: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeUsername = usernames[platform].trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!activeUsername) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chess-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username: activeUsername }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Помилка підключення акаунту");
      }

      const data: unknown = await res.json();
      const d = data as Record<string, unknown>;
      if (
        typeof data !== "object" ||
        data === null ||
        typeof d.id !== "string" ||
        typeof d.platform !== "string" ||
        typeof d.username !== "string" ||
        (typeof d.lastSyncedAt !== "string" && d.lastSyncedAt !== null)
      ) {
        throw new Error("Невалідна відповідь сервера");
      }

      setUsernames((prev) => ({ ...prev, [platform]: "" }));
      onSuccess(data as LinkedAccount);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося підключитись. Перевірте з'єднання"
      );
    }
    setLoading(false);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} id="platform-label">Платформа</label>
          <div className={styles.segmented} role="group" aria-labelledby="platform-label">
            {(["lichess", "chess_com"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.seg} ${platform === p ? styles.segActive : ""}`}
                onClick={() => setPlatform(p)}
                disabled={loading}
              >
                {p === "lichess" ? "Lichess" : "Chess.com"}
              </button>
            ))}
          </div>
        </div>

        <div className={`${styles.field} ${styles.fieldGrow}`}>
          <label className={styles.label} htmlFor="account-username">
            Нікнейм
          </label>
          <input
            id="account-username"
            className={styles.input}
            type="text"
            value={usernames[platform]}
            onChange={(e) =>
              setUsernames((prev) => ({ ...prev, [platform]: e.target.value }))
            }
            placeholder={
              platform === "lichess" ? "lichess_username" : "chess_com_username"
            }
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading || !activeUsername}
        >
          {loading ? "Підключення…" : "Підключити"}
        </button>
      </div>

      {loading && (
        <div className={styles.loadingRow}>
          <span className={styles.spinner} aria-hidden />
          <span className={styles.loadingText}>Перевіряємо нікнейм…</span>
        </div>
      )}

      {error && <p className={styles.error} aria-live="assertive">{error}</p>}
    </form>
  );
}
