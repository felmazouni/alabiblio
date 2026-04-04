import type {
  CenterDecisionSummary,
  CenterSortBy,
  GetCenterDetailResponse,
  GetCenterScheduleResponse,
  ListCentersQuery,
  ListCentersResponse,
  ScheduleAudience,
} from "@alabiblio/contracts/centers";
import type { GetTopMobilityCentersResponse } from "@alabiblio/contracts/mobility";
import {
  toCenterDecisionCardItem,
  toCenterDetailDecisionItem,
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
import { loadOriginTransportContext } from "../lib/originTransport";

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

function buildOriginBucket(lat: number | undefined, lon: number | undefined): string | null {
  if (lat === undefined || lon === undefined) {
    return null;
  }

  const resolution = 0.002;
  const latBucket = (Math.round(lat / resolution) * resolution).toFixed(3);
  const lonBucket = (Math.round(lon / resolution) * resolution).toFixed(3);

  return `${latBucket},${lonBucket}`;
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

function parseCoordinateParam(
  value: string | null,
  { min, max }: { min: number; max: number },
): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error("invalid_coordinate");
  }

  return parsed;
}

function parseSortByParam(value: string | null): CenterSortBy | undefined {
  if (value === null || value === "") {
    return undefined;
  }

  if (
    value === "recommended" ||
    value === "distance" ||
    value === "arrival" ||
    value === "open_now"
  ) {
    return value;
  }

  throw new Error("invalid_sort_by");
}

function parseListCentersQuery(
  url: URL,
): Required<Pick<ListCentersQuery, "limit" | "offset">> &
  Pick<
    ListCentersQuery,
    | "kind"
    | "q"
    | "open_now"
    | "has_wifi"
    | "has_sockets"
    | "accessible"
    | "open_air"
    | "has_ser"
    | "district"
    | "neighborhood"
    | "sort_by"
    | "user_lat"
    | "user_lon"
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

  const userLat = parseCoordinateParam(url.searchParams.get("user_lat"), {
    min: -90,
    max: 90,
  });
  const userLon = parseCoordinateParam(url.searchParams.get("user_lon"), {
    min: -180,
    max: 180,
  });

  if ((userLat === undefined) !== (userLon === undefined)) {
    throw new Error("invalid_partial_user_location");
  }

  const district = url.searchParams.get("district")?.trim() ?? "";
  const neighborhood = url.searchParams.get("neighborhood")?.trim() ?? "";

  return {
    kind: kind ?? undefined,
    q: q === "" ? undefined : q,
    limit,
    offset,
    open_now: parseBooleanParam(url.searchParams.get("open_now")),
    has_wifi: parseBooleanParam(url.searchParams.get("has_wifi")),
    has_sockets: parseBooleanParam(url.searchParams.get("has_sockets")),
    accessible: parseBooleanParam(url.searchParams.get("accessible")),
    open_air: parseBooleanParam(url.searchParams.get("open_air")),
    has_ser: parseBooleanParam(url.searchParams.get("has_ser")),
    district: district === "" ? undefined : district,
    neighborhood: neighborhood === "" ? undefined : neighborhood,
    sort_by: parseSortByParam(url.searchParams.get("sort_by")),
    user_lat: userLat,
    user_lon: userLon,
  };
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

function buildListSortMode(
  requestedSort: CenterSortBy | undefined,
  hasUserLocation: boolean,
): CenterSortBy {
  return requestedSort ?? (hasUserLocation ? "recommended" : "open_now");
}

function sortDecisionRecords<
  T extends {
    center: { id: string; name: string };
    schedule: { is_open_now: boolean | null; schedule_confidence_label: "high" | "medium" | "low" };
    decision: CenterDecisionSummary;
  },
>(records: T[], sortBy: CenterSortBy): T[] {
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

function buildCenterFilters(
  query: ReturnType<typeof parseListCentersQuery>,
) {
  return {
    kind: query.kind,
    q: query.q,
    has_wifi: query.has_wifi,
    has_sockets: query.has_sockets,
    accessible: query.accessible,
    open_air: query.open_air,
    has_ser: query.has_ser,
    district: query.district,
    neighborhood: query.neighborhood,
  };
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
  const sortMode = buildListSortMode(query.sort_by, userLocation !== null);
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
    records: sortDecisionRecords(records, sortMode),
    exhausted,
    sortMode,
  };
}

