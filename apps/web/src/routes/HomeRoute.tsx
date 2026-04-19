import { ArrowRight, BookOpen, Check, Clock, LayoutGrid, List, Loader2, MapPin, Moon, Navigation, Sun, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BackgroundIllustration } from "../components/BackgroundIllustration";
import { LibraryCard } from "../components/LibraryCard";
import { cn } from "../lib/cn";
import { type CallejeroSuggestion, defaultPublicFilters, fetchCallejeroSuggestions, usePublicCatalog } from "../lib/publicCatalog";
import { useTheme } from "../lib/theme";
import { useUserLocation } from "../lib/userLocation";

function Button({
  children,
  className,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-[13px] font-medium transition",
        variant === "default" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "outline" &&
          "border border-border bg-card text-foreground shadow-sm hover:bg-muted/55",
        variant === "ghost" && "text-muted-foreground hover:bg-card/70",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

type LocationMode = "auto" | "manual";

function LocationDialog({
  onClose,
  requestLocation,
  requesting,
  gpsError,
  setManualLocation,
}: {
  onClose: () => void;
  requestLocation: () => void;
  requesting: boolean;
  gpsError: string | null;
  setManualLocation: (lat: number, lon: number, label: string) => void;
}) {
  const [mode, setMode] = useState<LocationMode>("auto");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CallejeroSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CallejeroSuggestion | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (mode === "manual") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [mode]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setSearching(true);
      try {
        const results = await fetchCallejeroSuggestions(query, abortRef.current.signal);
        setSuggestions(results);
      } catch {
        // aborted or error — keep existing
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectSuggestion = (suggestion: CallejeroSuggestion) => {
    setSelected(suggestion);
    setQuery(suggestion.label);
    setSuggestions([]);
  };

  const handleConfirm = () => {
    if (mode === "manual" && selected) {
      setManualLocation(selected.lat, selected.lon, selected.label);
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
      <button
        aria-label="Cerrar selector de ubicacion"
        className="absolute inset-0 bg-slate-950/55"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-[101] w-full max-w-[380px] rounded-2xl border border-border bg-card shadow-[0_24px_60px_rgba(2,6,23,0.5)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            <h4 className="text-[14px] font-semibold text-foreground">Tu ubicación</h4>
          </div>
          <button
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex border-b border-border">
          <button
            className={cn(
              "flex-1 py-2.5 text-[12px] font-medium transition",
              mode === "auto"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setMode("auto")}
            type="button"
          >
            Automática
          </button>
          <button
            className={cn(
              "flex-1 py-2.5 text-[12px] font-medium transition",
              mode === "manual"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setMode("manual")}
            type="button"
          >
            Manual
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {mode === "auto" ? (
            <div className="space-y-3">
              <p className="text-[12px] text-muted-foreground">
                Usa la geolocalización del navegador para fijar tu posición actual.
              </p>
              <button
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-medium text-primary-foreground transition hover:opacity-90",
                  requesting && "cursor-not-allowed opacity-70",
                )}
                disabled={requesting}
                onClick={() => {
                  requestLocation();
                  onClose();
                }}
                type="button"
              >
                {requesting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Navigation className="size-4" />
                )}
                {requesting ? "Obteniendo..." : "Obtener ubicación GPS"}
              </button>
              {gpsError ? (
                <p className="text-[11px] text-destructive">{gpsError}</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] text-muted-foreground">
                Escribe una calle de Madrid para buscar tu ubicación.
              </p>
              <div className="relative">
                <input
                  ref={inputRef}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                  }}
                  placeholder="Ej: Gran Vía 5, Calle Mayor..."
                  type="text"
                  value={query}
                />
                {searching ? (
                  <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
                ) : null}
              </div>

              {suggestions.length > 0 ? (
                <ul className="max-h-[180px] overflow-y-auto rounded-xl border border-border bg-card shadow-sm">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>
                      <button
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-[12px] text-foreground transition hover:bg-muted/50"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        type="button"
                      >
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        {suggestion.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {query.trim().length > 0 && query.trim().length < 3 ? (
                <p className="text-[11px] text-muted-foreground">Escribe al menos 3 letras…</p>
              ) : null}

              <button
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-medium text-primary-foreground transition hover:opacity-90",
                  !selected && "cursor-not-allowed opacity-50",
                )}
                disabled={!selected}
                onClick={handleConfirm}
                type="button"
              >
                <Check className="size-4" />
                Confirmar ubicación
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HomeRoute() {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const { location, requestLocation, requesting, error: locationError, clearLocation, setManualLocation } = useUserLocation();
  const { theme, toggleTheme } = useTheme();
  const { data, error, loading, topItems } = usePublicCatalog(
    defaultPublicFilters,
    location,
    3,
  );

  const metrics = data?.metrics;
  const topRanked = useMemo(
    () => topItems.map((item, index) => ({ ...item, rankingPosition: index + 1 })),
    [topItems],
  );

  const locationLabel = location?.label
    ? location.label.split(",").slice(0, 2).join(",").trim()
    : location?.source === "gps"
      ? "Ubicación GPS"
      : null;
  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors">
      <BackgroundIllustration />

      <div className="relative mx-auto w-full max-w-[960px] px-4 py-5 sm:px-6 sm:py-6">
        <header className="mb-7">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_22px_rgba(15,91,167,0.18)]">
                <BookOpen className="size-4.5" />
              </div>
              <div>
                <p className="text-[1.15rem] font-bold leading-none">AlaBiblio</p>
                <p className="mt-1 text-xs text-muted-foreground">Comunidad de Madrid</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-2xl border border-border bg-card p-1 shadow-sm">
                <button
                  className={cn(
                    "rounded-xl px-2.5 py-2 transition",
                    viewMode === "card"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setViewMode("card")}
                  type="button"
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button
                  className={cn(
                    "rounded-xl px-2.5 py-2 transition",
                    viewMode === "list"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setViewMode("list")}
                  type="button"
                >
                  <List className="size-3.5" />
                </button>
              </div>
              <button
                className="rounded-2xl border border-border bg-card p-2.5 text-muted-foreground shadow-sm transition hover:text-foreground"
                onClick={toggleTheme}
                type="button"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <h1 className="max-w-[620px] text-[1.85rem] font-bold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[2.35rem]">
              Encuentra tu espacio de estudio ideal
            </h1>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Las mejores opciones cerca de ti, actualizadas en tiempo real
            </p>

            <div className="mt-4 flex flex-wrap gap-3.5">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <div className="flex size-7.5 items-center justify-center rounded-xl bg-accent text-primary">
                  <BookOpen className="size-3.5" />
                </div>
                <span>
                  <span className="font-semibold text-foreground">
                    {loading ? "..." : metrics?.totalCenters ?? 0}
                  </span>{" "}
                  centros validos
                </span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <div className="flex size-7.5 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Clock className="size-3.5" />
                </div>
                <span>
                  <span className="font-semibold text-foreground">
                    {loading ? "..." : metrics?.openNowCount ?? 0}
                  </span>{" "}
                  abiertas ahora
                </span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <div className="flex size-7.5 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                  <Users className="size-3.5" />
                </div>
                <span>
                  <span className="font-semibold text-foreground">
                    {loading
                      ? "..."
                      : metrics?.totalCapacity !== null && metrics?.totalCapacity !== undefined
                        ? new Intl.NumberFormat("es-ES").format(metrics.totalCapacity)
                        : "N/D"}
                  </span>{" "}
                  plazas oficiales
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {location ? (
                <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm">
                  <MapPin className="size-3.5 shrink-0 text-primary" />
                  <span className="max-w-[160px] truncate text-[12px] font-medium text-foreground">
                    {locationLabel ?? "Ubicación activa"}
                  </span>
                  <button
                    className="ml-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => setLocationDialogOpen(true)}
                    type="button"
                  >
                    Cambiar
                  </button>
                  <button
                    aria-label="Quitar ubicación"
                    className="ml-0.5 rounded-md text-muted-foreground hover:text-destructive"
                    onClick={clearLocation}
                    type="button"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <Button onClick={() => setLocationDialogOpen(true)}>
                  <MapPin className="size-4" />
                  Añadir ubicación
                </Button>
              )}
              <Link to="/listado">
                <Button className="w-full sm:w-auto" variant="outline">
                  Ver todas las bibliotecas
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>

            {locationError ? (
              <p className="mt-3 text-[12px] text-destructive">{locationError}</p>
            ) : null}
          </div>
        </header>

        {locationDialogOpen ? (
          <LocationDialog
            gpsError={locationError}
            onClose={() => setLocationDialogOpen(false)}
            requestLocation={requestLocation}
            requesting={requesting}
            setManualLocation={setManualLocation}
          />
        ) : null}

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[1.35rem] font-semibold leading-none text-foreground">
                Top 3 opciones para ti
              </h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Basado en tu ubicacion y en los datos operativos disponibles
              </p>
            </div>
            <Link className="text-[13px] font-medium text-primary" to="/top">
              Ver mas →
            </Link>
          </div>

          {loading ? (
            <div className="rounded-[24px] border border-border bg-card p-7 text-sm text-muted-foreground shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              Cargando mejores opciones...
            </div>
          ) : error ? (
            <div className="rounded-[24px] border border-destructive/20 bg-destructive/8 p-7 text-sm text-destructive shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              {error}
            </div>
          ) : (
            <div className="space-y-3.5">
              {topRanked.map((center) => (
                <LibraryCard center={center} key={center.id} viewMode={viewMode} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
