import assert from "node:assert/strict";

type HealthResponse = {
  ok: boolean;
  env: string;
  timestamp: string;
};

type CentersListResponse = {
  items: Array<{
    slug: string;
    schedule_confidence_label: "high" | "medium" | "low";
  }>;
  total: number;
  limit: number;
  offset: number;
};

type CenterDetailResponse = {
  item: {
    slug: string;
    schedule: {
      schedule_confidence_label: "high" | "medium" | "low";
    };
  };
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  assert.equal(response.ok, true, `Request failed: ${url} -> ${response.status}`);
  assert.match(
    response.headers.get("content-type") ?? "",
    /application\/json/i,
    `Expected JSON content-type for ${url}`,
  );

  return (await response.json()) as T;
}

async function main() {
  const baseUrl = process.argv[2];

  assert.ok(baseUrl, "Usage: tsx scripts/smoke-public.ts <baseUrl>");

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const health = await fetchJson<HealthResponse>(
    `${normalizedBaseUrl}/api/health`,
  );
  assert.equal(health.ok, true, "Health endpoint must return ok=true");

  const list = await fetchJson<CentersListResponse>(
    `${normalizedBaseUrl}/api/centers?limit=1`,
  );
  assert.ok(list.total > 0, "Centers list must return at least one item");
  assert.ok(list.items.length > 0, "Centers list must include one item");

  const slug = list.items[0]?.slug;
  assert.ok(slug, "First center slug is required");

  const detail = await fetchJson<CenterDetailResponse>(
    `${normalizedBaseUrl}/api/centers/${encodeURIComponent(slug)}`,
  );
  assert.equal(detail.item.slug, slug, "Center detail must match list slug");

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl: normalizedBaseUrl,
        checked: [
          "/api/health",
          "/api/centers?limit=1",
          `/api/centers/${slug}`,
        ],
      },
      null,
      2,
    ),
  );
}

void main();
