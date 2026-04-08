import type {
  CenterDetailItem,
  GetCenterDetailResponse,
  ListCentersResponse,
} from "@alabiblio/contracts/centers";
import type {
  CenterMobility,
  CenterTopMobilityItem,
  GetCenterMobilityResponse,
  GetCenterMobilitySummaryResponse,
  GetTopMobilityCentersResponse,
} from "@alabiblio/contracts/mobility";

export function buildListCentersResponsePayload(input: {
  items: ListCentersResponse["items"];
  total: number;
  open_count: number;
  limit: number;
  offset: number;
  next_offset: number | null;
}): ListCentersResponse {
  return {
    meta: {
      scope: "base_exploration",
      endpoint: "list_centers",
    },
    items: input.items,
    total: input.total,
    open_count: input.open_count,
    limit: input.limit,
    offset: input.offset,
    next_offset: input.next_offset,
  };
}

export function buildTopMobilityCentersResponsePayload(input: {
  items: CenterTopMobilityItem[];
  open_count: number;
}): GetTopMobilityCentersResponse {
  return {
    meta: {
      scope: "origin_enriched",
      endpoint: "top_mobility_centers",
    },
    items: input.items,
    open_count: input.open_count,
  };
}

export function buildCenterDetailResponsePayload(
  item: CenterDetailItem,
): GetCenterDetailResponse {
  return {
    meta: {
      scope: "base_exploration",
      endpoint: "center_detail",
    },
    item,
  };
}

export function buildCenterMobilityResponsePayload(
  item: CenterMobility,
): GetCenterMobilityResponse {
  return {
    meta: {
      scope: "origin_enriched",
      endpoint: "center_mobility",
    },
    item,
  };
}

export function buildCenterMobilitySummaryResponsePayload(input: {
  slug: string;
  item: CenterMobility;
}): GetCenterMobilitySummaryResponse {
  return {
    meta: {
      scope: "origin_enriched",
      endpoint: "center_mobility_summary",
    },
    slug: input.slug,
    item: input.item,
  };
}
