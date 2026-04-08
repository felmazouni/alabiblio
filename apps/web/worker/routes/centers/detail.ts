import type {
  GetCenterDetailResponse,
  GetCenterScheduleResponse,
} from "@alabiblio/contracts/centers";
import { respondWithCentersPublicCache } from "../../lib/centersCache";
import {
  buildCenterDetailUseCase,
  buildCenterScheduleUseCase,
  DETAIL_CACHE_TTL_SECONDS,
} from "../../lib/centersRuntime";
import type { WorkerEnv } from "../../lib/db";
import type { ApiRequestContext } from "../../lib/observability";
import {
  buildNoStoreHeaders,
  buildPublicCacheControl,
  classifyDataStateFromDataVersion,
  createApiErrorResponse,
  createApiJsonResponse,
} from "../../lib/observability";

export async function handleGetCenterDetail(
  slug: string,
  env: WorkerEnv,
  ctx: ExecutionContext,
  request: Request,
  requestContext: ApiRequestContext,
): Promise<Response> {
  try {
    return await respondWithCentersPublicCache(
      request,
      env,
      ctx,
      requestContext,
      {},
      async (dataVersion) => {
        const payload: GetCenterDetailResponse | null = await buildCenterDetailUseCase(env, slug);

        if (!payload) {
          return createApiErrorResponse(requestContext, {
            status: 404,
            error: "Center not found",
            detail: slug,
            errorType: "not_found",
            headers: buildNoStoreHeaders(),
            cacheStatus: "BYPASS",
            dataScope: "base_exploration",
            upstreamStatus: "none",
            dataState: "estimated",
          });
        }

        return createApiJsonResponse(requestContext, payload, {
          headers: buildPublicCacheControl(DETAIL_CACHE_TTL_SECONDS),
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
      detail: error instanceof Error ? error.message : "center_detail_failed",
      errorType: "internal_error",
      headers: buildNoStoreHeaders(),
      cacheStatus: "BYPASS",
      dataScope: "base_exploration",
      upstreamStatus: "none",
      dataState: "estimated",
    });
  }
}

export async function handleGetCenterSchedule(
  slug: string,
  env: WorkerEnv,
  ctx: ExecutionContext,
  request: Request,
  requestContext: ApiRequestContext,
): Promise<Response> {
  return respondWithCentersPublicCache(
    request,
    env,
    ctx,
    requestContext,
    {},
    async (dataVersion) => {
      const payload: GetCenterScheduleResponse | null = await buildCenterScheduleUseCase(env, slug);

      if (!payload) {
        return createApiErrorResponse(requestContext, {
          status: 404,
          error: "Center not found",
          detail: slug,
          errorType: "not_found",
          headers: buildNoStoreHeaders(),
          cacheStatus: "BYPASS",
          dataScope: "base_exploration",
          upstreamStatus: "none",
          dataState: "estimated",
        });
      }

      return createApiJsonResponse(requestContext, payload, {
        headers: buildPublicCacheControl(DETAIL_CACHE_TTL_SECONDS),
        cacheStatus: "MISS",
        dataScope: "base_exploration",
        upstreamStatus: "none",
        dataState: classifyDataStateFromDataVersion(dataVersion, "estimated"),
        dataVersion,
      });
    },
  );
}
