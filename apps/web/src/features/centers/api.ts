import type {
  GetCenterDetailResponse,
  ListCentersQuery,
  ListCentersResponse,
} from "@alabiblio/contracts/centers";

function buildListCentersUrl(query: ListCentersQuery): string {
  const url = new URL("/api/centers", window.location.origin);

  if (query.kind) {
    url.searchParams.set("kind", query.kind);
  }

  if (query.q) {
    url.searchParams.set("q", query.q);
  }

  if (query.limit !== undefined) {
    url.searchParams.set("limit", String(query.limit));
  }

  if (query.offset !== undefined) {
    url.searchParams.set("offset", String(query.offset));
  }

  return url.pathname + url.search;
}

export async function fetchCenters(
  query: ListCentersQuery,
  signal?: AbortSignal,
): Promise<ListCentersResponse> {
  const response = await fetch(buildListCentersUrl(query), { signal });

  if (!response.ok) {
    throw new Error(`centers_list_${response.status}`);
  }

  return response.json() as Promise<ListCentersResponse>;
}

export async function fetchCenterDetail(
  slug: string,
  signal?: AbortSignal,
): Promise<GetCenterDetailResponse> {
  const response = await fetch(`/api/centers/${encodeURIComponent(slug)}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`center_detail_${response.status}`);
  }

  return response.json() as Promise<GetCenterDetailResponse>;
}
