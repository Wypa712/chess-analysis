"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AppUserProvider } from "./AppUserContext";
import { SidebarNav } from "./SidebarNav";
import styles from "./AppShell.module.css";
import type { User } from "next-auth";

interface AppShellProps {
  user: User;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    content.scrollTop = 0;
    content.scrollLeft = 0;
  }, [pathname]);

  return (
    <AppUserProvider user={user}>
      <div className={styles.shell}>
        <SidebarNav user={user} />
        <main ref={contentRef} className={styles.content}>
          <div key={pathname} className={styles.routeFrame}>
            {children}
          </div>
        </main>
      </div>
    </AppUserProvider>
  );
}
