"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import styles from "./SidebarNav.module.css";
import type { User } from "next-auth";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Дошка",
    icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  },
] as const;

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

interface SidebarNavProps {
  user: User;
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <>
      <nav className={styles.sidebar} aria-label="Головна навігація">
        <div className={styles.logo} aria-hidden>
          ♟
        </div>

        <div className={styles.navItems}>
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navBtn} ${active ? styles.navBtnActive : ""}`}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
              >
                <NavIcon d={icon} />
              </Link>
            );
          })}
        </div>

        <div className={styles.userArea}>
          {user.image && (
            <img
              src={user.image}
              alt=""
              className={styles.avatar}
              width={32}
              height={32}
              title={user.name ?? ""}
            />
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className={styles.signOutBtn}
              title="Вийти"
              aria-label="Вийти"
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" />
              </svg>
            </button>
          </form>
        </div>
      </nav>

      <nav className={styles.bottomNav} aria-label="Мобільна навігація">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.bottomItem} ${active ? styles.bottomItemActive : ""}`}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              <NavIcon d={icon} />
              <span className={styles.bottomLabel}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
