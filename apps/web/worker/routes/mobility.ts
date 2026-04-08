import type {
  GetCenterMobilityResponse,
  GetCenterMobilitySummaryResponse,
} from "@alabiblio/contracts/mobility";
import {
  buildCenterMobility,
} from "@alabiblio/domain/mobility";
import { buildSchedulePayload } from "@alabiblio/schedule-engine";
import type { ActiveScheduleRecord } from "@alabiblio/schedule-engine/types";
import {
  getCenterBySlug,
  getCenterSerCoverageByCenterId,
  getLatestDataVersion,
  listTransportNodesByCenterId,
  type WorkerEnv,
} from "../lib/db";
import {
  groupDestinationTransportNodes,
} from "../lib/mobility";
import {
  buildCenterMobilityResponsePayload,
  buildCenterMobilitySummaryResponsePayload,
} from "../lib/centerPayloads";
import type { ApiRequestContext } from "../lib/observability";
import {
  buildMobilityUpstreamStatus,
  buildNoStoreHeaders,
  buildPublicCacheControl,
  classifyMobilityDataState,
  createApiErrorResponse,
  createApiJsonResponse,
  setOriginBucket,
  withApiHeaders,
} from "../lib/observability";
import { loadOriginTransportContext } from "../lib/originTransport";

const MOBILITY_CACHE_TTL_SECONDS = 15;

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
  requestContext: ApiRequestContext,
  originBucket: string | null,
  buildResponse: (dataVersion: string | null) => Promise<Response>,
): Promise<Response> {
  const dataVersion = await getLatestDataVersion(env.DB);
  const cacheUrl = new URL(request.url);
  setOriginBucket(requestContext, originBucket);
  cacheUrl.searchParams.set("__v", dataVersion ?? "none");
  if (originBucket) {
    cacheUrl.searchParams.set("__origin_bucket", originBucket);
    cacheUrl.searchParams.delete("user_lat");
    cacheUrl.searchParams.delete("user_lon");
  }
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);

  if (cached) {
    return withApiHeaders(cached, requestContext, { cacheStatus: "HIT" });
  }

  const response = await buildResponse(dataVersion);
  const missResponse = withApiHeaders(response, requestContext, { cacheStatus: "MISS" });

  if (missResponse.ok) {
    ctx.waitUntil(cache.put(cacheKey, missResponse.clone()));
  }

  return missResponse;
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

function buildScheduleSummaryForDecision(
  scheduleRecord: ActiveScheduleRecord | null,
  sourceLastUpdated: string | null,
) {
  return buildSchedulePayload(scheduleRecord ?? null, {
    preferredAudiences: ["sala", "centro", "otros", "secretaria"],
    sourceLastUpdated,
    dataFreshness: sourceLastUpdated,
  });
}

function parseUserLocationFromRequest(request: Request): { lat: number; lon: number } | null {
  const url = new URL(request.url);
  const userLat = parseCoordinateParam(url.searchParams.get("user_lat"), {
    min: -90,
    max: 90,
  });
  const userLon = parseCoordinateParam(url.searchParams.get("user_lon"), {
    min: -180,
    max: 180,
  });

  return userLat !== undefined && userLon !== undefined
    ? {
        lat: userLat,
        lon: userLon,
      }
    : null;
}

