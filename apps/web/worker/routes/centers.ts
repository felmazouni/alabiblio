import type {
  GetCenterDetailResponse,
  ListCentersQuery,
  ListCentersResponse,
} from "@alabiblio/contracts/centers";
import { toCenterDetailItem, toCenterListItem } from "@alabiblio/domain/centers";
import { getCenterBySlug, listCenters, type WorkerEnv } from "../lib/db";

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

function parseListCentersQuery(url: URL): Required<Pick<ListCentersQuery, "limit" | "offset">> &
  Pick<ListCentersQuery, "kind" | "q"> {
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
    const payload: ListCentersResponse = {
      items: centers.items.map(toCenterListItem),
      total: centers.total,
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
      record.rawScheduleText,
      record.sources,
    ),
  };

  return Response.json(payload, {
    headers: JSON_HEADERS,
  });
}
