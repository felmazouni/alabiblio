import type { CenterListBaseItemV1, ListCentersResponse } from "@alabiblio/contracts/centers";
import type { UserOrigin } from "@alabiblio/contracts/origin";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { fetchCenters } from "../api";
import { type CatalogBaseSortBy } from "../catalogFilters";
import { formatFetchError } from "../screenLogic";
import { useCatalogFilters } from "./useCatalogFilters";
import { useOriginSearchController } from "../../origin/hooks/useOriginSearchController";
import { useUserOrigin } from "../../location/useUserOrigin";

const PAGE_SIZE = 18;

export type CatalogViewMode = "cards" | "rows";

export function useCatalogScreen() {
  const {
    filters,
    offset,
    filterDrawerOpen,
    openFilterDrawer,
    closeFilterDrawer,
    activeChips,
    activeFilterCount,
    setKindFilter,
    setSortBy,
    setSearchText,
    updateFilters,
    clearFilter,
    clearAllFilters: clearCatalogFilters,
    resetPagination,
    loadMore,
    buildRequestQuery,
  } = useCatalogFilters();
  const deferredSearch = useDeferredValue(filters.searchText.trim());
  const [viewMode, setViewMode] = useState<CatalogViewMode>("cards");
  const [items, setItems] = useState<CenterListBaseItemV1[]>([]);
  const [catalogScope, setCatalogScope] = useState<ListCentersResponse["meta"]["scope"] | null>(null);
  const [total, setTotal] = useState(0);
  const [serverOpenCount, setServerOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [originSheetOpen, setOriginSheetOpen] = useState(false);
  const originSearch = useOriginSearchController();
  const {
    origin,
    geolocationStatus,
    requestGeolocation,
    setManualOrigin,
    clearOrigin,
  } = useUserOrigin();

  const hasMore = items.length < total;

  useEffect(() => {
    const controller = new AbortController();
    const isFirstPage = offset === 0;

    void fetchCenters(
      buildRequestQuery({
        deferredSearch,
        limit: PAGE_SIZE,
        offset,
      }),
      controller.signal,
    )
      .then((response) => {
        setCatalogScope(response.meta.scope);
        setItems((current) =>
          isFirstPage ? response.items : [...current, ...response.items],
        );
        setTotal(response.total);
        if (isFirstPage) {
          setServerOpenCount(response.open_count);
        }
        setListError(null);
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setListError(
            isFirstPage
              ? formatFetchError("catalog", error)
              : "No se pudieron cargar mas centros. Intentalo de nuevo.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      });

    return () => controller.abort();
  }, [buildRequestQuery, deferredSearch, offset]);

  const resetListState = useCallback((): void => {
    setItems([]);
    setCatalogScope(null);
    setTotal(0);
    setServerOpenCount(0);
    setLoading(true);
    setLoadingMore(false);
    setListError(null);
  }, []);

  function clearAllFilters(): void {
    clearCatalogFilters();
    resetListState();
  }

  function handleKindFilterChange(value: "all" | "library" | "study_room"): void {
    setKindFilter(value);
    resetListState();
  }

  function handleSortChange(value: CatalogBaseSortBy): void {
    setSortBy(value);
    resetListState();
  }

  function handleSearchChange(value: string): void {
    setSearchText(value);
    resetListState();
  }

  function handleFilterPatch(
    patch: Partial<Pick<typeof filters, "openNowOnly" | "wifiOnly" | "accessibleOnly" | "serOnly" | "districtFilter" | "neighborhoodFilter">>,
  ): void {
    updateFilters(patch);
    resetListState();
  }

  function handleClearChip(key: Parameters<typeof clearFilter>[0]): void {
    clearFilter(key);
    resetListState();
  }

  function applyOrigin(nextOrigin: UserOrigin): void {
    setManualOrigin(nextOrigin);
    originSearch.resetSearch(nextOrigin.label);
    setOriginSheetOpen(false);
    resetPagination();
    resetListState();
  }

  function requestGeolocationFromSheet(): void {
    requestGeolocation();
    originSearch.resetSearch();
    setOriginSheetOpen(false);
    resetPagination();
    resetListState();
  }

  function continueWithoutOrigin(): void {
    originSearch.resetSearch();
    setOriginSheetOpen(false);
    resetPagination();
    resetListState();
  }

  function clearOriginAndReset(): void {
    clearOrigin();
    resetPagination();
    resetListState();
  }

  function loadNextPage(): void {
    setLoadingMore(true);
    loadMore(items.length);
  }

  return {
    filters,
    activeChips,
    activeFilterCount,
    filterDrawerOpen,
    viewMode,
    items,
    catalogScope,
    total,
    serverOpenCount,
    loading,
    loadingMore,
    listError,
    hasMore,
    origin,
    geolocationStatus,
    originSheetOpen,
    originSearch,
    setViewMode,
    openFilterDrawer,
    closeFilterDrawer,
    openOriginSheet: () => setOriginSheetOpen(true),
    closeOriginSheet: () => setOriginSheetOpen(false),
    clearAllFilters,
    handleKindFilterChange,
    handleSortChange,
    handleSearchChange,
    handleFilterPatch,
    handleClearChip,
    applyOrigin,
    requestGeolocationFromSheet,
    continueWithoutOrigin,
    clearOriginAndReset,
    loadNextPage,
  };
}
