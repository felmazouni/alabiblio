import type {
  GetCenterDetailResponse,
  GetCenterScheduleResponse,
  ListCentersResponse,
  ScheduleAudience,
} from "@alabiblio/contracts/centers";
import type { GetTopMobilityCentersResponse } from "@alabiblio/contracts/mobility";
import {
  toCenterListBaseItem,
  toCenterDetailDecisionItem,
  toCenterTopMobilityCardItem,
} from "@alabiblio/domain/centers";
import {
  buildStaticTransportAnchors,
  buildCenterMobility,
  buildDecisionSummary,
  sortCenterListItems,
} from "@alabiblio/domain/mobility";
import { buildSchedulePayload } from "@alabiblio/schedule-engine";
import {
  countCenters,
  getCenterBySlug,
  getCenterSerCoverageByCenterId,
  getLatestDataVersion,
  listCenters,
  listTransportNodesByCenterId,
  loadActiveSchedulesByCenterIds,
  loadCenterFeaturesByCenterIds,
  loadSerCoverageByCenterIds,
  loadTransportNodesByCenterIds,
  type WorkerEnv,
} from "../lib/db";
import {
  groupDestinationTransportNodes,
} from "../lib/mobility";
import {
  buildCenterDetailResponsePayload,
  buildListCentersResponsePayload,
  buildTopMobilityCentersResponsePayload,
} from "../lib/centerPayloads";
import { loadOriginTransportContext } from "../lib/originTransport";
import {
  buildCenterFilters,
  buildOriginBucket,
  parseListCentersQuery,
  toBaseExplorationQuery,
} from "../lib/centersQuery";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;
const LIST_SCAN_CHUNK = 48;
const LIST_SCAN_LIMIT = 144;
const LIST_VISIBLE_PADDING = 12;
const LIST_CACHE_TTL_SECONDS = 30;
const TOP_MOBILITY_CACHE_TTL_SECONDS = 15;
const DETAIL_CACHE_TTL_SECONDS = 60;
const TOP_MOBILITY_COUNT = 3;
const TOP_MOBILITY_CANDIDATES = 6;
const OPEN_COUNT_SCAN_CHUNK = 200;
const SCHEDULE_AUDIENCE_ORDER: ScheduleAudience[] = [
  "sala",
  "centro",
  "otros",
  "secretaria",
];

function buildPublicReadHeaders(
  dataVersion: string | null,
  ttlSeconds: number,
): HeadersInit {
  return {
    "cache-control": `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`,
    ...(dataVersion ? { "x-data-version": dataVersion } : {}),
  };
}

function buildNoStoreHeaders(): HeadersInit {
  return {
    "cache-control": "no-store",
  };
}

function buildInternalErrorResponse(scope: string, error: unknown): Response {
  console.error(`[${scope}]`, error);

  return Response.json(
    {
      error: "Internal server error",
      detail: scope,
    },
    {
      status: 500,
      headers: buildNoStoreHeaders(),
    },
  );
}

