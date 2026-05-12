"use client";

import { createContext, useContext } from "react";
import type { User } from "next-auth";

const AppUserContext = createContext<User | null>(null);

export function AppUserProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <AppUserContext.Provider value={user}>{children}</AppUserContext.Provider>
  );
}

export function useAppUser() {
  const user = useContext(AppUserContext);
  if (!user) {
    throw new Error("useAppUser must be used inside AppUserProvider");
  }
  return user;
}
