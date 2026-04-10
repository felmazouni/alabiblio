import type { UserOrigin } from "@alabiblio/contracts/origin";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  MapPin,
  Navigation,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import FadeContent from "../../../components/reactbits/FadeContent";
import { getTopMobilityScopeSignal } from "../scopePresentation";
import { TopMobilityCard } from "../components/TopMobilityCard";
import { useTopPicksScreen } from "../hooks/useTopPicksScreen";
import { OriginSheet } from "../../origin/components/OriginSheet";
import { getOriginStatusText, getOriginTone } from "../../origin/originPresentation";
import { EmptyStateCard } from "../../ui/EmptyStateCard";
import { LoadingCard } from "../../ui/LoadingCard";
import { BackgroundIllustration } from "../../ui/BackgroundIllustration";

export function TopPicksScreen() {
  const navigate = useNavigate();
  const {
    origin,
    geolocationStatus,
    originActive,
    originSheetOpen,
    topScope,
    topPicks,
    serverOpenCount,
    loading,
    error,
    originSearch,
    requestGeolocation,
    openOriginSheet,
    closeOriginSheet,
    applyOrigin,
    requestGeolocationFromSheet,
    continueWithoutOrigin,
  } = useTopPicksScreen();

  const originStatusText = getOriginStatusText(origin, geolocationStatus);
  const scopeSignal = topScope ? getTopMobilityScopeSignal(topScope) : "sin origen";
  const heroTitle = !originActive
    ? "Encuentra tu espacio de estudio ideal"
    : serverOpenCount > 0
      ? "Las mejores opciones abiertas ahora"
      : "Las mejores opciones para tu siguiente visita";
  const heroCopy = !originActive
    ? "Resolvemos las tres mejores opciones cerca de ti con movilidad real y acceso directo al listado completo."
    : serverOpenCount > 0
      ? "Priorizamos centros abiertos y resolvemos transporte real o estimado para las tres mejores opciones."
      : "No hay centros abiertos elegibles ahora mismo. Dejamos preparadas las opciones mas utiles para cuando vuelvan a abrir.";

  function handleApplyOrigin(nextOrigin: UserOrigin): void {
    applyOrigin(nextOrigin);
  }

  return (
    <section className="screen screen--list top-screen">
      <div className="screen__background">
        <BackgroundIllustration className="top-screen__background-illustration" />
      </div>

      <FadeContent blur duration={320} className="screen__content top-screen__content">
        <section className="top-screen__hero">
          <div className="top-screen__hero-copy">
            <span className="top-screen__hero-kicker">Top 3 / Madrid / tiempo real</span>
            <h1>{heroTitle}</h1>
            <p>{heroCopy}</p>
          </div>

          <div className="top-screen__hero-stats">
            <div className="top-screen__stat-card">
              <span className="top-screen__stat-icon">
                <BookOpen size={16} />
              </span>
              <div className="top-screen__stat-copy">
                <strong>{originActive ? topPicks.length : "Top 3"}</strong>
                <span>{originActive ? "opciones resueltas" : "mejores opciones"}</span>
              </div>
            </div>
            <div className="top-screen__stat-card">
              <span className="top-screen__stat-icon top-screen__stat-icon--open">
                <Clock3 size={16} />
              </span>
              <div className="top-screen__stat-copy">
                <strong>{originActive ? serverOpenCount : "Real"}</strong>
                <span>{originActive ? "abiertas ahora" : "datos de movilidad"}</span>
              </div>
            </div>
            <div className="top-screen__stat-card">
              <span className="top-screen__stat-icon top-screen__stat-icon--origin">
                <MapPin size={16} />
              </span>
              <div className="top-screen__stat-copy">
                <strong>{originActive ? scopeSignal : "Origen"}</strong>
                <span>{originStatusText}</span>
              </div>
            </div>
          </div>

          <div className="top-screen__hero-actions">
            {!originActive ? (
              <>
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
                  onClick={openOriginSheet}
                >
                  <MapPin size={16} />
                  Introducir direccion
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`list-topbar__origin list-topbar__origin--${getOriginTone(origin, geolocationStatus)}`}
                  onClick={openOriginSheet}
                >
                  <span className="list-topbar__origin-dot" />
                  <Navigation size={15} />
                  <span>{originStatusText}</span>
                </button>
                <button
                  type="button"
                  className="entry-screen__secondary"
                  onClick={() => requestGeolocation()}
                >
                  <Navigation size={16} />
                  Reubicar con GPS
                </button>
              </>
            )}
            <button
              type="button"
              className="entry-screen__ghost"
              onClick={() => navigate("/listado")}
            >
              Ver listado base
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="top-screen__hero-meta">
            <span className="entry-screen__live-pill">
              <Sparkles size={12} />
              {originActive ? "TOP RESUELTO CON ORIGEN" : "ELIGE ORIGEN PARA ACTIVAR EL TOP"}
            </span>
            {originSearch.presetsError ? <span className="screen__inline-error">{originSearch.presetsError}</span> : null}
          </div>
        </section>

        <section className="top-screen__section-head">
          <div className="top-screen__section-copy">
            <span className="top-screen__section-kicker">Top 3 opciones para ti</span>
            <h2>{originActive ? "Bibliotecas priorizadas para salir ahora" : "Activa un origen para resolver el Top"}</h2>
            <p>
              {originActive
                ? "Mantenemos solo tres opciones y dejamos el listado completo aparte para explorar el resto."
                : "Cuando fijes un origen mostramos las tres mejores opciones con contexto real de movilidad y apertura."}
            </p>
          </div>
          <button
            type="button"
            className="top-screen__section-link"
            onClick={() => navigate("/listado")}
          >
            Ver listado base
            <ArrowRight size={14} />
          </button>
        </section>

        {!originActive ? (
          <section className="top-screen__state">
            <EmptyStateCard
              title="Activa un origen para resolver el Top 3"
              body="Usa tu ubicacion o introduce una direccion para comparar solo las tres opciones mas utiles. El listado base sigue disponible aparte."
            />
          </section>
        ) : (
          <>
            {loading ? (
              <div className="center-list__grid">
                <LoadingCard count={3} />
              </div>
            ) : error ? (
              <EmptyStateCard title="No se pudo cargar el Top 3" body={error} />
            ) : topScope !== "origin_enriched" || topPicks.length === 0 ? (
              <EmptyStateCard title="Sin opciones cercanas" body="Activa otro origen o abre el listado base para explorar todos los centros." />
            ) : (
              <section className="top-picks-grid">
                {topPicks.map((entry) => (
                  <TopMobilityCard
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

        <footer className="top-screen__footer">
          <div className="top-screen__footer-brand">
            <div className="top-screen__footer-mark">
              <BookOpen size={16} />
            </div>
            <span>alabiblio</span>
          </div>
          <p>Top con datos reales de movilidad y acceso directo al listado base.</p>
        </footer>
      </FadeContent>

      <OriginSheet
        open={originSheetOpen}
        origin={origin}
        geolocationStatus={geolocationStatus}
        query={originSearch.query}
        results={originSearch.results}
        loading={originSearch.loading}
        error={originSearch.error}
        presets={originSearch.presets}
        onClose={closeOriginSheet}
        onRequestGeolocation={requestGeolocationFromSheet}
        onQueryChange={originSearch.handleQueryChange}
        onSelectAddress={(option) =>
          handleApplyOrigin({
            kind: "manual_address",
            label: option.label,
            lat: option.lat,
            lon: option.lon,
          })}
        onSelectPreset={(preset) =>
          handleApplyOrigin({
            kind: "preset_area",
            label: preset.label,
            area_code: preset.code,
            lat: preset.lat,
            lon: preset.lon,
          })}
        onContinueWithoutOrigin={() => {
          continueWithoutOrigin();
          navigate("/listado");
        }}
      />
    </section>
  );
}
