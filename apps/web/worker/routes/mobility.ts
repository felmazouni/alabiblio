import type { GetCenterMobilityResponse } from "@alabiblio/contracts/mobility";
import {
  buildCenterMobility,
  type DecisionBicimadStation,
  type DecisionEmtStop,
  type DecisionMetroStation,
} from "@alabiblio/domain/mobility";
import { fetchEmtRealtimeForStopIds } from "@alabiblio/mobility/emtApi";
import { buildSchedulePayload } from "@alabiblio/schedule-engine";
import type { ActiveScheduleRecord } from "@alabiblio/schedule-engine/types";
import {
  getCenterBySlug,
  getCenterSerCoverageByCenterId,
  getLatestDataVersion,
  listActiveTransportNodesByKinds,
  listTransportNodesByCenterId,
  type WorkerEnv,
} from "../lib/db";
import {
  buildOriginTransportCandidates,
  groupDestinationTransportNodes,
} from "../lib/mobility";

const MOBILITY_CACHE_TTL_SECONDS = 15;

function buildPublicReadHeaders(dataVersion: string | null): HeadersInit {
  return {
    "cache-control": `public, max-age=${MOBILITY_CACHE_TTL_SECONDS}, s-maxage=${MOBILITY_CACHE_TTL_SECONDS}, stale-while-revalidate=${MOBILITY_CACHE_TTL_SECONDS}`,
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
  originBucket: string | null,
  buildResponse: (dataVersion: string | null) => Promise<Response>,
): Promise<Response> {
  const dataVersion = await getLatestDataVersion(env.DB);
  const cacheUrl = new URL(request.url);
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
    return cached;
  }

  const response = await buildResponse(dataVersion);

  if (response.ok) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
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

function groupRealtimeByStopId(arrivals: Awaited<ReturnType<typeof fetchEmtRealtimeForStopIds>>["arrivals"]) {
  const grouped = new Map<string, Awaited<ReturnType<typeof fetchEmtRealtimeForStopIds>>["arrivals"]>();

  for (const arrival of arrivals) {
    const current = grouped.get(arrival.stop_id) ?? [];
    current.push(arrival);
    grouped.set(arrival.stop_id, current);
  }

  return grouped;
}

export async function handleGetCenterMobility(
  slug: string,
  env: WorkerEnv,
  ctx: ExecutionContext,
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  let userLocation: { lat: number; lon: number } | null = null;

  try {
    const userLat = parseCoordinateParam(url.searchParams.get("user_lat"), {
      min: -90,
      max: 90,
    });
    const userLon = parseCoordinateParam(url.searchParams.get("user_lon"), {
      min: -180,
      max: 180,
    });
    userLocation =
      userLat !== undefined && userLon !== undefined
        ? {
            lat: userLat,
            lon: userLon,
          }
        : null;
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
      buildOriginBucket(userLocation?.lat, userLocation?.lon),
      async (dataVersion) => {
        const centerRecord = await getCenterBySlug(env.DB, slug);

        if (!centerRecord) {
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

        const [ser, nodeRows] = await Promise.all([
          getCenterSerCoverageByCenterId(env.DB, centerRecord.center.id),
          listTransportNodesByCenterId(env.DB, centerRecord.center.id),
        ]);
        const destination = groupDestinationTransportNodes(nodeRows);
        let originEmtStops: DecisionEmtStop[] = [];
        let originBicimadStations: DecisionBicimadStation[] = [];
        let originMetroStations: DecisionMetroStation[] = [];
        let realtimeByStopId = new Map<
          string,
          Awaited<ReturnType<typeof fetchEmtRealtimeForStopIds>>["arrivals"]
        >();
        let emtRealtimeStatus: Awaited<ReturnType<typeof fetchEmtRealtimeForStopIds>>["status"] = "unconfigured";
        let emtRealtimeFetchedAt: string | null = null;

        if (userLocation) {
          const activeTransportNodes = await listActiveTransportNodesByKinds(env.DB, [
            "emt_stop",
            "bicimad_station",
            "metro_station",
          ]);
          const originCandidates = buildOriginTransportCandidates({
            rows: activeTransportNodes,
            origin: userLocation,
          });
          originEmtStops = originCandidates.originEmtStops;
          originBicimadStations = originCandidates.originBicimadStations;
          originMetroStations = originCandidates.originMetroStations;
          const realtime = await fetchEmtRealtimeForStopIds(
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
          realtimeByStopId = groupRealtimeByStopId(realtime.arrivals);
          emtRealtimeStatus = realtime.status;
          emtRealtimeFetchedAt = new Date().toISOString();
        }

        const payload: GetCenterMobilityResponse = {
          item: buildCenterMobility({
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
            originEmtStops,
            destinationEmtStops: destination.destinationEmtStops,
            originBicimadStations,
            destinationBicimadStations: destination.destinationBicimadStations,
            originMetroStations,
            destinationMetroStations: destination.destinationMetroStations,
            destinationParkings: destination.destinationParkings,
            realtimeByStopId,
            emtRealtimeStatus,
            emtRealtimeFetchedAt,
            fetchedAt: new Date().toISOString(),
          }),
        };

        return Response.json(payload, {
          headers: buildPublicReadHeaders(dataVersion),
        });
      },
    );
  }
  catch (error) {
    return buildInternalErrorResponse("center_mobility_failed", error);
  }
}
