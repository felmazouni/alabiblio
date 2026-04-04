import type {
  CenterKind,
  CenterListItem,
  CenterSortBy,
  GetCenterDetailResponse,
} from "@alabiblio/contracts/centers";
import type {
  CenterMobility,
  CenterTopMobilityCardV1,
  CenterTopMobilityItem,
} from "@alabiblio/contracts/mobility";
import type {
  GeocodeAddressOption,
  OriginPreset,
  UserOrigin,
} from "@alabiblio/contracts/origin";
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
  SlidersHorizontal,
  Sparkles,
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

const PAGE_SIZE = 18;

function buildMotivo(mobility: CenterMobility | null): string {
  return buildHumanReason(mobility);
}

function formatFetchError(scope: "top" | "catalog", error: Error): string {
  if (error.message === "Failed to fetch") {
    return scope === "catalog"
      ? "No se pudo cargar el listado. La conexion no respondio a tiempo."
      : "No se pudo cargar el Top 3. La conexion no respondio a tiempo.";
  }

  if (error.message.startsWith("centers_list_500")) {
    return "No se pudo cargar el listado base. El endpoint devolvio un error interno.";
  }

  if (error.message.startsWith("top_mobility_500")) {
    return "No se pudieron resolver las mejores opciones. El endpoint devolvio un error interno.";
  }

  return scope === "catalog"
    ? `No se pudo cargar el listado (${error.message}).`
    : `No se pudieron cargar las mejores opciones (${error.message}).`;
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

function buildFeaturedCardFrame(
  center: Pick<CenterTopMobilityCardV1, "is_open_now" | "opens_today" | "decision"> | null,
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
  const [originQuery, setOriginQuery] = useState("");
  const [originResults, setOriginResults] = useState<GeocodeAddressOption[]>([]);
  const [originSearchLoading, setOriginSearchLoading] = useState(false);
  const [originSearchError, setOriginSearchError] = useState<string | null>(null);
  const [originPresets, setOriginPresets] = useState<OriginPreset[]>([]);
  const [originPresetsError, setOriginPresetsError] = useState<string | null>(null);
  const [serverOpenCount, setServerOpenCount] = useState(0);
  const [topMobilityItems, setTopMobilityItems] = useState<CenterTopMobilityItem[]>([]);
  const [topPicksResolvedKey, setTopPicksResolvedKey] = useState<string | null>(null);
  const [topPicksErrorState, setTopPicksErrorState] = useState<{ key: string; message: string } | null>(null);
  const originSearchController = useRef<AbortController | null>(null);
  const {
    origin,
    geolocationStatus,
    requestGeolocation,
    setManualOrigin,
  } = useUserOrigin();

  const originActive = origin !== null;
  const requestKey = originActive ? `${origin?.lat ?? "none"}:${origin?.lon ?? "none"}` : null;
  const topPicks = topMobilityItems
    .map((entry) => ({
      rank: entry.rank,
      center: entry.center,
      mobility: entry.item,
    }));
  const hasCurrentTopPicksError =
    topPicksErrorState !== null && topPicksErrorState.key === requestKey;
  const loading = originActive && topPicksResolvedKey !== requestKey && !hasCurrentTopPicksError;
  const error = hasCurrentTopPicksError ? topPicksErrorState.message : null;

  useEffect(() => {
    const controller = new AbortController();
    void fetchOriginPresets(controller.signal)
      .then((response) => setOriginPresets(response.items))
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setOriginPresetsError(`No se pudieron cargar las zonas (${nextError.message}).`);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!originActive) {
      return;
    }

    const controller = new AbortController();
    const resolvedRequestKey = requestKey ?? "none";

    void fetchTopMobilityCenters(
      buildCentersListQuery({
        kindFilter: "all",
        deferredSearch: "",
        limit: 12,
        offset: 0,
        openNowOnly: false,
        wifiOnly: false,
        socketsOnly: false,
        accessibleOnly: false,
        serOnly: false,
        districtFilter: "",
        neighborhoodFilter: "",
        sortBy: "recommended",
        userLat: origin?.lat,
        userLon: origin?.lon,
      }),
      controller.signal,
    )
      .then((topResponse) => {
        if (!controller.signal.aborted) {
          setServerOpenCount(topResponse.open_count);
          setTopMobilityItems(topResponse.items);
          setTopPicksResolvedKey(resolvedRequestKey);
          setTopPicksErrorState(null);
        }
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setTopMobilityItems([]);
          setTopPicksResolvedKey(resolvedRequestKey);
          setTopPicksErrorState({
            key: resolvedRequestKey,
            message: formatFetchError("top", nextError),
          });
        }
      });

    return () => controller.abort();
  }, [originActive, origin?.lat, origin?.lon, requestKey]);

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
    setOriginQuery(nextOrigin.label);
    setOriginResults([]);
    setOriginSearchError(null);
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
                <h1>Las 3 mejores opciones</h1>
                <p>Analizamos tres centros con transporte completo y dejamos el resto del catalogo en carga base.</p>
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
              <span className="list-topbar__pill list-topbar__pill--open"><strong>{serverOpenCount}</strong> abiertas</span>
              {originPresetsError ? <span className="screen__inline-error">{originPresetsError}</span> : null}
            </section>

            {loading ? (
              <div className="center-list__grid">
                <LoadingCard count={3} />
              </div>
            ) : error ? (
              <EmptyStateCard title="No se pudo cargar el Top 3" body={error} />
            ) : topPicks.length === 0 ? (
              <EmptyStateCard title="Sin opciones cercanas" body="Activa otro origen o abre el listado base para explorar todos los centros." />
            ) : (
              <section className="top-picks-grid">
                {topPicks.map((entry) => (
                  <TopPickCard
                    key={entry.center.id}
                    center={entry.center}
                    mobility={entry.mobility}
                    rank={entry.rank}
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
          setOriginSheetOpen(false);
          navigate("/listado");
        }}
      />
    </section>
  );
}

function TopPickCard({
  center,
  mobility,
  rank,
  serverOpenCount,
  onSelect,
}: {
  center: CenterTopMobilityCardV1;
  mobility: CenterMobility;
  rank: number;
  serverOpenCount: number;
  onSelect: (slug: string) => void;
}) {
  const recommendedMode = mobility.summary.best_mode ?? center.decision.best_mode ?? null;
  const transportRows = buildFeaturedTransportRows(mobility);
  const footerTiles = buildFeaturedFooterTiles(mobility, center);
  const frame = buildFeaturedCardFrame(center, recommendedMode, serverOpenCount);
  const area = [center.neighborhood, center.district].filter(Boolean).join(" - ");
  const locationLine = center.address_line ?? area;
  const secondaryLine = center.address_line && area ? area : null;
  const reason = buildMotivo(mobility).split(".")[0]?.trim() ?? buildMotivo(mobility);

  return (
    <button
      type="button"
      className="best-option-card top-pick-card"
      onClick={() => onSelect(center.slug)}
    >
      <SpotlightCard className="best-option-card__surface top-pick-card__surface">
        <div className="best-option-card__eyebrow-row">
          <span className="best-option-card__eyebrow">
            <Sparkles size={11} />
            {rank === 1 ? "1a opcion" : rank === 2 ? "2a opcion" : "3a opcion"}
          </span>
          <span className="best-option-card__kind-badge">{center.kind_label}</span>
          <span className={center.is_open_now ? "decision-card__status decision-card__status--open" : "decision-card__status decision-card__status--closed"}>
            {center.is_open_now ? "Abierta" : "Cerrada"}
          </span>
        </div>

        <h2 className="best-option-card__name">{center.name}</h2>

        {locationLine ? (
          <p className="best-option-card__subline top-pick-card__location">
            <MapPin size={11} />
            {locationLine}
          </p>
        ) : null}

        {secondaryLine ? <p className="top-pick-card__secondary-line">{secondaryLine}</p> : null}
        <p className="top-pick-card__state-line">
          <strong>{frame.sectionTitle}</strong>
          <span>{frame.sectionSummary}</span>
        </p>

        <div className="best-option-card__board">
          {transportRows.map((row) => (
            <div
              key={`${center.id}-${row.mode}`}
              className={`best-option-card__board-row${row.recommended ? " best-option-card__board-row--recommended" : ""}`}
            >
              <span className="best-option-card__board-mode top-pick-card__board-mode">
                <span className={`top-pick-card__mode-icon top-pick-card__mode-icon--${row.mode}`}>
                  {row.mode === "metro" ? <TrainFront size={14} /> : row.mode === "bus" ? <Bus size={14} /> : <Bike size={14} />}
                </span>
                <span className="top-pick-card__mode-label">{row.label}</span>
              </span>
              <span className="best-option-card__board-body">{row.body}</span>
              <span className="best-option-card__board-eta">{row.eta}</span>
            </div>
          ))}
        </div>

        <div className="best-option-card__footer-grid">
          {footerTiles.map((tile) => (
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

        <p className="best-option-card__reason">{reason}</p>

        <div className="best-option-card__footer">
          <span className="best-option-card__cta">
            Ver detalle <ArrowRight size={13} />
          </span>
        </div>
      </SpotlightCard>
    </button>
  );
}

function CatalogScreen() {
  const navigate = useNavigate();
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
  const originSearchController = useRef<AbortController | null>(null);
  const {
    origin,
    geolocationStatus,
    requestGeolocation,
    setManualOrigin,
    clearOrigin,
  } = useUserOrigin();

  const hasMore = items.length < total;

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

  function resetListState(): void {
    setOffset(0);
    setItems([]);
    setTotal(0);
    setServerOpenCount(0);
    setLoading(true);
    setLoadingMore(false);
    setListError(null);
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
        <>
          <section className="list-topbar">
            <div className="list-topbar__row list-topbar__row--headline">
              <div className="list-topbar__title">
                <span className="list-topbar__eyebrow">listado base</span>
                <h1>Catalogo de bibliotecas y salas</h1>
                <p>Sin tiempo real en el grid. Solo datos base, filtros y acceso al detalle.</p>
              </div>
              <div className="list-topbar__signals">
                <span className="list-topbar__signal">BASE</span>
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
                onClick={() => { clearOrigin(); resetListState(); }}
              >
                Reiniciar origen
              </button>
            ) : null}
          </section>

          {originPresetsError ? <p className="screen__inline-error">{originPresetsError}</p> : null}

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
            {!loading && items.length > 0 ? (
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
                      mobility={null}
                      mobilityLoading={false}
                      canLoadMobility={false}
                      onLoadMobility={() => undefined}
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
                  setOffset(items.length);
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


