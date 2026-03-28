import type { WorkerEnv } from "../lib/db";

const noStoreHeaders = {
  "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
  pragma: "no-cache",
  expires: "0",
};

export function handleHealth(_request: Request, env: WorkerEnv): Response {
  return Response.json(
    {
      ok: true,
      env: env.APP_ENV,
      timestamp: new Date().toISOString(),
    },
    {
      headers: noStoreHeaders,
    },
  );
}

export function handleApiNotFound(request: Request): Response {
  return Response.json(
    {
      error: "Not Found",
      path: new URL(request.url).pathname,
    },
    {
      status: 404,
      headers: noStoreHeaders,
    },
  );
}
