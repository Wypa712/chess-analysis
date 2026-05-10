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
    <html lang="uk">
      <body>
        <div role="alert" aria-live="assertive" className={styles.shell}>
          <div className={styles.panel}>
            <h1 className={styles.title}>Щось пішло не так</h1>
            <p className={styles.message}>
              Помилку зафіксовано. Спробуйте оновити сторінку.
            </p>
            <button type="button" onClick={reset} className={styles.button}>
              Спробувати ще раз
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
