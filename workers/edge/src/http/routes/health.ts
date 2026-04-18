import type { EdgeEnv } from "../../env";

export function buildHealthResponse(env: EdgeEnv): Response {
  return Response.json({
    app: "alabiblio",
    env: env.APP_ENV,
    status: "ok",
    timestamp: new Date().toISOString()
  });
}

