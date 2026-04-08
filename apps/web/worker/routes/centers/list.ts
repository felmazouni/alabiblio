import type { ListCentersResponse } from "@alabiblio/contracts/centers";
import { buildOriginBucket, parseListCentersQuery } from "../../lib/centersQuery";
import { respondWithCentersPublicCache } from "../../lib/centersCache";
import {
  buildListCentersUseCase,
  DEFAULT_CENTERS_LIMIT,
  LIST_CACHE_TTL_SECONDS,
  MAX_LIMIT,
} from "../../lib/centersRuntime";
import type { WorkerEnv } from "../../lib/db";
import type { ApiRequestContext } from "../../lib/observability";
import {
  buildNoStoreHeaders,
  buildPublicCacheControl,
  classifyDataStateFromDataVersion,
  createApiErrorResponse,
  createApiJsonResponse,
  setOriginBucket,
} from "../../lib/observability";

export async function handleListCenters(
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
      dataScope: "base_exploration",
      upstreamStatus: "none",
      dataState: "estimated",
    });
  }

  setOriginBucket(requestContext, buildOriginBucket(query.user_lat, query.user_lon));

  try {
    return await respondWithCentersPublicCache(
      request,
      env,
      ctx,
      requestContext,
      {},
      async (dataVersion) => {
        const payload: ListCentersResponse = await buildListCentersUseCase(env, query);

        return createApiJsonResponse(requestContext, payload, {
          headers: buildPublicCacheControl(LIST_CACHE_TTL_SECONDS),
          cacheStatus: "MISS",
          dataScope: "base_exploration",
          upstreamStatus: "none",
          dataState: classifyDataStateFromDataVersion(dataVersion, "estimated"),
          dataVersion,
        });
      },
    );
  } catch (error) {
    return createApiErrorResponse(requestContext, {
      status: 500,
      error: "Internal server error",
      detail: error instanceof Error ? error.message : "list_centers_failed",
      errorType: "internal_error",
      headers: buildNoStoreHeaders(),
      cacheStatus: "BYPASS",
      dataScope: "base_exploration",
      upstreamStatus: "none",
      dataState: "estimated",
    });
  }
}
