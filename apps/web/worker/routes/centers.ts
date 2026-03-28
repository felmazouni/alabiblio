import type { ListCentersResponse } from "@alabiblio/contracts/centers";
import { toCenterListItem } from "@alabiblio/domain/centers";
import { listCenters, type WorkerEnv } from "../lib/db";

export async function handleListCenters(
  _request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const centers = await listCenters(env.DB);
  const payload: ListCentersResponse = {
    items: centers.map(toCenterListItem),
    total: centers.length,
  };

  return Response.json(payload, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
