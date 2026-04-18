import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BackgroundIllustration } from "../components/BackgroundIllustration";
import { FiltersPanel, defaultPublicFilters, type PublicFilters } from "../components/FiltersPanel";
import { LibraryCard } from "../components/LibraryCard";
import { usePublicCatalog } from "../lib/publicCatalog";
import { ArrowLeft, BookOpen, LayoutGrid, List, MapPin, Moon, Search, X } from "lucide-react";
import { cn } from "../lib/cn";

function Button({
  children,
  className,
  variant = "default",
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2",
        variant === "default" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "outline" && "border border-border bg-card text-foreground hover:bg-muted/50",
        variant === "ghost" && "text-foreground hover:bg-muted/70",
        className,
      )}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

function matchesFilters(filters: PublicFilters, item: ReturnType<typeof usePublicCatalog>["items"][number]) {
  const haystack = [item.name, item.addressLine, item.neighborhood, item.district]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (filters.query && !haystack.includes(filters.query.toLowerCase())) {
    return false;
  }

  if (filters.openNow && item.schedule.isOpenNow !== true) {
    return false;
  }

  if (filters.onlyLibraries && item.kind !== "library") {
    return false;
  }

  if (filters.onlyStudyRooms && item.kind !== "study_room") {
    return false;
  }

  if (filters.withWifi && !item.wifi) {
    return false;
  }

  if (filters.accessible && !item.accessibility) {
    return false;
  }

  return true;
}

export function PublicCatalogRoute() {
  const [isDark, setIsDark] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [filters, setFilters] = useState<PublicFilters>(defaultPublicFilters);
  const { error, items, loading } = usePublicCatalog();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const filteredLibraries = useMemo(() => items.filter((item) => matchesFilters(filters, item)), [filters, items]);

  const activeFiltersCount = [
    filters.query !== "",
    filters.openNow,
    filters.onlyLibraries,
    filters.onlyStudyRooms,
    filters.withWifi,
    filters.accessible,
  ].filter(Boolean).length;

  const clearFilters = () => setFilters(defaultPublicFilters);

  return (
    <div className="min-h-screen bg-background transition-colors relative">
      <BackgroundIllustration />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 relative">
        <header className="py-4 mb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button className="mr-1 h-9 w-9 px-0" variant="ghost">
                  <ArrowLeft className="size-5" />
                </Button>
              </Link>
              <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <BookOpen className="size-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">AlaBiblio</h1>
                <p className="text-xs text-muted-foreground">Comunidad de Madrid</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  className={cn(viewMode === "card" ? "bg-card shadow-sm" : "hover:bg-transparent", "h-8 px-3")}
                  onClick={() => setViewMode("card")}
                  variant="ghost"
                >
                  <LayoutGrid className="size-4" />
                </Button>
                <Button
                  className={cn(viewMode === "list" ? "bg-card shadow-sm" : "hover:bg-transparent", "h-8 px-3")}
                  onClick={() => setViewMode("list")}
                  variant="ghost"
                >
                  <List className="size-4" />
                </Button>
              </div>

              <Button className="h-9 w-9 px-0 border-border" onClick={() => setIsDark(!isDark)} variant="outline">
                <Moon className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 pl-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Buscar por nombre, direccion o barrio..."
                type="text"
                value={filters.query}
              />
              {filters.query ? (
                <Button
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-7 px-0"
                  onClick={() => setFilters((current) => ({ ...current, query: "" }))}
                  variant="ghost"
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button className="border-border gap-2" variant="outline">
                <MapPin className="size-4" />
                <span className="hidden sm:inline">Cerca de mi</span>
              </Button>
              <FiltersPanel filters={filters} onChange={setFilters} resultCount={filteredLibraries.length} />
            </div>
          </div>

          {(activeFiltersCount > 0 || filters.query) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filtros activos:</span>
              {filters.query ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                  Busqueda: {filters.query}
                  <button onClick={() => setFilters((current) => ({ ...current, query: "" }))} type="button">
                    <X className="size-3" />
                  </button>
                </span>
              ) : null}
              {filters.openNow ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                  Abierta ahora
                  <button onClick={() => setFilters((current) => ({ ...current, openNow: false }))} type="button">
                    <X className="size-3" />
                  </button>
                </span>
              ) : null}
              {filters.onlyLibraries ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                  Bibliotecas
                </span>
              ) : null}
              {filters.onlyStudyRooms ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                  Salas de estudio
                </span>
              ) : null}
              {activeFiltersCount > 0 ? (
                <Button className="text-xs text-muted-foreground h-6" onClick={clearFilters} variant="ghost">
                  Limpiar todo
                </Button>
              ) : null}
            </div>
          )}
        </header>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {loading ? "…" : filteredLibraries.length} {filteredLibraries.length === 1 ? "resultado" : "resultados"}
            </h2>
            <p className="text-sm text-muted-foreground">Ordenados por relevancia y distancia</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
            Cargando listado…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
            {error}
          </div>
        ) : filteredLibraries.length > 0 ? (
          <div className="space-y-4">
            {filteredLibraries.map((library, index) => (
              <LibraryCard
                key={library.id}
                onDetails={() => undefined}
                onNavigate={() => undefined}
                onReview={() => undefined}
                viewMode={viewMode}
                center={{ ...library, rankingPosition: index + 1 }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron resultados</h3>
            <p className="text-muted-foreground mb-4">Prueba a modificar los filtros o la busqueda</p>
            <Button onClick={clearFilters} variant="outline">
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
