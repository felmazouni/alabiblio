import type {
  ApiCacheStatusV1,
  ApiDataStateV1,
  CenterComputationScope,
} from "@alabiblio/contracts/scopes";
import type {
  CenterMobility,
  CenterTopMobilityItem,
  MobilityRealtimeStatus,
} from "@alabiblio/contracts/mobility";
import { findSuspiciousTextEntries } from "../../../../packages/ingestion/src/text";

const REQUEST_ID_HEADER = "x-request-id";
const CACHE_STATUS_HEADER = "x-cache-status";
const DATA_SCOPE_HEADER = "x-data-scope";
const UPSTREAM_STATUS_HEADER = "x-upstream-status";
const DATA_STATE_HEADER = "x-data-state";
const ERROR_TYPE_HEADER = "x-error-type";
const STALE_DATA_THRESHOLD_MS = 48 * 60 * 60 * 1000;

export type ApiRouteName =
  | "health"
  | "api_not_found"
  | "list_centers"
  | "top_mobility_centers"
  | "center_detail"
  | "center_schedule"
  | "center_mobility"
  | "center_mobility_summary"
  | "geocode_search"
  | "origin_presets";

export type ApiErrorType =
  | "validation_error"
  | "not_found"
  | "internal_error"
  | "upstream_timeout"
  | "upstream_error"
  | "cache_error";

export interface ApiRequestContext {
  requestId: string;
  route: ApiRouteName;
  method: string;
  startedAt: number;
  path: string;
  originBucket: string | null;
  textSuspect: boolean;
  textSuspectCount: number;
}

type ApiResponseTelemetry = {
  cacheStatus?: ApiCacheStatusV1;
  dataScope?: CenterComputationScope | "not_applicable";
  upstreamStatus?: string;
  dataState?: ApiDataStateV1;
  dataVersion?: string | null;
  errorType?: ApiErrorType;
};

type ApiJsonResponseOptions = ApiResponseTelemetry & {
  status?: number;
  headers?: HeadersInit;
};

function buildApiHeaders(
  requestContext: ApiRequestContext,
  options: ApiResponseTelemetry & {
    headers?: HeadersInit;
  },
): Headers {
  const headers = new Headers(options.headers);

  headers.set(REQUEST_ID_HEADER, requestContext.requestId);
  headers.set(CACHE_STATUS_HEADER, options.cacheStatus ?? "BYPASS");

  if (options.dataScope) {
    headers.set(DATA_SCOPE_HEADER, options.dataScope);
  }

  headers.set(UPSTREAM_STATUS_HEADER, options.upstreamStatus ?? "none");

  if (options.dataState) {
    headers.set(DATA_STATE_HEADER, options.dataState);
  }

  if (options.dataVersion) {
    headers.set("x-data-version", options.dataVersion);
  }

  if (options.errorType) {
    headers.set(ERROR_TYPE_HEADER, options.errorType);
  }

  return headers;
}

function annotateMeta<T>(body: T, options: ApiResponseTelemetry): T {
  if (!body || typeof body !== "object" || !("meta" in body)) {
    return body;
  }

  const candidate = body as T & { meta?: Record<string, unknown> };
  if (!candidate.meta || typeof candidate.meta !== "object") {
    return body;
  }

  candidate.meta = {
    ...candidate.meta,
    ...(options.dataState ? { data_state: options.dataState } : {}),
    ...(options.upstreamStatus ? { upstream_status: options.upstreamStatus } : {}),
  };

  return candidate;
}

function logSuspiciousTextFindings(
  requestContext: ApiRequestContext,
  body: unknown,
): void {
  const findings = findSuspiciousTextEntries(body);

  if (findings.length === 0) {
    return;
  }

  requestContext.textSuspect = true;
  requestContext.textSuspectCount = findings.length;

  for (const finding of findings) {
    console.warn(
      JSON.stringify({
        request_id: requestContext.requestId,
        route: requestContext.route,
        method: requestContext.method,
        source: "response_body",
        field: finding.field,
        raw_snippet: finding.rawSnippet,
        text_suspect: true,
      }),
    );
  }
}

