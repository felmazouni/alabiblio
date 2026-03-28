import type {
  CenterDetailItem,
  CenterKind,
  CenterListItem,
} from "@alabiblio/contracts/centers";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchCenterDetail, fetchCenters } from "./features/centers/api";
import { CenterCard } from "./features/centers/components/CenterCard";
import { CenterDetailPanel } from "./features/centers/components/CenterDetailPanel";
import "./App.css";

type KindFilter = "all" | CenterKind;

const PAGE_SIZE = 24;

function getSelectedSlug(pathname: string): string | null {
  if (!pathname.startsWith("/centers/")) {
    return null;
  }

  const slug = pathname.replace("/centers/", "").trim();
  return slug === "" ? null : decodeURIComponent(slug);
}

function navigate(pathname: string): void {
  window.history.pushState({}, "", pathname);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText.trim());
  const [items, setItems] = useState<CenterListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CenterDetailItem | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const selectedSlug = getSelectedSlug(pathname);
  const detailLoading =
    selectedSlug !== null &&
    detailError === null &&
    (detail === null || detail.slug !== selectedSlug);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const isFirstPage = offset === 0;

    void fetchCenters(
      {
        kind: kindFilter === "all" ? undefined : kindFilter,
        q: deferredSearch === "" ? undefined : deferredSearch,
        limit: PAGE_SIZE,
        offset,
      },
      controller.signal,
    )
      .then((response) => {
        setItems((current) =>
          isFirstPage ? response.items : [...current, ...response.items],
        );
        setTotal(response.total);
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
  }, [deferredSearch, kindFilter, offset]);

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }

    const controller = new AbortController();

    void fetchCenterDetail(selectedSlug, controller.signal)
      .then((response) => {
        setDetail(response.item);
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setDetailError(`No se pudo cargar el detalle (${error.message}).`);
        }
      });

    return () => controller.abort();
  }, [selectedSlug]);

  const hasMore = items.length < total;
  const resultsLabel = useMemo(() => {
    if (loading) {
      return "Cargando centros...";
    }

    return `${total} centros encontrados`;
  }, [loading, total]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <a className="app-brand" href="/">
            alabiblio
          </a>
          <p className="app-subtitle">
            Bibliotecas y salas de estudio reales del Ayuntamiento de Madrid.
          </p>
        </div>
        <div className="app-meta">
          <span>{resultsLabel}</span>
          <a href="/api/centers?limit=5" target="_blank" rel="noreferrer">
            API
          </a>
        </div>
      </header>

      <section className="explorer-toolbar">
        <div className="explorer-search">
          <label htmlFor="search">Buscar por nombre</label>
          <input
            id="search"
            name="search"
            type="search"
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
              setOffset(0);
              setItems([]);
              setTotal(0);
              setLoading(true);
              setLoadingMore(false);
              setListError(null);
            }}
            placeholder="Ej. Antonio Mingote o Galileo"
          />
        </div>

        <div
          className="explorer-filters"
          role="tablist"
          aria-label="Tipo de centro"
        >
          {(["all", "library", "study_room"] as const).map((value) => (
            <button
              key={value}
              className={
                kindFilter === value
                  ? "filter-pill filter-pill--active"
                  : "filter-pill"
              }
              type="button"
              onClick={() => {
                setKindFilter(value);
                setOffset(0);
                setItems([]);
                setTotal(0);
                setLoading(true);
                setLoadingMore(false);
                setListError(null);
              }}
            >
              {value === "all"
                ? "Todos"
                : value === "library"
                  ? "Bibliotecas"
                  : "Salas de estudio"}
            </button>
          ))}
        </div>
      </section>

      <section className="explorer-layout">
        <section className="explorer-list">
          {loading ? <div className="state-card">Cargando centros...</div> : null}

          {!loading && listError ? (
            <div className="state-card state-card--error">{listError}</div>
          ) : null}

          {!loading && !listError && items.length === 0 ? (
            <div className="state-card">No hay centros para ese filtro.</div>
          ) : null}

          {!loading && !listError ? (
            <div className="center-grid">
              {items.map((center) => (
                <CenterCard
                  key={center.id}
                  center={center}
                  isSelected={selectedSlug === center.slug}
                  onSelect={(slug) =>
                    startTransition(() => {
                      setDetailError(null);
                      navigate(`/centers/${slug}`);
                    })
                  }
                />
              ))}
            </div>
          ) : null}

          {!loading && !listError && hasMore ? (
            <div className="load-more">
              <button
                className="load-more__button"
                type="button"
                onClick={() => {
                  setLoadingMore(true);
                  setOffset(items.length);
                }}
                disabled={loadingMore}
              >
                {loadingMore ? "Cargando mas..." : "Cargar mas"}
              </button>
            </div>
          ) : null}
        </section>

        <CenterDetailPanel
          center={
            selectedSlug && detail?.slug === selectedSlug ? detail : null
          }
          error={selectedSlug ? detailError : null}
          loading={detailLoading}
          onClose={() =>
            startTransition(() => {
              setDetailError(null);
              navigate("/");
            })
          }
        />
      </section>
    </main>
  );
}

export default App;
