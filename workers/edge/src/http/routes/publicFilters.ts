import { loadPublicFilters } from "@alabiblio/application";
import type { PublicCatalogQuery } from "@alabiblio/contracts";
import type { EdgeEnv } from "../../env";

export async function buildPublicFiltersResponse(
  env: EdgeEnv,
  query: PublicCatalogQuery,
): Promise<Response> {
  const payload = await loadPublicFilters(env.DB, query);

  return Response.json(payload, {
    headers: {
      "cache-control": "public, max-age=300",
    },
  });
}
