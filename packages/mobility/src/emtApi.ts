import type {
  EmtApiEnvelope,
  EmtCredentials,
  EmtLoginDataItem,
  JsonValue,
} from "./types";

type EmtRealtimeRawItem = {
  stop_id: string;
  stop_name: string;
  line: string;
  destination: string;
  minutes: number;
};

type EmtRuntimeResult = {
  status: "available" | "unconfigured" | "unavailable" | "error" | "empty";
  message: string | null;
  arrivals: EmtRealtimeRawItem[];
};

type EmtLoginAttempt = {
  label: "client_pass_key" | "email_password";
  headers: Record<string, string>;
};

const EMT_LOGIN_TIMEOUT_MS = 1200;
const EMT_REALTIME_TIMEOUT_MS = 1100;
const EMT_RETRY_DELAY_MS = 180;

let cachedAccessToken:
  | {
      value: string;
      expiresAt: number;
    }
  | null = null;

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithTimeoutRetry(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  fetchImpl: typeof fetch,
  retries = 1,
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, init, timeoutMs, fetchImpl);

      if (response.status >= 500 && response.status < 600 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, EMT_RETRY_DELAY_MS));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, EMT_RETRY_DELAY_MS));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("emt_fetch_failed");
}

function getJsonValue(
  record: Record<string, JsonValue>,
  key: string,
): JsonValue | undefined {
  return record[key];
}