async function countOpenCentersForQuery(
  env: WorkerEnv,
  query: ReturnType<typeof parseListCentersQuery>,
): Promise<number> {
  if (query.open_now === true) {
    return countCenters(env.DB, buildCenterFilters(query));
  }

  if (query.open_now === false) {
    return 0;
  }

  const filters = buildCenterFilters(query);
  let openCount = 0;
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
      }
    }

    offset += centers.length;

    if (centers.length < OPEN_COUNT_SCAN_CHUNK) {
      break;
    }
  }

  return openCount;
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
  const [transportNodeMap, originContext] = await Promise.all([
    loadTransportNodesByCenterIds(env.DB, candidateIds),
    loadOriginTransportContext(env, userLocation),
  ]);

  return records.map((record) => {
    const destination = groupDestinationTransportNodes(
      transportNodeMap.get(record.center.id) ?? [],
    );
    const mobility = buildCenterMobility({
      center: record.center,
      schedule: record.schedule,
      userLocation,
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
    query = parseListCentersQuery(url);
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
        originBucket: buildOriginBucket(query.user_lat, query.user_lon),
      },
      async (dataVersion) => {
        const userLocation =
          query.user_lat !== undefined && query.user_lon !== undefined
            ? { lat: query.user_lat, lon: query.user_lon }
            : null;
        const [totalMatchingCenters, totalOpenCenters, listWindow] = await Promise.all([
          countCenters(env.DB, buildCenterFilters(query)),
          countOpenCentersForQuery(env, query),
          loadListWindowRecords(env, query, userLocation),
        ]);
        const sortedRecords = listWindow.records;

        const pagedRecords = sortedRecords.slice(query.offset, query.offset + query.limit);
        const pageCenterIds = pagedRecords.map((item) => item.center.id);
        const serMap = await loadSerCoverageByCenterIds(env.DB, pageCenterIds);
        const items = pagedRecords.map((item) =>
          toCenterDecisionCardItem({
            center: item.center,
            schedule: item.schedule,
            ser: serMap.has(item.center.id)
              ? {
                  enabled: serMap.get(item.center.id)?.enabled ?? false,
                  zone_name: serMap.get(item.center.id)?.zone_name ?? null,
                }
              : null,
            decision: item.decision,
            mobilityHighlights: item.mobility.highlights,
          }),
        );
        const payload: ListCentersResponse = {
          items,
          total:
            query.open_now === undefined
              ? totalMatchingCenters
              : listWindow.exhausted
                ? sortedRecords.length
                : Math.max(sortedRecords.length, query.offset + pagedRecords.length + 1),
          open_count: totalOpenCenters,
          limit: query.limit,
          offset: query.offset,
          next_offset:
            query.offset + query.limit <
            (query.open_now === undefined
              ? totalMatchingCenters
              : listWindow.exhausted
                ? sortedRecords.length
                : Math.max(sortedRecords.length, query.offset + pagedRecords.length + 1))
              ? query.offset + query.limit
              : null,
        };

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
    query = parseListCentersQuery(url);
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
    const emptyPayload: GetTopMobilityCentersResponse = { items: [], open_count: 0 };
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
        const totalOpenCenters = await countOpenCentersForQuery(env, query);
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
          listWindow.sortMode,
        ).slice(0, TOP_MOBILITY_COUNT);
        const serMap = await loadSerCoverageByCenterIds(
          env.DB,
          rankedCandidates.map((record) => record.center.id),
        );

        const payload: GetTopMobilityCentersResponse = {
          items: rankedCandidates.map((record, index) => ({
            slug: record.center.slug,
            rank: index + 1,
            center: toCenterDecisionCardItem({
              center: record.center,
              schedule: record.schedule,
              ser: serMap.has(record.center.id)
                ? {
                    enabled: serMap.get(record.center.id)?.enabled ?? false,
                    zone_name: serMap.get(record.center.id)?.zone_name ?? null,
                  }
                : null,
              decision: record.decision,
              mobilityHighlights: record.mobility.highlights,
            }),
            item: record.mobility,
          })),
          open_count: totalOpenCenters,
        };

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
        const payload: GetCenterDetailResponse = {
          item: toCenterDetailDecisionItem({
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
        };

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
