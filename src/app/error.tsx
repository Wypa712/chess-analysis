"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import styles from "./error-boundary.module.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div role="alert" aria-live="assertive" className={styles.shell}>
      <div className={styles.panel}>
        <h2 className={styles.title}>Щось пішло не так</h2>
        <p className={styles.message}>
          Помилку зафіксовано. Спробуйте оновити сторінку.
        </p>
        <button
          type="button"
          onClick={reset}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className={styles.button}
        >
          Спробувати ще раз
        </button>
      </div>
    </div>
  );
}
