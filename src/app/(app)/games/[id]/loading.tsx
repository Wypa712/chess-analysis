import styles from "./GameView.module.css";

export default function GameLoading() {
  return (
    <div className={styles.routeLoader} aria-live="polite">
      <div className={styles.loaderSpinner} aria-hidden="true" />
      <p className={styles.loaderText}>Завантажуємо партію…</p>
    </div>
  );
}
