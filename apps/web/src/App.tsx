import type {
  CenterKind,
  CenterListItem,
  CenterSortBy,
  GetCenterDetailResponse,
} from "@alabiblio/contracts/centers";
import type { CenterMobility, CenterTopMobilityItem } from "@alabiblio/contracts/mobility";
import type {
  GeocodeAddressOption,
  OriginPreset,
  UserOrigin,
} from "@alabiblio/contracts/origin";
import type { ReactNode } from "react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
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
  Bike,
  Bus,
  Car,
  LayoutGrid,
  List,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TimerReset,
  TrainFront,
  X,
} from "lucide-react";
import { AppShell } from "./app/AppShell";
import DotGrid from "./components/reactbits/DotGrid";
import FadeContent from "./components/reactbits/FadeContent";
import SpotlightCard from "./components/reactbits/SpotlightCard";
import ShinyText from "./components/reactbits/ShinyText";
import {
  fetchCenterDetail,
  fetchCenterMobility,
  fetchCenterMobilitySummary,
  fetchCenters,
  fetchGeocodeOptions,
  fetchOriginPresets,
  fetchTopMobilityCenters,
} from "./features/centers/api";
import {
  buildFeaturedFooterTiles,
  buildFeaturedTransportRows,
  buildHumanReason,
  modeLabel,
} from "./features/centers/transportCopy";
import { CenterCard } from "./features/centers/components/CenterCard";
import { CenterDetailScreen } from "./features/centers/components/CenterDetailScreen";
import { CenterRowItem } from "./features/centers/components/CenterRowItem";
import { useUserOrigin } from "./features/location/useUserOrigin";
import { BottomNavBar } from "./features/navigation/BottomNavBar";
import { OriginSheet } from "./features/origin/components/OriginSheet";
import { EmptyStateCard } from "./features/ui/EmptyStateCard";
import { FilterDrawer } from "./features/ui/FilterDrawer";
import { LoadingCard } from "./features/ui/LoadingCard";
import { SearchField } from "./features/ui/SearchField";
import "./App.css";

type KindFilter = "all" | CenterKind;
type ViewMode = "cards" | "rows";

const PAGE_SIZE = 24;

function buildMotivo(mobility: CenterMobility | null): string {
  return buildHumanReason(mobility);
}

function getOriginStatusText(
  origin: UserOrigin | null,
  geolocationStatus: ReturnType<typeof useUserOrigin>["geolocationStatus"],
): string {
  if (origin?.kind === "manual_address") return origin.label;
  if (origin?.kind === "preset_area") return origin.label;
  if (origin?.kind === "geolocation") return "Mi ubicacion actual";
  switch (geolocationStatus) {
    case "requesting": return "Buscando ubicacion";
    case "denied": return "Permiso denegado";
    case "unavailable": return "Ubicacion no disponible";
    default: return "Sin origen activo";
  }
}

function getOriginTone(
  origin: UserOrigin | null,
  geolocationStatus: ReturnType<typeof useUserOrigin>["geolocationStatus"],
): "live" | "approx" | "idle" {
  if (origin?.kind === "geolocation" || geolocationStatus === "granted") return "live";
  if (origin?.kind === "manual_address" || origin?.kind === "preset_area") return "approx";
  return "idle";
}

function buildListSubtitle(origin: UserOrigin | null): string {
  if (!origin) return "Explora sin origen o activa uno para calcular llegadas";
  return `Saliendo desde ${origin.label}`;
}

function buildCentersListQuery(input: {
  kindFilter: KindFilter;
  deferredSearch: string;
  limit?: number;
  offset?: number;
  openNowOnly: boolean;
  wifiOnly: boolean;
  socketsOnly: boolean;
  accessibleOnly: boolean;
  serOnly: boolean;
  districtFilter: string;
  neighborhoodFilter: string;
  sortBy: CenterSortBy;
  userLat?: number;
  userLon?: number;
}) {
  return {
    kind: input.kindFilter === "all" ? undefined : input.kindFilter,
    q: input.deferredSearch === "" ? undefined : input.deferredSearch,
    limit: input.limit,
    offset: input.offset,
    open_now: input.openNowOnly || undefined,
    has_wifi: input.wifiOnly || undefined,
    has_sockets: input.socketsOnly || undefined,
    accessible: input.accessibleOnly || undefined,
    has_ser: input.serOnly || undefined,
    district: input.districtFilter || undefined,
    neighborhood: input.neighborhoodFilter || undefined,
    sort_by: input.sortBy,
    user_lat: input.userLat,
    user_lon: input.userLon,
  };
}

