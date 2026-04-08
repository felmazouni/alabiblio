import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  buildCatalogActiveFilterChips,
  buildCatalogFilterSearchParams,
  buildBaseCatalogListQuery,
  clearCatalogFilter,
  DEFAULT_CATALOG_FILTERS,
  parseCatalogFilterSearchParams,
  type CatalogBaseSortBy,
  type CatalogActiveFilterKey,
  type CatalogFilterState,
  type KindFilter,
} from "../catalogFilters";

type BuildCatalogQueryOptions = {
  deferredSearch: string;
  limit?: number;
  offset?: number;
  userLat?: number;
  userLon?: number;
};

function normalizeSearch(search: string): string {
  return search.startsWith("?") ? search.slice(1) : search;
}

export function useCatalogFilters() {
  const location = useLocation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CatalogFilterState>(() =>
    parseCatalogFilterSearchParams(new URLSearchParams(location.search)),
  );
  const [offset, setOffset] = useState(0);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const serializedFilters = useMemo(
    () => buildCatalogFilterSearchParams(filters).toString(),
    [filters],
  );

  useEffect(() => {
    const currentSearch = normalizeSearch(location.search);
    if (serializedFilters === currentSearch) {
      return;
    }

    void navigate(
      {
        pathname: location.pathname,
        search: serializedFilters ? `?${serializedFilters}` : "",
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate, serializedFilters]);

  const activeChips = useMemo(() => buildCatalogActiveFilterChips(filters), [filters]);

  const updateFilters = useCallback((patch: Partial<CatalogFilterState>): void => {
    setFilters((current) => ({ ...current, ...patch }));
    setOffset(0);
  }, []);

  const setKindFilter = useCallback((kindFilter: KindFilter): void => {
    updateFilters({ kindFilter });
  }, [updateFilters]);

  const setSortBy = useCallback((sortBy: CatalogBaseSortBy): void => {
    updateFilters({ sortBy });
  }, [updateFilters]);

  const setSearchText = useCallback((searchText: string): void => {
    updateFilters({ searchText });
  }, [updateFilters]);

  const clearFilter = useCallback((key: CatalogActiveFilterKey): void => {
    setFilters((current) => clearCatalogFilter(current, key));
    setOffset(0);
  }, []);

  const clearAllFilters = useCallback((): void => {
    setFilters((current) => ({
      ...DEFAULT_CATALOG_FILTERS,
      searchText: current.searchText,
    }));
    setOffset(0);
  }, []);

  const resetPagination = useCallback((): void => {
    setOffset(0);
  }, []);

  const loadMore = useCallback((nextOffset: number): void => {
    setOffset(nextOffset);
  }, []);

  const buildRequestQuery = useCallback((options: BuildCatalogQueryOptions) => {
    return buildBaseCatalogListQuery(filters, options);
  }, [filters]);

  return {
    filters,
    offset,
    filterDrawerOpen,
    openFilterDrawer: () => setFilterDrawerOpen(true),
    closeFilterDrawer: () => setFilterDrawerOpen(false),
    activeChips,
    activeFilterCount: activeChips.length,
    setKindFilter,
    setSortBy,
    setSearchText,
    updateFilters,
    clearFilter,
    clearAllFilters,
    resetPagination,
    loadMore,
    buildRequestQuery,
  };
}
