import { loadPublicCatalog } from "@alabiblio/application";
import type { EdgeEnv } from "../../env";

export async function buildPublicCatalogResponse(env: EdgeEnv): Promise<Response> {
  try {
    const payload = await loadPublicCatalog(env.DB);

    console.log(
      JSON.stringify({
        event: "catalog_response",
        env: env.APP_ENV,
        source_mode: payload.sourceMode,
        total: payload.total,
      }),
    );

    return Response.json(payload, {
      headers: {
        "cache-control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "catalog_error",
        env: env.APP_ENV,
        message: error instanceof Error ? error.message : "Unexpected catalog failure.",
      }),
    );

    return Response.json(
      {
        error: "catalog_unavailable",
        message: error instanceof Error ? error.message : "Unexpected catalog failure.",
      },
      { status: 503 },
    );
  }
}
