import { fetchEmtRealtimeForStopIds } from "@alabiblio/mobility/emtApi";
import { buildOriginTransportCandidates } from "./mobility";
import {
  listActiveTransportNodesByKinds,
  type ActiveTransportNodeRow,
  type WorkerEnv,
} from "./db";

const ORIGIN_NODE_CACHE_TTL_MS = 5 * 60 * 1000;

const activeNodesCache = new Map<
  string,
  { expiresAt: number; rows: ActiveTransportNodeRow[] }
>();

function buildCacheKey(kinds: string[]): string {
  return [...kinds].sort().join("|");
}

function buildEmtCredentials(env: WorkerEnv) {
  return env.EMT_CLIENT_ID ||
    env.EMT_PASS_KEY ||
    env.EMT_EMAIL ||
    env.EMT_PASSWORD
    ? {
        clientId: env.EMT_CLIENT_ID,
        passKey: env.EMT_PASS_KEY,
        email: env.EMT_EMAIL,
        password: env.EMT_PASSWORD,
      }
    : null;
}

function groupRealtimeByStopId(
  arrivals: Awaited<ReturnType<typeof fetchEmtRealtimeForStopIds>>["arrivals"],
) {
  const typedMap = new Map<
    string,
    Awaited<ReturnType<typeof fetchEmtRealtimeForStopIds>>["arrivals"]
  >();

  for (const arrival of arrivals) {
    const current = typedMap.get(arrival.stop_id) ?? [];
    current.push(arrival);
    typedMap.set(arrival.stop_id, current);
  }

  return typedMap;
}

async function getActiveTransportNodes(
  env: WorkerEnv,
  kinds: Array<"emt_stop" | "bicimad_station" | "metro_station">,
): Promise<ActiveTransportNodeRow[]> {
  const key = buildCacheKey(kinds);
  const cached = activeNodesCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.rows;
  }

  const rows = await listActiveTransportNodesByKinds(env.DB, kinds);
  activeNodesCache.set(key, {
    expiresAt: Date.now() + ORIGIN_NODE_CACHE_TTL_MS,
    rows,
  });

  return rows;
}

export async function loadOriginTransportContext(
  env: WorkerEnv,
  userLocation: { lat: number; lon: number } | null,
) {
  if (!userLocation) {
    return {
      originEmtStops: [],
      originBicimadStations: [],
      originMetroStations: [],
      realtimeByStopId: new Map(),
      emtRealtimeStatus: "unconfigured" as const,
      emtRealtimeFetchedAt: null as string | null,
    };
  }

  const activeTransportNodes = await getActiveTransportNodes(env, [
    "emt_stop",
    "bicimad_station",
    "metro_station",
  ]);
  const originCandidates = buildOriginTransportCandidates({
    rows: activeTransportNodes,
    origin: userLocation,
  });
  const realtimeResult = await fetchEmtRealtimeForStopIds(
    originCandidates.originEmtStops.map((stop) => stop.id),
    buildEmtCredentials(env),
  );

  return {
    originEmtStops: originCandidates.originEmtStops,
    originBicimadStations: originCandidates.originBicimadStations,
    originMetroStations: originCandidates.originMetroStations,
    realtimeByStopId: groupRealtimeByStopId(realtimeResult.arrivals),
    emtRealtimeStatus: realtimeResult.status,
    emtRealtimeFetchedAt: new Date().toISOString(),
  };
}
