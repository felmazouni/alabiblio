import {
  loadPublicCenterRatings,
  submitPublicCenterRating,
} from "@alabiblio/application";
import type { CenterRatingVoteInput } from "@alabiblio/contracts";
import type { EdgeEnv } from "../../env";

interface GoogleTokenInfo {
  sub?: string;
  aud?: string;
  iss?: string;
  exp?: string;
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function verifyGoogleIdToken(
  idToken: string,
  env: EdgeEnv,
): Promise<string> {
  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("id_token", idToken);

  const response = await fetch(url.toString(), {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("google_token_invalid");
  }

  const payload = (await response.json()) as GoogleTokenInfo;

  if (!payload.sub) {
    throw new Error("google_sub_missing");
  }

  if (env.GOOGLE_CLIENT_ID && payload.aud !== env.GOOGLE_CLIENT_ID) {
    throw new Error("google_aud_mismatch");
  }

  if (
    payload.iss !== "accounts.google.com" &&
    payload.iss !== "https://accounts.google.com"
  ) {
    throw new Error("google_iss_invalid");
  }

  if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
    throw new Error("google_token_expired");
  }

  return payload.sub;
}

function parseVoteInput(value: unknown): CenterRatingVoteInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const parsed: CenterRatingVoteInput = {
    silence: Number(candidate.silence),
    wifi: Number(candidate.wifi),
    cleanliness: Number(candidate.cleanliness),
    plugs: Number(candidate.plugs),
    temperature: Number(candidate.temperature),
    lighting: Number(candidate.lighting),
  };

  if (
    !Number.isFinite(parsed.silence) ||
    !Number.isFinite(parsed.wifi) ||
    !Number.isFinite(parsed.cleanliness) ||
    !Number.isFinite(parsed.plugs) ||
    !Number.isFinite(parsed.temperature) ||
    !Number.isFinite(parsed.lighting)
  ) {
    return null;
  }

  return parsed;
}

export function buildPublicGoogleAuthConfigResponse(env: EdgeEnv): Response {
  const clientId = env.GOOGLE_CLIENT_ID?.trim() || null;

  return Response.json(
    {
      enabled: Boolean(clientId),
      clientId,
    },
    {
      headers: {
        "cache-control": "public, max-age=300",
      },
    },
  );
}

export async function buildPublicCenterRatingsResponse(
  env: EdgeEnv,
  slug: string,
  request: Request,
): Promise<Response> {
  let userId: string | undefined;
  const bearer = extractBearerToken(request);

  if (bearer) {
    try {
      userId = await verifyGoogleIdToken(bearer, env);
    } catch {
      return Response.json(
        {
          error: "unauthorized",
          message: "Google token invalid.",
        },
        { status: 401 },
      );
    }
  }

  const payload = await loadPublicCenterRatings(slug, env.DB, userId);
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
      "cache-control": "no-store",
    },
  });
}

export async function buildSubmitPublicCenterRatingResponse(
  env: EdgeEnv,
  slug: string,
  request: Request,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        error: "invalid_payload",
        message: "Expected JSON body.",
      },
      { status: 400 },
    );
  }

  const payloadRecord =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const vote = parseVoteInput(payloadRecord.vote);

  if (!vote) {
    return Response.json(
      {
        error: "invalid_vote",
        message: "Vote payload is not valid.",
      },
      { status: 400 },
    );
  }

  const tokenFromBody =
    typeof payloadRecord.idToken === "string" ? payloadRecord.idToken : null;
  const token = tokenFromBody ?? extractBearerToken(request);

  if (!token) {
    return Response.json(
      {
        error: "unauthorized",
        message: "Google login is required.",
      },
      { status: 401 },
    );
  }

  let userId: string;
  try {
    userId = await verifyGoogleIdToken(token, env);
  } catch {
    return Response.json(
      {
        error: "unauthorized",
        message: "Google token invalid.",
      },
      { status: 401 },
    );
  }

  try {
    const result = await submitPublicCenterRating(slug, vote, userId, env.DB);
    if (!result) {
      return Response.json(
        {
          error: "center_not_found",
          message: "No center matched the requested slug.",
        },
        { status: 404 },
      );
    }

    return Response.json(result, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: "rating_submit_failed",
        message: error instanceof Error ? error.message : "Unexpected submit failure.",
      },
      { status: 400 },
    );
  }
}
