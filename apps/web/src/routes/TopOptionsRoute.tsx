import { LibraryCard } from "../components/LibraryCard";
import { PublicChrome } from "../components/PublicChrome";
import { usePublicCatalog } from "../lib/publicCatalog";

export function TopOptionsRoute() {
  const { error, items, loading } = usePublicCatalog();

  return (
    <PublicChrome backTo="/" compact>
      <main className="mx-auto max-w-[820px]">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-950">Mejores opciones para ti</h1>
          <p className="mt-1 text-base text-slate-500">
            Ranking inicial sobre datos reales: apertura, calidad del horario estructurado y riqueza operativa del centro
          </p>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            Calculando ranking…
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {items.slice(0, 10).map((item) => (
              <LibraryCard center={item} key={item.id} />
            ))}
          </div>
        )}
      </main>
    </PublicChrome>
  );
}
