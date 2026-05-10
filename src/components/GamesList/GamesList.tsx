"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./GamesList.module.css";

type Game = {
  id: string;
  result: "win" | "loss" | "draw";
  color: "white" | "black";
  opponent: string;
  opponentRating: number | null;
  playerRating: number | null;
  openingName: string | null;
  timeControl: string | null;
  timeControlCategory: string;
  rated: boolean | null;
  playedAt: string;
  moveCount: number;
  sourceUrl: string | null;
  platform: "chess_com" | "lichess";
  engineAnalysisStatus: "done" | "not_started";
};

type Summary = {
  total: number;
  wins: number;
  draws: number;
  losses: number;
};

type GamesResponse = {
  games: Game[];
  total: number;
  page: number;
  pageSize: number;
  summary: Summary;
};

const TIME_CONTROLS = [
  { value: "", label: "Усі" },
  { value: "bullet", label: "Bullet" },
  { value: "blitz", label: "Blitz" },
  { value: "rapid", label: "Rapid" },
  { value: "classical", label: "Classical" },
  { value: "correspondence", label: "Correspondence" },
];

const RESULTS = [
  { value: "", label: "Усі" },
  { value: "win", label: "Перемога" },
  { value: "loss", label: "Поразка" },
  { value: "draw", label: "Нічия" },
];

const PLATFORMS = [
  { value: "", label: "Усі" },
  { value: "lichess", label: "Lichess" },
  { value: "chess_com", label: "Chess.com" },
];

function resultLabel(r: Game["result"]) {
  if (r === "win") return "Перемога";
  if (r === "loss") return "Поразка";
  return "Нічия";
}

function platformLabel(platform: Game["platform"]) {
  return platform === "chess_com" ? "Chess.com" : "Lichess";
}

