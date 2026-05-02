import { SidebarNav } from "./SidebarNav";
import styles from "./AppShell.module.css";
import type { User } from "next-auth";

interface AppShellProps {
  user: User;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <SidebarNav user={user} />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
