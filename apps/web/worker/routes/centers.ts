import type {
  CenterDecisionSummary,
  CenterSortBy,
  GetCenterDetailResponse,
  GetCenterScheduleResponse,
  ListCentersQuery,
  ListCentersResponse,
  ScheduleAudience,
} from "@alabiblio/contracts/centers";
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
import { fetchEmtRealtimeForStopIds } from "@alabiblio/mobility/emtApi";
import { buildSchedulePayload } from "@alabiblio/schedule-engine";
import {
  getCenterBySlug,
  getCenterSerCoverageByCenterId,
  getLatestDataVersion,
  listActiveTransportNodesByKinds,
  listCenters,
  listTransportNodesByCenterId,
  loadActiveSchedulesByCenterIds,
  loadCenterFeaturesByCenterIds,
  loadSerCoverageByCenterIds,
  loadTransportNodesByCenterIds,
  type WorkerEnv,
} from "../lib/db";
import {
  buildOriginTransportCandidates,
  groupDestinationTransportNodes,
} from "../lib/mobility";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;
const LIST_CACHE_TTL_SECONDS = 30;
const DETAIL_CACHE_TTL_SECONDS = 60;
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

function groupRealtimeByStopId(arrivals: Awaited<ReturnType<typeof fetchEmtRealtimeForStopIds>>["arrivals"]) {
  const typedMap = new Map<string, Awaited<ReturnType<typeof fetchEmtRealtimeForStopIds>>["arrivals"]>();

  for (const arrival of arrivals) {
    const current = typedMap.get(arrival.stop_id) ?? [];
    current.push(arrival);
    typedMap.set(arrival.stop_id, current);
  }

  return typedMap;
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

async function loadOriginContext(
  env: WorkerEnv,
  userLocation: { lat: number; lon: number } | null,
) {
  if (!userLocation) {
    return {
      originEmtStops: [],
      originBicimadStations: [],
      originMetroStations: [],
      realtimeByStopId: new Map(),
      emtRealtimeStatus: "unconfigured" as const,
      emtRealtimeFetchedAt: null as string | null,
    };
  }

  const activeTransportNodes = await listActiveTransportNodesByKinds(env.DB, [
    "emt_stop",
    "bicimad_station",
    "metro_station",
  ]);
  const originCandidates = buildOriginTransportCandidates({
    rows: activeTransportNodes,
    origin: userLocation,
  });
  const realtimeResult = await fetchEmtRealtimeForStopIds(
    originCandidates.originEmtStops.map((stop) => stop.id),
    env.EMT_CLIENT_ID ||
      env.EMT_PASS_KEY ||
      env.EMT_EMAIL ||
      env.EMT_PASSWORD
      ? {
          clientId: env.EMT_CLIENT_ID,
          passKey: env.EMT_PASS_KEY,
          email: env.EMT_EMAIL,
          password: env.EMT_PASSWORD,
        }
      : null,
  );

  return {
    originEmtStops: originCandidates.originEmtStops,
    originBicimadStations: originCandidates.originBicimadStations,
    originMetroStations: originCandidates.originMetroStations,
    realtimeByStopId: groupRealtimeByStopId(realtimeResult.arrivals),
    emtRealtimeStatus: realtimeResult.status,
    emtRealtimeFetchedAt: new Date().toISOString(),
  };
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
        const centers = await listCenters(env.DB, {
          kind: query.kind,
          q: query.q,
          has_wifi: query.has_wifi,
          has_sockets: query.has_sockets,
          accessible: query.accessible,
          open_air: query.open_air,
          has_ser: query.has_ser,
          district: query.district,
          neighborhood: query.neighborhood,
        });
        const centerIds = centers.map((center) => center.id);
        const userLocation =
          query.user_lat !== undefined && query.user_lon !== undefined
            ? { lat: query.user_lat, lon: query.user_lon }
            : null;
        const sortMode = buildListSortMode(query.sort_by, userLocation !== null);
        const scheduleMap = await loadActiveSchedulesByCenterIds(env.DB, centerIds);
        const baseRecords = centers
          .map((center) => {
            const schedule = buildScheduleFromRecord(scheduleMap.get(center.id) ?? null, null);
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
          })
          .filter((item) =>
            query.open_now === undefined ? true : item.schedule.is_open_now === query.open_now,
          );
        const baseSortedRecords = sortDecisionRecords(baseRecords, sortMode);
        const openCountInResults = baseSortedRecords.filter((r) => r.schedule.is_open_now).length;
        let sortedRecords = baseSortedRecords;

        if (userLocation && baseSortedRecords.length > 0) {
          const candidateCount = Math.min(
            baseSortedRecords.length,
            Math.max(query.offset + query.limit + 12, 24),
          );
          const candidateRecords = baseSortedRecords.slice(0, candidateCount);
          const candidateIds = candidateRecords.map((record) => record.center.id);
          const [transportNodeMap, originContext] = await Promise.all([
            loadTransportNodesByCenterIds(env.DB, candidateIds),
            loadOriginContext(env, userLocation),
          ]);
          const enrichedCandidates = candidateRecords.map((record) => {
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
          const candidateIdSet = new Set(candidateIds);
          sortedRecords = [
            ...sortDecisionRecords(enrichedCandidates, sortMode),
            ...baseSortedRecords.filter((record) => !candidateIdSet.has(record.center.id)),
          ];
        }

        const pagedRecords = sortedRecords.slice(query.offset, query.offset + query.limit);
        const pageCenterIds = pagedRecords.map((item) => item.center.id);
        const serMap = await loadSerCoverageByCenterIds(env.DB, pageCenterIds);
        const items = pagedRecords.map((item) =>
          toCenterDecisionCardItem({
            center: item.center,
            schedule: buildScheduleFromRecord(scheduleMap.get(item.center.id) ?? null, null),
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
          total: sortedRecords.length,
          open_count: openCountInResults,
          limit: query.limit,
          offset: query.offset,
          next_offset:
            query.offset + query.limit < sortedRecords.length
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
