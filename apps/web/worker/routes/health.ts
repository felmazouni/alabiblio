import type { WorkerEnv } from "../lib/db";
import type { ApiRequestContext } from "../lib/observability";
import {
  buildNoStoreHeaders,
  createApiErrorResponse,
  createApiJsonResponse,
} from "../lib/observability";

const noStoreHeaders = {
  "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
  pragma: "no-cache",
  expires: "0",
};

export function handleHealth(
  _request: Request,
  env: WorkerEnv,
  requestContext: ApiRequestContext,
): Response {
  return createApiJsonResponse(
    requestContext,
    {
      ok: true,
      env: env.APP_ENV,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        ...buildNoStoreHeaders(),
        ...noStoreHeaders,
      },
      cacheStatus: "BYPASS",
      dataScope: "not_applicable",
      upstreamStatus: "none",
      dataState: "estimated",
    },
  );
}

export function handleApiNotFound(
  request: Request,
  requestContext: ApiRequestContext,
): Response {
  return createApiErrorResponse(
    requestContext,
    {
      error: "Not Found",
      detail: new URL(request.url).pathname,
      errorType: "not_found",
      status: 404,
      headers: {
        ...buildNoStoreHeaders(),
        ...noStoreHeaders,
      },
      cacheStatus: "BYPASS",
      dataScope: "not_applicable",
      upstreamStatus: "none",
      dataState: "estimated",
    },
  );
}