function pickFeaturedCenter(items: CenterListItem[], originActive: boolean): CenterListItem | null {
  if (!originActive || items.length === 0) return null;
  return items.find((item) => item.is_open_now) ?? items[0] ?? null;
}

function buildFeaturedCardFrame(
  center: CenterListItem | null,
  recommendedMode: CenterMobility["summary"]["best_mode"],
  serverOpenCount: number,
): {
  eyebrow: string;
  sectionTitle: string;
  sectionSummary: string;
} {
  const timingSummary =
    center && center.decision.best_time_minutes !== null && recommendedMode
      ? `${center.decision.best_time_minutes} min en ${modeLabel(recommendedMode)}`
      : "Sin origen suficiente";

  if (!center) {
    return {
      eyebrow: "Opcion destacada",
      sectionTitle: "Planifica el trayecto",
      sectionSummary: timingSummary,
    };
  }

  if (center.is_open_now) {
    return {
      eyebrow: "Mejor opcion ahora",
      sectionTitle: "Llegar ahora",
      sectionSummary: timingSummary,
    };
  }

  if (center.opens_today) {
    return {
      eyebrow: serverOpenCount === 0 ? "Mejor opcion proxima" : "Opcion destacada",
      sectionTitle: "Preparala para cuando abra",
      sectionSummary:
        timingSummary === "Sin origen suficiente"
          ? `Abre a las ${center.opens_today}`
          : `Abre a las ${center.opens_today} - ${timingSummary}`,
    };
  }

  return {
    eyebrow: "Mejor opcion cercana",
    sectionTitle: "Planifica el trayecto",
    sectionSummary: timingSummary,
  };
}

function LandingFeature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <SpotlightCard className="landing-feature">
      <span className="landing-feature__icon">{icon}</span>
      <div className="landing-feature__copy">
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </SpotlightCard>
  );
}