function timeControlLabel(game: Game) {
  if (!game.timeControl || game.timeControl === "-") {
    return game.timeControlCategory;
  }
  return game.timeControl;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function analysisStatusLabel(status: "done" | "not_started") {
  return status === "done" ? "Проаналізовано" : "Не проаналізовано";
}

export function GamesList({
  refreshKey,
  onSummary,
}: {
  refreshKey?: number;
  onSummary?: (summary: Summary, loading: boolean) => void;
}) {
  const [data, setData] = useState<GamesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState("");
  const [timeControlCategory, setTimeControlCategory] = useState("");
  const [result, setResult] = useState("");

  // Keep a ref to onSummary so the effect doesn't re-run when an unstable
  // function reference is passed from a parent that forgot useCallback.
  const onSummaryRef = useRef(onSummary);
  useEffect(() => { onSummaryRef.current = onSummary; }, [onSummary]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page) });
    if (platform) params.set("platform", platform);
    if (timeControlCategory) params.set("timeControlCategory", timeControlCategory);
    if (result) params.set("result", result);

    async function fetchGames() {
      setLoading(true);
      setError(false);
      onSummaryRef.current?.({ total: 0, wins: 0, draws: 0, losses: 0 }, true);

      try {
        const res = await fetch(`/api/games?${params}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const json: GamesResponse = await res.json();
          setData(json);
          onSummaryRef.current?.(json.summary, false);
        } else {
          setData(null);
          setError(true);
          onSummaryRef.current?.({ total: 0, wins: 0, draws: 0, losses: 0 }, false);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(true);
          onSummaryRef.current?.({ total: 0, wins: 0, draws: 0, losses: 0 }, false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchGames();

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, platform, timeControlCategory, result, refreshKey]);

  function updatePlatform(value: string) {
    setPage(1);
    setPlatform(value);
  }

  function updateTimeControlCategory(value: string) {
    setPage(1);
    setTimeControlCategory(value);
  }

  function updateResult(value: string) {
    setPage(1);
    setResult(value);
  }

  function resetFilters() {
    setPage(1);
    setPlatform("");
    setTimeControlCategory("");
    setResult("");
  }

  const hasActiveFilters = platform !== "" || timeControlCategory !== "" || result !== "";
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.listHeader}>
        <div>
          <h2 className={styles.heading}>Останні партії</h2>
          <p className={styles.count}>
            {data ? `${data.total} у списку` : "Завантаження..."}
          </p>
        </div>

        <div className={styles.filtersBar}>
          <FilterSelect
            label="Платформа"
            value={platform}
            onChange={updatePlatform}
            options={PLATFORMS}
          />
          <FilterSelect
            label="Контроль часу"
            value={timeControlCategory}
            onChange={updateTimeControlCategory}
            options={TIME_CONTROLS}
          />
          <FilterSelect
            label="Результат"
            value={result}
            onChange={updateResult}
            options={RESULTS}
          />
        </div>
      </div>

      {loading && !data && (
        <div className={styles.rows}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={styles.skeletonIcon} />
              <div className={styles.skeletonMain}>
                <div className={styles.skeletonLine} style={{ width: "55%" }} />
                <div className={styles.skeletonLine} style={{ width: "75%", opacity: 0.6 }} />
              </div>
              <div className={styles.skeletonSide}>
                <div className={styles.skeletonLine} style={{ width: 60 }} />
                <div className={styles.skeletonLine} style={{ width: 48, opacity: 0.6 }} />
              </div>
              <div className={styles.skeletonStatuses}>
                <div className={styles.skeletonLine} style={{ width: 90, height: 20, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Не вдалося завантажити партії</p>
          <p className={styles.emptyText}>Спробуйте оновити сторінку</p>
        </div>
      )}

      {!loading && !error && data?.games.length === 0 && hasActiveFilters && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Партій не знайдено</p>
          <p className={styles.emptyText}>
            Жодна партія не відповідає обраним фільтрам
          </p>
          <button
            type="button"
            className={styles.emptyBtn}
            onClick={resetFilters}
          >
            Скинути фільтри
          </button>
        </div>
      )}

      {!loading && !error && data?.games.length === 0 && !hasActiveFilters && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">♟</div>
          <p className={styles.emptyTitle}>Партій ще немає</p>
          <p className={styles.emptyText}>
            Додайте шаховий акаунт у налаштуваннях або зачекайте завершення синхронізації
          </p>
        </div>
      )}

      {!error && data && data.games.length > 0 && (
        <>
          <div className={`${styles.rows} ${loading ? styles.refetching : ""}`}>
            {data.games.map((game) => (
              <Link key={game.id} href={`/games/${game.id}`} className={styles.gameRow}>
                <div className={styles.pieceMark}>
                  {game.color === "white" ? "♔" : "♚"}
                </div>

                <div className={styles.gameMain}>
                  <div className={styles.topLine}>
                    <span className={styles.opponent}>{game.opponent}</span>
                    {game.opponentRating !== null && (
                      <span className={styles.rating}>{game.opponentRating}</span>
                    )}
                    <span className={`${styles.resultMark} ${styles[game.result]}`}>
                      <span className={styles.resultDot} />
                      {resultLabel(game.result)}
                    </span>
                  </div>
                  <div className={styles.metaLine}>
                    <span className={styles.opening}>
                      {game.openingName ?? "Дебют невідомий"}
                    </span>
                    <span>{game.moveCount} ходів</span>
                    <span className={styles.colorCell}>
                      <span className={`${styles.colorDot} ${styles[`dot_${game.color}`]}`} />
                      {game.color === "white" ? "Білі" : "Чорні"}
                    </span>
                  </div>
                </div>

                <div className={styles.gameSide}>
                  <span className={styles.platformBadge}>{platformLabel(game.platform)}</span>
                  <span className={styles.timeControl}>{timeControlLabel(game)}</span>
                  <span className={styles.date}>{formatDate(game.playedAt)}</span>
                </div>

                <div className={styles.statuses}>
                  <span className={`${styles.statusBadge} ${game.engineAnalysisStatus === "done" ? styles.statusBadgeDone : ""}`}>
                    {analysisStatusLabel(game.engineAnalysisStatus)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page <= 1}
                aria-label="Попередня сторінка"
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </button>
              <span className={styles.pageInfo}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page >= totalPages}
                aria-label="Наступна сторінка"
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className={styles.filterLabel}>
      <span className={styles.filterLabelText}>{label}</span>
      <select
        className={styles.filterSelect}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
