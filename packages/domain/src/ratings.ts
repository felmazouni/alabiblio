import type {
  DataOrigin,
  RatingSampleState,
  RatingSource,
} from "@alabiblio/contracts";

export interface RatingPresentationMeta {
  ratingOrigin: DataOrigin;
  ratingSource: RatingSource;
  ratingSourceLabel: string | null;
  ratingSampleState: RatingSampleState;
  ratingSampleLabel: string | null;
}

export function getRatingSampleState(ratingCount: number): RatingSampleState {
  if (ratingCount <= 0) {
    return "no_votes";
  }

  if (ratingCount <= 2) {
    return "initial";
  }

  if (ratingCount <= 7) {
    return "limited";
  }

  return "established";
}

export function getRatingSampleLabel(state: RatingSampleState): string | null {
  switch (state) {
    case "no_votes":
      return null;
    case "initial":
      return "Muestra inicial";
    case "limited":
      return "Muestra limitada";
    case "established":
      return "Muestra suficiente";
  }
}

export function buildRatingPresentationMeta(
  ratingCount: number,
): RatingPresentationMeta {
  if (ratingCount <= 0) {
    return {
      ratingOrigin: "not_available",
      ratingSource: "not_available",
      ratingSourceLabel: null,
      ratingSampleState: "no_votes",
      ratingSampleLabel: null,
    };
  }

  const ratingSampleState = getRatingSampleState(ratingCount);

  return {
    ratingOrigin: "heuristic",
    ratingSource: "app_users",
    ratingSourceLabel: "Valoraciones internas de AlaBiblio",
    ratingSampleState,
    ratingSampleLabel: getRatingSampleLabel(ratingSampleState),
  };
}
