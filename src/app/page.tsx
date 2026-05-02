import { auth } from "@/auth";
import { redirect } from "next/navigation";
import styles from "./page.module.css";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Chess Analysis</h1>
        <p className={styles.subtitle}>
          Імпортуй партії з Chess.com або Lichess і отримуй практичні поради
          для покращення гри
        </p>
        <Link href="/auth/login" className={styles.ctaButton}>
          Почати аналіз
        </Link>
      </div>
    </main>
  );
}
