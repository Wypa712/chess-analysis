import { auth } from "@/auth";
import styles from "./page.module.css";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Мої партії</h1>
      </div>

      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>Партій ще немає</p>
        <p className={styles.emptyText}>
          Імпортуй партії з Chess.com або Lichess, щоб почати аналіз
        </p>
        <button className={styles.importButton} disabled>
          Імпортувати партії
        </button>
      </div>
    </div>
  );
}
