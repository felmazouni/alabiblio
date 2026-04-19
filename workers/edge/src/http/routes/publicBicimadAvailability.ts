import type { DataOrigin } from "@alabiblio/contracts";
import type { EdgeEnv } from "../../env";

interface BicimadAvailabilityPayload {
  stationId: string;
  bikesAvailable: number | null;
  docksAvailable: number | null;
  dataOrigin: DataOrigin;
  sourceLabel: string;
  fetchedAt: string | null;
  note: string | null;
}

interface GbfsFeedIndex {
  data?: {
    es?: { feeds?: Array<{ name?: string; url?: string }> };
    feeds?: Array<{ name?: string; url?: string }>;
  };
}

interface GbfsStationInformation {
  data?: {
    stations?: Array<{
      station_id?: string;
      short_name?: string;
      obcn?: string;
      name?: string;
    }>;
  };
}

interface GbfsStationStatus {
  data?: {
    stations?: Array<{
      station_id?: string;
      num_bikes_available?: number;
      num_docks_available?: number;
    }>;
  };
}

function payloadResponse(payload: BicimadAvailabilityPayload, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function readNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const rawValue = record[key];
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      return rawValue;
    }

    if (typeof rawValue === "string" && rawValue.trim() !== "") {
      const parsed = Number(rawValue);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function parseAvailabilityBody(body: unknown): { bikesAvailable: number | null; docksAvailable: number | null } {
  if (!body || typeof body !== "object") {
    return { bikesAvailable: null, docksAvailable: null };
  }

  const objectBody = body as Record<string, unknown>;
  const possibleRecords: Array<Record<string, unknown>> = [];

  const topLevelData = objectBody.data;
  if (Array.isArray(topLevelData)) {
    for (const dataEntry of topLevelData) {
      if (dataEntry && typeof dataEntry === "object") {
        possibleRecords.push(dataEntry as Record<string, unknown>);

        const stations = (dataEntry as Record<string, unknown>).stations;
        if (Array.isArray(stations)) {
          for (const station of stations) {
            if (station && typeof station === "object") {
              possibleRecords.push(station as Record<string, unknown>);
            }
          }
        }
      }
    }
  }

  possibleRecords.push(objectBody);

  for (const record of possibleRecords) {
    const bikesAvailable = readNumber(record, [
      "dockBikes",
      "dock_bikes",
      "availableBikes",
      "available_bikes",
      "bikes",
      "bikesAvailable",
    ]);

    const docksAvailable = readNumber(record, [
      "freeBases",
      "free_bases",
      "availableDocks",
      "available_docks",
      "docks",
      "docksAvailable",
    ]);

    if (bikesAvailable !== null || docksAvailable !== null) {
      return { bikesAvailable, docksAvailable };
    }
  }

  return { bikesAvailable: null, docksAvailable: null };
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function stationCodeFromName(stationName: string): string | null {
  const matched = stationName.match(/^(\d+)\s*[-:]/);
  return matched?.[1] ?? null;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

async function fetchJsonWithTimeout<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function findGbfsFeedUrl(index: GbfsFeedIndex, feedName: string): string | null {
  const feeds = index.data?.es?.feeds ?? index.data?.feeds ?? [];
  const feed = feeds.find((entry) => entry.name === feedName);
  return feed?.url ?? null;
}

async function fetchBicimadAvailabilityFromGbfs(
  stationId: string,
  stationName: string,
): Promise<{ bikesAvailable: number | null; docksAvailable: number | null } | null> {
  const index = await fetchJsonWithTimeout<GbfsFeedIndex>(
    "https://madrid.publicbikesystem.net/customer/gbfs/v2/gbfs.json",
  );
  if (!index) {
    return null;
  }

  const stationInfoUrl = findGbfsFeedUrl(index, "station_information");
  const stationStatusUrl = findGbfsFeedUrl(index, "station_status");
  if (!stationInfoUrl || !stationStatusUrl) {
    return null;
  }

  const [information, status] = await Promise.all([
    fetchJsonWithTimeout<GbfsStationInformation>(stationInfoUrl),
    fetchJsonWithTimeout<GbfsStationStatus>(stationStatusUrl),
  ]);

  if (!information || !status) {
    return null;
  }

  const infoStations = information.data?.stations ?? [];
  const statusStations = status.data?.stations ?? [];

  const candidateCodes = new Set<string>();
  candidateCodes.add(stationId.trim());

  const fromNameCode = stationCodeFromName(stationName.trim());
  if (fromNameCode) {
    candidateCodes.add(fromNameCode);
  }

  const normalizedName = normalizeSearch(stationName);

  const infoMatch =
    infoStations.find((station) =>
      station.station_id ? candidateCodes.has(station.station_id) : false,
    ) ??
    infoStations.find((station) =>
      station.short_name ? candidateCodes.has(station.short_name) : false,
    ) ??
    infoStations.find((station) =>
      station.obcn ? candidateCodes.has(station.obcn) : false,
    ) ??
    infoStations.find((station) =>
      normalizedName !== "" && station.name
        ? normalizeSearch(station.name) === normalizedName
        : false,
    ) ??
    null;

  const resolvedStationId = infoMatch?.station_id ??
    (statusStations.some((station) => (station.station_id ? candidateCodes.has(station.station_id) : false))
      ? [...candidateCodes.values()].find((candidate) =>
          statusStations.some((station) => station.station_id === candidate),
        ) ?? null
      : null);

  if (!resolvedStationId) {
    return null;
  }

  const statusMatch = statusStations.find((station) => station.station_id === resolvedStationId);
  if (!statusMatch) {
    return null;
  }

  return {
    bikesAvailable: readFiniteNumber(statusMatch.num_bikes_available),
    docksAvailable: readFiniteNumber(statusMatch.num_docks_available),
  };
}

async function getEmtAccessToken(env: EdgeEnv): Promise<string | null> {
  if (!env.EMT_CLIENT_ID || !env.EMT_PASSKEY) {
    return null;
  }

  const loginResponse = await fetch("https://openapi.emtmadrid.es/v1/mobilitylabs/user/login/", {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-clientid": env.EMT_CLIENT_ID,
      passKey: env.EMT_PASSKEY,
    },
  });

  if (!loginResponse.ok) {
    return null;
  }

  const loginBody = (await loginResponse.json()) as {
    data?: Array<{ accessToken?: string }>;
  };

  return loginBody.data?.[0]?.accessToken ?? null;
}

async function fetchBicimadAvailabilityByStation(stationId: string, accessToken: string): Promise<{ bikesAvailable: number | null; docksAvailable: number | null } | null> {
  const candidateUrls = [
    `https://openapi.emtmadrid.es/v1/transport/bicimad/stations/${encodeURIComponent(stationId)}/detail/`,
    `https://openapi.emtmadrid.es/v1/transport/bicimad/stations/${encodeURIComponent(stationId)}/`,
    `https://openapi.emtmadrid.es/v1/transport/bicimad/stations/${encodeURIComponent(stationId)}`,
  ];

  for (const url of candidateUrls) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        accessToken,
      },
    });

    if (!response.ok) {
      continue;
    }

    const body = await response.json();
    const parsed = parseAvailabilityBody(body);
    if (parsed.bikesAvailable !== null || parsed.docksAvailable !== null) {
      return parsed;
    }
  }

  return null;
}

