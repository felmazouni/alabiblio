import type { UserOrigin } from "@alabiblio/contracts/origin";
import {
  ArrowRight,
  MapPin,
  Navigation,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DotGrid from "../../../components/reactbits/DotGrid";
import FadeContent from "../../../components/reactbits/FadeContent";
import ShinyText from "../../../components/reactbits/ShinyText";
import { getTopMobilityScopeSignal } from "../scopePresentation";
import { TopMobilityCard } from "../components/TopMobilityCard";
import { useTopPicksScreen } from "../hooks/useTopPicksScreen";
import { OriginSheet } from "../../origin/components/OriginSheet";
import { getOriginStatusText, getOriginTone } from "../../origin/originPresentation";
import { EmptyStateCard } from "../../ui/EmptyStateCard";
import { LoadingCard } from "../../ui/LoadingCard";

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

  function handleApplyOrigin(nextOrigin: UserOrigin): void {
    applyOrigin(nextOrigin);
  }

  return (
    <section className="screen screen--list">
      <div className="screen__background">
        <DotGrid
          dotSize={10}
          gap={22}
          baseColor="color-mix(in srgb, var(--color-text-3) 26%, transparent)"
          activeColor="color-mix(in srgb, var(--color-primary-soft) 34%, transparent)"
        />
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
                onClick={openOriginSheet}
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
                <h1>{serverOpenCount > 0 ? "Las mejores opciones abiertas ahora" : "Las mejores opciones proximas"}</h1>
                <p>
                  {serverOpenCount > 0
                    ? "Priorizamos solo centros abiertos y resolvemos transporte completo para las tres mejores opciones."
                    : "No hay centros abiertos elegibles ahora mismo. Mostramos las opciones mas utiles para mas tarde."}
                </p>
              </div>
              <div className="top-picks-header__actions">
                <button
                  type="button"
                  className={`list-topbar__origin list-topbar__origin--${getOriginTone(origin, geolocationStatus)}`}
                  onClick={openOriginSheet}
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
              <span className="list-topbar__pill"><strong>{getTopMobilityScopeSignal(topScope)}</strong> desde origen</span>
              <span className="list-topbar__pill list-topbar__pill--open"><strong>{serverOpenCount}</strong> abiertas ahora</span>
              {originSearch.presetsError ? <span className="screen__inline-error">{originSearch.presetsError}</span> : null}
            </section>

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
