import styles from "./page.module.css";

export default function DashboardLoading() {
  return (
    <div className={styles.routeLoader} aria-live="polite">
      <div className={styles.loaderSpinner} aria-hidden="true" />
      <p className={styles.loaderText}>Завантажуємо дашборд…</p>
    </div>
  );
}
