import type { GetOriginPresetsResponse, OriginPreset } from "@alabiblio/contracts/origin";
import type { ApiRequestContext } from "../lib/observability";
import { buildPublicCacheControl, createApiJsonResponse } from "../lib/observability";

const ORIGIN_PRESETS: OriginPreset[] = [
  { code: "sol", label: "Sol", lat: 40.4169, lon: -3.7035 },
  { code: "moncloa", label: "Moncloa", lat: 40.4353, lon: -3.7196 },
  { code: "atocha", label: "Atocha", lat: 40.4066, lon: -3.6892 },
  { code: "retiro", label: "Retiro", lat: 40.4153, lon: -3.6844 },
  { code: "chamartin", label: "Chamartin", lat: 40.4721, lon: -3.6826 },
  { code: "ciudad-universitaria", label: "Ciudad Universitaria", lat: 40.4444, lon: -3.7269 },
  { code: "lavapies", label: "Lavapies", lat: 40.4088, lon: -3.7002 },
  { code: "malasana", label: "Malasana", lat: 40.4253, lon: -3.7044 },
  { code: "carabanchel", label: "Carabanchel", lat: 40.3899, lon: -3.7416 },
  { code: "vallecas", label: "Vallecas", lat: 40.3822, lon: -3.6678 },
];

export function handleGetOriginPresets(requestContext: ApiRequestContext): Response {
  const payload: GetOriginPresetsResponse = {
    items: ORIGIN_PRESETS,
  };

  return createApiJsonResponse(requestContext, payload, {
    headers: buildPublicCacheControl(86400),
    cacheStatus: "BYPASS",
    dataScope: "not_applicable",
    upstreamStatus: "none",
    dataState: "estimated",
  });
}
