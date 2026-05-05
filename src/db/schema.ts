import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  primaryKey,
  uniqueIndex,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const chessPlatformEnum = pgEnum("chess_platform", [
  "chess_com",
  "lichess",
]);
export const gameResultEnum = pgEnum("game_result", ["win", "loss", "draw"]);
export const playerColorEnum = pgEnum("player_color", ["white", "black"]);
export const timeControlCategoryEnum = pgEnum("time_control_category", [
  "bullet",
  "blitz",
  "rapid",
  "classical",
  "correspondence",
  "unknown",
]);
export const analysisLanguageEnum = pgEnum("analysis_language", ["uk"]);
export const moveClassificationEnum = pgEnum("move_classification", [
  "brilliant",
  "best",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
]);

const now = () => new Date();

// ─── Auth tables (NextAuth.js v5 compatible) ──────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email"),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    name: text("name"),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)]
);

// Auth.js DrizzleAdapter requires these specific TypeScript property names
export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (t) => [
    unique("auth_accounts_provider_account_unique").on(
      t.provider,
      t.providerAccountId
    ),
    index("auth_accounts_user_id_idx").on(t.userId),
  ]
);

export const authVerificationTokens = pgTable(
  "auth_verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({
      name: "auth_verification_tokens_identifier_token_pk",
      columns: [t.identifier, t.token],
    }),
    unique("auth_verification_tokens_token_unique").on(t.token),
  ]
);

// ─── Product tables ───────────────────────────────────────────────────────────

export const chessAccounts = pgTable(
  "chess_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: chessPlatformEnum("platform").notNull(),
    username: text("username").notNull(),
    normalizedUsername: text("normalized_username").notNull(),
    profileUrl: text("profile_url"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (t) => [
    unique("chess_accounts_user_platform_username_unique").on(
      t.userId,
      t.platform,
      t.normalizedUsername
    ),
    index("chess_accounts_user_platform_idx").on(t.userId, t.platform),
  ]
);

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chessAccountId: uuid("chess_account_id")
      .notNull()
      .references(() => chessAccounts.id, { onDelete: "cascade" }),
    platformGameId: text("platform_game_id").notNull(),
    sourceUrl: text("source_url"),
    pgn: text("pgn").notNull(),
    result: gameResultEnum("result").notNull(),
    color: playerColorEnum("color").notNull(),
    opponent: text("opponent").notNull(),
    opponentRating: integer("opponent_rating"),
    playerRating: integer("player_rating"),
    openingName: text("opening_name"),
    timeControl: text("time_control"),
    timeControlCategory: timeControlCategoryEnum(
      "time_control_category"
    ).notNull(),
    rated: boolean("rated"),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull(),
    moveCount: integer("move_count").notNull(),
    rawMetadata: jsonb("raw_metadata"),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (t) => [
    unique("games_account_platform_id_unique").on(
      t.chessAccountId,
      t.platformGameId
    ),
    index("games_account_played_at_idx").on(t.chessAccountId, t.playedAt),
    index("games_account_result_idx").on(t.chessAccountId, t.result),
    index("games_account_time_control_idx").on(
      t.chessAccountId,
      t.timeControlCategory
    ),
    check("games_move_count_non_negative", sql`${t.moveCount} >= 0`),
  ]
);

export const engineAnalyses = pgTable(
  "engine_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    engineName: text("engine_name").notNull(),
    engineVersion: text("engine_version"),
    profileKey: text("profile_key").notNull(),
    depth: integer("depth"),
    timeMsPerPosition: integer("time_ms_per_position"),
    analysisJson: jsonb("analysis_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (t) => [
    unique("engine_analyses_game_profile_unique").on(t.gameId, t.profileKey),
    index("engine_analyses_game_id_idx").on(t.gameId),
  ]
);

export const gameAnalyses = pgTable(
  "game_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    llmModel: text("llm_model").notNull(),
    language: analysisLanguageEnum("language").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    inputHash: text("input_hash"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    analysisJson: jsonb("analysis_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("game_analyses_game_created_idx").on(t.gameId, t.createdAt),
    index("game_analyses_game_language_idx").on(t.gameId, t.language),
  ]
);

export const groupAnalyses = pgTable(
  "group_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameIds: uuid("game_ids").array().notNull(),
    llmModel: text("llm_model").notNull(),
    language: analysisLanguageEnum("language").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    inputHash: text("input_hash"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    analysisJson: jsonb("analysis_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("group_analyses_user_created_idx").on(t.userId, t.createdAt),
    check(
      "group_analyses_game_ids_count",
      sql`cardinality(${t.gameIds}) BETWEEN 5 AND 30`
    ),
  ]
);

export const playerSummaries = pgTable(
  "player_summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gamesCount: integer("games_count").notNull(),
    periodDays: integer("period_days").notNull(),
    maxGames: integer("max_games").notNull(),
    llmModel: text("llm_model").notNull(),
    language: analysisLanguageEnum("language").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    analysisJson: jsonb("analysis_json").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("player_summaries_user_generated_idx").on(t.userId, t.generatedAt),
    check("player_summaries_games_count_min", sql`${t.gamesCount} >= 5`),
    check(
      "player_summaries_period_days_valid",
      sql`${t.periodDays} IN (7, 30, 90)`
    ),
    check(
      "player_summaries_max_games_valid",
      sql`${t.maxGames} IN (25, 50, 100)`
    ),
  ]
);
