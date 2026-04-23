import type { EdgeEnv } from "../env";
import { parsePublicCatalogQuery } from "./query";
import { buildAdminBootstrapResponse } from "./routes/admin";
import { buildHealthResponse } from "./routes/health";
import { buildPublicBootstrapResponse } from "./routes/public";
import { buildPublicBicimadAvailabilityResponse } from "./routes/publicBicimadAvailability";
import { buildCallejeroAutocompleteResponse } from "./routes/publicCallejero";
import { buildPublicCatalogResponse } from "./routes/publicCatalog";
import { buildPublicCenterDetailResponse } from "./routes/publicCenterDetail";
import { buildPublicFiltersResponse } from "./routes/publicFilters";
import {
  buildPublicCenterRatingsResponse,
  buildPublicGoogleAuthConfigResponse,
  buildSubmitPublicCenterRatingResponse,
} from "./routes/publicRatings";

function logRequest(
  request: Request,
  response: Response,
  durationMs: number,
  env: EdgeEnv,
): void {
  const url = new URL(request.url);

  console.log(
    JSON.stringify({
      event: "request",
      env: env.APP_ENV,
      method: request.method,
      path: url.pathname,
      status: response.status,
      duration_ms: durationMs,
    }),
  );
}

async function notFound(request: Request, env: EdgeEnv): Promise<Response> {
  if (env.ASSETS) {
    const url = new URL(request.url);
    const hasExtension = /\.[a-z0-9]+$/i.test(url.pathname);

    if (request.method === "GET" && !url.pathname.startsWith("/api/") && !hasExtension) {
      const rootResponse = await env.ASSETS.fetch(
        new Request(new URL("/", request.url), request),
      );

      if (rootResponse.status !== 404) {
        return rootResponse;
      }

      return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    }

    return env.ASSETS.fetch(request);
  }

  return Response.json(
    {
      error: "not_found",
      message: "No route or static asset matched the request.",
    },
    { status: 404 },
  );
}

export async function handleRequest(
  request: Request,
  env: EdgeEnv,
  ctx?: { waitUntil: (p: Promise<unknown>) => void },
): Promise<Response> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const catalogQuery = parsePublicCatalogQuery(url);
  const waitUntil = ctx ? (p: Promise<unknown>) => ctx.waitUntil(p) : undefined;

  try {
    let response: Response;

    if (request.method === "GET" && url.pathname === "/api/health") {
      response = await buildHealthResponse(env);
    } else if (request.method === "GET" && url.pathname === "/api/public/bootstrap") {
      response = buildPublicBootstrapResponse();
    } else if (request.method === "GET" && url.pathname === "/api/public/auth/google/config") {
      response = buildPublicGoogleAuthConfigResponse(env);
    } else if (request.method === "GET" && url.pathname === "/api/public/catalog") {
      response = await buildPublicCatalogResponse(env, catalogQuery, waitUntil);
    } else if (request.method === "GET" && url.pathname === "/api/public/transport/bicimad/availability") {
      const stationId = url.searchParams.get("station_id") ?? "";
      const stationName = url.searchParams.get("station_name") ?? "";
      response = await buildPublicBicimadAvailabilityResponse(env, stationId, stationName);
    } else if (request.method === "GET" && url.pathname === "/api/public/callejero/autocomplete") {
      const q = url.searchParams.get("q") ?? "";
      response = await buildCallejeroAutocompleteResponse(q);
    } else if (request.method === "GET" && url.pathname === "/api/public/filters") {
      response = await buildPublicFiltersResponse(env, catalogQuery, waitUntil);
    } else if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/public/centers/") &&
      url.pathname.endsWith("/ratings")
    ) {
      const slug = decodeURIComponent(
        url.pathname.replace("/api/public/centers/", "").replace("/ratings", ""),
      );
      response = await buildPublicCenterRatingsResponse(env, slug, request);
    } else if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/public/centers/") &&
      url.pathname.endsWith("/ratings")
    ) {
      const slug = decodeURIComponent(
        url.pathname.replace("/api/public/centers/", "").replace("/ratings", ""),
      );
      response = await buildSubmitPublicCenterRatingResponse(env, slug, request);
    } else if (request.method === "GET" && url.pathname.startsWith("/api/public/centers/")) {
      const slug = decodeURIComponent(url.pathname.replace("/api/public/centers/", ""));
      response = await buildPublicCenterDetailResponse(env, slug, {
        lat: catalogQuery.lat,
        lon: catalogQuery.lon,
      });
    } else if (request.method === "GET" && url.pathname === "/api/admin/bootstrap") {
      response = buildAdminBootstrapResponse();
    } else {
      response = await notFound(request, env);
    }

    logRequest(request, response, Date.now() - startedAt, env);
    return response;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "request_error",
        env: env.APP_ENV,
        method: request.method,
        path: url.pathname,
        duration_ms: Date.now() - startedAt,
        message: error instanceof Error ? error.message : "Unexpected request failure.",
      }),
    );

    const response = Response.json(
      {
        error: "internal_error",
        message: "Unexpected worker failure.",
      },
      { status: 500 },
    );

    logRequest(request, response, Date.now() - startedAt, env);
    return response;
  }
}
