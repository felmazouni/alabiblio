import type {
  CenterRatingAverages,
  CenterRatingVote,
  CenterRatingVoteInput,
  CenterRatingsSummary,
  PublicCenterRatingsResponse,
} from "@alabiblio/contracts";
import { buildRatingPresentationMeta } from "@alabiblio/domain";

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1LikeDatabase {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

function asDatabase(database: unknown): D1LikeDatabase | null {
  if (
    database &&
    typeof database === "object" &&
    "prepare" in database &&
    typeof (database as { prepare?: unknown }).prepare === "function"
  ) {
    return database as D1LikeDatabase;
  }

  return null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function round1(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

function validateVote(vote: CenterRatingVoteInput): void {
  const values = [
    vote.silence,
    vote.wifi,
    vote.cleanliness,
    vote.plugs,
    vote.temperature,
    vote.lighting,
  ];

  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) {
    throw new Error("invalid_vote_value");
  }
}

interface CenterRow {
  id: string;
}

interface RatingAggregateRow {
  rating_count: number;
  silence_avg: number | null;
  wifi_avg: number | null;
  cleanliness_avg: number | null;
  plugs_avg: number | null;
  temperature_avg: number | null;
  lighting_avg: number | null;
}

interface UserVoteRow {
  silence: number;
  wifi: number;
  cleanliness: number;
  plugs: number;
  temperature: number;
  lighting: number;
  created_at: string;
  updated_at: string;
}

async function centerBySlug(database: D1LikeDatabase, slug: string): Promise<CenterRow | null> {
  return database
    .prepare("SELECT id FROM centers WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first<CenterRow>();
}

async function readAggregates(database: D1LikeDatabase, centerId: string): Promise<{
  ratingCount: number;
  attributes: CenterRatingAverages;
  ratingAverage: number | null;
}> {
  const row = await database
    .prepare(
      `SELECT
        COUNT(*) AS rating_count,
        AVG(silence) AS silence_avg,
        AVG(wifi) AS wifi_avg,
        AVG(cleanliness) AS cleanliness_avg,
        AVG(plugs) AS plugs_avg,
        AVG(temperature) AS temperature_avg,
        AVG(lighting) AS lighting_avg
      FROM center_attribute_votes
      WHERE center_id = ?`,
    )
    .bind(centerId)
    .first<RatingAggregateRow>();

  const ratingCount = row?.rating_count ?? 0;
  const attributes: CenterRatingAverages = {
    silence: round1(row?.silence_avg ?? null),
    wifi: round1(row?.wifi_avg ?? null),
    cleanliness: round1(row?.cleanliness_avg ?? null),
    plugs: round1(row?.plugs_avg ?? null),
    temperature: round1(row?.temperature_avg ?? null),
    lighting: round1(row?.lighting_avg ?? null),
  };

  const values = Object.values(attributes).filter((value): value is number => value !== null);
  const ratingAverage = values.length === 6
    ? round1(values.reduce((sum, value) => sum + value, 0) / 6)
    : null;

  return {
    ratingCount,
    attributes,
    ratingAverage,
  };
}

async function readUserVote(
  database: D1LikeDatabase,
  centerId: string,
  userId?: string,
): Promise<CenterRatingVote | null> {
  if (!userId) {
    return null;
  }

  const row = await database
    .prepare(
      `SELECT silence, wifi, cleanliness, plugs, temperature, lighting, created_at, updated_at
       FROM center_attribute_votes
       WHERE center_id = ? AND user_id = ?
       LIMIT 1`,
    )
    .bind(centerId, userId)
    .first<UserVoteRow>();

  if (!row) {
    return null;
  }

  return {
    silence: row.silence,
    wifi: row.wifi,
    cleanliness: row.cleanliness,
    plugs: row.plugs,
    temperature: row.temperature,
    lighting: row.lighting,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function syncCenterRatingSummary(
  database: D1LikeDatabase,
  centerId: string,
): Promise<{ ratingAverage: number | null; ratingCount: number }> {
  const aggregates = await readAggregates(database, centerId);
  const now = nowIso();

  await database
    .prepare(
      `UPDATE centers
       SET rating_average = ?,
           rating_count = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(aggregates.ratingAverage, aggregates.ratingCount, now, centerId)
    .run();

  return {
    ratingAverage: aggregates.ratingAverage,
    ratingCount: aggregates.ratingCount,
  };
}

export async function getCenterRatingsBySlug(
  databaseLike: unknown,
  slug: string,
  userId?: string,
): Promise<PublicCenterRatingsResponse | null> {
  const database = asDatabase(databaseLike);
  if (!database) {
    throw new Error("database_unavailable");
  }

  const center = await centerBySlug(database, slug);
  if (!center) {
    return null;
  }

  const aggregates = await readAggregates(database, center.id);
  const userVote = await readUserVote(database, center.id, userId);

  const item: CenterRatingsSummary = {
    centerId: center.id,
    ratingAverage: aggregates.ratingAverage,
    ratingCount: aggregates.ratingCount,
    attributes: aggregates.attributes,
    ...buildRatingPresentationMeta(aggregates.ratingCount),
    userVote,
  };

  return {
    generatedAt: nowIso(),
    sourceMode: "d1",
    item,
  };
}

export async function upsertCenterRatingBySlug(
  databaseLike: unknown,
  slug: string,
  userId: string,
  vote: CenterRatingVoteInput,
): Promise<PublicCenterRatingsResponse | null> {
  const database = asDatabase(databaseLike);
  if (!database) {
    throw new Error("database_unavailable");
  }

  validateVote(vote);

  const center = await centerBySlug(database, slug);
  if (!center) {
    return null;
  }

  const now = nowIso();
  await database
    .prepare(
      `INSERT INTO center_attribute_votes (
        id,
        center_id,
        user_id,
        silence,
        wifi,
        cleanliness,
        plugs,
        temperature,
        lighting,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(center_id, user_id) DO UPDATE SET
        silence = excluded.silence,
        wifi = excluded.wifi,
        cleanliness = excluded.cleanliness,
        plugs = excluded.plugs,
        temperature = excluded.temperature,
        lighting = excluded.lighting,
        updated_at = excluded.updated_at`,
    )
    .bind(
      randomId("rat"),
      center.id,
      userId,
      vote.silence,
      vote.wifi,
      vote.cleanliness,
      vote.plugs,
      vote.temperature,
      vote.lighting,
      now,
      now,
    )
    .run();

  const summary = await syncCenterRatingSummary(database, center.id);
  const userVote = await readUserVote(database, center.id, userId);

  const item: CenterRatingsSummary = {
    centerId: center.id,
    ratingAverage: summary.ratingAverage,
    ratingCount: summary.ratingCount,
    attributes: {
      silence: null,
      wifi: null,
      cleanliness: null,
      plugs: null,
      temperature: null,
      lighting: null,
    },
    ...buildRatingPresentationMeta(summary.ratingCount),
    userVote,
  };

  const freshAggregates = await readAggregates(database, center.id);
  item.attributes = freshAggregates.attributes;

  return {
    generatedAt: nowIso(),
    sourceMode: "d1",
    item,
  };
}
