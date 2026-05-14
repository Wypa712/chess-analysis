"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type ProfileStats = {
  analyzedGames: number;
  totalAvailable: number;
  accounts: Array<{ platform: "chess_com" | "lichess"; username: string }>;
  wdl: { wins: number; draws: number; losses: number } | null;
  byColor: {
    white: { games: number; wins: number; rate: number };
    black: { games: number; wins: number; rate: number };
  } | null;
  byTimeControl: Array<{ label: string; games: number; rate: number }> | null;
  openings: Array<{ name: string; games: number; rate: number }> | null;
  eloHistory: {
    chess_com: Record<string, Array<{ playedAt: string; rating: number }>>;
    lichess: Record<string, Array<{ playedAt: string; rating: number }>>;
  };
};

export type ProfileStatsDays = 0 | 7 | 30 | 90;

export function useProfileStats(initialDays: ProfileStatsDays = 30) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterDays, setFilterDays] = useState<ProfileStatsDays>(initialDays);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (stats) {
      setRefetching(true);
    } else {
      setInitialLoading(true);
    }
    setError(null);

    const params = new URLSearchParams({ days: filterDays.toString() });

    fetch(`/api/profile/stats?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then((data: ProfileStats) => {
        setStats(data);
        setInitialLoading(false);
        setRefetching(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Не вдалося завантажити статистику");
          setInitialLoading(false);
          setRefetching(false);
        }
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDays]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", filterDays.toString());
    router.replace(`/profile?${params}`, { scroll: false });
  }, [filterDays, router, searchParams]);

  return {
    stats,
    filterDays,
    setFilterDays,
    initialLoading,
    refetching,
    error,
  };
}