function getStringValue(record: Record<string, JsonValue>, keys: string[]): string | null {
  for (const key of keys) {
    const value = getJsonValue(record, key);

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return null;
}

function getNumberValue(record: Record<string, JsonValue>, keys: string[]): number | null {
  for (const key of keys) {
    const value = getJsonValue(record, key);

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

async function loginEmt(
  credentials: EmtCredentials,
  fetchImpl: typeof fetch,
): Promise<string> {
  const attempts: EmtLoginAttempt[] = [];

  if (credentials.clientId && credentials.passKey) {
    attempts.push({
      label: "client_pass_key",
      headers: {
        "X-ClientId": credentials.clientId.trim(),
        passKey: credentials.passKey.trim(),
      },
    });
  }

  if (credentials.email && credentials.password) {
    attempts.push({
      label: "email_password",
      headers: {
        email: credentials.email.trim(),
        password: credentials.password.trim(),
      },
    });
  }

  if (attempts.length === 0) {
    throw new Error("emt_login_missing_credentials");
  }

  const errors: string[] = [];

  for (const attempt of attempts) {
    const response = await fetchWithTimeoutRetry(
      "https://openapi.emtmadrid.es/v1/mobilitylabs/user/login/",
      {
        method: "GET",
        headers: attempt.headers,
      },
      EMT_LOGIN_TIMEOUT_MS,
      fetchImpl,
      1,
    );

    if (!response.ok) {
      errors.push(`${attempt.label}_http_${response.status}`);
      continue;
    }

    const payload = (await response.json()) as EmtApiEnvelope<EmtLoginDataItem>;
    const accessToken = payload.data[0]?.accessToken;
    const expiresIn = payload.data[0]?.tokenSecExpiration ?? 300;

    if ((payload.code === "00" || payload.code === "01") && accessToken) {
      cachedAccessToken = {
        value: accessToken,
        expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
      };

      return accessToken;
    }

    errors.push(`${attempt.label}_code_${payload.code}`);
  }

  throw new Error(errors.join("__"));
}

async function getAccessToken(
  credentials: EmtCredentials,
  fetchImpl: typeof fetch,
): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.value;
  }

  return loginEmt(credentials, fetchImpl);
}

function normalizeArrivalData(
  stopId: string,
  data: JsonValue[],
): EmtRealtimeRawItem[] {
  return data
    .filter(
      (value): value is Record<string, JsonValue> =>
        typeof value === "object" && value !== null && !Array.isArray(value),
    )
    .map((item) => {
      const etaSeconds = getNumberValue(item, [
        "estimateArrive",
        "busTimeLeft",
        "estimateTime",
      ]);

      if (etaSeconds === null) {
        return null;
      }

      return {
        stop_id: stopId,
        stop_name: getStringValue(item, ["stopName", "name", "stop"]) ?? stopId,
        line: getStringValue(item, ["line", "lineId", "linea"]) ?? "Linea",
        destination:
          getStringValue(item, ["destination", "destinationName", "destinationLine"]) ??
          "Destino",
        minutes: Math.max(0, Math.round(etaSeconds / 60)),
      } satisfies EmtRealtimeRawItem;
    })
    .filter((item): item is EmtRealtimeRawItem => item !== null)
    .sort((left, right) => left.minutes - right.minutes)
    .slice(0, 6);
}

export async function fetchEmtRealtimeForStopIds(
  stopIds: string[],
  credentials: EmtCredentials | null,
  fetchImpl: typeof fetch = fetch,
): Promise<EmtRuntimeResult> {
  if (stopIds.length === 0) {
    return {
      status: "unavailable",
      message: "No hay paradas EMT enlazadas para este centro.",
      arrivals: [],
    };
  }

  if (
    !credentials ||
    ((!credentials.clientId || !credentials.passKey) &&
      (!credentials.email || !credentials.password))
  ) {
    return {
      status: "unconfigured",
      message:
        "Tiempo real EMT no disponible: faltan credenciales EMT en este entorno.",
      arrivals: [],
    };
  }

  let accessToken: string;

  try {
    accessToken = await getAccessToken(credentials, fetchImpl);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? `No se pudo autenticar contra EMT (${error.message}).`
          : "No se pudo autenticar contra EMT.",
      arrivals: [],
    };
  }

  const results = await Promise.allSettled(
    stopIds.slice(0, 6).map(async (stopId) => {
      const response = await fetchWithTimeoutRetry(
        `https://openapi.emtmadrid.es/v1/transport/busemtmad/stops/${encodeURIComponent(stopId)}/arrives/all/`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accessToken,
          },
          body: JSON.stringify({
            cultureInfo: "ES",
            Text_StopRequired_YN: "Y",
            Text_EstimationsRequired_YN: "Y",
            Text_IncidencesRequired_YN: "N",
            DateTime_Referenced_Incidencies_YYYYMMDD:
              new Date().toISOString().slice(0, 10).replace(/-/g, ""),
          }),
        },
        EMT_REALTIME_TIMEOUT_MS,
        fetchImpl,
        1,
      );

      if (!response.ok) {
        throw new Error(`emt_realtime_http_${response.status}`);
      }

      const payload = (await response.json()) as EmtApiEnvelope<JsonValue>;
      const realtimeBlock =
        Array.isArray(payload.data) && payload.data.length > 0 ? payload.data[0] : null;
      const realtimeRecord =
        realtimeBlock &&
        typeof realtimeBlock === "object" &&
        !Array.isArray(realtimeBlock)
          ? (realtimeBlock as Record<string, JsonValue>)
          : null;
      const arriveData =
        realtimeRecord && Array.isArray(realtimeRecord.Arrive)
          ? realtimeRecord.Arrive
          : [];

      return normalizeArrivalData(
        stopId,
        arriveData,
      );
    }),
  );
  const fulfilled = results
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<EmtRealtimeRawItem[]> => result.status === "fulfilled",
    )
    .map((result) => result.value);
  const rejected = results
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .map((result) =>
      result.reason instanceof Error ? result.reason.message : "emt_realtime_unknown",
    );

  if (fulfilled.length === 0 && rejected.length > 0) {
    return {
      status: "error",
      message: `Tiempo real EMT no disponible (${rejected.join(", ")}).`,
      arrivals: [],
    };
  }

  const arrivals = fulfilled.flat().sort((left, right) => left.minutes - right.minutes);

  if (arrivals.length === 0) {
    return {
      status: rejected.length > 0 ? "error" : "empty",
      message:
        rejected.length > 0
          ? `Tiempo real EMT parcial o agotado (${rejected.join(", ")}).`
          : "EMT no ha devuelto proximas llegadas para las paradas cercanas.",
      arrivals: [],
    };
  }

  return {
    status: rejected.length > 0 ? "error" : "available",
    message:
      rejected.length > 0
        ? `Tiempo real EMT parcial (${rejected.join(", ")}).`
        : null,
    arrivals,
  };
}
