"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { signOutAction } from "@/app/actions/auth";
import styles from "./SidebarNav.module.css";
import type { User } from "next-auth";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Дошка",
    icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  },
  {
    href: "/profile",
    label: "Профіль",
    icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
  {
    href: "/settings",
    label: "Налаштування",
    icon: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M4.93 19.07l1.41-1.41 M17.66 6.34l1.41-1.41",
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
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const activePath = pendingHref ?? pathname;

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  function handleNavClick(
    event: MouseEvent<HTMLAnchorElement>,
    href: string
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      pathname.startsWith(href)
    ) {
      return;
    }

    setPendingHref(href);
  }

  return (
    <>
      <nav className={styles.sidebar} aria-label="Головна навігація">
        <div className={styles.logo} aria-hidden>
          ♟
        </div>

        <div className={styles.navItems}>
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = activePath.startsWith(href);
            const current = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navBtn} ${active ? styles.navBtnActive : ""}`}
                title={label}
                aria-label={label}
                aria-current={current ? "page" : undefined}
                onClick={(event) => handleNavClick(event, href)}
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
          const active = activePath.startsWith(href);
          const current = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.bottomItem} ${active ? styles.bottomItemActive : ""}`}
              aria-label={label}
              aria-current={current ? "page" : undefined}
              onClick={(event) => handleNavClick(event, href)}
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
