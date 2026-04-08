import type {
  CenterListBaseItemV1,
  ListCentersResponse,
} from "@alabiblio/contracts/centers";
import type {
  CenterMobility,
  CenterTopMobilityCardV1,
  GetTopMobilityCentersResponse,
} from "@alabiblio/contracts/mobility";
import {
  buildBaseExplorationHighlights,
  buildFeaturedFooterTiles,
  buildFeaturedTransportRows,
  buildHumanReason,
} from "./transportCopy";
import {
  getBaseExplorationFallbackCopy,
  getBaseExplorationLabel,
  getTopMobilityScopeSignal,
} from "./scopePresentation";
import { buildFeaturedCardFrame } from "./screenLogic";

export function buildBaseCardPresentation(
  center: CenterListBaseItemV1,
  scope: ListCentersResponse["meta"]["scope"],
) {
  return {
    highlightRows: buildBaseExplorationHighlights(center),
    fallbackCopy: getBaseExplorationFallbackCopy(scope, center.is_open_now),
    footerLabel: getBaseExplorationLabel(scope),
  };
}

export function buildTopMobilityCardPresentation(input: {
  center: CenterTopMobilityCardV1;
  mobility: CenterMobility;
  scope: GetTopMobilityCentersResponse["meta"]["scope"];
  serverOpenCount: number;
}) {
  const { center, mobility, scope, serverOpenCount } = input;
  const recommendedMode = mobility.summary.best_mode ?? center.decision.best_mode ?? null;

  return {
    scopeSignal: getTopMobilityScopeSignal(scope),
    frame: buildFeaturedCardFrame(center, recommendedMode, serverOpenCount),
    transportRows: buildFeaturedTransportRows(mobility),
    footerTiles: buildFeaturedFooterTiles(mobility, center),
    reason: buildHumanReason(mobility).split(".")[0]?.trim() ?? buildHumanReason(mobility),
  };
}
