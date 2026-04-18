import type { EdgeEnv } from "../env";
import { buildAdminBootstrapResponse } from "./routes/admin";
import { buildHealthResponse } from "./routes/health";
import { buildPublicCatalogResponse } from "./routes/publicCatalog";
import { buildPublicBootstrapResponse } from "./routes/public";

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

function notFound(request: Request, env: EdgeEnv): Promise<Response> | Response {
  if (env.ASSETS) {
    const url = new URL(request.url);
    const hasExtension = /\.[a-z0-9]+$/i.test(url.pathname);

    if (request.method === "GET" && !url.pathname.startsWith("/api/") && !hasExtension) {
      return env.ASSETS.fetch(new Request(new URL("/", request.url), request));
    }

    return env.ASSETS.fetch(request);
  }

  return Response.json(
    {
      error: "not_found",
      message: "No route or static asset matched the request."
    },
    { status: 404 }
  );
}

export async function handleRequest(
  request: Request,
  env: EdgeEnv
): Promise<Response> {
  const startedAt = Date.now();
  const url = new URL(request.url);

  try {
    let response: Response;

    if (request.method === "GET" && url.pathname === "/api/health") {
      response = buildHealthResponse(env);
    } else if (request.method === "GET" && url.pathname === "/api/public/bootstrap") {
      response = buildPublicBootstrapResponse();
    } else if (request.method === "GET" && url.pathname === "/api/public/catalog") {
      response = await buildPublicCatalogResponse(env);
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
