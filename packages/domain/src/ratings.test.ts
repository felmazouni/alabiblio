import { describe, expect, it } from "vitest";
import {
  buildRatingPresentationMeta,
  getRatingSampleState,
} from "./ratings";

describe("ratings domain helpers", () => {
  it("marks centers without votes as unavailable", () => {
    expect(buildRatingPresentationMeta(0)).toEqual({
      ratingOrigin: "not_available",
      ratingSource: "not_available",
      ratingSourceLabel: null,
      ratingSampleState: "no_votes",
      ratingSampleLabel: null,
    });
  });

  it("marks one or two votes as an initial sample", () => {
    expect(getRatingSampleState(1)).toBe("initial");
    expect(getRatingSampleState(2)).toBe("initial");
    expect(buildRatingPresentationMeta(2).ratingSampleLabel).toBe("Muestra inicial");
  });

  it("marks three to seven votes as a limited sample", () => {
    expect(getRatingSampleState(3)).toBe("limited");
    expect(getRatingSampleState(7)).toBe("limited");
  });

  it("marks eight or more votes as established", () => {
    expect(getRatingSampleState(8)).toBe("established");
    expect(buildRatingPresentationMeta(12).ratingOrigin).toBe("heuristic");
  });
});
