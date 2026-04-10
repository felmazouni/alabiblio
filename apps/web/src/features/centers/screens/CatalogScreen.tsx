import type { UserOrigin } from "@alabiblio/contracts/origin";
import {
  ArrowRight,
  BookOpen,
  LayoutGrid,
  List,
  Navigation,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import FadeContent from "../../../components/reactbits/FadeContent";
import { CenterCard } from "../components/CenterCard";
import { CenterRowItem } from "../components/CenterRowItem";
import { getBaseCatalogScopeDescription, getBaseCatalogScopeSignal } from "../scopePresentation";
import { useCatalogScreen } from "../hooks/useCatalogScreen";
import { OriginSheet } from "../../origin/components/OriginSheet";
import { getOriginStatusText, getOriginTone } from "../../origin/originPresentation";
import { EmptyStateCard } from "../../ui/EmptyStateCard";
import { FilterDrawer } from "../../ui/FilterDrawer";
import { LoadingCard } from "../../ui/LoadingCard";
import { SearchField } from "../../ui/SearchField";
import { BackgroundIllustration } from "../../ui/BackgroundIllustration";

export function CatalogScreen() {
  const navigate = useNavigate();
  const {
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
    openOriginSheet,
    closeOriginSheet,
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
  } = useCatalogScreen();

  function handleApplyOrigin(nextOrigin: UserOrigin): void {
    applyOrigin(nextOrigin);
  }

  const visibleResults = items.length;
  const hasActiveSearch = filters.searchText.trim().length > 0;

  return (
    <section className="screen screen--list catalog-screen">
      <div className="screen__background">
        <BackgroundIllustration />
      </div>

      <FadeContent blur duration={320} className="screen__content">
        <section className="list-topbar catalog-screen__hero">
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
                onClick={openOriginSheet}
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
              <strong>{visibleResults}</strong> cargados
            </span>
            {activeFilterCount > 0 ? (
              <span className="list-topbar__pill">
                <strong>{activeFilterCount}</strong> filtros
              </span>
            ) : null}
            <button
              type="button"
              className={`list-topbar__origin list-topbar__origin--${getOriginTone(origin, geolocationStatus)}`}
              onClick={openOriginSheet}
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

        <section className="list-search-strip catalog-screen__search-strip">
          <div className="list-topbar__search">
            <Search size={16} />
            <SearchField
              value={filters.searchText}
              onChange={handleSearchChange}
              placeholder="Buscar por nombre o barrio..."
            />
          </div>
          <div className="catalog-screen__search-actions">
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

            {origin ? (
              <button
                type="button"
                className="origin-clear-button"
                onClick={clearOriginAndReset}
              >
                Reiniciar origen
              </button>
            ) : null}

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
          </div>
        </section>

        <section className="controls-bar catalog-screen__controls">
          <div className="catalog-screen__controls-summary">
            <span className="catalog-screen__summary-pill">
              {loading ? "Cargando listado..." : `${visibleResults} de ${total} visibles`}
            </span>
            <span className="catalog-screen__summary-pill">
              {hasActiveSearch ? "Busqueda activa" : "Listado base sin ranking contextual"}
            </span>
          </div>
          {activeChips.length > 0 || activeFilterCount > 0 ? (
            <div className="controls-bar__row">
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
              onClick={loadNextPage}
              disabled={loadingMore}
            >
              {loadingMore ? "Cargando..." : `Cargar mas (${total - items.length} restantes)`}
            </button>
          ) : null}
        </section>

        <footer className="catalog-screen__footer">
          <div className="catalog-screen__footer-brand">
            <div className="catalog-screen__footer-mark">
              <BookOpen size={18} />
            </div>
            <span>AlaBiblio</span>
          </div>
          <p>Proyecto de la Comunidad de Madrid</p>
          <span>Catalogo base con filtros reales y acceso al detalle</span>
        </footer>
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
        onClose={closeOriginSheet}
        onRequestGeolocation={requestGeolocationFromSheet}
        onQueryChange={originSearch.handleQueryChange}
        onSelectAddress={(option) =>
          handleApplyOrigin({
            kind: "manual_address",
            label: option.label,
            lat: option.lat,
            lon: option.lon,
          })}
        onSelectPreset={(preset) =>
          handleApplyOrigin({
            kind: "preset_area",
            label: preset.label,
            area_code: preset.code,
            lat: preset.lat,
            lon: preset.lon,
          })}
        onContinueWithoutOrigin={continueWithoutOrigin}
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
