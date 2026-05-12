import Link from "next/link";
import styles from "./not-found.module.css";

export default function GameNotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "1rem",
        textAlign: "center",
        padding: "2rem 1.5rem",
      }}
    >
      <div aria-hidden="true" style={{ fontSize: "3rem", opacity: 0.25, lineHeight: 1 }}>♟</div>
      <h2
        style={{
          fontSize: "1.125rem",
          fontWeight: 600,
          color: "var(--color-text)",
          margin: 0,
        }}
      >
        Партію не знайдено
      </h2>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--color-text-muted)",
          margin: 0,
          maxWidth: "22rem",
        }}
      >
        Ця партія недоступна або не існує у вашому акаунті
      </p>
      <Link href="/dashboard" className={styles.link}>
        ← До списку партій
      </Link>
    </div>
  );
}
