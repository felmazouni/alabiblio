import type { WorkerEnv } from "./lib/db";
import {
  handleGetCenterDetail,
  handleGetCenterSchedule,
  handleListCenters,
} from "./routes/centers";
import { handleApiNotFound, handleHealth } from "./routes/health";

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return handleHealth(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/centers") {
      return handleListCenters(request, env);
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/centers/")) {
      const nestedPath = decodeURIComponent(url.pathname.replace("/api/centers/", ""));

      if (nestedPath.endsWith("/schedule")) {
        const slug = nestedPath.replace(/\/schedule$/, "");

        if (slug === "") {
          return handleApiNotFound(request);
        }

        return handleGetCenterSchedule(slug, env);
      }

      const slug = nestedPath;

      if (slug === "") {
        return handleApiNotFound(request);
      }

      return handleGetCenterDetail(slug, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return handleApiNotFound(request);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<WorkerEnv>;
