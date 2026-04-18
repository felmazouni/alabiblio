import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LibraryCard } from "../components/LibraryCard";
import { BackgroundIllustration } from "../components/BackgroundIllustration";
import { usePublicCatalog } from "../lib/publicCatalog";
import { ArrowRight, BookOpen, Clock, LayoutGrid, List, MapPin, Moon, Users } from "lucide-react";
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

export function HomeRoute() {
  const [isDark, setIsDark] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const { capacityKnown, error, items, loading, openNowCount, topItems } = usePublicCatalog();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background transition-colors relative">
      <BackgroundIllustration />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 relative">
        <header className="py-6 mb-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <BookOpen className="size-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AlaBiblio</h1>
                <p className="text-sm text-muted-foreground">Comunidad de Madrid</p>
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

          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 text-balance">
              Encuentra tu espacio de estudio ideal
            </h2>
            <p className="text-muted-foreground mb-6">
              Las mejores opciones cerca de ti, actualizadas en tiempo real
            </p>

            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="size-4 text-primary" />
                </div>
                <span>
                  <span className="font-semibold text-foreground">{loading ? "…" : String(items.length)}</span>{" "}
                  bibliotecas
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Clock className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span>
                  <span className="font-semibold text-foreground">{loading ? "…" : openNowCount}</span> abiertas ahora
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span>
                  <span className="font-semibold text-foreground">{loading ? "…" : new Intl.NumberFormat("es-ES").format(capacityKnown)}</span>{" "}
                  plazas libres
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                <MapPin className="size-4" />
                Usar mi ubicacion
              </Button>
              <Link to="/listado">
                <Button className="w-full sm:w-auto border-border gap-2" variant="outline">
                  Ver todas las bibliotecas
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Top 3 opciones para ti</h3>
              <p className="text-sm text-muted-foreground">Basado en tu ubicacion y preferencias</p>
            </div>
            <Link to="/listado">
              <Button className="gap-1 text-primary hover:text-primary/80" variant="ghost">
                Ver mas
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
              Cargando mejores opciones…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              {topItems.map((library) => (
                <LibraryCard
                  key={library.id}
                  onDetails={() => undefined}
                  onNavigate={() => undefined}
                  onReview={() => undefined}
                  viewMode={viewMode}
                  center={library}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
