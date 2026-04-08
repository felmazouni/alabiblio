import type {
  CenterListBaseItemV1,
  GetCenterDetailResponse,
  ListCentersResponse,
} from "@alabiblio/contracts/centers";
import type {
  CenterMobility,
  GetCenterMobilityResponse,
  GetTopMobilityCentersResponse,
} from "@alabiblio/contracts/mobility";
import type {
  UserOrigin,
} from "@alabiblio/contracts/origin";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowRight,
  LayoutGrid,
  List,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { AppShell } from "./app/AppShell";
import DotGrid from "./components/reactbits/DotGrid";
import FadeContent from "./components/reactbits/FadeContent";
import ShinyText from "./components/reactbits/ShinyText";
import {
  fetchCenterDetail,
  fetchCenterMobility,
  fetchCenters,
  fetchTopMobilityCenters,
} from "./features/centers/api";
import {
  buildTopMobilityQuery,
  type CatalogBaseSortBy,
} from "./features/centers/catalogFilters";
import {
  formatFetchError,
} from "./features/centers/screenLogic";
import { useCatalogFilters } from "./features/centers/hooks/useCatalogFilters";
import { CenterCard } from "./features/centers/components/CenterCard";
import { CenterDetailScreen } from "./features/centers/components/CenterDetailScreen";
import { CenterRowItem } from "./features/centers/components/CenterRowItem";
import { TopMobilityCard } from "./features/centers/components/TopMobilityCard";
import { useUserOrigin } from "./features/location/useUserOrigin";
import { BottomNavBar } from "./features/navigation/BottomNavBar";
import { OriginSheet } from "./features/origin/components/OriginSheet";
import { useOriginSearchController } from "./features/origin/hooks/useOriginSearchController";
import {
  getBaseCatalogScopeDescription,
  getBaseCatalogScopeSignal,
  getTopMobilityScopeSignal,
} from "./features/centers/scopePresentation";
import { EmptyStateCard } from "./features/ui/EmptyStateCard";
import { FilterDrawer } from "./features/ui/FilterDrawer";
import { LoadingCard } from "./features/ui/LoadingCard";
import { SearchField } from "./features/ui/SearchField";
import { getOriginStatusText, getOriginTone } from "./features/origin/originPresentation";
import "./App.css";

type ViewMode = "cards" | "rows";

const PAGE_SIZE = 18;

const DESKTOP_NAV = [
  { to: "/", label: "Top 3" },
  { to: "/listado", label: "Listado" },
];

function DesktopTopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="desktop-topbar">
      <div className="desktop-topbar__inner">
        <button type="button" className="desktop-topbar__brand" onClick={() => navigate("/")}>
          <div className="desktop-topbar__logo-mark">
            <Navigation size={14} />
          </div>
          <span className="desktop-topbar__wordmark">alabiblio</span>
        </button>
        <nav className="desktop-topbar__nav">
          {DESKTOP_NAV.map((item) => {
            const active =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <button
                key={item.to}
                type="button"
                className={`desktop-topbar__nav-item${active ? " desktop-topbar__nav-item--active" : ""}`}
                onClick={() => navigate(item.to)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function TopPicksScreen() {
  const navigate = useNavigate();
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

  return (
    <section className="screen screen--list">
      <div className="screen__background">
        <DotGrid dotSize={10} gap={22} baseColor="#243045" activeColor="#ffb45d" />
      </div>

      <FadeContent blur duration={320} className="screen__content">
        {!originActive ? (
          <section className="entry-screen">
            <div className="entry-screen__brand">
              <div className="entry-screen__logo">
                <div className="entry-screen__logo-mark">
                  <Navigation size={26} />
                </div>
                <div className="entry-screen__logo-copy">
                  <ShinyText text="alabiblio" className="entry-screen__wordmark" />
                  <span className="entry-screen__eyebrow">TOP 3 / MADRID / TIEMPO REAL</span>
                </div>
              </div>
              <span className="entry-screen__live-pill">
                <Sparkles size={12} />
                DATOS EN TIEMPO REAL
              </span>
              <h1>Las 3 mejores opciones para ir ahora.</h1>
              <p>
                Resolvemos solo las tres bibliotecas mas utiles desde tu origen y dejamos el listado completo aparte.
              </p>
            </div>

            <div className="entry-screen__actions">
              <button
                type="button"
                className="entry-screen__primary"
                onClick={() => requestGeolocation()}
              >
                <Navigation size={16} />
                Usar mi ubicacion
              </button>
              <button
                type="button"
                className="entry-screen__secondary"
                onClick={() => setOriginSheetOpen(true)}
              >
                <MapPin size={16} />
                Introducir direccion
              </button>
              <button
                type="button"
                className="entry-screen__ghost"
                onClick={() => navigate("/listado")}
              >
                Ver listado base
                <ArrowRight size={14} />
              </button>
              <span className="entry-screen__status">
                {getOriginStatusText(origin, geolocationStatus)}
              </span>
            </div>
          </section>
        ) : (
          <>
            <section className="top-picks-header">
              <div className="top-picks-header__copy">
                <span className="list-topbar__eyebrow">cerca de ti</span>
                <h1>{serverOpenCount > 0 ? "Las mejores opciones abiertas ahora" : "Las mejores opciones proximas"}</h1>
                <p>
                  {serverOpenCount > 0
                    ? "Priorizamos solo centros abiertos y resolvemos transporte completo para las tres mejores opciones."
                    : "No hay centros abiertos elegibles ahora mismo. Mostramos las opciones mas utiles para mas tarde."}
                </p>
              </div>
              <div className="top-picks-header__actions">
                <button
                  type="button"
                  className={`list-topbar__origin list-topbar__origin--${getOriginTone(origin, geolocationStatus)}`}
                  onClick={() => setOriginSheetOpen(true)}
                >
                  <span className="list-topbar__origin-dot" />
                  <Navigation size={15} />
                  <span>{getOriginStatusText(origin, geolocationStatus)}</span>
                </button>
                <button
                  type="button"
                  className="entry-screen__ghost top-picks-header__link"
                  onClick={() => navigate("/listado")}
                >
                  Ver listado base
                  <ArrowRight size={14} />
                </button>
              </div>
            </section>

            <section className="top-picks-summary">
              <span className="list-topbar__pill"><strong>{topPicks.length}</strong> opciones resueltas</span>
              <span className="list-topbar__pill"><strong>{getTopMobilityScopeSignal(topScope)}</strong> scope</span>
              <span className="list-topbar__pill list-topbar__pill--open"><strong>{serverOpenCount}</strong> abiertas ahora</span>
              {originSearch.presetsError ? <span className="screen__inline-error">{originSearch.presetsError}</span> : null}
            </section>

            {loading ? (
              <div className="center-list__grid">
                <LoadingCard count={3} />
              </div>
            ) : error ? (
              <EmptyStateCard title="No se pudo cargar el Top 3" body={error} />
            ) : topScope !== "origin_enriched" || topPicks.length === 0 ? (
              <EmptyStateCard title="Sin opciones cercanas" body="Activa otro origen o abre el listado base para explorar todos los centros." />
            ) : (
              <section className="top-picks-grid">
                {topPicks.map((entry) => (
                  <TopMobilityCard
                    key={entry.center.id}
                    center={entry.center}
                    mobility={entry.mobility}
                    rank={entry.rank}
                    scope={topScope}
                    serverOpenCount={serverOpenCount}
                    onSelect={(slug) => navigate(`/centers/${slug}`)}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </FadeContent>

      <OriginSheet
        open={originSheetOpen}
        origin={origin}
        geolocationStatus={geolocationStatus}
        query={originSearch.query}
        results={originSearch.results}
        loading={originSearch.loading}
        error={originSearch.error}
        presets={originSearch.presets}
        onClose={() => setOriginSheetOpen(false)}
        onRequestGeolocation={() => {
          requestGeolocation();
          originSearch.resetSearch();
          setOriginSheetOpen(false);
        }}
        onQueryChange={originSearch.handleQueryChange}
        onSelectAddress={(option) =>
          applyOrigin({
            kind: "manual_address",
            label: option.label,
            lat: option.lat,
            lon: option.lon,
          })
        }
        onSelectPreset={(preset) =>
          applyOrigin({
            kind: "preset_area",
            label: preset.label,
            area_code: preset.code,
            lat: preset.lat,
            lon: preset.lon,
          })
        }
        onContinueWithoutOrigin={() => {
          originSearch.resetSearch();
          setOriginSheetOpen(false);
          navigate("/listado");
        }}
      />
    </section>
  );
}

function CatalogScreen() {
  const navigate = useNavigate();
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
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
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
        if (isFirstPage) setServerOpenCount(response.open_count);
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
  }, [
    buildRequestQuery,
    deferredSearch,
    offset,
  ]);

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

  return (
    <section className="screen screen--list">
      <div className="screen__background">
        <DotGrid dotSize={10} gap={22} baseColor="#243045" activeColor="#ffb45d" />
      </div>

      <FadeContent blur duration={320} className="screen__content">
        <>
          <section className="list-topbar">
            <div className="list-topbar__row list-topbar__row--headline">
              <div className="list-topbar__title">
                <span className="list-topbar__eyebrow">listado base</span>
                <h1>Catalogo de bibliotecas y salas</h1>
                <p>{getBaseCatalogScopeDescription(catalogScope)}</p>
              </div>
              <div className="list-topbar__signals">
                <span className="list-topbar__signal">{getBaseCatalogScopeSignal(catalogScope)}</span>
                <button
                  type="button"
                  className="list-topbar__origin-button"
                  onClick={() => setOriginSheetOpen(true)}
                  aria-label="Cambiar origen"
                >
                  <Navigation size={16} />
                </button>
              </div>
            </div>
            <div className="list-topbar__meta">
              <span className="list-topbar__pill">
                <strong>{total}</strong> resultados
              </span>
              <span className="list-topbar__pill list-topbar__pill--open">
                <strong>{serverOpenCount}</strong> {filters.openNowOnly ? "abiertos en este filtro" : "abiertos ahora"}
              </span>
              <span className="list-topbar__pill">
                <strong>{items.length}</strong> cargados
              </span>
              <span className="list-topbar__pill">
                <strong>{catalogScope === "base_exploration" ? "base_exploration" : "pendiente"}</strong> scope
              </span>
              <button
                type="button"
                className={`list-topbar__origin list-topbar__origin--${getOriginTone(origin, geolocationStatus)}`}
                onClick={() => setOriginSheetOpen(true)}
              >
                <span className="list-topbar__origin-dot" />
                <Navigation size={15} />
                <span>{getOriginStatusText(origin, geolocationStatus)}</span>
              </button>
              <button
                type="button"
                className="entry-screen__ghost list-topbar__link"
                onClick={() => navigate("/")}
              >
                Ver Top 3
                <ArrowRight size={14} />
              </button>
            </div>
          </section>

          <section className="list-search-strip">
            <div className="list-topbar__search">
              <Search size={16} />
              <SearchField
                value={filters.searchText}
                onChange={handleSearchChange}
                placeholder="Buscar por nombre o barrio..."
              />
            </div>
            <div className="view-toggle">
              <button
                type="button"
                className={`view-toggle__btn${viewMode === "cards" ? " view-toggle__btn--active" : ""}`}
                onClick={() => setViewMode("cards")}
                aria-label="Vista tarjetas"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                className={`view-toggle__btn${viewMode === "rows" ? " view-toggle__btn--active" : ""}`}
                onClick={() => setViewMode("rows")}
                aria-label="Vista lista"
              >
                <List size={16} />
              </button>
            </div>
          </section>

          <section className="controls-bar">
            <div className="controls-bar__row">
              <button
                type="button"
                className={`controls-bar__filters-btn${activeFilterCount > 0 ? " controls-bar__filters-btn--active" : ""}`}
                onClick={openFilterDrawer}
              >
                <SlidersHorizontal size={14} />
                Filtros
                {activeFilterCount > 0 ? (
                  <span className="controls-bar__badge">{activeFilterCount}</span>
                ) : null}
              </button>

              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className="active-pill"
                  onClick={() => handleClearChip(chip.key)}
                >
                  {chip.label} <X size={11} />
                </button>
              ))}

              {activeFilterCount > 0 ? (
                <button type="button" className="controls-bar__clear" onClick={clearAllFilters}>
                  Limpiar todo
                </button>
              ) : null}
            </div>

            {origin ? (
              <button
                type="button"
                className="origin-clear-button"
                onClick={() => { clearOrigin(); resetPagination(); resetListState(); }}
              >
                Reiniciar origen
              </button>
            ) : null}
          </section>

          {originSearch.presetsError ? <p className="screen__inline-error">{originSearch.presetsError}</p> : null}

          <section className="center-list">
            {loading ? (
              <div className="center-list__grid">
                <LoadingCard count={6} />
              </div>
            ) : null}
            {!loading && listError && items.length === 0 ? <EmptyStateCard title="Error de listado" body={listError} /> : null}
            {!loading && !listError && items.length === 0 ? (
              <EmptyStateCard title="Sin resultados" body="Prueba a quitar filtros o cambiar el origen." />
            ) : null}
            {!loading && catalogScope === "base_exploration" && items.length > 0 ? (
              viewMode === "rows" ? (
                <div className="center-list__rows">
                  {items.map((center) => (
                    <CenterRowItem
                      key={center.id}
                      center={center}
                      scope={catalogScope}
                      onSelect={(slug) => navigate(`/centers/${slug}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="center-list__grid">
                  {items.map((center) => (
                    <CenterCard
                      key={center.id}
                      center={center}
                      scope={catalogScope}
                      onSelect={(slug) => navigate(`/centers/${slug}`)}
                    />
                  ))}
                </div>
              )
            ) : null}
            {!loading && listError && items.length > 0 ? (
              <p className="screen__inline-error">{listError}</p>
            ) : null}
            {!loading && hasMore ? (
              <button
                type="button"
                className="center-list__more"
                onClick={() => {
                  setLoadingMore(true);
                  loadMore(items.length);
                }}
                disabled={loadingMore}
              >
                {loadingMore ? "Cargando..." : `Cargar mas (${total - items.length} restantes)`}
              </button>
            ) : null}
          </section>
        </>
      </FadeContent>

      <OriginSheet
        open={originSheetOpen}
        origin={origin}
        geolocationStatus={geolocationStatus}
        query={originSearch.query}
        results={originSearch.results}
        loading={originSearch.loading}
        error={originSearch.error}
        presets={originSearch.presets}
        onClose={() => setOriginSheetOpen(false)}
        onRequestGeolocation={() => {
          requestGeolocation();
          originSearch.resetSearch();
          setOriginSheetOpen(false);
          resetPagination();
          resetListState();
        }}
        onQueryChange={originSearch.handleQueryChange}
        onSelectAddress={(option) =>
          applyOrigin({
            kind: "manual_address",
            label: option.label,
            lat: option.lat,
            lon: option.lon,
          })
        }
        onSelectPreset={(preset) =>
          applyOrigin({
            kind: "preset_area",
            label: preset.label,
            area_code: preset.code,
            lat: preset.lat,
            lon: preset.lon,
          })
        }
        onContinueWithoutOrigin={() => {
          originSearch.resetSearch();
          setOriginSheetOpen(false);
          resetPagination();
          resetListState();
        }}
      />

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={closeFilterDrawer}
        kindFilter={filters.kindFilter}
        onKindChange={handleKindFilterChange}
        sortBy={filters.sortBy}
        onSortChange={handleSortChange}
        openNowOnly={filters.openNowOnly}
        onOpenNowChange={(value) => handleFilterPatch({ openNowOnly: value })}
        wifiOnly={filters.wifiOnly}
        onWifiChange={(value) => handleFilterPatch({ wifiOnly: value })}
        accessibleOnly={filters.accessibleOnly}
        onAccessibleChange={(value) => handleFilterPatch({ accessibleOnly: value })}
        serOnly={filters.serOnly}
        onSerChange={(value) => handleFilterPatch({ serOnly: value })}
        districtFilter={filters.districtFilter}
        onDistrictChange={(value) => handleFilterPatch({ districtFilter: value })}
        neighborhoodFilter={filters.neighborhoodFilter}
        onNeighborhoodChange={(value) => handleFilterPatch({ neighborhoodFilter: value })}
        activeCount={activeFilterCount}
        onClearAll={clearAllFilters}
      />
    </section>
  );
}

function CenterDetailRoute() {
  const { slug } = useParams<{ slug: string }>();
  const { origin } = useUserOrigin();
  const [detail, setDetail] = useState<GetCenterDetailResponse["item"] | null>(null);
  const [detailScope, setDetailScope] = useState<GetCenterDetailResponse["meta"]["scope"] | null>(null);
  const [mobility, setMobility] = useState<CenterMobility | null>(null);
  const [mobilityScope, setMobilityScope] = useState<GetCenterMobilityResponse["meta"]["scope"] | null>(null);
  const [detailResolvedSlug, setDetailResolvedSlug] = useState<string | null>(null);
  const [detailErrorState, setDetailErrorState] = useState<{ slug: string; message: string } | null>(null);
  const [mobilityResolvedKey, setMobilityResolvedKey] = useState<string | null>(null);
  const [mobilityErrorState, setMobilityErrorState] = useState<{ key: string; message: string } | null>(null);
  const requestKey = `${slug ?? "missing"}:${origin?.lat ?? "none"}:${origin?.lon ?? "none"}`;

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();

    void fetchCenterDetail(slug, controller.signal)
      .then((detailResponse) => {
        if (!controller.signal.aborted) {
          setDetail(detailResponse.item);
          setDetailScope(detailResponse.meta.scope);
          setDetailResolvedSlug(slug);
          setDetailErrorState(null);
        }
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setDetail(null);
          setDetailScope(null);
          setDetailResolvedSlug(slug);
          setDetailErrorState({ slug, message: `No se pudo cargar el centro (${nextError.message}).` });
        }
      });

    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();

    void fetchCenterMobility(
      slug,
      origin ? { userLat: origin.lat, userLon: origin.lon } : undefined,
      controller.signal,
    )
      .then((response) => {
        if (!controller.signal.aborted) {
          setMobility(response.item);
          setMobilityScope(response.meta.scope);
          setMobilityResolvedKey(requestKey);
          setMobilityErrorState(null);
        }
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setMobility(null);
          setMobilityScope(null);
          setMobilityResolvedKey(requestKey);
          setMobilityErrorState({ key: requestKey, message: `No se pudo actualizar la movilidad (${nextError.message}).` });
        }
      });

    return () => controller.abort();
  }, [origin, requestKey, slug]);

  const detailMatches = detailResolvedSlug === slug;
  const mobilityMatches = mobilityResolvedKey === requestKey;
  const hasCurrentDetailError = detailErrorState !== null && detailErrorState.slug === slug;
  const hasCurrentMobilityError =
    mobilityErrorState !== null && mobilityErrorState.key === requestKey;
  const loading = slug !== undefined && !detailMatches && !hasCurrentDetailError;
  const mobilityLoading = !!slug && !mobilityMatches && !hasCurrentMobilityError;
  const detailError = hasCurrentDetailError ? detailErrorState.message : null;
  const mobilityError = hasCurrentMobilityError ? mobilityErrorState.message : null;

  return (
    <CenterDetailScreen
      item={detailMatches ? detail : null}
      detailScope={detailMatches ? detailScope : null}
      mobility={mobilityMatches ? mobility : null}
      mobilityScope={mobilityMatches ? mobilityScope : null}
      origin={origin}
      loading={loading}
      mobilityLoading={mobilityLoading}
      mobilityError={mobilityError}
      error={detailError}
    />
  );
}

function AppRoutes() {
  return (
    <AppShell topBar={<DesktopTopBar />} bottomNav={<BottomNavBar />}>
      <Routes>
        <Route path="/" element={<TopPicksScreen />} />
        <Route path="/listado" element={<CatalogScreen />} />
        <Route path="/centers/:slug" element={<CenterDetailRoute />} />
        <Route path="/map" element={<Navigate to="/listado" replace />} />
        <Route path="/search" element={<Navigate to="/listado" replace />} />
        <Route path="/saved" element={<Navigate to="/listado" replace />} />
        <Route path="/profile" element={<Navigate to="/listado" replace />} />
      </Routes>
    </AppShell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;


