import { LibraryCard } from "../components/LibraryCard";
import { MotionCarousel } from "../components/animate-ui/components/community/motion-carousel";
import { PublicChrome } from "../components/PublicChrome";
import { defaultPublicFilters, usePublicCatalog } from "../lib/publicCatalog";
import { useUserLocation } from "../lib/userLocation";

export function TopOptionsRoute() {
  const { location } = useUserLocation();
  const { error, items, loading } = usePublicCatalog(
    defaultPublicFilters,
    location,
    10,
  );

  return (
    <PublicChrome backTo="/" compact>
      <main className="mx-auto max-w-[820px]">
        <div className="mb-5">
          <h1 className="text-[1.95rem] font-semibold text-foreground">
            Mejores opciones para ti
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Ranking calculado con horario, confianza del dato, capacidad,
            accesibilidad, transporte y distancia real si hay ubicacion.
          </p>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-border bg-card p-6 text-sm text-muted-foreground shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            Calculando ranking...
          </div>
        ) : error ? (
          <div className="rounded-[24px] border border-destructive/20 bg-destructive/8 p-6 text-sm text-destructive shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            {error}
          </div>
        ) : (
          <MotionCarousel
            renderSlide={(item, index) => (
              <LibraryCard center={{ ...item, rankingPosition: index + 1 }} key={item.id} />
            )}
            slides={items}
          />
        )}
      </main>
    </PublicChrome>
  );
}
