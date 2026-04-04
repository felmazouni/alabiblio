import type { WorkerEnv } from "./lib/db";
import {
  handleGetCenterDetail,
  handleGetCenterSchedule,
  handleListCenters,
} from "./routes/centers";
import { handleApiNotFound, handleHealth } from "./routes/health";
import { handleGeocodeSearch } from "./routes/geocode";
import { handleGetCenterMobility } from "./routes/mobility";
import { handleGetOriginPresets } from "./routes/originPresets";

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        return handleHealth(request, env);
      }

      if (request.method === "GET" && url.pathname === "/api/centers") {
        return handleListCenters(request, env, ctx);
      }

      if (request.method === "GET" && url.pathname === "/api/geocode") {
        return handleGeocodeSearch(request, env);
      }

      if (request.method === "GET" && url.pathname === "/api/origin/presets") {
        return handleGetOriginPresets();
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/centers/")) {
        const nestedPath = decodeURIComponent(url.pathname.replace("/api/centers/", ""));

        if (nestedPath.endsWith("/schedule")) {
          const slug = nestedPath.replace(/\/schedule$/, "");

          if (slug === "") {
            return handleApiNotFound(request);
          }

          return handleGetCenterSchedule(slug, env, ctx, request);
        }

        if (nestedPath.endsWith("/mobility")) {
          const slug = nestedPath.replace(/\/mobility$/, "");

          if (slug === "") {
            return handleApiNotFound(request);
          }

          return handleGetCenterMobility(slug, env, ctx, request);
        }

        const slug = nestedPath;

        if (slug === "") {
          return handleApiNotFound(request);
        }

        return handleGetCenterDetail(slug, env, ctx, request);
      }

      if (url.pathname.startsWith("/api/")) {
        return handleApiNotFound(request);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("[worker_fetch_failed]", error);

      if (url.pathname.startsWith("/api/")) {
        return Response.json(
          {
            error: "Internal server error",
            detail: "worker_fetch_failed",
          },
          {
            status: 500,
            headers: {
              "cache-control": "no-store",
            },
          },
        );
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