export function createApiRequestContext(
  request: Request,
  route: ApiRouteName,
): ApiRequestContext {
  return {
    requestId: crypto.randomUUID(),
    route,
    method: request.method,
    startedAt: Date.now(),
    path: new URL(request.url).pathname,
    originBucket: null,
    textSuspect: false,
    textSuspectCount: 0,
  };
}

function inferDataSource(
  route: ApiRouteName,
  upstreamStatus: string | null,
): string {
  switch (route) {
    case "health":
      return "internal";
    case "origin_presets":
      return "static";
    case "geocode_search":
      if (upstreamStatus?.includes("callejero:hit")) {
        return "d1_callejero";
      }
      if (upstreamStatus?.includes("nominatim:ok") || upstreamStatus?.includes("nominatim:timeout")) {
        return "upstream_nominatim";
      }
      return "geocode_mixed";
    case "list_centers":
    case "center_detail":
    case "center_schedule":
      return "d1";
    case "top_mobility_centers":
    case "center_mobility":
    case "center_mobility_summary":
      return "d1_plus_mobility";
    default:
      return "unknown";
  }
}

function inferRealtimeStatus(upstreamStatus: string | null): string {
  if (!upstreamStatus || upstreamStatus === "none") {
    return "none";
  }

  const statuses = upstreamStatus
    .split(";")
    .map((segment) => segment.split(":")[1] ?? "")
    .filter(Boolean);
  const distinct = [...new Set(statuses)];

  if (distinct.length === 0) {
    return "none";
  }

  return distinct.length === 1 ? distinct[0]! : distinct.join(",");
}

function countUpstreamFailures(upstreamStatus: string | null): number {
  if (!upstreamStatus || upstreamStatus === "none") {
    return 0;
  }

  return upstreamStatus
    .split(";")
    .map((segment) => segment.split(":")[1] ?? "")
    .filter((status) => status === "error" || status === "timeout")
    .length;
}

export function withRequestContext(
  request: Request,
  requestContext: ApiRequestContext,
): Request {
  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, requestContext.requestId);

  return new Request(request, {
    headers,
  });
}

export function setOriginBucket(
  requestContext: ApiRequestContext,
  originBucket: string | null,
): void {
  requestContext.originBucket = originBucket;
}

export function createApiJsonResponse<T>(
  requestContext: ApiRequestContext,
  body: T,
  options: ApiJsonResponseOptions = {},
): Response {
  const annotatedBody = annotateMeta(body, options);
  logSuspiciousTextFindings(requestContext, annotatedBody);

  return Response.json(annotatedBody, {
    status: options.status,
    headers: buildApiHeaders(requestContext, options),
  });
}

export function createApiErrorResponse(
  requestContext: ApiRequestContext,
  options: {
    status: number;
    error: string;
    detail: string;
    errorType: ApiErrorType;
    headers?: HeadersInit;
    cacheStatus?: ApiCacheStatusV1;
    dataScope?: CenterComputationScope | "not_applicable";
    upstreamStatus?: string;
    dataState?: ApiDataStateV1;
    dataVersion?: string | null;
  },
): Response {
  return Response.json(
    {
      error: options.error,
      detail: options.detail,
      error_type: options.errorType,
      request_id: requestContext.requestId,
    },
    {
      status: options.status,
      headers: buildApiHeaders(requestContext, {
        headers: options.headers,
        cacheStatus: options.cacheStatus ?? "BYPASS",
        dataScope: options.dataScope,
        upstreamStatus: options.upstreamStatus,
        dataState: options.dataState,
        dataVersion: options.dataVersion,
        errorType: options.errorType,
      }),
    },
  );
}

export function withApiHeaders(
  response: Response,
  requestContext: ApiRequestContext,
  options: ApiResponseTelemetry = {},
): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: buildApiHeaders(requestContext, {
      headers: response.headers,
      cacheStatus: options.cacheStatus
        ?? (response.headers.get(CACHE_STATUS_HEADER) as ApiCacheStatusV1 | null)
        ?? "BYPASS",
      dataScope: options.dataScope
        ?? (response.headers.get(DATA_SCOPE_HEADER) as CenterComputationScope | "not_applicable" | null)
        ?? undefined,
      upstreamStatus: options.upstreamStatus ?? response.headers.get(UPSTREAM_STATUS_HEADER) ?? undefined,
      dataState: options.dataState
        ?? (response.headers.get(DATA_STATE_HEADER) as ApiDataStateV1 | null)
        ?? undefined,
      dataVersion: options.dataVersion ?? response.headers.get("x-data-version"),
      errorType: options.errorType
        ?? (response.headers.get(ERROR_TYPE_HEADER) as ApiErrorType | null)
        ?? undefined,
    }),
  });
}

