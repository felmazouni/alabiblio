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
): Promise<Response> {
  const normalizedStationId = stationId.trim();
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
    const accessToken = await getEmtAccessToken(env);
    if (!accessToken) {
      return payloadResponse({
        stationId: normalizedStationId,
        bikesAvailable: null,
        docksAvailable: null,
        dataOrigin: "not_available",
        sourceLabel: "BiciMAD oficial (on-demand)",
        fetchedAt: new Date().toISOString(),
        note: "bicimad_realtime_not_configured",
      });
    }

    const availability = await fetchBicimadAvailabilityByStation(normalizedStationId, accessToken);
    if (!availability) {
      return payloadResponse({
        stationId: normalizedStationId,
        bikesAvailable: null,
        docksAvailable: null,
        dataOrigin: "not_available",
        sourceLabel: "BiciMAD oficial (on-demand)",
        fetchedAt: new Date().toISOString(),
        note: "bicimad_realtime_unavailable",
      });
    }

    return payloadResponse({
      stationId: normalizedStationId,
      bikesAvailable: availability.bikesAvailable,
      docksAvailable: availability.docksAvailable,
      dataOrigin: "realtime",
      sourceLabel: "BiciMAD oficial (on-demand)",
      fetchedAt: new Date().toISOString(),
      note: null,
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
