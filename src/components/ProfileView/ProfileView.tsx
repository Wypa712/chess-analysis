"use client";

import { useState, useEffect, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./ProfileView.module.css";
import type { User } from "next-auth";
import { GroupAnalysisPanel } from "@/components/GroupAnalysisPanel/GroupAnalysisPanel";
import type { GroupAnalysisJsonV1 } from "@/lib/llm/types";

type ProfileStats = {
  totalGames: number;
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

  // Validate and parse filter days from URL
  const parsedDays = parseInt(searchParams.get("days") ?? "30", 10);
  const validDaysList = [0, 7, 30, 90] as const;
  const validDays = (validDaysList.includes(parsedDays as any) ? parsedDays : 30) as 0 | 7 | 30 | 90;

  const [filterDays, setFilterDays] = useState<0 | 7 | 30 | 90>(validDays);

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [groupAnalysis, setGroupAnalysis] = useState<GroupAnalysisRow | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupReanalyzing, setGroupReanalyzing] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Fetch profile stats
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
    const params = new URLSearchParams({ days: filterDays.toString() });
    router.replace(`/profile?${params}`, { scroll: false });
  }, [filterDays, router]);

  async function handleGroupAnalyze() {
    setGroupReanalyzing(true);
    setGroupError(null);
    try {
      const res = await fetch("/api/analysis/group", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setGroupError("Ліміт запитів вичерпано — зачекайте хвилину перед повторним аналізом.");
        } else if (res.status === 502 || res.status === 503) {
          setGroupError("Помилка сервера — спробуйте пізніше");
        } else {
          setGroupError(data.error ?? "Не вдалося запустити аналіз");
        }
        return;
      }
      setGroupAnalysis(data.analysis);
    } catch {
      setGroupError("Не вдалося отримати відповідь. Перевірте з'єднання.");
    } finally {
      setGroupReanalyzing(false);
    }
  }

  if (initialLoading || (!stats && !error)) {
    return (
      <div className={styles.page}>
        {/* Hero skeleton */}
        <div className={styles.skeletonHero}>
          <div className={styles.skeletonAvatar} />
          <div className={styles.skeletonHeroLines}>
            <div className={styles.skeletonLine} style={{ width: "40%" }} />
            <div className={styles.skeletonLine} style={{ width: "60%", opacity: 0.6 }} />
          </div>
        </div>
        {/* Filters bar — static, no skeleton needed */}
        <div className={styles.filtersBar} aria-hidden="true" style={{ pointerEvents: "none", opacity: 0.4 }}>
          <div className={styles.filterSegment}>
            {["7 дн.", "30 дн.", "90 дн.", "Всі"].map((l) => (
              <button key={l} type="button" className={styles.segBtn}>{l}</button>
            ))}
          </div>
        </div>
        {/* Stats row skeleton */}
        <div className={styles.skeletonStatsRow}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonLine} style={{ width: "50%" }} />
              <div className={styles.skeletonLine} style={{ width: "100%", height: 18 }} />
              <div className={styles.skeletonLine} style={{ width: "80%", opacity: 0.6 }} />
              <div className={styles.skeletonLine} style={{ width: "65%", opacity: 0.4 }} />
            </div>
          ))}
        </div>
        {/* Openings card skeleton */}
        <div className={styles.skeletonCard}>
          <div className={styles.skeletonLine} style={{ width: "30%" }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skeletonLine} style={{ width: `${75 - i * 8}%`, opacity: 1 - i * 0.12 }} />
          ))}
        </div>
        {/* ELO chart skeleton */}
        <div className={styles.skeletonCard}>
          <div className={styles.skeletonLine} style={{ width: "35%" }} />
          <div className={styles.skeletonLine} style={{ width: "100%", height: 130 }} />
        </div>
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

  if (!stats) return null;

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
                key={`${acc.platform}-${acc.username}`}
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
        <div className={styles.filterSegment}>
          {([7, 30, 90, 0] as const).map((v) => (
            <button
              type="button"
              key={v}
              className={`${styles.segBtn} ${filterDays === v ? styles.segBtnActive : ""}`}
              onClick={() => setFilterDays(v)}
            >
              {v === 0 ? "Всі" : `${v} дн.`}
            </button>
          ))}
        </div>
      </section>

      {/* ── Stats row ── */}
      <div className={`${styles.statsRow} ${refetching ? styles.refetching : ""}`}>
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
      <section className={`${styles.card} ${refetching ? styles.refetching : ""}`}>
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
      <section className={`${styles.card} ${refetching ? styles.refetching : ""}`}>
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
              Аналіз повторюваних помилок і закономірностей у вибірці останніх партій
            </p>
          </div>
          <button
            type="button"
            className={styles.groupAnalyzeBtn}
            onClick={handleGroupAnalyze}
            disabled={groupReanalyzing}
          >
            {groupReanalyzing ? "Аналізуємо…" : "Аналізувати останні партії"}
          </button>
        </div>
        {groupError && (
          <div className={styles.groupError}>
            <span className={styles.groupErrorText}>{groupError}</span>
            <button
              type="button"
              className={styles.groupAnalyzeBtn}
              onClick={handleGroupAnalyze}
              disabled={groupReanalyzing}
            >
              {groupReanalyzing ? "Аналізуємо…" : "Спробувати ще раз"}
            </button>
          </div>
        )}
        {!groupError && groupLoading ? (
          <div className={styles.groupEmpty}>
            <p className={styles.groupEmptyTitle}>Завантаження...</p>
          </div>
        ) : !groupError && groupAnalysis ? (
          <GroupAnalysisPanel
            analysis={groupAnalysis.analysisJson}
            gameCount={groupAnalysis.gameIds.length}
            createdAt={groupAnalysis.createdAt}
          />
        ) : !groupError ? (
          <div className={styles.groupEmpty}>
            <div className={styles.groupEmptyIcon}>◈</div>
            <p className={styles.groupEmptyTitle}>Груповий аналіз ще не запускався</p>
            <p className={styles.groupEmptyHint}>
              Після аналізу тут з&apos;являться повторювані закономірності, слабкості і план дій
            </p>
            <button
              type="button"
              className={styles.groupAnalyzeBtn}
              style={{ marginTop: "1rem" }}
              onClick={handleGroupAnalyze}
              disabled={groupReanalyzing}
            >
              {groupReanalyzing ? "Аналізуємо…" : "Запустити аналіз"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

const TC_LABELS: Record<string, string> = {
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
  classical: "Classical",
  correspondence: "Корес.",
  unknown: "Інше",
};
const TC_ORDER = ["bullet", "blitz", "rapid", "classical", "correspondence", "unknown"];

function EloChartPlaceholder({
  ccData,
  liData,
}: {
  ccData: Record<string, Array<{ playedAt: string; rating: number }>>;
  liData: Record<string, Array<{ playedAt: string; rating: number }>>;
}) {
  const uid = useId();
  const gradCC = `${uid}-cc`;
  const gradLI = `${uid}-li`;

  const hasCCData = Object.keys(ccData).length > 0;
  const hasLIData = Object.keys(liData).length > 0;
  const bothPlatforms = hasCCData && hasLIData;

  const [activePlatform, setActivePlatform] = useState<"chess_com" | "lichess">(() =>
    hasCCData ? "chess_com" : "lichess"
  );

  const activeRecord = activePlatform === "chess_com" ? ccData : liData;
  const availableTCs = TC_ORDER.filter((tc) => (activeRecord[tc]?.length ?? 0) > 0);

  const [activeTC, setActiveTC] = useState<string>(() => {
    const record = hasCCData ? ccData : liData;
    return TC_ORDER.find((tc) => (record[tc]?.length ?? 0) > 0) ?? "blitz";
  });

  // Reset TC to first available when platform changes
  useEffect(() => {
    const first = TC_ORDER.find((tc) => (activeRecord[tc]?.length ?? 0) > 0);
    if (first && !activeRecord[activeTC]) setActiveTC(first);
  }, [activePlatform]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeSeries = activeRecord[activeTC] ?? [];

  const W = 500;
  const H = 200;
  const padL = 44;
  const padR = 52;
  const padT = 16;
  const padB = 28;

  if (!hasCCData && !hasLIData) {
    return (
      <div className={styles.eloEmpty}>
        <p>Немає даних про рейтинг</p>
      </div>
    );
  }

  // Downsample to at most 200 pts with a simple moving-average smoothing pass
  function processSeries(arr: Array<{ playedAt: string; rating: number }>, max: number) {
    if (arr.length === 0) return [];
    // stride sample first
    const sampled =
      arr.length <= max
        ? arr
        : Array.from({ length: max - 1 }, (_, i) => arr[Math.round((i * arr.length) / (max - 1))]).concat([
            arr[arr.length - 1],
          ]);
    // 5-point moving average to reduce noise
    const win = Math.min(5, Math.floor(sampled.length / 4));
    if (win < 2) return sampled.map((d) => ({ t: new Date(d.playedAt).getTime(), r: d.rating }));
    return sampled.map((d, i, a) => {
      const lo = Math.max(0, i - win);
      const hi = Math.min(a.length - 1, i + win);
      const avg = a.slice(lo, hi + 1).reduce((s, x) => s + x.rating, 0) / (hi - lo + 1);
      return { t: new Date(d.playedAt).getTime(), r: Math.round(avg) };
    });
  }

  // Only process and display the currently selected platform + time control
  const activePts = processSeries(activeSeries, 200);

  const allTimes = activePts.map((p) => p.t);
  const allRatings = activePts.map((p) => p.r);

  const minT = allTimes.length > 0 ? Math.min(...allTimes) : 0;
  const maxT = allTimes.length > 0 ? Math.max(...allTimes) : 1;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Round Y range to nice step
  const rawMin = allRatings.length > 0 ? Math.min(...allRatings) : 0;
  const rawMax = allRatings.length > 0 ? Math.max(...allRatings) : 100;
  const range = rawMax - rawMin;
  const step = range > 600 ? 200 : range > 300 ? 100 : 50;
  const minV = Math.floor((rawMin - 30) / step) * step;
  const maxV = Math.ceil((rawMax + 30) / step) * step;

  const yTicks: number[] = [];
  for (let v = minV; v <= maxV; v += step) yTicks.push(v);

  function toX(t: number) {
    if (maxT === minT) return padL + chartW / 2;
    return padL + ((t - minT) / (maxT - minT)) * chartW;
  }
  function toY(v: number) {
    return padT + (1 - (v - minV) / (maxV - minV)) * chartH;
  }

  // Catmull-Rom smooth bezier path — control points clamped to [p1.x, p2.x] to prevent loops
  function makeSmoothPath(pts: Array<{ t: number; r: number }>) {
    if (pts.length === 0) return "";
    const coords = pts.map((p) => ({ x: toX(p.t), y: toY(p.r) }));
    if (coords.length === 1) return `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    let d = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    const tension = 0.3;
    for (let i = 1; i < coords.length; i++) {
      const p0 = coords[i - 2] ?? coords[i - 1];
      const p1 = coords[i - 1];
      const p2 = coords[i];
      const p3 = coords[i + 1] ?? coords[i];
      const cp1x = Math.max(p1.x, Math.min(p2.x, p1.x + (p2.x - p0.x) * tension));
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = Math.max(p1.x, Math.min(p2.x, p2.x - (p3.x - p1.x) * tension));
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function makeAreaPath(pts: Array<{ t: number; r: number }>, linePath: string) {
    if (!linePath || pts.length === 0) return "";
    const bottomY = (padT + chartH).toFixed(1);
    return `${linePath} L${toX(pts[pts.length - 1].t).toFixed(1)},${bottomY} L${toX(pts[0].t).toFixed(1)},${bottomY} Z`;
  }

  // X-axis labels: ~5 evenly spaced date ticks
  const NUM_X_LABELS = 5;
  const xLabels = Array.from({ length: NUM_X_LABELS }, (_, i) => {
    const t = minT + (i / (NUM_X_LABELS - 1)) * (maxT - minT);
    const d = new Date(t);
    const label = d.toLocaleDateString("uk-UA", { month: "short", year: "2-digit" });
    return { t, label };
  });

  const activeLinePath = makeSmoothPath(activePts);
  const isCC = activePlatform === "chess_com" || (!bothPlatforms && hasCCData);
  const activeColor = isCC ? "var(--color-green-lt)" : "var(--color-gold)";
  const activeGrad = isCC ? gradCC : gradLI;

  return (
    <div>
      <div className={styles.eloControls}>
        {/* Platform toggle — left, only when both platforms have data */}
        {bothPlatforms && (
          <div className={styles.eloToggle}>
            <button
              type="button"
              className={`${styles.eloToggleBtn} ${styles.eloToggleBtnCC} ${activePlatform === "chess_com" ? styles.eloToggleActive : ""}`}
              onClick={() => setActivePlatform("chess_com")}
            >
              Chess.com
            </button>
            <button
              type="button"
              className={`${styles.eloToggleBtn} ${styles.eloToggleBtnLI} ${activePlatform === "lichess" ? styles.eloToggleActive : ""}`}
              onClick={() => setActivePlatform("lichess")}
            >
              Lichess
            </button>
          </div>
        )}

        {/* Time-control toggle — right */}
        {availableTCs.length > 1 && (
          <div className={styles.eloTCToggle}>
            {availableTCs.map((tc) => (
              <button
                type="button"
                key={tc}
                className={`${styles.eloTCBtn} ${activeTC === tc ? styles.eloTCBtnActive : ""}`}
                onClick={() => setActiveTC(tc)}
              >
                {TC_LABELS[tc] ?? tc}
              </button>
            ))}
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className={styles.eloSvg} aria-hidden="true">
        <defs>
          <linearGradient id={gradCC} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-green-lt)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--color-green-lt)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={gradLI} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.15} />
            <stop offset="100%" stopColor="var(--color-gold)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Y grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)} stroke="var(--color-border)" strokeWidth={1} />
            <text x={padL - 6} y={toY(v) + 4} textAnchor="end" fontSize={9} fill="var(--color-text-faded)" fontFamily="var(--font-mono)">
              {v}
            </text>
          </g>
        ))}

        {/* X axis baseline */}
        <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="var(--color-border)" strokeWidth={1} />

        {/* X-axis date labels */}
        {xLabels.map(({ t, label }, i) => (
          <text key={i} x={toX(t)} y={padT + chartH + 14} textAnchor="middle" fontSize={8} fill="var(--color-text-faded)" fontFamily="var(--font-mono)">
            {label}
          </text>
        ))}

        {/* Active series */}
        {activePts.length > 0 && (
          <>
            <path d={makeAreaPath(activePts, activeLinePath)} fill={`url(#${activeGrad})`} />
            <path d={activeLinePath} fill="none" stroke={activeColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={toX(activePts[activePts.length - 1].t)} cy={toY(activePts[activePts.length - 1].r)} r={3} fill={activeColor} />
            <text
              x={toX(activePts[activePts.length - 1].t) + 6}
              y={toY(activePts[activePts.length - 1].r) + 4}
              fontSize={10}
              fill={activeColor}
              fontFamily="var(--font-mono)"
            >
              {activeSeries[activeSeries.length - 1].rating}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