export function logApiResponse(
  requestContext: ApiRequestContext,
  response: Response,
): void {
  const upstreamStatus = response.headers.get(UPSTREAM_STATUS_HEADER) ?? "none";

  console.log(
    JSON.stringify({
      request_id: requestContext.requestId,
      route: requestContext.route,
      method: requestContext.method,
      origin_bucket: requestContext.originBucket,
      cache_status: response.headers.get(CACHE_STATUS_HEADER) ?? "BYPASS",
      upstream_status: upstreamStatus,
      data_source: inferDataSource(requestContext.route, upstreamStatus),
      realtime_status: inferRealtimeStatus(upstreamStatus),
      duration_ms: Date.now() - requestContext.startedAt,
      data_version: response.headers.get("x-data-version"),
      data_scope: response.headers.get(DATA_SCOPE_HEADER),
      data_state: response.headers.get(DATA_STATE_HEADER),
      error_type: response.headers.get(ERROR_TYPE_HEADER),
      text_suspect: requestContext.textSuspect,
      text_suspect_count: requestContext.textSuspectCount,
      upstream_failure_count: countUpstreamFailures(upstreamStatus),
      status: response.status,
    }),
  );
}

export function buildPublicCacheControl(ttlSeconds: number): HeadersInit {
  return {
    "cache-control": `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`,
  };
}

export function buildNoStoreHeaders(): HeadersInit {
  return {
    "cache-control": "no-store",
  };
}

function classifyFreshness(dataVersion: string | null): ApiDataStateV1 | null {
  if (!dataVersion) {
    return null;
  }

  const parsed = Date.parse(dataVersion);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Date.now() - parsed > STALE_DATA_THRESHOLD_MS ? "stale" : null;
}

function isRealtimeStatusAvailable(status: MobilityRealtimeStatus): boolean {
  return status === "available";
}

export function classifyDataStateFromDataVersion(
  dataVersion: string | null,
  fallbackState: Exclude<ApiDataStateV1, "stale">,
): ApiDataStateV1 {
  return classifyFreshness(dataVersion) ?? fallbackState;
}

export function classifyMobilityDataState(
  mobility: CenterMobility,
  dataVersion: string | null,
): ApiDataStateV1 {
  const freshnessState = classifyFreshness(dataVersion);
  if (freshnessState) {
    return freshnessState;
  }

  if (
    isRealtimeStatusAvailable(mobility.realtime.emt_realtime_status) ||
    isRealtimeStatusAvailable(mobility.realtime.bicimad_realtime_status)
  ) {
    return "realtime";
  }

  if (
    mobility.origin.available === false ||
    mobility.summary.best_mode === "walk" ||
    mobility.summary.rationale.includes("Fallback andando")
  ) {
    return "fallback";
  }

  return "estimated";
}

function summarizeStatuses(statuses: string[]): string {
  const distinct = [...new Set(statuses.filter(Boolean))];
  if (distinct.length === 0) {
    return "none";
  }

  return distinct.length === 1 ? distinct[0]! : "mixed";
}

export function buildMobilityUpstreamStatus(mobility: CenterMobility): string {
  return [
    `emt:${mobility.realtime.emt_realtime_status}`,
    `bicimad:${mobility.realtime.bicimad_realtime_status}`,
    `metro:${mobility.realtime.metro_realtime_status}`,
  ].join(";");
}

export function buildTopMobilityUpstreamStatus(
  items: CenterTopMobilityItem[],
): string {
  const emtStatuses = items.map((item) => item.item.realtime.emt_realtime_status);
  const bicimadStatuses = items.map((item) => item.item.realtime.bicimad_realtime_status);
  const metroStatuses = items.map((item) => item.item.realtime.metro_realtime_status);

  return [
    `emt:${summarizeStatuses(emtStatuses)}`,
    `bicimad:${summarizeStatuses(bicimadStatuses)}`,
    `metro:${summarizeStatuses(metroStatuses)}`,
  ].join(";");
}
