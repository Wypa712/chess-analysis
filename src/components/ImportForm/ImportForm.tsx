"use client";

import { useState } from "react";
import styles from "./ImportForm.module.css";

type ImportResult = { imported: number; skipped: number };
type ImportMode = "count" | "days";

const LIMITS = [25, 50, 100] as const;
const DAYS = [7, 30, 90] as const;

export function ImportForm({ onImported }: { onImported?: () => void }) {
  const [platform, setPlatform] = useState<"lichess" | "chess_com">("lichess");
  const [username, setUsername] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("count");
  const [limit, setLimit] = useState<(typeof LIMITS)[number]>(25);
  const [days, setDays] = useState<(typeof DAYS)[number]>(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/games/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          username: username.trim(),
          importMode,
          ...(importMode === "count" ? { limit } : { days }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Помилка імпорту");
      } else {
        setResult(data);
        onImported?.();
      }
    } catch (error) {
      if (error instanceof TypeError) {
        setError("Не вдалося підключитися до сервера");
      } else if (error instanceof SyntaxError) {
        setError("Некоректна відповідь сервера");
      } else {
        setError("Помилка імпорту");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <div>
          <h2 className={styles.title}>Імпорт партій</h2>
          <p className={styles.subtitle}>
            Обери один спосіб: останні партії або партії за період
          </p>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Платформа</label>
          <div className={styles.segmented}>
            <button
              type="button"
              className={`${styles.seg} ${platform === "lichess" ? styles.segActive : ""}`}
              onClick={() => setPlatform("lichess")}
            >
              Lichess
            </button>
            <button
              type="button"
              className={`${styles.seg} ${platform === "chess_com" ? styles.segActive : ""}`}
              onClick={() => setPlatform("chess_com")}
            >
              Chess.com
            </button>
          </div>
        </div>

        <div className={`${styles.field} ${styles.fieldGrow}`}>
          <label className={styles.label} htmlFor="username">
            Нікнейм
          </label>
          <input
            id="username"
            className={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={platform === "lichess" ? "lichess_username" : "chess_com_username"}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Спосіб імпорту</label>
          <div className={styles.segmented}>
            <button
              type="button"
              className={`${styles.seg} ${importMode === "count" ? styles.segActive : ""}`}
              onClick={() => setImportMode("count")}
            >
              За кількістю
            </button>
            <button
              type="button"
              className={`${styles.seg} ${importMode === "days" ? styles.segActive : ""}`}
              onClick={() => setImportMode("days")}
            >
              За період
            </button>
          </div>
        </div>

        {importMode === "count" ? (
          <div className={styles.field}>
            <label className={styles.label}>Кількість партій</label>
            <div className={styles.segmented}>
              {LIMITS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`${styles.seg} ${limit === l ? styles.segActive : ""}`}
                  onClick={() => setLimit(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.field}>
            <label className={styles.label}>Період</label>
            <div className={styles.segmented}>
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`${styles.seg} ${days === d ? styles.segActive : ""}`}
                  onClick={() => setDays(d)}
                >
                  {d}д
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading || !username.trim()}
        >
          {loading ? "Імпорт…" : "Імпортувати"}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {result && (
        <p className={styles.success}>
          Імпортовано: <strong>{result.imported}</strong>
          {result.skipped > 0 && (
            <>, пропущено (вже існують): <strong>{result.skipped}</strong></>
          )}
        </p>
      )}
    </form>
  );
}
