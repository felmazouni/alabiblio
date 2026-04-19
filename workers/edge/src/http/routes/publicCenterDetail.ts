import { loadPublicCenterDetail } from "@alabiblio/application";
import type { EdgeEnv } from "../../env";

export async function buildPublicCenterDetailResponse(
  env: EdgeEnv,
  slug: string,
  query: { lat?: number; lon?: number },
): Promise<Response> {
  const payload = await loadPublicCenterDetail(slug, env.DB, query);

  if (!payload) {
    return Response.json(
      {
        error: "center_not_found",
        message: "No center matched the requested slug.",
      },
      { status: 404 },
    );
  }

  return Response.json(payload, {
    headers: {
      "cache-control": "public, max-age=300",
    },
  });
}
