import { getLatestDataVersion, type WorkerEnv } from "./db";
import type { ApiRequestContext } from "./observability";
import { setOriginBucket, withApiHeaders } from "./observability";

export async function respondWithCentersPublicCache(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
  requestContext: ApiRequestContext,
  options: {
    originBucket?: string | null;
  },
  buildResponse: (dataVersion: string | null) => Promise<Response>,
): Promise<Response> {
  const dataVersion = await getLatestDataVersion(env.DB);
  const cacheUrl = new URL(request.url);

  if (options.originBucket !== undefined) {
    setOriginBucket(requestContext, options.originBucket);
  }

  cacheUrl.searchParams.set("__v", dataVersion ?? "none");
  if (options.originBucket) {
    cacheUrl.searchParams.set("__origin_bucket", options.originBucket);
    cacheUrl.searchParams.delete("user_lat");
    cacheUrl.searchParams.delete("user_lon");
  }

  const cacheKey = new Request(cacheUrl.toString(), request);
  const cached = await caches.default.match(cacheKey);

  if (cached) {
    return withApiHeaders(cached, requestContext, { cacheStatus: "HIT" });
  }

  const response = await buildResponse(dataVersion);
  const missResponse = withApiHeaders(response, requestContext, { cacheStatus: "MISS" });

  if (missResponse.ok) {
    ctx.waitUntil(caches.default.put(cacheKey, missResponse.clone()));
  }

  return missResponse;
}
