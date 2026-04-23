import { describe, expect, it } from "vitest";
import { parseOfficialTransportText } from "./transport";

describe("parseOfficialTransportText", () => {
  it("does not convert walking minutes into fake metro lines", () => {
    const parsed = parseOfficialTransportText(
      "Metro: Montecarmelo (línea 10) (20 minutos a pie).",
    );

    expect(parsed).toEqual([
      {
        mode: "metro",
        stationName: "Montecarmelo",
        stopName: null,
        lines: ["L10"],
        raw: "Montecarmelo (línea 10)",
      },
    ]);
  });

  it("keeps explicit cercanias and metro ligero codes only when present", () => {
    expect(
      parseOfficialTransportText("Cercanías: Sol (C3, C4). Metro Ligero: ML1."),
    ).toEqual([
      {
        mode: "cercanias",
        stationName: "Sol",
        stopName: null,
        lines: ["C3", "C4"],
        raw: "Sol (C3, C4)",
      },
      {
        mode: "metro_ligero",
        stationName: "ML1",
        stopName: null,
        lines: ["ML1"],
        raw: "ML1",
      },
    ]);
  });
});