const DESKTOP_NAV = [
  { to: "/", label: "Explorar" },
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

function ExplorerScreen() {
  const navigate = useNavigate();
  const [exploreWithoutOrigin, setExploreWithoutOrigin] = useState(false);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sortBy, setSortBy] = useState<CenterSortBy>("recommended");
  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText.trim());
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [socketsOnly, setSocketsOnly] = useState(false);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [serOnly, setSerOnly] = useState(false);
  const [districtFilter, setDistrictFilter] = useState<string>("");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<string>("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [items, setItems] = useState<CenterListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [serverOpenCount, setServerOpenCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [originSheetOpen, setOriginSheetOpen] = useState(false);
  const [originQuery, setOriginQuery] = useState("");
  const [originResults, setOriginResults] = useState<GeocodeAddressOption[]>([]);
  const [originSearchLoading, setOriginSearchLoading] = useState(false);
  const [originSearchError, setOriginSearchError] = useState<string | null>(null);
  const [originPresets, setOriginPresets] = useState<OriginPreset[]>([]);
  const [originPresetsError, setOriginPresetsError] = useState<string | null>(null);
  const [topMobilityItems, setTopMobilityItems] = useState<CenterTopMobilityItem[]>([]);
  const [topMobilityResolvedKey, setTopMobilityResolvedKey] = useState<string | null>(null);
  const [cardMobilityBySlug, setCardMobilityBySlug] = useState<Record<string, CenterMobility>>({});
  const [cardMobilityLoadingBySlug, setCardMobilityLoadingBySlug] = useState<Record<string, boolean>>({});
  const originSearchController = useRef<AbortController | null>(null);
  const {
    origin,
    geolocationStatus,
    requestGeolocation,
    setManualOrigin,
    clearOrigin,
  } = useUserOrigin();

  const originActive = origin !== null;
  const showEntry = !originActive && !exploreWithoutOrigin;
  const hasMore = items.length < total;
  const topMobilityKey = originActive
    ? JSON.stringify(buildCentersListQuery({
      kindFilter,
      deferredSearch,
      openNowOnly,
      wifiOnly,
      socketsOnly,
      accessibleOnly,
      serOnly,
      districtFilter,
      neighborhoodFilter,
      sortBy,
      userLat: origin?.lat,
      userLon: origin?.lon,
    }))
    : null;
  const topMobilityItemsDisplay = topMobilityResolvedKey === topMobilityKey ? topMobilityItems : [];
  const topMobilityLoading = originActive && topMobilityResolvedKey !== topMobilityKey;
  const topMobilityMap = new Map(topMobilityItemsDisplay.map((entry) => [entry.slug, entry.item] as const));
  const bestOption =
    (topMobilityItemsDisplay[0]
      ? items.find((item) => item.slug === topMobilityItemsDisplay[0]?.slug) ?? null
      : null) ?? pickFeaturedCenter(items, originActive);
  const featuredTargetSlug = bestOption?.slug ?? null;
  const featuredMobilityDisplay =
    featuredTargetSlug ? topMobilityMap.get(featuredTargetSlug) ?? cardMobilityBySlug[featuredTargetSlug] ?? null : null;
  const featuredMobilityLoading = topMobilityLoading && featuredTargetSlug !== null && featuredMobilityDisplay === null;
  const recommendedMode = featuredMobilityDisplay?.summary.best_mode ?? bestOption?.decision.best_mode ?? null;
  const featuredTransportRows = buildFeaturedTransportRows(featuredMobilityDisplay);
  const featuredFooterTiles = buildFeaturedFooterTiles(featuredMobilityDisplay, bestOption ?? null);
  const featuredCardFrame = buildFeaturedCardFrame(bestOption, recommendedMode, serverOpenCount);
  const topMobilitySlugs = new Set(topMobilityItemsDisplay.map((entry) => entry.slug));

  // Active filter count (for badge)
  const activeFilterCount = [
    openNowOnly, wifiOnly, socketsOnly, accessibleOnly, serOnly,
    districtFilter !== "", neighborhoodFilter !== "",
  ].filter(Boolean).length;

  useEffect(() => {
    const controller = new AbortController();
    void fetchOriginPresets(controller.signal)
      .then((response) => setOriginPresets(response.items))
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setOriginPresetsError(`No se pudieron cargar las zonas (${error.message}).`);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const isFirstPage = offset === 0;

    void fetchCenters(
      buildCentersListQuery({
        kindFilter,
        deferredSearch,
        limit: PAGE_SIZE,
        offset,
        openNowOnly,
        wifiOnly,
        socketsOnly,
        accessibleOnly,
        serOnly,
        districtFilter,
        neighborhoodFilter,
        sortBy,
        userLat: origin?.lat,
        userLon: origin?.lon,
      }),
      controller.signal,
    )
      .then((response) => {
        setItems((current) =>
          isFirstPage ? response.items : [...current, ...response.items],
        );
        setTotal(response.total);
        if (isFirstPage) setServerOpenCount(response.open_count);
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setListError(`No se pudo cargar el listado (${error.message}).`);
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
    accessibleOnly,
    deferredSearch,
    districtFilter,
    neighborhoodFilter,
    kindFilter,
    offset,
    openNowOnly,
    socketsOnly,
    serOnly,
    origin?.lat,
    origin?.lon,
    sortBy,
    wifiOnly,
  ]);

  useEffect(() => {
    if (!originActive) {
      return;
    }

    const controller = new AbortController();

    void fetchTopMobilityCenters(
      buildCentersListQuery({
        kindFilter,
        deferredSearch,
        openNowOnly,
        wifiOnly,
        socketsOnly,
        accessibleOnly,
        serOnly,
        districtFilter,
        neighborhoodFilter,
        sortBy,
        userLat: origin?.lat,
        userLon: origin?.lon,
      }),
      controller.signal,
    )
      .then((response) => {
        if (!controller.signal.aborted) {
          setTopMobilityItems(response.items);
          setTopMobilityResolvedKey(topMobilityKey);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTopMobilityItems([]);
          setTopMobilityResolvedKey(topMobilityKey);
        }
      });

    return () => controller.abort();
  }, [
    accessibleOnly,
    deferredSearch,
    districtFilter,
    neighborhoodFilter,
    kindFilter,
    openNowOnly,
    originActive,
    origin?.lat,
    origin?.lon,
    serOnly,
    socketsOnly,
    sortBy,
    topMobilityKey,
    wifiOnly,
  ]);

  function resetListState(): void {
    setOffset(0);
    setItems([]);
    setTotal(0);
    setServerOpenCount(0);
    setTopMobilityItems([]);
    setTopMobilityResolvedKey(null);
    setCardMobilityBySlug({});
    setCardMobilityLoadingBySlug({});
    setLoading(true);
    setLoadingMore(false);
    setListError(null);
  }

  function handleLoadCardMobility(slug: string): void {
    if (!origin || cardMobilityBySlug[slug] || cardMobilityLoadingBySlug[slug]) {
      return;
    }

    setCardMobilityLoadingBySlug((current) => ({ ...current, [slug]: true }));

    void fetchCenterMobilitySummary(
      slug,
      {
        userLat: origin.lat,
        userLon: origin.lon,
      },
    )
      .then((response) => {
        setCardMobilityBySlug((current) => ({
          ...current,
          [slug]: response.item,
        }));
      })
      .finally(() => {
        setCardMobilityLoadingBySlug((current) => ({
          ...current,
          [slug]: false,
        }));
      });
  }

  function clearAllFilters(): void {
    setOpenNowOnly(false);
    setWifiOnly(false);
    setSocketsOnly(false);
    setAccessibleOnly(false);
    setSerOnly(false);
    setDistrictFilter("");
    setNeighborhoodFilter("");
    resetListState();
  }

  function handleOriginQueryChange(value: string): void {
    setOriginQuery(value);

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      originSearchController.current?.abort();
      setOriginResults([]);
      setOriginSearchError(null);
      setOriginSearchLoading(false);
      return;
    }

    setOriginSearchLoading(true);
    setOriginSearchError(null);
  }

  // Debounced origin autocomplete: fires 350ms after query changes
  useEffect(() => {
    const q = originQuery.trim();
    if (q.length < 3) {
      return;
    }
    originSearchController.current?.abort();
    const controller = new AbortController();
    originSearchController.current = controller;
    const timer = window.setTimeout(() => {
      void fetchGeocodeOptions(q, controller.signal)
        .then((response) => {
          if (!controller.signal.aborted) {
            setOriginResults(response.items);
            setOriginSearchError(
              response.items.length === 0 ? "No encuentro esa direccion. Prueba con calle, barrio o estacion." : null,
            );
            setOriginSearchLoading(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setOriginSearchError("No se pudo buscar la direccion. Intentalo de nuevo.");
            setOriginResults([]);
            setOriginSearchLoading(false);
          }
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [originQuery]);

  function applyOrigin(nextOrigin: UserOrigin): void {
    setManualOrigin(nextOrigin);
    setExploreWithoutOrigin(false);
    setOriginQuery(nextOrigin.label);
    setOriginResults([]);
    setOriginSearchError(null);
    setOriginSheetOpen(false);
    resetListState();
  }

  return (
    <section className="screen screen--list">
      <div className="screen__background">
        <DotGrid dotSize={10} gap={22} baseColor="#243045" activeColor="#ffb45d" />
      </div>

      <FadeContent blur duration={320} className="screen__content">
        {showEntry ? (
          <section className="entry-screen">
            <div className="entry-screen__brand">
              <div className="entry-screen__logo">
                <div className="entry-screen__logo-mark">
                  <Navigation size={26} />
                </div>
                <div className="entry-screen__logo-copy">
                  <ShinyText text="alabiblio" className="entry-screen__wordmark" />
                  <span className="entry-screen__eyebrow">ESPACIOS / ETA / MADRID</span>
                </div>
              </div>
              <span className="entry-screen__live-pill">
                <Sparkles size={12} />
                EN VIVO
              </span>
              <h1>Decide rapido a que biblioteca te compensa ir ahora.</h1>
              <p>
                Calculamos llegada, alternativa dominante y servicios utiles desde tu origen.
              </p>
            </div>

            <div className="entry-screen__highlights">
              <LandingFeature
                icon={<Bus size={18} />}
                title="EMT en tiempo real"
                body="Usamos llegadas reales cuando hay base suficiente."
              />
              <LandingFeature
                icon={<TimerReset size={18} />}
                title="ETA siempre util"
                body="Si no hay transporte, caemos a tiempo andando."
              />
              <LandingFeature
                icon={<ShieldCheck size={18} />}
                title="Servicios claros"
                body="WiFi, enchufes, accesible y mas evidencia."
              />
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
                onClick={() => {
                  setExploreWithoutOrigin(true);
                  setOriginSheetOpen(false);
                  resetListState();
                }}
              >
                Continuar sin ubicacion
                <ArrowRight size={14} />
              </button>
              <span className="entry-screen__status">
                {getOriginStatusText(origin, geolocationStatus)}
              </span>
            </div>
          </section>
        ) : (
          <>
            {/* List topbar */}
            <section className="list-topbar">
              <div className="list-topbar__row list-topbar__row--headline">
                <div className="list-topbar__title">
                  <span className="list-topbar__eyebrow">decision activa</span>
                  <h1>Bibliotecas</h1>
                  <p>{buildListSubtitle(origin)}</p>
                </div>
                <div className="list-topbar__signals">
                  <span className="list-topbar__signal list-topbar__signal--live">LIVE</span>
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
                  <strong>{total}</strong> centros
                </span>
                <span className="list-topbar__pill list-topbar__pill--open">
                  <strong>{serverOpenCount}</strong> abiertos
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
              </div>
            </section>

            {/* Search + view toggle */}
            <section className="list-search-strip">
              <div className="list-topbar__search">
                <Search size={16} />
                <SearchField
                  value={searchText}
                  onChange={(value) => {
                    setSearchText(value);
                    resetListState();
                  }}
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

            {/* Controls bar: unico sistema de filtros */}
            <section className="controls-bar">
              <div className="controls-bar__row">
                <button
                  type="button"
                  className={`controls-bar__filters-btn${activeFilterCount > 0 ? " controls-bar__filters-btn--active" : ""}`}
                  onClick={() => setFilterDrawerOpen(true)}
                >
                  <SlidersHorizontal size={14} />
                  Filtros
                  {activeFilterCount > 0 ? (
                    <span className="controls-bar__badge">{activeFilterCount}</span>
                  ) : null}
                </button>

                {/* Active filter pills */}
                {kindFilter !== "all" ? (
                  <button type="button" className="active-pill" onClick={() => { setKindFilter("all"); resetListState(); }}>
                    {kindFilter === "library" ? "Bibliotecas" : "Salas estudio"}
                    <X size={11} />
                  </button>
                ) : null}
                {sortBy !== "recommended" ? (
                  <button type="button" className="active-pill" onClick={() => { setSortBy("recommended"); resetListState(); }}>
                    {sortBy === "distance" ? "Por distancia" : sortBy === "arrival" ? "Mejor ETA" : "Abiertos primero"}
                    <X size={11} />
                  </button>
                ) : null}
                {openNowOnly ? (
                  <button type="button" className="active-pill" onClick={() => { setOpenNowOnly(false); resetListState(); }}>
                    Abierto ahora <X size={11} />
                  </button>
                ) : null}
                {wifiOnly ? (
                  <button type="button" className="active-pill" onClick={() => { setWifiOnly(false); resetListState(); }}>
                    WiFi <X size={11} />
                  </button>
                ) : null}
                {socketsOnly ? (
                  <button type="button" className="active-pill" onClick={() => { setSocketsOnly(false); resetListState(); }}>
                    Enchufes <X size={11} />
                  </button>
                ) : null}
                {accessibleOnly ? (
                  <button type="button" className="active-pill" onClick={() => { setAccessibleOnly(false); resetListState(); }}>
                    Accesible <X size={11} />
                  </button>
                ) : null}
                {serOnly ? (
                  <button type="button" className="active-pill" onClick={() => { setSerOnly(false); resetListState(); }}>
                    Zona SER <X size={11} />
                  </button>
                ) : null}
                {districtFilter ? (
                  <button type="button" className="active-pill" onClick={() => { setDistrictFilter(""); resetListState(); }}>
                    {districtFilter} <X size={11} />
                  </button>
                ) : null}
                {neighborhoodFilter ? (
                  <button type="button" className="active-pill" onClick={() => { setNeighborhoodFilter(""); resetListState(); }}>
                    {neighborhoodFilter} <X size={11} />
                  </button>
                ) : null}

                {activeFilterCount > 0 ? (
                  <button type="button" className="controls-bar__clear" onClick={clearAllFilters}>
                    Limpiar todo
                  </button>
                ) : null}

                <div className="controls-bar__spacer" />

                {/* View toggle */}
                <div className="view-toggle">
                  <button
                    type="button"
                    className={`view-toggle__btn${viewMode === "cards" ? " view-toggle__btn--active" : ""}`}
                    onClick={() => setViewMode("cards")}
                    aria-label="Vista tarjetas"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    className={`view-toggle__btn${viewMode === "rows" ? " view-toggle__btn--active" : ""}`}
                    onClick={() => setViewMode("rows")}
                    aria-label="Vista lista"
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>

              {origin ? (
                <button
                  type="button"
                  className="origin-clear-button"
                  onClick={() => { clearOrigin(); setExploreWithoutOrigin(false); resetListState(); }}
                >
                  Reiniciar origen
                </button>
              ) : null}
            </section>

            {/* Featured card: mejor opcion */}
            {bestOption ? (
              <button
                type="button"
                className="best-option-card"
                onClick={() => navigate(`/centers/${bestOption.slug}`)}
              >
                <SpotlightCard className="best-option-card__surface">
                  <div className="best-option-card__eyebrow-row">
                    <span className="best-option-card__eyebrow">
                      <Sparkles size={11} />
                      {featuredCardFrame.eyebrow}
                    </span>
                    <span className="best-option-card__kind-badge">{bestOption.kind_label}</span>
                    <span className={bestOption.is_open_now ? "decision-card__status decision-card__status--open" : "decision-card__status decision-card__status--closed"}>
                      {bestOption.is_open_now ? "Abierta" : "Cerrada"}
                    </span>
                  </div>

                  <h2 className="best-option-card__name">{bestOption.name}</h2>

                  {bestOption.district || bestOption.neighborhood || bestOption.closes_today || bestOption.opens_today ? (
                    <p className="best-option-card__subline">
                      {bestOption.district || bestOption.neighborhood ? (
                        <>
                          <MapPin size={11} />
                          {[bestOption.neighborhood, bestOption.district].filter(Boolean).join(" - ")}
                        </>
                      ) : null}
                      {(bestOption.district || bestOption.neighborhood) && (bestOption.closes_today || bestOption.opens_today) ? " - " : null}
                      {bestOption.is_open_now && bestOption.closes_today
                        ? `Cierra a las ${bestOption.closes_today}`
                        : !bestOption.is_open_now && bestOption.opens_today
                        ? `Abre a las ${bestOption.opens_today}`
                        : null}
                    </p>
                  ) : null}

                  <div className="best-option-card__section-head">
                    <div>
                      <strong>{featuredCardFrame.sectionTitle}</strong>
                      <span>{featuredCardFrame.sectionSummary}</span>
                    </div>
                  </div>

                  <div className="best-option-card__board">
                    {featuredTransportRows.map((row) => (
                      <div
                        key={row.mode}
                        className={`best-option-card__board-row${row.recommended ? " best-option-card__board-row--recommended" : ""}`}
                      >
                        <span className="best-option-card__board-mode">
                          {row.mode === "metro" ? <TrainFront size={14} /> : row.mode === "bus" ? <Bus size={14} /> : <Bike size={14} />}
                          {row.label}
                        </span>
                        <span className="best-option-card__board-body">{row.body}</span>
                        <span className="best-option-card__board-eta">{row.eta}</span>
                      </div>
                    ))}
                  </div>

                  <div className="best-option-card__footer-grid">
                    {featuredFooterTiles.map((tile) => (
                      <div
                        key={tile.mode}
                        className={`best-option-card__footer-tile best-option-card__footer-tile--${tile.mode}`}
                      >
                        <span className="best-option-card__footer-label">
                          {tile.mode === "car" ? <Car size={13} /> : <Navigation size={13} />}
                          {tile.label}
                        </span>
                        <strong className="best-option-card__footer-body">{tile.body}</strong>
                      </div>
                    ))}
                  </div>

                  {featuredMobilityLoading ? (
                    <span className="best-option-card__transport-loading">Actualizando transporte en tiempo real...</span>
                  ) : null}

                  <p className="best-option-card__reason">{buildMotivo(featuredMobilityDisplay)}</p>

                  <div className="best-option-card__footer">
                    <span className="best-option-card__cta">
                      Ver detalle <ArrowRight size={13} />
                    </span>
                  </div>
                </SpotlightCard>
              </button>
            ) : null}

            {originPresetsError ? <p className="screen__inline-error">{originPresetsError}</p> : null}

            {/* Results */}
            <section className="center-list">
              {loading ? (
                <div className="center-list__grid">
                  <LoadingCard count={6} />
                </div>
              ) : null}
              {!loading && listError ? <EmptyStateCard title="Error de listado" body={listError} /> : null}
              {!loading && !listError && items.length === 0 ? (
                <EmptyStateCard title="Sin resultados" body="Prueba a quitar filtros o cambiar el origen." />
              ) : null}
              {!loading && !listError ? (
                viewMode === "rows" ? (
                  <div className="center-list__rows">
                    {items.map((center) => (
                      <CenterRowItem
                        key={center.id}
                        center={center}
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
                        mobility={topMobilityMap.get(center.slug) ?? cardMobilityBySlug[center.slug] ?? null}
                        mobilityLoading={cardMobilityLoadingBySlug[center.slug] ?? false}
                        canLoadMobility={originActive && !topMobilitySlugs.has(center.slug)}
                        onLoadMobility={() => handleLoadCardMobility(center.slug)}
                        onSelect={(slug) => navigate(`/centers/${slug}`)}
                      />
                    ))}
                  </div>
                )
              ) : null}
              {!loading && !listError && hasMore ? (
                <button
                  type="button"
                  className="center-list__more"
                  onClick={() => {
                    setLoadingMore(true);
                    setOffset(items.length);
                  }}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Cargando..." : `Cargar mas (${total - items.length} restantes)`}
                </button>
              ) : null}
            </section>
          </>
        )}
      </FadeContent>

      <OriginSheet
        open={originSheetOpen}
        origin={origin}
        geolocationStatus={geolocationStatus}
        query={originQuery}
        results={originResults}
        loading={originSearchLoading}
        error={originSearchError}
        presets={originPresets}
        onClose={() => setOriginSheetOpen(false)}
        onRequestGeolocation={() => {
          requestGeolocation();
          setOriginResults([]);
          setOriginSearchError(null);
          setOriginSheetOpen(false);
          resetListState();
        }}
        onQueryChange={handleOriginQueryChange}
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
          clearOrigin();
          setOriginSheetOpen(false);
          resetListState();
        }}
      />

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        kindFilter={kindFilter}
        onKindChange={(v) => { setKindFilter(v); resetListState(); }}
        sortBy={sortBy}
        onSortChange={(v) => { setSortBy(v); resetListState(); }}
        openNowOnly={openNowOnly}
        onOpenNowChange={(v) => { setOpenNowOnly(v); resetListState(); }}
        wifiOnly={wifiOnly}
        onWifiChange={(v) => { setWifiOnly(v); resetListState(); }}
        socketsOnly={socketsOnly}
        onSocketsChange={(v) => { setSocketsOnly(v); resetListState(); }}
        accessibleOnly={accessibleOnly}
        onAccessibleChange={(v) => { setAccessibleOnly(v); resetListState(); }}
        serOnly={serOnly}
        onSerChange={(v) => { setSerOnly(v); resetListState(); }}
        districtFilter={districtFilter}
        onDistrictChange={(v) => { setDistrictFilter(v); resetListState(); }}
        neighborhoodFilter={neighborhoodFilter}
        onNeighborhoodChange={(v) => { setNeighborhoodFilter(v); resetListState(); }}
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
  const [mobility, setMobility] = useState<CenterMobility | null>(null);
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
          setDetailResolvedSlug(slug);
          setDetailErrorState(null);
        }
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setDetail(null);
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
          setMobilityResolvedKey(requestKey);
          setMobilityErrorState(null);
        }
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setMobility(null);
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
      mobility={mobilityMatches ? mobility : null}
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
        <Route path="/" element={<ExplorerScreen />} />
        <Route path="/centers/:slug" element={<CenterDetailRoute />} />
        <Route path="/map" element={<Navigate to="/" replace />} />
        <Route path="/search" element={<Navigate to="/" replace />} />
        <Route path="/saved" element={<Navigate to="/" replace />} />
        <Route path="/profile" element={<Navigate to="/" replace />} />
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


