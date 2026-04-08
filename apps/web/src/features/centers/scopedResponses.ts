import type {
  GetCenterDetailResponse,
  ListCentersResponse,
} from "@alabiblio/contracts/centers";
import type {
  GetCenterMobilityResponse,
  GetTopMobilityCentersResponse,
} from "@alabiblio/contracts/mobility";
import type {
  CenterComputationScope,
  CenterResponseMetaV1,
  CenterScopedEndpoint,
} from "@alabiblio/contracts/scopes";

type ScopedResponse<
  TScope extends CenterComputationScope,
  TEndpoint extends CenterScopedEndpoint,
> = {
  meta: CenterResponseMetaV1<TScope, TEndpoint>;
};

function assertScopedResponse<
  TScope extends CenterComputationScope,
  TEndpoint extends CenterScopedEndpoint,
  TResponse extends ScopedResponse<TScope, TEndpoint>,
>(
  response: TResponse,
  expected: {
    scope: TScope;
    endpoint: TEndpoint;
    source: string;
  },
): TResponse {
  if (response.meta.scope !== expected.scope || response.meta.endpoint !== expected.endpoint) {
    throw new Error(`${expected.source}_scope_contract`);
  }

  return response;
}

export function requireBaseCatalogResponse(
  response: ListCentersResponse,
): ListCentersResponse {
  return assertScopedResponse(response, {
    scope: "base_exploration",
    endpoint: "list_centers",
    source: "centers_list",
  });
}

export function requireOriginTopMobilityResponse(
  response: GetTopMobilityCentersResponse,
): GetTopMobilityCentersResponse {
  return assertScopedResponse(response, {
    scope: "origin_enriched",
    endpoint: "top_mobility_centers",
    source: "top_mobility",
  });
}

export function requireBaseCenterDetailResponse(
  response: GetCenterDetailResponse,
): GetCenterDetailResponse {
  return assertScopedResponse(response, {
    scope: "base_exploration",
    endpoint: "center_detail",
    source: "center_detail",
  });
}

export function requireOriginCenterMobilityResponse(
  response: GetCenterMobilityResponse,
): GetCenterMobilityResponse {
  return assertScopedResponse(response, {
    scope: "origin_enriched",
    endpoint: "center_mobility",
    source: "center_mobility",
  });
}
