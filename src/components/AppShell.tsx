"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AppUserProvider } from "./AppUserContext";
import { SidebarNav } from "./SidebarNav";
import { RouteLoader } from "./RouteLoader/RouteLoader";
import styles from "./AppShell.module.css";
import type { User } from "next-auth";

const MIN_LOADER_MS = 1600;
const FADE_MS = 300;

interface AppShellProps {
  user: User;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLElement>(null);
  const [navLoading, setNavLoading] = useState(false);
  const [navFading, setNavFading] = useState(false);
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    content.scrollTop = 0;
    content.scrollLeft = 0;
  }, [pathname]);

  useEffect(() => {
    setNavLoading(true);
    setNavFading(false);
    const fadeTimer = setTimeout(() => setNavFading(true), MIN_LOADER_MS);
    const hideTimer = setTimeout(() => setNavLoading(false), MIN_LOADER_MS + FADE_MS);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
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
        {navLoading && (
          <div className={`${styles.navOverlay} ${navFading ? styles.navOverlayFading : ""}`}>
            <RouteLoader />
          </div>
        )}
      </div>
    </AppUserProvider>
  );
}
