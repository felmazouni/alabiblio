import type { WorkerEnv } from "./lib/db";
import {
  handleGetCenterDetail,
  handleGetCenterSchedule,
  handleGetTopMobilityCenters,
  handleListCenters,
} from "./routes/centers";
import { handleApiNotFound, handleHealth } from "./routes/health";
import { handleGeocodeSearch } from "./routes/geocode";
import { handleGetCenterMobility, handleGetCenterMobilitySummary } from "./routes/mobility";
import { handleGetOriginPresets } from "./routes/originPresets";
import {
  buildNoStoreHeaders,
  createApiErrorResponse,
  createApiRequestContext,
  logApiResponse,
  type ApiRequestContext,
  type ApiRouteName,
  withApiHeaders,
  withRequestContext,
} from "./lib/observability";

async function runApiRoute(
  request: Request,
  route: ApiRouteName,
  handler: (request: Request, requestContext: ApiRequestContext) => Promise<Response> | Response,
): Promise<Response> {
  const requestContext = createApiRequestContext(request, route);
  const requestWithContext = withRequestContext(request, requestContext);

  try {
    const response = await handler(requestWithContext, requestContext);
    const observedResponse = withApiHeaders(response, requestContext);
    logApiResponse(requestContext, observedResponse);
    return observedResponse;
  } catch (error) {
    const errorResponse = createApiErrorResponse(requestContext, {
      status: 500,
      error: "Internal server error",
      detail: error instanceof Error ? error.message : `${route}_failed`,
      errorType: "internal_error",
      headers: buildNoStoreHeaders(),
      cacheStatus: "BYPASS",
      dataScope: "not_applicable",
      upstreamStatus: "none",
      dataState: "estimated",
    });
    logApiResponse(requestContext, errorResponse);
    return errorResponse;
  }
}

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        return runApiRoute(request, "health", (requestWithContext, requestContext) =>
          handleHealth(requestWithContext, env, requestContext)
        );
      }

      if (request.method === "GET" && url.pathname === "/api/centers") {
        return runApiRoute(request, "list_centers", (requestWithContext, requestContext) =>
          handleListCenters(requestWithContext, env, ctx, requestContext)
        );
      }

      if (request.method === "GET" && url.pathname === "/api/centers/top-mobility") {
        return runApiRoute(request, "top_mobility_centers", (requestWithContext, requestContext) =>
          handleGetTopMobilityCenters(requestWithContext, env, ctx, requestContext)
        );
      }

      if (request.method === "GET" && url.pathname === "/api/geocode") {
        return runApiRoute(request, "geocode_search", (requestWithContext, requestContext) =>
          handleGeocodeSearch(requestWithContext, env, requestContext)
        );
      }

      if (request.method === "GET" && url.pathname === "/api/origin/presets") {
        return runApiRoute(request, "origin_presets", (_requestWithContext, requestContext) =>
          handleGetOriginPresets(requestContext)
        );
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/centers/")) {
        const nestedPath = decodeURIComponent(url.pathname.replace("/api/centers/", ""));

        if (nestedPath.endsWith("/schedule")) {
          const slug = nestedPath.replace(/\/schedule$/, "");

          if (slug === "") {
            return runApiRoute(request, "api_not_found", (requestWithContext, requestContext) =>
              handleApiNotFound(requestWithContext, requestContext)
            );
          }

          return runApiRoute(request, "center_schedule", (requestWithContext, requestContext) =>
            handleGetCenterSchedule(slug, env, ctx, requestWithContext, requestContext)
          );
        }

        if (nestedPath.endsWith("/mobility")) {
          const slug = nestedPath.replace(/\/mobility$/, "");

          if (slug === "") {
            return runApiRoute(request, "api_not_found", (requestWithContext, requestContext) =>
              handleApiNotFound(requestWithContext, requestContext)
            );
          }

          return runApiRoute(request, "center_mobility", (requestWithContext, requestContext) =>
            handleGetCenterMobility(slug, env, ctx, requestWithContext, requestContext)
          );
        }

        if (nestedPath.endsWith("/transport")) {
          const slug = nestedPath.replace(/\/transport$/, "");

          if (slug === "") {
            return runApiRoute(request, "api_not_found", (requestWithContext, requestContext) =>
              handleApiNotFound(requestWithContext, requestContext)
            );
          }

          return runApiRoute(request, "center_mobility", (requestWithContext, requestContext) =>
            handleGetCenterMobility(slug, env, ctx, requestWithContext, requestContext)
          );
        }

        if (nestedPath.endsWith("/mobility-summary")) {
          const slug = nestedPath.replace(/\/mobility-summary$/, "");

          if (slug === "") {
            return runApiRoute(request, "api_not_found", (requestWithContext, requestContext) =>
              handleApiNotFound(requestWithContext, requestContext)
            );
          }

          return runApiRoute(request, "center_mobility_summary", (requestWithContext, requestContext) =>
            handleGetCenterMobilitySummary(slug, env, ctx, requestWithContext, requestContext)
          );
        }

        const slug = nestedPath;

        if (slug === "") {
          return runApiRoute(request, "api_not_found", (requestWithContext, requestContext) =>
            handleApiNotFound(requestWithContext, requestContext)
          );
        }

        return runApiRoute(request, "center_detail", (requestWithContext, requestContext) =>
          handleGetCenterDetail(slug, env, ctx, requestWithContext, requestContext)
        );
      }

      if (url.pathname.startsWith("/api/")) {
        return runApiRoute(request, "api_not_found", (requestWithContext, requestContext) =>
          handleApiNotFound(requestWithContext, requestContext)
        );
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      if (url.pathname.startsWith("/api/")) {
        const requestContext = createApiRequestContext(request, "api_not_found");
        const errorResponse = createApiErrorResponse(requestContext, {
          status: 500,
          error: "Internal server error",
          detail: error instanceof Error ? error.message : "worker_fetch_failed",
          errorType: "internal_error",
          headers: buildNoStoreHeaders(),
          cacheStatus: "BYPASS",
          dataScope: "not_applicable",
          upstreamStatus: "none",
          dataState: "estimated",
        });
        logApiResponse(requestContext, errorResponse);
        return errorResponse;
      }

      return new Response("Internal server error", {
        status: 500,
        headers: {
          "cache-control": "no-store",
        },
      });
    }
  },
} satisfies ExportedHandler<WorkerEnv>;
