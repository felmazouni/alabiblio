import type { GetTopMobilityCentersResponse } from "@alabiblio/contracts/mobility";
import type { UserOrigin } from "@alabiblio/contracts/origin";
import { useEffect, useState } from "react";
import { fetchTopMobilityCenters } from "../api";
import { buildTopMobilityQuery } from "../catalogFilters";
import { formatFetchError } from "../screenLogic";
import { useUserOrigin } from "../../location/useUserOrigin";
import { useOriginSearchController } from "../../origin/hooks/useOriginSearchController";

export function useTopPicksScreen() {
  const [originSheetOpen, setOriginSheetOpen] = useState(false);
  const [topMobilityResponse, setTopMobilityResponse] = useState<GetTopMobilityCentersResponse | null>(null);
  const [topPicksResolvedKey, setTopPicksResolvedKey] = useState<string | null>(null);
  const [topPicksErrorState, setTopPicksErrorState] = useState<{ key: string; message: string } | null>(null);
  const originSearch = useOriginSearchController();
  const {
    origin,
    geolocationStatus,
    requestGeolocation,
    setManualOrigin,
  } = useUserOrigin();

  const originActive = origin !== null;
  const requestKey = originActive ? `${origin?.lat ?? "none"}:${origin?.lon ?? "none"}` : null;
  const topScope = topMobilityResponse?.meta.scope ?? null;
  const topPicks = (topScope === "origin_enriched" ? topMobilityResponse?.items : [])
    ?.map((entry) => ({
      rank: entry.rank,
      center: entry.center,
      mobility: entry.item,
    })) ?? [];
  const serverOpenCount =
    topScope === "origin_enriched" ? topMobilityResponse?.open_count ?? 0 : 0;
  const hasCurrentTopPicksError =
    topPicksErrorState !== null && topPicksErrorState.key === requestKey;
  const loading = originActive && topPicksResolvedKey !== requestKey && !hasCurrentTopPicksError;
  const error = hasCurrentTopPicksError ? topPicksErrorState.message : null;

  useEffect(() => {
    if (!originActive) {
      return;
    }

    const controller = new AbortController();
    const resolvedRequestKey = requestKey ?? "none";

    void fetchTopMobilityCenters(
      buildTopMobilityQuery({
        limit: 12,
        offset: 0,
        userLat: origin?.lat,
        userLon: origin?.lon,
      }),
      controller.signal,
    )
      .then((response) => {
        if (!controller.signal.aborted) {
          setTopMobilityResponse(response);
          setTopPicksResolvedKey(resolvedRequestKey);
          setTopPicksErrorState(null);
        }
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setTopMobilityResponse(null);
          setTopPicksResolvedKey(resolvedRequestKey);
          setTopPicksErrorState({
            key: resolvedRequestKey,
            message: formatFetchError("top", nextError),
          });
        }
      });

    return () => controller.abort();
  }, [originActive, origin?.lat, origin?.lon, requestKey]);

  function applyOrigin(nextOrigin: UserOrigin): void {
    setManualOrigin(nextOrigin);
    originSearch.resetSearch(nextOrigin.label);
    setOriginSheetOpen(false);
  }

  function requestGeolocationFromSheet(): void {
    requestGeolocation();
    originSearch.resetSearch();
    setOriginSheetOpen(false);
  }

  function continueWithoutOrigin(): void {
    originSearch.resetSearch();
    setOriginSheetOpen(false);
  }

  return {
    origin,
    geolocationStatus,
    originActive,
    originSheetOpen,
    topScope,
    topPicks,
    serverOpenCount,
    loading,
    error,
    originSearch,
    requestGeolocation,
    openOriginSheet: () => setOriginSheetOpen(true),
    closeOriginSheet: () => setOriginSheetOpen(false),
    applyOrigin,
    requestGeolocationFromSheet,
    continueWithoutOrigin,
  };
}
