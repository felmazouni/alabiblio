import type {
  GetCenterDetailResponse,
  GetCenterScheduleResponse,
  ListCentersQuery,
  ListCentersResponse,
  ScheduleAudience,
} from "@alabiblio/contracts/centers";
import {
  formatDataFreshness,
  toCenterDetailItem,
  toCenterListItem,
} from "@alabiblio/domain/centers";
import { buildSchedulePayload } from "@alabiblio/schedule-engine/index";
import {
  getCenterBySlug,
  getLatestDataVersion,
  listCenters,
  loadActiveSchedulesByCenterIds,
  loadSourceFreshnessByCenterIds,
  type WorkerEnv,
} from "../lib/db";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;
const PUBLIC_CACHE_TTL_SECONDS = 90;
const SCHEDULE_AUDIENCE_ORDER: ScheduleAudience[] = [
  "sala",
  "centro",
  "otros",
  "secretaria",
];

function buildPublicReadHeaders(dataVersion: string | null): HeadersInit {
  return {
    "cache-control": `public, max-age=${PUBLIC_CACHE_TTL_SECONDS}, s-maxage=${PUBLIC_CACHE_TTL_SECONDS}, stale-while-revalidate=${PUBLIC_CACHE_TTL_SECONDS * 2}`,
    ...(dataVersion ? { "x-data-version": dataVersion } : {}),
  };
}

function buildNoStoreHeaders(): HeadersInit {
  return {
    "cache-control": "no-store",
  };
}

function buildScheduleFromRecord(
  scheduleRecord: Parameters<typeof buildSchedulePayload>[0],
  sourceLastUpdated: string | null,
) {
  return buildSchedulePayload(scheduleRecord, {
    preferredAudiences: SCHEDULE_AUDIENCE_ORDER,
    sourceLastUpdated,
    dataFreshness: formatDataFreshness(sourceLastUpdated),
  });
}

async function respondWithPublicCache(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
  buildResponse: (dataVersion: string | null) => Promise<Response>,
): Promise<Response> {
  const dataVersion = await getLatestDataVersion(env.DB);
  const cacheKey = new Request(
    new URL(request.url).toString() +
      `${request.url.includes("?") ? "&" : "?"}__v=${encodeURIComponent(dataVersion ?? "none")}`,
    request,
  );
  const cache = caches.default;
  const cached = await cache.match(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await buildResponse(dataVersion);

  if (response.ok) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

function parseIntegerParam(
  value: string | null,
  fallback: number,
  { min, max }: { min: number; max: number },
): number {
  if (value === null) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error("invalid_integer");
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error("invalid_integer_range");
  }

  return parsed;
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  throw new Error("invalid_boolean");
}

function parseListCentersQuery(
  url: URL,
): Required<Pick<ListCentersQuery, "limit" | "offset">> &
  Pick<
    ListCentersQuery,
    "kind" | "q" | "open_now" | "has_wifi" | "accessible" | "open_air"
  > {
  const kind = url.searchParams.get("kind");
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = parseIntegerParam(url.searchParams.get("limit"), DEFAULT_LIMIT, {
    min: 1,
    max: MAX_LIMIT,
  });
  const offset = parseIntegerParam(url.searchParams.get("offset"), 0, {
    min: 0,
    max: 5000,
  });

  if (kind !== null && kind !== "study_room" && kind !== "library") {
    throw new Error("invalid_kind");
  }

  return {
    kind: kind ?? undefined,
    q: q === "" ? undefined : q,
    limit,
    offset,
    open_now: parseBooleanParam(url.searchParams.get("open_now")),
    has_wifi: parseBooleanParam(url.searchParams.get("has_wifi")),
    accessible: parseBooleanParam(url.searchParams.get("accessible")),
    open_air: parseBooleanParam(url.searchParams.get("open_air")),
  };
}

export async function handleListCenters(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);

  try {
    const query = parseListCentersQuery(url);
    return respondWithPublicCache(request, env, ctx, async (dataVersion) => {
      const centers = await listCenters(env.DB, query);
      const centerIds = centers.map((center) => center.id);
      const [scheduleMap, sourceFreshnessMap] = await Promise.all([
        loadActiveSchedulesByCenterIds(env.DB, centerIds),
        loadSourceFreshnessByCenterIds(env.DB, centerIds),
      ]);
      const items = centers
        .map((center) => {
          const sourceLastUpdated = sourceFreshnessMap.get(center.id) ?? null;
          const schedule = buildScheduleFromRecord(
            scheduleMap.get(center.id) ?? null,
            sourceLastUpdated,
          );
          return toCenterListItem(center, schedule, sourceLastUpdated);
        })
        .filter((item) =>
          query.open_now === undefined ? true : item.is_open_now === query.open_now,
        );
      const payload: ListCentersResponse = {
        items: items.slice(query.offset, query.offset + query.limit),
        total: items.length,
        limit: query.limit,
        offset: query.offset,
      };

      return Response.json(payload, {
        headers: buildPublicReadHeaders(dataVersion),
      });
    });
  } catch (error) {
    return Response.json(
      {
        error: "Invalid query parameters",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      {
        status: 400,
        headers: buildNoStoreHeaders(),
      },
    );
  }
}

export async function handleGetCenterDetail(
  slug: string,
  env: WorkerEnv,
  ctx: ExecutionContext,
  request: Request,
): Promise<Response> {
  return respondWithPublicCache(request, env, ctx, async (dataVersion) => {
    const record = await getCenterBySlug(env.DB, slug);

    if (!record) {
      return Response.json(
        {
          error: "Center not found",
        },
        {
          status: 404,
          headers: buildNoStoreHeaders(),
        },
      );
    }

    const schedule = buildScheduleFromRecord(
      record.schedule,
      record.source_last_updated,
    );
    const payload: GetCenterDetailResponse = {
      item: toCenterDetailItem(
        record.center,
        schedule,
        record.sources,
        record.source_last_updated,
      ),
    };

    return Response.json(payload, {
      headers: buildPublicReadHeaders(dataVersion),
    });
  });
}

export async function handleGetCenterSchedule(
  slug: string,
  env: WorkerEnv,
  ctx: ExecutionContext,
  request: Request,
): Promise<Response> {
  return respondWithPublicCache(request, env, ctx, async (dataVersion) => {
    const record = await getCenterBySlug(env.DB, slug);

    if (!record) {
      return Response.json(
        {
          error: "Center not found",
        },
        {
          status: 404,
          headers: buildNoStoreHeaders(),
        },
      );
    }

    const payload: GetCenterScheduleResponse = {
      item: buildScheduleFromRecord(record.schedule, record.source_last_updated),
    };

    return Response.json(payload, {
      headers: buildPublicReadHeaders(dataVersion),
    });
  });
}
