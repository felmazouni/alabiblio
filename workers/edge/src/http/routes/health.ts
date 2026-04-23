import type { EdgeEnv } from "../../env";

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
}

interface D1LikeDatabase {
  prepare(query: string): D1Statement;
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

export async function buildHealthResponse(env: EdgeEnv): Promise<Response> {
  const database = asDatabase(env.DB);
  const timestamp = new Date().toISOString();

  if (!database) {
    return Response.json(
      {
        app: "alabiblio",
        env: env.APP_ENV,
        status: "degraded",
        timestamp,
        checks: {
          database: false,
        },
      },
      { status: 503 },
    );
  }

  try {
    const [centersRow, snapshotsRow, ratingsRow, transportFreshnessRow] = await Promise.all([
      database.prepare("SELECT COUNT(*) AS total FROM centers").first<{ total: number }>(),
      database.prepare("SELECT COUNT(*) AS total FROM center_transport_snapshots").first<{ total: number }>(),
      database.prepare("SELECT COUNT(*) AS total FROM center_attribute_votes").first<{ total: number }>(),
      database
        .prepare("SELECT MAX(fetched_at) AS latest_fetched_at FROM transport_source_runs")
        .first<{ latest_fetched_at: string | null }>(),
    ]);

    const centers = centersRow?.total ?? 0;
    const snapshots = snapshotsRow?.total ?? 0;
    const ratingsVotes = ratingsRow?.total ?? 0;
    const latestTransportSourceRunAt = transportFreshnessRow?.latest_fetched_at ?? null;
    const latestTransportAgeHours =
      latestTransportSourceRunAt
        ? Math.round(
            (Date.now() - new Date(latestTransportSourceRunAt).getTime()) / 3_600_000,
          )
        : null;

    const healthy =
      centers > 0 &&
      snapshots >= centers &&
      latestTransportAgeHours !== null &&
      latestTransportAgeHours <= 168;

    return Response.json(
      {
        app: "alabiblio",
        env: env.APP_ENV,
        status: healthy ? "ok" : "degraded",
        timestamp,
        checks: {
          database: true,
          centers,
          transportSnapshots: snapshots,
          ratingsVotes,
          latestTransportSourceRunAt,
          latestTransportAgeHours,
        },
      },
      { status: healthy ? 200 : 503 },
    );
  } catch (error) {
    return Response.json(
      {
        app: "alabiblio",
        env: env.APP_ENV,
        status: "degraded",
        timestamp,
        checks: {
          database: false,
        },
        error: error instanceof Error ? error.message : "health_check_failed",
      },
      { status: 503 },
    );
  }
}