async function buildCenterMobilityRuntime(
  slug: string,
  env: WorkerEnv,
  userLocation: { lat: number; lon: number } | null,
): Promise<GetCenterMobilityResponse["item"] | null> {
  const centerRecord = await getCenterBySlug(env.DB, slug);

  if (!centerRecord) {
    return null;
  }

  const [ser, nodeRows] = await Promise.all([
    getCenterSerCoverageByCenterId(env.DB, centerRecord.center.id),
    listTransportNodesByCenterId(env.DB, centerRecord.center.id),
  ]);
  const destination = groupDestinationTransportNodes(nodeRows);
  const originContext = await loadOriginTransportContext(env, userLocation);

  return buildCenterMobility({
    center: centerRecord.center,
    schedule: buildScheduleSummaryForDecision(
      centerRecord.schedule,
      centerRecord.source_last_updated,
    ),
    userLocation,
    ser,
    origin: userLocation
      ? {
          kind: null,
          label: "Origen activo",
        }
      : null,
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
}

export async function handleGetCenterMobility(
  slug: string,
  env: WorkerEnv,
  ctx: ExecutionContext,
  request: Request,
  requestContext: ApiRequestContext,
): Promise<Response> {
  let userLocation: { lat: number; lon: number } | null = null;

  try {
    userLocation = parseUserLocationFromRequest(request);
  } catch (error) {
    return createApiErrorResponse(requestContext, {
      status: 400,
      error: "Invalid query parameters",
      detail: error instanceof Error ? error.message : "unknown_error",
      errorType: "validation_error",
      headers: buildNoStoreHeaders(),
      cacheStatus: "BYPASS",
      dataScope: "origin_enriched",
      upstreamStatus: "none",
      dataState: "estimated",
    });
  }

  try {
    return await respondWithPublicCache(
      request,
      env,
      ctx,
      requestContext,
      buildOriginBucket(userLocation?.lat, userLocation?.lon),
      async (dataVersion) => {
        const item = await buildCenterMobilityRuntime(slug, env, userLocation);

        if (!item) {
          return createApiErrorResponse(requestContext, {
            status: 404,
            error: "Center not found",
            detail: slug,
            errorType: "not_found",
            headers: buildNoStoreHeaders(),
            cacheStatus: "BYPASS",
            dataScope: "origin_enriched",
            upstreamStatus: "none",
            dataState: "fallback",
          });
        }

        const payload: GetCenterMobilityResponse = buildCenterMobilityResponsePayload(item);

        return createApiJsonResponse(requestContext, payload, {
          headers: buildPublicCacheControl(MOBILITY_CACHE_TTL_SECONDS),
          cacheStatus: "MISS",
          dataScope: "origin_enriched",
          upstreamStatus: buildMobilityUpstreamStatus(item),
          dataState: classifyMobilityDataState(item, dataVersion),
          dataVersion,
        });
      },
    );
  }
  catch (error) {
    return createApiErrorResponse(requestContext, {
      status: 500,
      error: "Internal server error",
      detail: error instanceof Error ? error.message : "center_mobility_failed",
      errorType: "internal_error",
      headers: buildNoStoreHeaders(),
      cacheStatus: "BYPASS",
      dataScope: "origin_enriched",
      upstreamStatus: "none",
      dataState: "estimated",
    });
  }
}

export async function handleGetCenterMobilitySummary(
  slug: string,
  env: WorkerEnv,
  ctx: ExecutionContext,
  request: Request,
  requestContext: ApiRequestContext,
): Promise<Response> {
  let userLocation: { lat: number; lon: number } | null = null;

  try {
    userLocation = parseUserLocationFromRequest(request);
  } catch (error) {
    return createApiErrorResponse(requestContext, {
      status: 400,
      error: "Invalid query parameters",
      detail: error instanceof Error ? error.message : "unknown_error",
      errorType: "validation_error",
      headers: buildNoStoreHeaders(),
      cacheStatus: "BYPASS",
      dataScope: "origin_enriched",
      upstreamStatus: "none",
      dataState: "estimated",
    });
  }

  try {
    return await respondWithPublicCache(
      request,
      env,
      ctx,
      requestContext,
      buildOriginBucket(userLocation?.lat, userLocation?.lon),
      async (dataVersion) => {
        const item = await buildCenterMobilityRuntime(slug, env, userLocation);

        if (!item) {
          return createApiErrorResponse(requestContext, {
            status: 404,
            error: "Center not found",
            detail: slug,
            errorType: "not_found",
            headers: buildNoStoreHeaders(),
            cacheStatus: "BYPASS",
            dataScope: "origin_enriched",
            upstreamStatus: "none",
            dataState: "fallback",
          });
        }

        const payload: GetCenterMobilitySummaryResponse =
          buildCenterMobilitySummaryResponsePayload({
            slug,
            item,
          });

        return createApiJsonResponse(requestContext, payload, {
          headers: buildPublicCacheControl(MOBILITY_CACHE_TTL_SECONDS),
          cacheStatus: "MISS",
          dataScope: "origin_enriched",
          upstreamStatus: buildMobilityUpstreamStatus(item),
          dataState: classifyMobilityDataState(item, dataVersion),
          dataVersion,
        });
      },
    );
  } catch (error) {
    return createApiErrorResponse(requestContext, {
      status: 500,
      error: "Internal server error",
      detail: error instanceof Error ? error.message : "center_mobility_summary_failed",
      errorType: "internal_error",
      headers: buildNoStoreHeaders(),
      cacheStatus: "BYPASS",
      dataScope: "origin_enriched",
      upstreamStatus: "none",
      dataState: "estimated",
    });
  }
}
