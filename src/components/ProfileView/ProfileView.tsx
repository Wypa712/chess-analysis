"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./ProfileView.module.css";
import type { User } from "next-auth";
import { GroupAnalysisPanel } from "@/components/GroupAnalysisPanel/GroupAnalysisPanel";
import type { GroupAnalysisJsonV1 } from "@/lib/llm/types";

type ProfileStats = {
  totalGames: number;
  accounts: Array<{ platform: "chess_com" | "lichess"; username: string }>;
  wdl: { wins: number; draws: number; losses: number } | null;
  byColor: {
    white: { games: number; wins: number; rate: number };
    black: { games: number; wins: number; rate: number };
  } | null;
  byTimeControl: Array<{ label: string; games: number; rate: number }> | null;
  openings: Array<{ name: string; games: number; rate: number }> | null;
  eloHistory: {
    chess_com: Array<{ playedAt: string; rating: number }>;
    lichess: Array<{ playedAt: string; rating: number }>;
  };
};

type GroupAnalysisRow = {
  id: string;
  gameIds: string[];
  analysisJson: GroupAnalysisJsonV1;
  createdAt: string;
};

type Props = { user: User };

export function ProfileView({ user }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Validate and parse filter mode from URL
  const parsedMode = searchParams.get("mode");
  const validMode = parsedMode === "period" ? "period" : "count";

  // Validate and parse filter count from URL
  const parsedCount = parseInt(searchParams.get("count") ?? "25", 10);
  const validCounts = [25, 50, 100] as const;
  const validCount = (validCounts.includes(parsedCount as any) ? parsedCount : 25) as 25 | 50 | 100;

  // Validate and parse filter days from URL
  const parsedDays = parseInt(searchParams.get("days") ?? "30", 10);
  const validDaysList = [7, 30, 90] as const;
  const validDays = (validDaysList.includes(parsedDays as any) ? parsedDays : 30) as 7 | 30 | 90;

  const [filterMode, setFilterMode] = useState<"count" | "period">(validMode);
  const [filterCount, setFilterCount] = useState<25 | 50 | 100>(validCount);
  const [filterDays, setFilterDays] = useState<7 | 30 | 90>(validDays);

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [groupAnalysis, setGroupAnalysis] = useState<GroupAnalysisRow | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupReanalyzing, setGroupReanalyzing] = useState(false);

  // Fetch profile stats
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      mode: filterMode,
      ...(filterMode === "count" ? { count: filterCount.toString() } : { days: filterDays.toString() }),
    });

    fetch(`/api/profile/stats?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then((data: ProfileStats) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Не вдалося завантажити статистику");
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [filterMode, filterCount, filterDays]);

  // Fetch group analysis
  useEffect(() => {
    setGroupLoading(true);
    fetch("/api/analysis/group")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch group analysis");
        return res.json();
      })
      .then((data) => {
        setGroupAnalysis(data.analysis ?? null);
        setGroupLoading(false);
      })
      .catch((err) => {
        console.error("Group analysis fetch failed:", err);
        setGroupLoading(false);
      });
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams({
      mode: filterMode,
      ...(filterMode === "count" ? { count: filterCount.toString() } : { days: filterDays.toString() }),
    });
    router.replace(`/profile?${params}`, { scroll: false });
  }, [filterMode, filterCount, filterDays, router]);

  async function handleGroupAnalyze() {
    setGroupReanalyzing(true);
    try {
      const res = await fetch("/api/analysis/group", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Не вдалося запустити аналіз");
        return;
      }
      const data = await res.json();
      setGroupAnalysis(data.analysis);
    } catch {
      alert("Не вдалося запустити аналіз");
    } finally {
      setGroupReanalyzing(false);
    }
  }

  if (loading || !stats) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Завантаження...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (stats.totalGames < 5) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>♞</div>
          <h2 className={styles.emptyTitle}>Для перегляду профілю потрібно мінімум 5 партій</h2>
          <p className={styles.emptyHint}>Імпортуйте партії з Chess.com або Lichess, щоб побачити статистику</p>
          <button
            type="button"
            className={styles.emptyBtn}
            onClick={() => router.push("/dashboard")}
          >
            Імпортувати партії
          </button>
        </div>
      </div>
    );
  }

  // Guard: ensure all required stats are defined
  if (!stats.wdl || !stats.byColor || !stats.byTimeControl || !stats.openings) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✕</div>
          <h2 className={styles.emptyTitle}>Помилка завантаження статистики</h2>
          <p className={styles.emptyHint}>Не вдалося завантажити дані для профілю. Спробуйте оновити сторінку.</p>
        </div>
      </div>
    );
  }

  const { wdl, byColor, byTimeControl, openings, eloHistory } = stats;
  const total = wdl.wins + wdl.draws + wdl.losses;
  const wPct = Math.round((wdl.wins / total) * 100);
  const dPct = Math.round((wdl.draws / total) * 100);
  const lPct = 100 - wPct - dPct;

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroAvatarWrap}>
          {user.image ? (
            <img src={user.image} alt="" className={styles.heroImg} width={56} height={56} />
          ) : (
            <span className={styles.heroAvatarFallback}>♞</span>
          )}
        </div>
        <div className={styles.heroInfo}>
          <h1 className={styles.heroName}>{user.name ?? "Профіль"}</h1>
          <div className={styles.heroAccounts}>
            {stats.accounts.map((acc) => (
              <span
                key={acc.platform}
                className={`${styles.platformBadge} ${acc.platform === "chess_com" ? styles.badgeCC : styles.badgeLI}`}
              >
                {acc.platform === "chess_com" ? "Chess.com" : "Lichess"}
                <span className={styles.platformUsername}> · {acc.username}</span>
              </span>
            ))}
          </div>
        </div>
        <div className={styles.heroTotal}>
          <span className={styles.heroTotalNum}>{stats.totalGames}</span>
          <span className={styles.heroTotalLabel}>партій</span>
        </div>
      </section>

      {/* ── Filters ── */}
      <section className={styles.filtersBar}>
        <div className={styles.filterGroup}>
          <button
            type="button"
            className={`${styles.filterModeBtn} ${filterMode === "count" ? styles.filterModeBtnActive : ""}`}
            onClick={() => setFilterMode("count")}
          >
            За кількістю
          </button>
          <button
            type="button"
            className={`${styles.filterModeBtn} ${filterMode === "period" ? styles.filterModeBtnActive : ""}`}
            onClick={() => setFilterMode("period")}
          >
            За періодом
          </button>
        </div>
        {filterMode === "count" ? (
          <div className={styles.filterSegment}>
            {([25, 50, 100] as const).map((v) => (
              <button
                type="button"
                key={v}
                className={`${styles.segBtn} ${filterCount === v ? styles.segBtnActive : ""}`}
                onClick={() => setFilterCount(v)}
              >
                {v}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.filterSegment}>
            {([7, 30, 90] as const).map((v) => (
              <button
                type="button"
                key={v}
                className={`${styles.segBtn} ${filterDays === v ? styles.segBtnActive : ""}`}
                onClick={() => setFilterDays(v)}
              >
                {v} дн.
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Stats row ── */}
      <div className={styles.statsRow}>
        {/* WDL */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Результати</h3>
          <div className={styles.wdlBar}>
            <div className={styles.wdlW} style={{ width: `${wPct}%` }} title={`Перемоги: ${wdl.wins}`} />
            <div className={styles.wdlD} style={{ width: `${dPct}%` }} title={`Нічиї: ${wdl.draws}`} />
            <div className={styles.wdlL} style={{ width: `${lPct}%` }} title={`Поразки: ${wdl.losses}`} />
          </div>
          <div className={styles.wdlLegend}>
            <div className={styles.wdlItem}>
              <span className={`${styles.wdlDot} ${styles.wdlDotW}`} />
              <span>Перемоги</span>
              <span className={styles.wdlCount}>{wdl.wins} ({wPct}%)</span>
            </div>
            <div className={styles.wdlItem}>
              <span className={`${styles.wdlDot} ${styles.wdlDotD}`} />
              <span>Нічиї</span>
              <span className={styles.wdlCount}>{wdl.draws} ({dPct}%)</span>
            </div>
            <div className={styles.wdlItem}>
              <span className={`${styles.wdlDot} ${styles.wdlDotL}`} />
              <span>Поразки</span>
              <span className={styles.wdlCount}>{wdl.losses} ({lPct}%)</span>
            </div>
          </div>
        </div>

        {/* By color */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>За кольором</h3>
          <table className={styles.statTable}>
            <thead>
              <tr>
                <th>Колір</th>
                <th>Партій</th>
                <th>Win%</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className={`${styles.colorDot} ${styles.colorDotW}`} />
                  Білі
                </td>
                <td className={styles.mono}>{byColor.white.games}</td>
                <td className={styles.mono}>{byColor.white.rate}%</td>
              </tr>
              <tr>
                <td>
                  <span className={`${styles.colorDot} ${styles.colorDotB}`} />
                  Чорні
                </td>
                <td className={styles.mono}>{byColor.black.games}</td>
                <td className={styles.mono}>{byColor.black.rate}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* By time control */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>За контролем часу</h3>
          <table className={styles.statTable}>
            <thead>
              <tr>
                <th>Формат</th>
                <th>Партій</th>
                <th>Win%</th>
              </tr>
            </thead>
            <tbody>
              {byTimeControl.map((t) => (
                <tr key={t.label}>
                  <td>{t.label}</td>
                  <td className={styles.mono}>{t.games}</td>
                  <td className={styles.mono}>{t.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Openings ── */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Дебюти (топ-5)</h3>
        <div className={styles.openingsList}>
          <div className={styles.openingHeader}>
            <span>Дебют</span>
            <span>Партій</span>
            <span>Win rate</span>
            <span />
          </div>
          {openings.map((o) => (
            <div key={o.name} className={styles.openingRow}>
              <span className={styles.openingName}>{o.name}</span>
              <span className={styles.mono}>{o.games}</span>
              <span className={styles.mono}>{o.rate}%</span>
              <div className={styles.miniBar}>
                <div className={styles.miniBarFill} style={{ width: `${o.rate}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ELO chart ── */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Динаміка рейтингу</h3>
        <EloChartPlaceholder
          ccData={eloHistory.chess_com}
          liData={eloHistory.lichess}
        />
      </section>

      {/* ── Group analysis ── */}
      <section className={styles.groupSection}>
        <div className={styles.groupHeader}>
          <div>
            <h3 className={styles.groupTitle}>Груповий аналіз</h3>
            <p className={styles.groupDesc}>
              Аналіз повторюваних помилок і закономірностей у останніх 30 партіях
            </p>
          </div>
          <button
            type="button"
            className={styles.groupAnalyzeBtn}
            onClick={handleGroupAnalyze}
            disabled={groupReanalyzing}
          >
            {groupReanalyzing ? "Аналізуємо…" : "Аналізувати останні 30 партій"}
          </button>
        </div>
        {groupLoading ? (
          <div className={styles.groupEmpty}>
            <p className={styles.groupEmptyTitle}>Завантаження...</p>
          </div>
        ) : groupAnalysis ? (
          <GroupAnalysisPanel
            analysis={groupAnalysis.analysisJson}
            gameCount={groupAnalysis.gameIds.length}
            createdAt={groupAnalysis.createdAt}
            onReanalyze={handleGroupAnalyze}
            reanalyzing={groupReanalyzing}
          />
        ) : (
          <div className={styles.groupEmpty}>
            <div className={styles.groupEmptyIcon}>◈</div>
            <p className={styles.groupEmptyTitle}>Груповий аналіз ще не запускався</p>
            <p className={styles.groupEmptyHint}>
              Після аналізу тут з&apos;являться повторювані закономірності, слабкості і план дій
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function EloChartPlaceholder({
  ccData,
  liData,
}: {
  ccData: Array<{ playedAt: string; rating: number }>;
  liData: Array<{ playedAt: string; rating: number }>;
}) {
  const W = 500;
  const H = 130;
  const padL = 44;
  const padR = 48;
  const padT = 12;
  const padB = 20;

  const hasCCData = ccData.length > 0;
  const hasLIData = liData.length > 0;

  if (!hasCCData && !hasLIData) {
    return (
      <div className={styles.eloEmpty}>
        <p>Немає даних про рейтинг</p>
      </div>
    );
  }

  const ccRatings = ccData.map((d) => d.rating);
  const liRatings = liData.map((d) => d.rating);
  const allVals = [...ccRatings, ...liRatings];
  const minV = Math.min(...allVals) - 20;
  const maxV = Math.max(...allVals) + 20;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxLen = Math.max(ccData.length, liData.length);

  function toX(i: number, total: number) {
    if (total === 1) return padL + chartW / 2;
    return padL + (i / (total - 1)) * chartW;
  }
  function toY(v: number) {
    return padT + (1 - (v - minV) / (maxV - minV)) * chartH;
  }
  function makePath(pts: Array<{ rating: number }>) {
    if (pts.length === 0) return "";
    return pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${toX(i, pts.length).toFixed(1)},${toY(p.rating).toFixed(1)}`)
      .join(" ");
  }

  const yTicks = [minV + 20, Math.round((minV + maxV) / 2), maxV - 20];

  return (
    <div>
      <div className={styles.eloLegend}>
        {hasCCData && <span className={styles.eloCC}>— Chess.com</span>}
        {hasLIData && <span className={styles.eloLI}>— Lichess</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.eloSvg} aria-hidden="true">
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={padL}
              y1={toY(v)}
              x2={W - padR}
              y2={toY(v)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={toY(v) + 4}
              textAnchor="end"
              fontSize={9}
              fill="var(--color-text-faded)"
              fontFamily="var(--font-mono)"
            >
              {v}
            </text>
          </g>
        ))}
        <line
          x1={padL}
          y1={H - padB}
          x2={W - padR}
          y2={H - padB}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        {hasCCData && (
          <>
            <path
              d={makePath(ccData)}
              fill="none"
              stroke="var(--color-green-lt)"
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <circle
              cx={toX(ccData.length - 1, ccData.length)}
              cy={toY(ccData[ccData.length - 1].rating)}
              r={3}
              fill="var(--color-green-lt)"
            />
            <text
              x={toX(ccData.length - 1, ccData.length) + 6}
              y={toY(ccData[ccData.length - 1].rating) + 4}
              fontSize={10}
              fill="var(--color-green-lt)"
              fontFamily="var(--font-mono)"
            >
              {ccData[ccData.length - 1].rating}
            </text>
          </>
        )}
        {hasLIData && (
          <>
            <path
              d={makePath(liData)}
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <circle
              cx={toX(liData.length - 1, liData.length)}
              cy={toY(liData[liData.length - 1].rating)}
              r={3}
              fill="var(--color-gold)"
            />
            <text
              x={toX(liData.length - 1, liData.length) + 6}
              y={toY(liData[liData.length - 1].rating) + 4}
              fontSize={10}
              fill="var(--color-gold)"
              fontFamily="var(--font-mono)"
            >
              {liData[liData.length - 1].rating}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