export async function buildPublicBicimadAvailabilityResponse(
  env: EdgeEnv,
  stationId: string,
  stationName = "",
): Promise<Response> {
  const normalizedStationId = stationId.trim();
  const normalizedStationName = stationName.trim();
  if (!normalizedStationId) {
    return payloadResponse(
      {
        stationId: "",
        bikesAvailable: null,
        docksAvailable: null,
        dataOrigin: "not_available",
        sourceLabel: "BiciMAD",
        fetchedAt: null,
        note: "station_id_required",
      },
      400,
    );
  }

  try {
    const fetchedAt = new Date().toISOString();
    const accessToken = await getEmtAccessToken(env);
    if (accessToken) {
      const availabilityFromEmt = await fetchBicimadAvailabilityByStation(normalizedStationId, accessToken);
      if (availabilityFromEmt) {
        return payloadResponse({
          stationId: normalizedStationId,
          bikesAvailable: availabilityFromEmt.bikesAvailable,
          docksAvailable: availabilityFromEmt.docksAvailable,
          dataOrigin: "realtime",
          sourceLabel: "BiciMAD oficial (EMT OpenAPI)",
          fetchedAt,
          note: null,
        });
      }
    }

    const availabilityFromGbfs = await fetchBicimadAvailabilityFromGbfs(
      normalizedStationId,
      normalizedStationName,
    );
    if (availabilityFromGbfs) {
      return payloadResponse({
        stationId: normalizedStationId,
        bikesAvailable: availabilityFromGbfs.bikesAvailable,
        docksAvailable: availabilityFromGbfs.docksAvailable,
        dataOrigin: "realtime",
        sourceLabel: "BiciMAD oficial (GBFS)",
        fetchedAt,
        note: null,
      });
    }

    if (!accessToken) {
      return payloadResponse({
        stationId: normalizedStationId,
        bikesAvailable: null,
        docksAvailable: null,
        dataOrigin: "not_available",
        sourceLabel: "BiciMAD oficial (on-demand)",
        fetchedAt,
        note: "bicimad_realtime_not_configured",
      });
    }

    return payloadResponse({
      stationId: normalizedStationId,
      bikesAvailable: null,
      docksAvailable: null,
      dataOrigin: "not_available",
      sourceLabel: "BiciMAD oficial (on-demand)",
      fetchedAt,
      note: "bicimad_station_not_found",
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "bicimad_availability_error",
        env: env.APP_ENV,
        station_id: normalizedStationId,
        message: error instanceof Error ? error.message : "unexpected_bicimad_error",
      }),
    );

    return payloadResponse({
      stationId: normalizedStationId,
      bikesAvailable: null,
      docksAvailable: null,
      dataOrigin: "not_available",
      sourceLabel: "BiciMAD oficial (on-demand)",
      fetchedAt: new Date().toISOString(),
      note: "bicimad_realtime_error",
    });
  }
}
