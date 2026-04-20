import { ArrowLeft, BookOpen, LayoutGrid, List, MapPin, Moon, Search, Sun, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BackgroundIllustration } from "../components/BackgroundIllustration";
import { FiltersPanel } from "../components/FiltersPanel";
import { LibraryCard } from "../components/LibraryCard";
import { cn } from "../lib/cn";
import {
  defaultPublicFilters,
  usePublicCatalog,
  usePublicFilters,
  type PublicFiltersState,
} from "../lib/publicCatalog";
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
        "inline-flex items-center justify-center gap-2 rounded-2xl text-[13px] font-medium transition",
        variant === "default" && "bg-primary px-4 text-primary-foreground hover:opacity-90",
        variant === "outline" &&
          "border border-border bg-card px-4 text-foreground shadow-sm hover:bg-muted/55",
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

export function PublicCatalogRoute() {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [draftQuery, setDraftQuery] = useState("");
  const [filters, setFilters] = useState<PublicFiltersState>(defaultPublicFilters);
  const [searchParams] = useSearchParams();
  const { location, requestLocation, requesting } = useUserLocation();
  const { theme, toggleTheme } = useTheme();
  const { error, items, loading, total } = usePublicCatalog(filters, location);
  const { data: filterMetadata, loading: filtersLoading } = usePublicFilters(filters, location);

  const results = useMemo(
    () => items.map((item, index) => ({ ...item, rankingPosition: index + 1 })),
    [items],
  );
  const forceOpenFilters = searchParams.get("filters") === "open";

  const activeFilterLabels = useMemo(() => {
    const labels: Array<{ key: string; label: string; clear: () => void }> = [];

    if (filters.query) {
      labels.push({
        key: "query",
        label: `Busqueda: ${filters.query}`,
        clear: () => setFilters((current) => ({ ...current, query: "" })),
      });
    }
    if (filters.openNow) {
      labels.push({
        key: "openNow",
        label: "Abierta ahora",
        clear: () => setFilters((current) => ({ ...current, openNow: false })),
      });
    }
    if (filters.accessible) {
      labels.push({
        key: "accessible",
        label: "Accesible",
        clear: () => setFilters((current) => ({ ...current, accessible: false })),
      });
    }
    if (filters.withWifi) {
      labels.push({
        key: "withWifi",
        label: "Con WiFi",
        clear: () => setFilters((current) => ({ ...current, withWifi: false })),
      });
    }
    if (filters.withCapacity) {
      labels.push({
        key: "withCapacity",
        label: "Con aforo",
        clear: () => setFilters((current) => ({ ...current, withCapacity: false })),
      });
    }
    if (filters.withSer) {
      labels.push({
        key: "withSer",
        label: "Con cobertura SER",
        clear: () => setFilters((current) => ({ ...current, withSer: false })),
      });
    }
    if (location && filters.radiusMeters !== defaultPublicFilters.radiusMeters) {
      labels.push({
        key: "radius",
        label: `Radio ${Math.round(filters.radiusMeters / 1000)} km`,
        clear: () =>
          setFilters((current) => ({
            ...current,
            radiusMeters: defaultPublicFilters.radiusMeters,
          })),
      });
    }

    for (const kind of filters.kinds) {
      labels.push({
        key: `kind:${kind}`,
        label: kind === "library" ? "Biblioteca" : "Sala de estudio",
        clear: () =>
          setFilters((current) => ({
            ...current,
            kinds: current.kinds.filter((value) => value !== kind),
          })),
      });
    }

    for (const district of filters.districts) {
      const option = filterMetadata?.availableDistricts.find((value) => value.value === district);
      labels.push({
        key: `district:${district}`,
        label: option?.label ?? district,
        clear: () =>
          setFilters((current) => ({
            ...current,
            districts: current.districts.filter((value) => value !== district),
          })),
      });
    }

    for (const neighborhood of filters.neighborhoods) {
      const option = filterMetadata?.availableNeighborhoods.find(
        (value) => value.value === neighborhood,
      );
      labels.push({
        key: `neighborhood:${neighborhood}`,
        label: option?.label ?? neighborhood,
        clear: () =>
          setFilters((current) => ({
            ...current,
            neighborhoods: current.neighborhoods.filter((value) => value !== neighborhood),
          })),
      });
    }

    for (const mode of filters.transportModes) {
      const option = filterMetadata?.availableTransportModes.find((value) => value.mode === mode);
      labels.push({
        key: `transport:${mode}`,
        label: option?.label ?? mode,
        clear: () =>
          setFilters((current) => ({
            ...current,
            transportModes: current.transportModes.filter((value) => value !== mode),
          })),
      });
    }

    return labels;
  }, [
    filterMetadata?.availableDistricts,
    filterMetadata?.availableNeighborhoods,
    filterMetadata?.availableTransportModes,
    filters,
    location,
  ]);

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors">
      <BackgroundIllustration />

      <div className="relative mx-auto w-full max-w-[1020px] px-4 py-4 sm:px-5">
        <header className="mb-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button className="size-9 px-0" variant="ghost">
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>

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

          <div className="flex flex-col gap-3 sm:flex-row">
            <form
              className="relative flex-1"
              onSubmit={(event) => {
                event.preventDefault();
                setFilters((current) => ({ ...current, query: draftQuery.trim() }));
              }}
            >
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-2xl border border-input bg-card pl-11 pr-11 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/40"
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Buscar por nombre, direccion o barrio..."
                type="text"
                value={draftQuery}
              />
              {draftQuery ? (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  onClick={() => {
                    setDraftQuery("");
                    setFilters((current) => ({ ...current, query: "" }));
                  }}
                  type="button"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </form>

            <div className="flex gap-2">
              <Button className="h-10" onClick={requestLocation} variant="outline">
                <MapPin className="size-4" />
                {requesting ? "Buscando..." : "Cerca de mi"}
              </Button>
              <FiltersPanel
                filters={filters}
                forceOpen={forceOpenFilters}
                loading={filtersLoading}
                metadata={filterMetadata}
                onChange={setFilters}
                resultCount={total}
              />
            </div>
          </div>

          {activeFilterLabels.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeFilterLabels.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground"
                >
                  {item.label}
                  <button onClick={item.clear} type="button">
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              <button
                className="text-[11px] font-medium text-muted-foreground"
                onClick={() => {
                  setFilters(defaultPublicFilters);
                  setDraftQuery("");
                }}
                type="button"
              >
                Limpiar todo
              </button>
            </div>
          ) : null}
        </header>

        <div className="mb-4">
          <h1 className="text-[1.42rem] font-semibold leading-none text-foreground">
            {loading ? "..." : total} resultados
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Ordenados por{" "}
            {filterMetadata?.availableSortModes
              .find((option) => option.value === filters.sort)
              ?.label.toLowerCase() ?? "relevancia"}
          </p>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-border bg-card p-7 text-sm text-muted-foreground shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            Cargando listado...
          </div>
        ) : error ? (
          <div className="rounded-[24px] border border-destructive/20 bg-destructive/8 p-7 text-sm text-destructive shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            {error}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((center) => (
              <LibraryCard center={center} key={center.id} viewMode={viewMode} />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-border bg-card p-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-[1.45rem] font-semibold text-foreground">
              No se encontraron resultados
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajusta la busqueda o limpia los filtros activos.
            </p>
            <button
              className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-[13px] font-medium text-foreground shadow-sm"
              onClick={() => {
                setFilters(defaultPublicFilters);
                setDraftQuery("");
              }}
              type="button"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
