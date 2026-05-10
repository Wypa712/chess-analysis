"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AccountForm } from "@/components/AccountForm/AccountForm";
import type { LinkedAccount } from "@/components/AccountForm/AccountForm";
import { LinkedAccountCard } from "@/components/LinkedAccountCard/LinkedAccountCard";
import styles from "./page.module.css";

const INITIAL_CHUNK = 50;
const MAX_INITIAL_GAMES = 1000;

type AccountProgress = {
  imported: number;
  done: boolean;
  error?: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [progresses, setProgresses] = useState<Record<string, AccountProgress>>({});
  // Per-account stop flags — keyed by accountId to avoid cross-account cancellation
  const stopRefs = useRef<Map<string, boolean>>(new Map());
  const runningRefs = useRef<Set<string>>(new Set());

  async function runInitialImport(accountId: string) {
    if (runningRefs.current.has(accountId)) return;
    runningRefs.current.add(accountId);
    stopRefs.current.set(accountId, false);
    setProgresses((prev) => ({ ...prev, [accountId]: { imported: 0, done: false } }));

    let cursor: string | null = null;
    let totalImported = 0;
    let errorMsg: string | undefined;

    while (totalImported < MAX_INITIAL_GAMES && !stopRefs.current.get(accountId)) {
      try {
        const res = await fetch("/api/sync/initial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, cursor, limit: INITIAL_CHUNK }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => String(res.status));
          errorMsg = `Помилка ${res.status}: ${text}`;
          break;
        }

        const data = (await res.json()) as {
          imported: number;
          skipped: number;
          hasMore: boolean;
          nextCursor: string | null;
        };

        totalImported += data.imported;
        setProgresses((prev) => ({
          ...prev,
          [accountId]: { imported: totalImported, done: !data.hasMore },
        }));

        if (!data.hasMore || !data.nextCursor) break;
        cursor = data.nextCursor;
      } catch (err) {
        console.error("[onboarding] import chunk failed:", err);
        errorMsg = "Помилка мережі";
        break;
      }
    }

    stopRefs.current.delete(accountId);
    runningRefs.current.delete(accountId);
    setProgresses((prev) => ({
      ...prev,
      [accountId]: {
        imported: totalImported,
        done: true,
        ...(errorMsg ? { error: errorMsg } : {}),
      },
    }));
  }

  function handleAccountAdded(account: LinkedAccount) {
    setAccounts((prev) => {
      const exists = prev.some((a) => a.id === account.id);
      return exists ? prev : [...prev, account];
    });
    runInitialImport(account.id).catch((err) => {
      console.error("[onboarding] import failed:", err);
    });
  }

  function handleRemoveAccount(id: string) {
    // Stop only this account's import, not all running imports
    stopRefs.current.set(id, true);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setProgresses((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleContinue() {
    router.push("/dashboard");
  }

  const progressEntries = Object.entries(progresses);
  const totalImported = progressEntries.reduce((sum, [, p]) => sum + p.imported, 0);
  const allDone = progressEntries.length > 0 && progressEntries.every(([, p]) => p.done);
  const isImporting = progressEntries.length > 0 && !allDone;
  const errorEntries = progressEntries.filter(([, p]) => p.error);

  // Denominator grows with each chunk so bar advances smoothly rather than
  // jumping from a low fixed % to 100% when a small account finishes.
  const activeImports = progressEntries.filter(([, p]) => !p.done).length;
  const importPercent = isImporting
    ? Math.min(
        Math.round(
          (totalImported /
            Math.max(totalImported + activeImports * INITIAL_CHUNK, 1)) *
            100
        ),
        99
      )
    : 100;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.logo} aria-hidden>
            ♟
          </div>
          <h1 className={styles.title}>Підключіть шаховий акаунт</h1>
          <p className={styles.subtitle}>
            Вкажіть свій нік на Chess.com або Lichess — партії підтягнуться
            автоматично.
          </p>
        </header>

        <AccountForm onSuccess={handleAccountAdded} />

        {accounts.length > 0 && (
          <section className={styles.accountsSection}>
            <p className={styles.sectionLabel}>Підключено</p>
            <div className={styles.accountsList}>
              {accounts.map((account) => (
                <LinkedAccountCard
                  key={account.id}
                  {...account}
                  onRemove={handleRemoveAccount}
                />
              ))}
            </div>
          </section>
        )}

        {progressEntries.length > 0 && (
          <div className={styles.importBlock}>
            {allDone ? (
              <p className={styles.importDone}>
                ✓ Імпортовано партій: <strong>{totalImported}</strong>
              </p>
            ) : (
              <>
                <div
                  className={styles.progressTrack}
                  role="progressbar"
                  aria-valuenow={importPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Прогрес імпорту"
                >
                  <div
                    className={styles.progressFill}
                    style={{ width: `${importPercent}%` }}
                  />
                </div>
                <p className={styles.importStatus} aria-live="polite">
                  Імпорт партій… {totalImported}
                </p>
              </>
            )}
            {errorEntries.length > 0 && (
              <ul className={styles.importErrors}>
                {errorEntries.map(([id, p]) => (
                  <li key={id} className={styles.importError}>
                    {p.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          className={styles.continueBtn}
          onClick={handleContinue}
          disabled={accounts.length === 0 || isImporting}
        >
          {accounts.length === 0
            ? "Додайте хоча б один акаунт"
            : isImporting
              ? "Зачекайте — йде імпорт…"
              : "Перейти до дашборду →"}
        </button>
      </div>
    </div>
  );
}
