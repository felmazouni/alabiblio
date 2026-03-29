import type {
  GetCenterDetailResponse,
  GetCenterScheduleResponse,
  ListCentersQuery,
  ListCentersResponse,
} from "@alabiblio/contracts/centers";
import { toCenterDetailItem, toCenterListItem } from "@alabiblio/domain/centers";
import { buildSchedulePayload } from "@alabiblio/schedule-engine/index";
import {
  getCenterBySlug,
  listCenters,
  loadActiveSchedulesByCenterIds,
  type WorkerEnv,
} from "../lib/db";

const JSON_HEADERS = {
  "cache-control": "no-store",
};

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

function parseIntegerParam(
  value: string | null,
  fallback: number,
  { min, max }: { min: number; max: number },
): number {
  if (value === null) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error("invalid_integer");
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error("invalid_integer_range");
  }

  return parsed;
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  throw new Error("invalid_boolean");
}

function parseListCentersQuery(
  url: URL,
): Required<Pick<ListCentersQuery, "limit" | "offset">> &
  Pick<
    ListCentersQuery,
    "kind" | "q" | "open_now" | "has_wifi" | "accessible" | "open_air"
  > {
  const kind = url.searchParams.get("kind");
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = parseIntegerParam(url.searchParams.get("limit"), DEFAULT_LIMIT, {
    min: 1,
    max: MAX_LIMIT,
  });
  const offset = parseIntegerParam(url.searchParams.get("offset"), 0, {
    min: 0,
    max: 5000,
  });

  if (kind !== null && kind !== "study_room" && kind !== "library") {
    throw new Error("invalid_kind");
  }

  return {
    kind: kind ?? undefined,
    q: q === "" ? undefined : q,
    limit,
    offset,
    open_now: parseBooleanParam(url.searchParams.get("open_now")),
    has_wifi: parseBooleanParam(url.searchParams.get("has_wifi")),
    accessible: parseBooleanParam(url.searchParams.get("accessible")),
    open_air: parseBooleanParam(url.searchParams.get("open_air")),
  };
}

export async function handleListCenters(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const url = new URL(request.url);

  try {
    const query = parseListCentersQuery(url);
    const centers = await listCenters(env.DB, query);
    const scheduleMap = await loadActiveSchedulesByCenterIds(
      env.DB,
      centers.map((center) => center.id),
    );
    const items = centers
      .map((center) => {
        const schedule = buildSchedulePayload(scheduleMap.get(center.id) ?? null);
        return toCenterListItem(center, schedule);
      })
      .filter((item) =>
        query.open_now === undefined ? true : item.is_open_now === query.open_now,
      );
    const payload: ListCentersResponse = {
      items: items.slice(query.offset, query.offset + query.limit),
      total: items.length,
      limit: query.limit,
      offset: query.offset,
    };

    return Response.json(payload, {
      headers: JSON_HEADERS,
    });
  } catch (error) {
    return Response.json(
      {
        error: "Invalid query parameters",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      {
        status: 400,
        headers: JSON_HEADERS,
      },
    );
  }
}

export async function handleGetCenterDetail(
  slug: string,
  env: WorkerEnv,
): Promise<Response> {
  const record = await getCenterBySlug(env.DB, slug);

  if (!record) {
    return Response.json(
      {
        error: "Center not found",
      },
      {
        status: 404,
        headers: JSON_HEADERS,
      },
    );
  }

  const payload: GetCenterDetailResponse = {
    item: toCenterDetailItem(
      record.center,
      buildSchedulePayload(record.schedule),
      record.sources,
    ),
  };

  return Response.json(payload, {
    headers: JSON_HEADERS,
  });
}

export async function handleGetCenterSchedule(
  slug: string,
  env: WorkerEnv,
): Promise<Response> {
  const record = await getCenterBySlug(env.DB, slug);

  if (!record) {
    return Response.json(
      {
        error: "Center not found",
      },
      {
        status: 404,
        headers: JSON_HEADERS,
      },
    );
  }

  const payload: GetCenterScheduleResponse = {
    item: buildSchedulePayload(record.schedule),
  };

  return Response.json(payload, {
    headers: JSON_HEADERS,
  });
}
