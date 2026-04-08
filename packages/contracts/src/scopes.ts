export type CenterComputationScope = "base_exploration" | "origin_enriched";

export type CenterSemanticField =
  | "recommended"
  | "arrival"
  | "distance"
  | "open_now";

export type CenterScopeFieldAvailability = "supported" | "forbidden";

export interface CenterScopeDescriptorV1 {
  scope: CenterComputationScope;
  field_availability: Record<CenterSemanticField, CenterScopeFieldAvailability>;
}

export type CenterScopedEndpoint =
  | "list_centers"
  | "top_mobility_centers"
  | "center_detail"
  | "center_mobility"
  | "center_mobility_summary";

export interface CenterResponseMetaV1<
  TScope extends CenterComputationScope = CenterComputationScope,
  TEndpoint extends CenterScopedEndpoint = CenterScopedEndpoint,
> {
  scope: TScope;
  endpoint: TEndpoint;
}

export const CENTER_SCOPE_DESCRIPTORS_V1: Record<
  CenterComputationScope,
  CenterScopeDescriptorV1
> = {
  base_exploration: {
    scope: "base_exploration",
    field_availability: {
      recommended: "forbidden",
      arrival: "forbidden",
      distance: "forbidden",
      open_now: "supported",
    },
  },
  origin_enriched: {
    scope: "origin_enriched",
    field_availability: {
      recommended: "supported",
      arrival: "supported",
      distance: "supported",
      open_now: "supported",
    },
  },
};

export const CENTER_ENDPOINT_SCOPE_V1: Record<
  CenterScopedEndpoint,
  CenterComputationScope
> = {
  list_centers: "base_exploration",
  top_mobility_centers: "origin_enriched",
  center_detail: "base_exploration",
  center_mobility: "origin_enriched",
  center_mobility_summary: "origin_enriched",
};
