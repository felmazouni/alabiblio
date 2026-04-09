import type {
  GeocodeAddressOption,
  OriginPreset,
  UserOrigin,
} from "@alabiblio/contracts/origin";
import { useEffect, useRef, useState } from "react";
import { Check, Crosshair, Loader2, MapPin, Navigation, X } from "lucide-react";
import DotGrid from "../../../components/reactbits/DotGrid";
import FadeContent from "../../../components/reactbits/FadeContent";
import Magnet from "../../../components/reactbits/Magnet";
import ShinyText from "../../../components/reactbits/ShinyText";
import SpotlightCard from "../../../components/reactbits/SpotlightCard";
import { OriginPresetsRow } from "./OriginPresetsRow";

type OriginSheetProps = {
  open: boolean;
  origin: UserOrigin | null;
  geolocationStatus: "idle" | "requesting" | "granted" | "denied" | "unavailable";
  query: string;
  results: GeocodeAddressOption[];
  loading: boolean;
  error: string | null;
  presets: OriginPreset[];
  onClose: () => void;
  onRequestGeolocation: () => void;
  onQueryChange: (value: string) => void;
  onSelectAddress: (item: GeocodeAddressOption) => void;
  onSelectPreset: (preset: OriginPreset) => void;
  onContinueWithoutOrigin: () => void;
};

export function OriginSheet({
  open,
  origin,
  geolocationStatus,
  query,
  results,
  loading,
  error,
  presets,
  onClose,
  onRequestGeolocation,
  onQueryChange,
  onSelectAddress,
  onSelectPreset,
  onContinueWithoutOrigin,
}: OriginSheetProps) {
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const highlightedIndex =
    results.length === 0 ? -1 : Math.min(Math.max(highlighted, 0), results.length - 1);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [open]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => Math.min(Math.max(current, -1) + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" && highlightedIndex >= 0 && results[highlightedIndex]) {
      event.preventDefault();
      onSelectAddress(results[highlightedIndex]);
      return;
    }
    if (event.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  const showSuggestions = results.length > 0 || (loading && query.trim().length >= 3);
  const showError = error && !loading && results.length === 0 && query.trim().length >= 3;

  return (
    <div className="origin-sheet">
      <div className="origin-sheet__backdrop" onClick={onClose} />
      <div className="origin-sheet__surface">
        <DotGrid
          className="origin-sheet__background"
          dotSize={8}
          gap={18}
          baseColor="color-mix(in srgb, var(--color-text-3) 24%, transparent)"
          activeColor="color-mix(in srgb, var(--color-primary-soft) 30%, transparent)"
        />
        <FadeContent className="origin-sheet__inner" blur duration={500}>
          <div className="origin-sheet__handle" />

          <div className="origin-sheet__header">
            <div>
              <ShinyText text="alabiblio" className="origin-sheet__eyebrow" />
              <h2>Desde donde buscas?</h2>
              <p>Elige un origen para calcular llegada, orden y mejores alternativas.</p>
            </div>
            <button type="button" className="origin-sheet__close" onClick={onClose} aria-label="Cerrar origen">
              <X size={18} />
            </button>
          </div>

          <SpotlightCard className="origin-sheet__card">
            <div className="origin-sheet__selection-list">
              <button
                type="button"
                className={`origin-sheet__selection-item${origin?.kind === "geolocation" || geolocationStatus === "granted" ? " origin-sheet__selection-item--active" : ""}`}
                onClick={onRequestGeolocation}
              >
                <span className="origin-sheet__selection-icon">
                  <Crosshair size={17} />
                </span>
                <span className="origin-sheet__selection-copy">
                  <strong>Mi ubicacion actual</strong>
                  <small>
                    {geolocationStatus === "requesting"
                      ? "Buscando ubicacion..."
                      : geolocationStatus === "denied"
                      ? "Permiso denegado"
                      : geolocationStatus === "granted"
                      ? "Ubicacion activa"
                      : "GPS en tiempo real"}
                  </small>
                </span>
                {(origin?.kind === "geolocation" || geolocationStatus === "granted") ? (
                  <span className="origin-sheet__selection-check">
                    <Check size={16} />
                  </span>
                ) : null}
              </button>
            </div>

            <div className="origin-sheet__divider">
              <span>o busca una direccion</span>
            </div>

            <div className="origin-search">
              <div className="origin-search__field">
                <MapPin size={15} className="origin-search__icon" />
                <input
                  ref={inputRef}
                  type="text"
                  className="origin-search__input"
                  aria-label="Buscar direccion de origen"
                  value={query}
                  onChange={(event) => {
                    onQueryChange(event.target.value);
                    setHighlighted(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Calle, barrio o estacion..."
                  autoComplete="off"
                  spellCheck={false}
                />
                {loading ? (
                  <Loader2 size={15} className="origin-search__spinner" />
                ) : query ? (
                  <button
                    type="button"
                    className="origin-search__clear"
                    onClick={() => onQueryChange("")}
                    aria-label="Borrar busqueda"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              {showSuggestions ? (
                <div ref={suggestionsRef} className="origin-search__suggestions">
                  {loading && results.length === 0 ? (
                    <div className="origin-search__suggestion origin-search__suggestion--loading">
                      <Loader2 size={13} className="origin-search__spinner" />
                      <span>Buscando...</span>
                    </div>
                  ) : null}
                  {results.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`origin-search__suggestion${index === highlightedIndex ? " origin-search__suggestion--active" : ""}`}
                      onClick={() => onSelectAddress(item)}
                      onMouseEnter={() => setHighlighted(index)}
                    >
                      <MapPin size={13} className="origin-search__suggestion-icon" />
                      <div className="origin-search__suggestion-text">
                        <span className="origin-search__suggestion-main">
                          {item.address_line ?? item.label}
                        </span>
                        {(item.district ?? item.neighborhood) ? (
                          <span className="origin-search__suggestion-sub">
                            {[item.district, item.neighborhood].filter(Boolean).join(" - ")}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {showError ? (
                <p className="origin-search__hint origin-search__hint--error">{error}</p>
              ) : query.trim().length > 0 && query.trim().length < 3 ? (
                <p className="origin-search__hint">Escribe al menos 3 caracteres para buscar.</p>
              ) : null}
            </div>

            <OriginPresetsRow presets={presets} onSelect={onSelectPreset} />

            <div className="origin-sheet__actions">
              <Magnet wrapperClassName="origin-sheet__magnet">
                <button type="button" className="origin-sheet__cta" onClick={onRequestGeolocation}>
                  <Crosshair size={16} />
                  Usar mi ubicacion
                </button>
              </Magnet>
              <button
                type="button"
                className="origin-sheet__secondary"
                onClick={onContinueWithoutOrigin}
              >
                <Navigation size={16} />
                Continuar sin ubicacion
              </button>
            </div>
          </SpotlightCard>
        </FadeContent>
      </div>
    </div>
  );
}
