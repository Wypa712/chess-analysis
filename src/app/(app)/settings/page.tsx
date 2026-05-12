"use client";

import { useState, useEffect, useCallback } from "react";
import { AccountForm } from "@/components/AccountForm/AccountForm";
import type { LinkedAccount } from "@/components/AccountForm/AccountForm";
import { LinkedAccountCard } from "@/components/LinkedAccountCard/LinkedAccountCard";
import { RouteLoader } from "@/components/RouteLoader/RouteLoader";
import styles from "./page.module.css";

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const isDev = process.env.NODE_ENV === "development";

  const loadAccounts = useCallback((signal: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    fetch("/api/chess-accounts", { signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setAccounts(data as LinkedAccount[]);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setLoadError("Не вдалося завантажити акаунти");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadAccounts(controller.signal);
    return () => controller.abort();
  }, [loadAccounts]);

  function handleAccountAdded(account: LinkedAccount) {
    setAccounts((prev) => {
      const exists = prev.some((a) => a.id === account.id);
      return exists ? prev : [...prev, account];
    });
  }

  function handleRemoveAccount(id: string) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleDevReset() {
    if (!confirm("Видалити всі підключені акаунти і партії? Це незворотно.")) return;
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch("/api/chess-accounts/reset", { method: "DELETE" });
      if (!res.ok) {
        setResetError(`Помилка скидання: HTTP ${res.status}`);
        return;
      }
      setAccounts([]);
      sessionStorage.removeItem("chess_sync_ts");
    } catch {
      setResetError("Не вдалося скинути акаунти");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Налаштування</h1>
        <p className={styles.subtitle}>Управляйте підключеними шаховими акаунтами</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Підключені акаунти</h2>

        {loading ? (
          <RouteLoader inline text="Завантажуємо акаунти…" />
        ) : loadError ? (
          <div className={styles.errorRetry}>
            <p className={styles.errorText}>{loadError}</p>
            <button
              className={styles.retryBtn}
              onClick={() => loadAccounts(new AbortController().signal)}
            >
              Спробувати знову
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <p className={styles.empty}>Акаунтів ще не підключено</p>
        ) : (
          <div className={styles.accountsList}>
            {accounts.map((account) => (
              <LinkedAccountCard
                key={account.id}
                {...account}
                onRemove={handleRemoveAccount}
              />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Підключити новий акаунт</h2>
        <AccountForm onSuccess={handleAccountAdded} />
      </section>

      {isDev && (
        <section className={`${styles.section} ${styles.devSection}`}>
          <h2 className={styles.sectionTitle}>Dev-інструменти</h2>
          <p className={styles.devNote}>
            Видаляє всі chess_accounts та пов&apos;язані партії. Дозволяє
            тестувати онбординг повторно.
          </p>
          <button
            className={styles.devResetBtn}
            onClick={handleDevReset}
            disabled={resetting}
          >
            {resetting ? "Скидання…" : "Скинути всі акаунти"}
          </button>
          {resetError && <p className={styles.errorText}>{resetError}</p>}
        </section>
      )}
    </div>
  );
}
