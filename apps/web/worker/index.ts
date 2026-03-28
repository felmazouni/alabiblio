import type { WorkerEnv } from "./lib/db";
import { handleListCenters } from "./routes/centers";
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

    if (url.pathname.startsWith("/api/")) {
      return handleApiNotFound(request);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<WorkerEnv>;