async function respondWithPublicCache(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
  options: {
    ttlSeconds: number;
    originBucket?: string | null;
  },
  buildResponse: (dataVersion: string | null) => Promise<Response>,
): Promise<Response> {
  const dataVersion = await getLatestDataVersion(env.DB);
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.set("__v", dataVersion ?? "none");
  if (options.originBucket) {
    cacheUrl.searchParams.set("__origin_bucket", options.originBucket);
    cacheUrl.searchParams.delete("user_lat");
    cacheUrl.searchParams.delete("user_lon");
  }
  const cacheKey = new Request(cacheUrl.toString(), request);
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

function buildScheduleFromRecord(
  scheduleRecord: Parameters<typeof buildSchedulePayload>[0],
  sourceLastUpdated: string | null,
) {
  return buildSchedulePayload(scheduleRecord, {
    preferredAudiences: SCHEDULE_AUDIENCE_ORDER,
    sourceLastUpdated,
    dataFreshness: sourceLastUpdated,
  });
}

function sortDecisionRecords<
  T extends {
    center: { id: string; name: string };
    schedule: { is_open_now: boolean | null; schedule_confidence_label: "high" | "medium" | "low" };
    decision: {
      best_mode: "walk" | "car" | "bus" | "bike" | "metro" | null;
      best_time_minutes: number | null;
      distance_m: number | null;
      confidence: "high" | "medium" | "low";
      rationale: string[];
      summary_label: string | null;
    };
  },
>(records: T[], sortBy: "recommended" | "distance" | "arrival" | "open_now"): T[] {
  const sortedItems = sortCenterListItems(
    records.map((record) => ({
      id: record.center.id,
      name: record.center.name,
      is_open_now: record.schedule.is_open_now,
      schedule_confidence_label: record.schedule.schedule_confidence_label,
      decision: record.decision,
    })),
    sortBy,
  );
  const sortedIdOrder = new Map(sortedItems.map((item, index) => [item.id, index]));

  return [...records].sort(
    (left, right) =>
      (sortedIdOrder.get(left.center.id) ?? Number.MAX_SAFE_INTEGER) -
      (sortedIdOrder.get(right.center.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

function buildBaseListRecord(
  center: Awaited<ReturnType<typeof listCenters>>[number],
  scheduleRecord: Parameters<typeof buildScheduleFromRecord>[0],
  userLocation: { lat: number; lon: number } | null,
) {
  const schedule = buildScheduleFromRecord(scheduleRecord ?? null, null);
  const mobility = buildCenterMobility({
    center,
    schedule,
    userLocation,
    ser: null,
    originEmtStops: [],
    destinationEmtStops: [],
    originBicimadStations: [],
    destinationBicimadStations: [],
    originMetroStations: [],
    destinationMetroStations: [],
    destinationParkings: [],
    realtimeByStopId: new Map(),
    emtRealtimeStatus: "unconfigured",
    fetchedAt: new Date().toISOString(),
  });
  const decision = buildDecisionSummary({
    center,
    schedule,
    userLocation,
    mobility,
  });

  return { center, schedule, mobility, decision };
}

async function loadListWindowRecords(
  env: WorkerEnv,
  query: ReturnType<typeof parseListCentersQuery>,
  userLocation: { lat: number; lon: number } | null,
) {
  const filters = buildCenterFilters(query);
  const targetCount = Math.max(query.offset + query.limit + LIST_VISIBLE_PADDING, DEFAULT_LIMIT);
  const records: Array<ReturnType<typeof buildBaseListRecord>> = [];
  let scanned = 0;
  let fetchOffset = 0;
  let exhausted = false;

  while (records.length < targetCount && scanned < LIST_SCAN_LIMIT && !exhausted) {
    const batchLimit = Math.min(LIST_SCAN_CHUNK, LIST_SCAN_LIMIT - scanned);
    const centers = await listCenters(env.DB, filters, {
      limit: batchLimit,
      offset: fetchOffset,
    });

    if (centers.length === 0) {
      exhausted = true;
      break;
    }

    fetchOffset += centers.length;
    scanned += centers.length;

    const scheduleMap = await loadActiveSchedulesByCenterIds(
      env.DB,
      centers.map((center) => center.id),
    );

    const batchRecords = centers
      .map((center) => buildBaseListRecord(center, scheduleMap.get(center.id) ?? null, userLocation))
      .filter((item) =>
        query.open_now === undefined ? true : item.schedule.is_open_now === query.open_now,
      );

    records.push(...batchRecords);

    if (centers.length < batchLimit) {
      exhausted = true;
    }
  }

  return {
    records: sortDecisionRecords(records, "open_now"),
    exhausted,
  };
}

async function countScheduleStateSummaryForQuery(
  env: WorkerEnv,
  query: ReturnType<typeof parseListCentersQuery>,
): Promise<{ open_count: number; closed_count: number }> {
  const filters = buildCenterFilters(query);
  let openCount = 0;
  let closedCount = 0;
  let offset = 0;

  while (true) {
    const centers = await listCenters(env.DB, filters, {
      limit: OPEN_COUNT_SCAN_CHUNK,
      offset,
    });

    if (centers.length === 0) {
      break;
    }

    const scheduleMap = await loadActiveSchedulesByCenterIds(
      env.DB,
      centers.map((center) => center.id),
    );

    for (const center of centers) {
      const schedule = buildScheduleFromRecord(scheduleMap.get(center.id) ?? null, null);
      if (schedule.is_open_now) {
        openCount += 1;
      } else if (schedule.is_open_now === false) {
        closedCount += 1;
      }
    }

    offset += centers.length;

    if (centers.length < OPEN_COUNT_SCAN_CHUNK) {
      break;
    }
  }

  return {
    open_count: openCount,
    closed_count: closedCount,
  };
}

async function enrichDecisionRecords(
  env: WorkerEnv,
  records: Array<ReturnType<typeof buildBaseListRecord>>,
  userLocation: { lat: number; lon: number } | null,
) {
  if (!userLocation || records.length === 0) {
    return records;
  }

  const candidateIds = records.map((record) => record.center.id);
  const [transportNodeMap, originContext, serMap] = await Promise.all([
    loadTransportNodesByCenterIds(env.DB, candidateIds),
    loadOriginTransportContext(env, userLocation),
    loadSerCoverageByCenterIds(env.DB, candidateIds),
  ]);

  return records.map((record) => {
    const destination = groupDestinationTransportNodes(
      transportNodeMap.get(record.center.id) ?? [],
    );
    const mobility = buildCenterMobility({
      center: record.center,
      schedule: record.schedule,
      userLocation,
      ser: serMap.get(record.center.id) ?? null,
      originEmtStops: originContext.originEmtStops,
      destinationEmtStops: destination.destinationEmtStops,
      originBicimadStations: originContext.originBicimadStations,
      destinationBicimadStations: destination.destinationBicimadStations,
      originMetroStations: originContext.originMetroStations,
      destinationMetroStations: destination.destinationMetroStations,
      destinationParkings: destination.destinationParkings,
      realtimeByStopId: originContext.realtimeByStopId,
      emtRealtimeStatus: originContext.emtRealtimeStatus,
      emtRealtimeFetchedAt: originContext.emtRealtimeFetchedAt,
      fetchedAt: new Date().toISOString(),
    });
    const decision = buildDecisionSummary({
      center: record.center,
      schedule: record.schedule,
      userLocation,
      mobility,
    });

    return { ...record, mobility, decision };
  });
}

export async function handleListCenters(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);
  let query: ReturnType<typeof parseListCentersQuery>;

  try {
    query = parseListCentersQuery(url, {
      limit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
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

  try {
    return await respondWithPublicCache(
      request,
      env,
      ctx,
      {
        ttlSeconds: LIST_CACHE_TTL_SECONDS,
      },
      async (dataVersion) => {
        const baseQuery = toBaseExplorationQuery(query);
        const [totalMatchingCenters, scheduleStateSummary, listWindow] = await Promise.all([
          countCenters(env.DB, buildCenterFilters(baseQuery)),
          countScheduleStateSummaryForQuery(env, baseQuery),
          loadListWindowRecords(env, baseQuery, null),
        ]);
        const totalOpenCenters = scheduleStateSummary.open_count;
        const sortedRecords = listWindow.records;

        const pagedRecords = sortedRecords.slice(baseQuery.offset, baseQuery.offset + baseQuery.limit);
        const pageCenterIds = pagedRecords.map((item) => item.center.id);
        const serMap = await loadSerCoverageByCenterIds(env.DB, pageCenterIds);
        const items = pagedRecords.map((item) =>
          toCenterListBaseItem({
            center: item.center,
            schedule: item.schedule,
            ser: serMap.has(item.center.id)
              ? {
                  enabled: serMap.get(item.center.id)?.enabled ?? false,
                  zone_name: serMap.get(item.center.id)?.zone_name ?? null,
                }
              : null,
          }),
        );
        const scopedTotal =
          baseQuery.open_now === undefined
            ? totalMatchingCenters
            : baseQuery.open_now
              ? scheduleStateSummary.open_count
              : scheduleStateSummary.closed_count;
        const payload: ListCentersResponse = buildListCentersResponsePayload({
          items,
          total: scopedTotal,
          open_count: totalOpenCenters,
          limit: baseQuery.limit,
          offset: baseQuery.offset,
          next_offset: baseQuery.offset + baseQuery.limit < scopedTotal
            ? baseQuery.offset + baseQuery.limit
            : null,
        });

        return Response.json(payload, {
          headers: buildPublicReadHeaders(dataVersion, LIST_CACHE_TTL_SECONDS),
        });
      },
    );
  }
  catch (error) {
    return buildInternalErrorResponse("list_centers_failed", error);
  }
}

export async function handleGetTopMobilityCenters(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);
  let query: ReturnType<typeof parseListCentersQuery>;

  try {
    query = parseListCentersQuery(url, {
      limit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
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

  const userLocation =
    query.user_lat !== undefined && query.user_lon !== undefined
      ? { lat: query.user_lat, lon: query.user_lon }
      : null;

  if (!userLocation) {
    const emptyPayload: GetTopMobilityCentersResponse = buildTopMobilityCentersResponsePayload({
      items: [],
      open_count: 0,
    });
    return Response.json(emptyPayload, {
      headers: buildNoStoreHeaders(),
    });
  }

  try {
    return await respondWithPublicCache(
      request,
      env,
      ctx,
      {
        ttlSeconds: TOP_MOBILITY_CACHE_TTL_SECONDS,
        originBucket: buildOriginBucket(query.user_lat, query.user_lon),
      },
      async (dataVersion) => {
        const scheduleStateSummary = await countScheduleStateSummaryForQuery(env, query);
        const totalOpenCenters = scheduleStateSummary.open_count;
        const rankingQuery =
          totalOpenCenters > 0
            ? {
                ...query,
                open_now: true as const,
              }
            : query;

        const listWindow = await loadListWindowRecords(
          env,
          {
            ...rankingQuery,
            limit: TOP_MOBILITY_CANDIDATES,
            offset: 0,
          },
          userLocation,
        );

        const enrichedCandidates = await enrichDecisionRecords(
          env,
          listWindow.records.slice(0, TOP_MOBILITY_CANDIDATES),
          userLocation,
        );

        const rankedCandidates = sortDecisionRecords(
          enrichedCandidates,
          query.sort_by ?? "recommended",
        ).slice(0, TOP_MOBILITY_COUNT);
        const serMap = await loadSerCoverageByCenterIds(
          env.DB,
          rankedCandidates.map((record) => record.center.id),
        );

        const payload: GetTopMobilityCentersResponse = buildTopMobilityCentersResponsePayload({
          items: rankedCandidates.map((record, index) => ({
            slug: record.center.slug,
            rank: index + 1,
            center: toCenterTopMobilityCardItem({
              center: record.center,
              schedule: record.schedule,
              ser: serMap.has(record.center.id)
                ? {
                    enabled: serMap.get(record.center.id)?.enabled ?? false,
                    zone_name: serMap.get(record.center.id)?.zone_name ?? null,
                  }
                : null,
              decision: record.decision,
            }),
            item: record.mobility,
          })),
          open_count: totalOpenCenters,
        });

        return Response.json(payload, {
          headers: buildPublicReadHeaders(dataVersion, TOP_MOBILITY_CACHE_TTL_SECONDS),
        });
      },
    );
  } catch (error) {
    return buildInternalErrorResponse("top_mobility_failed", error);
  }
}

export async function handleGetCenterDetail(
  slug: string,
  env: WorkerEnv,
  ctx: ExecutionContext,
  request: Request,
): Promise<Response> {
  try {
    return await respondWithPublicCache(
      request,
      env,
      ctx,
      {
        ttlSeconds: DETAIL_CACHE_TTL_SECONDS,
      },
      async (dataVersion) => {
        const detail = await getCenterBySlug(env.DB, slug);

        if (!detail) {
          return Response.json(
            { error: "Center not found" },
            { status: 404, headers: buildNoStoreHeaders() },
          );
        }

        const [ser, nodeRows, featuresMap] = await Promise.all([
          getCenterSerCoverageByCenterId(env.DB, detail.center.id),
          listTransportNodesByCenterId(env.DB, detail.center.id),
          loadCenterFeaturesByCenterIds(env.DB, [detail.center.id]),
        ]);
        const schedule = buildScheduleFromRecord(
          detail.schedule,
          detail.source_last_updated,
        );
        const destination = groupDestinationTransportNodes(nodeRows);
        const payload: GetCenterDetailResponse = buildCenterDetailResponsePayload(
          toCenterDetailDecisionItem({
            center: detail.center,
            schedule,
            sources: detail.sources,
            sourceLastUpdated: detail.source_last_updated,
            ser,
            staticTransport: buildStaticTransportAnchors({
              destinationEmtStops: destination.destinationEmtStops,
              destinationMetroStations: destination.destinationMetroStations,
              destinationBicimadStations: destination.destinationBicimadStations,
              destinationParkings: destination.destinationParkings,
            }),
            features: featuresMap.get(detail.center.id) ?? [],
          }),
        );

        return Response.json(payload, {
          headers: buildPublicReadHeaders(dataVersion, DETAIL_CACHE_TTL_SECONDS),
        });
      },
    );
  }
  catch (error) {
    return buildInternalErrorResponse("center_detail_failed", error);
  }
}

export async function handleGetCenterSchedule(
  slug: string,
  env: WorkerEnv,
  ctx: ExecutionContext,
  request: Request,
): Promise<Response> {
  return respondWithPublicCache(
    request,
    env,
    ctx,
      {
        ttlSeconds: DETAIL_CACHE_TTL_SECONDS,
      },
      async (dataVersion) => {
        const detail = await getCenterBySlug(env.DB, slug);

        if (!detail) {
          return Response.json(
            { error: "Center not found" },
            { status: 404, headers: buildNoStoreHeaders() },
          );
        }

        const payload: GetCenterScheduleResponse = {
          item: buildScheduleFromRecord(detail.schedule, detail.source_last_updated),
        };

        return Response.json(payload, {
          headers: buildPublicReadHeaders(dataVersion, DETAIL_CACHE_TTL_SECONDS),
        });
      },
  );
}
