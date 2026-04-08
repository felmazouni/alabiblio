import type { GetTopMobilityCentersResponse } from "@alabiblio/contracts/mobility";
import { buildOriginBucket, parseListCentersQuery } from "../../lib/centersQuery";
import { respondWithCentersPublicCache } from "../../lib/centersCache";
import { buildTopMobilityCentersResponsePayload } from "../../lib/centerPayloads";
import {
  buildTopMobilityCentersUseCase,
  DEFAULT_CENTERS_LIMIT,
  MAX_LIMIT,
  TOP_MOBILITY_CACHE_TTL_SECONDS,
} from "../../lib/centersRuntime";
import type { WorkerEnv } from "../../lib/db";
import type { ApiRequestContext } from "../../lib/observability";
import {
  buildNoStoreHeaders,
  buildPublicCacheControl,
  buildTopMobilityUpstreamStatus,
  classifyDataStateFromDataVersion,
  classifyMobilityDataState,
  createApiErrorResponse,
  createApiJsonResponse,
  setOriginBucket,
} from "../../lib/observability";

export async function handleGetTopMobilityCenters(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
  requestContext: ApiRequestContext,
): Promise<Response> {
  const url = new URL(request.url);
  let query: ReturnType<typeof parseListCentersQuery>;

  try {
    query = parseListCentersQuery(url, {
      limit: DEFAULT_CENTERS_LIMIT,
      maxLimit: MAX_LIMIT,
    });
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

  const userLocation =
    query.user_lat !== undefined && query.user_lon !== undefined
      ? { lat: query.user_lat, lon: query.user_lon }
      : null;
  const originBucket = buildOriginBucket(query.user_lat, query.user_lon);
  setOriginBucket(requestContext, originBucket);

  if (!userLocation) {
    const emptyPayload: GetTopMobilityCentersResponse = buildTopMobilityCentersResponsePayload({
      items: [],
      open_count: 0,
    });

    return createApiJsonResponse(requestContext, emptyPayload, {
      headers: buildNoStoreHeaders(),
      cacheStatus: "BYPASS",
      dataScope: "origin_enriched",
      upstreamStatus: "origin:missing",
      dataState: "fallback",
    });
  }

  try {
    return await respondWithCentersPublicCache(
      request,
      env,
      ctx,
      requestContext,
      {
        originBucket,
      },
      async (dataVersion) => {
        const payload = await buildTopMobilityCentersUseCase(env, query, userLocation);

        return createApiJsonResponse(requestContext, payload, {
          headers: buildPublicCacheControl(TOP_MOBILITY_CACHE_TTL_SECONDS),
          cacheStatus: "MISS",
          dataScope: "origin_enriched",
          upstreamStatus: buildTopMobilityUpstreamStatus(payload.items),
          dataState:
            payload.items[0]
              ? classifyMobilityDataState(payload.items[0].item, dataVersion)
              : classifyDataStateFromDataVersion(dataVersion, "fallback"),
          dataVersion,
        });
      },
    );
  } catch (error) {
    return createApiErrorResponse(requestContext, {
      status: 500,
      error: "Internal server error",
      detail: error instanceof Error ? error.message : "top_mobility_failed",
      errorType: "internal_error",
      headers: buildNoStoreHeaders(),
      cacheStatus: "BYPASS",
      dataScope: "origin_enriched",
      upstreamStatus: "none",
      dataState: "estimated",
    });
  }
}
