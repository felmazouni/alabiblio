import { ArrowRight, BookOpen, Clock, LayoutGrid, List, MapPin, Moon, Sun, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BackgroundIllustration } from "../components/BackgroundIllustration";
import { LibraryCard } from "../components/LibraryCard";
import { cn } from "../lib/cn";
import { defaultPublicFilters, usePublicCatalog } from "../lib/publicCatalog";
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

export function HomeRoute() {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const { location, requestLocation, requesting, error: locationError } = useUserLocation();
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

            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <Button onClick={requestLocation}>
                <MapPin className="size-4" />
                {requesting ? "Obteniendo ubicacion..." : "Usar mi ubicacion"}
              </Button>
              <Link to="/listado">
                <Button className="w-full sm:w-auto" variant="outline">
                  Ver todas las bibliotecas
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>

            {locationError ? (
              <p className="mt-3 text-sm text-destructive">{locationError}</p>
            ) : null}
          </div>
        </header>

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
