import type { CenterKind } from "@alabiblio/contracts/centers";
import { Check, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId } from "react";
import type { CatalogBaseSortBy } from "../centers/catalogFilters";

type KindFilter = "all" | CenterKind;

const MADRID_DISTRICTS = [
  "Centro",
  "Arganzuela",
  "Retiro",
  "Salamanca",
  "Chamartin",
  "Tetuan",
  "Chamberi",
  "Fuencarral-El Pardo",
  "Moncloa-Aravaca",
  "Latina",
  "Carabanchel",
  "Usera",
  "Puente de Vallecas",
  "Moratalaz",
  "Ciudad Lineal",
  "Hortaleza",
  "Villaverde",
  "Villa de Vallecas",
  "Vicalvaro",
  "San Blas-Canillejas",
  "Barajas",
];

export type FilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  kindFilter: KindFilter;
  onKindChange: (v: KindFilter) => void;
  sortBy: CatalogBaseSortBy;
  onSortChange: (v: CatalogBaseSortBy) => void;
  openNowOnly: boolean;
  onOpenNowChange: (v: boolean) => void;
  wifiOnly: boolean;
  onWifiChange: (v: boolean) => void;
  accessibleOnly: boolean;
  onAccessibleChange: (v: boolean) => void;
  serOnly: boolean;
  onSerChange: (v: boolean) => void;
  districtFilter: string;
  onDistrictChange: (v: string) => void;
  neighborhoodFilter: string;
  onNeighborhoodChange: (v: string) => void;
  activeCount: number;
  onClearAll: () => void;
};

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`filter-drawer__toggle${checked ? " filter-drawer__toggle--on" : ""}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <div className="filter-drawer__toggle-copy">
        <span className="filter-drawer__toggle-label">{label}</span>
        {sub ? <span className="filter-drawer__toggle-sub">{sub}</span> : null}
      </div>
      <span className={`filter-drawer__toggle-knob${checked ? " filter-drawer__toggle-knob--on" : ""}`}>
        {checked ? <Check size={11} /> : null}
      </span>
    </button>
  );
}

function RadioGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="filter-drawer__radio-group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`filter-drawer__radio${value === opt.value ? " filter-drawer__radio--active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function FilterDrawer({
  open,
  onClose,
  kindFilter,
  onKindChange,
  sortBy,
  onSortChange,
  openNowOnly,
  onOpenNowChange,
  wifiOnly,
  onWifiChange,
  accessibleOnly,
  onAccessibleChange,
  serOnly,
  onSerChange,
  districtFilter,
  onDistrictChange,
  neighborhoodFilter,
  onNeighborhoodChange,
  activeCount,
  onClearAll,
}: FilterDrawerProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`filter-drawer__overlay${open ? " filter-drawer__overlay--open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`filter-drawer${open ? " filter-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="filter-drawer__header">
          <span id={titleId} className="filter-drawer__title">
            <SlidersHorizontal size={15} />
            Filtros
            {activeCount > 0 ? <span className="filter-drawer__badge">{activeCount}</span> : null}
          </span>
          <div className="filter-drawer__header-actions">
            {activeCount > 0 ? (
              <button type="button" className="filter-drawer__clear-all" onClick={onClearAll}>
                Limpiar
              </button>
            ) : null}
            <button type="button" className="filter-drawer__close" onClick={onClose} aria-label="Cerrar filtros">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="filter-drawer__body">
          <div className="filter-drawer__intro">
            <p className="filter-drawer__intro-title">Ajusta el catalogo base</p>
            <p className="filter-drawer__intro-copy">
              Los cambios se aplican al instante y no convierten el listado en ranking contextual.
            </p>
          </div>

          <section className="filter-drawer__section">
            <h4 className="filter-drawer__section-title">Tipo de centro</h4>
            <RadioGroup
              value={kindFilter}
              onChange={onKindChange}
              options={[
                { value: "all", label: "Todos" },
                { value: "library", label: "Bibliotecas" },
                { value: "study_room", label: "Salas de estudio" },
              ]}
            />
          </section>

          <section className="filter-drawer__section">
            <h4 className="filter-drawer__section-title">Orden base</h4>
            <RadioGroup
              value={sortBy}
              onChange={onSortChange}
              options={[
                { value: "open_now", label: "Abiertos primero" },
              ]}
            />
            <p className="filter-drawer__footer-note">
              El listado base no ordena por llegada ni distancia contextual.
            </p>
          </section>

          <section className="filter-drawer__section">
            <h4 className="filter-drawer__section-title">Condiciones</h4>
            <div className="filter-drawer__toggles">
              <ToggleRow label="Abierto ahora" sub="Solo centros activos" checked={openNowOnly} onChange={onOpenNowChange} />
              <ToggleRow label="WiFi" sub="Con cobertura wifi" checked={wifiOnly} onChange={onWifiChange} />
              <ToggleRow label="Accesible" sub="Accesibilidad confirmada" checked={accessibleOnly} onChange={onAccessibleChange} />
              <ToggleRow label="Zona SER" sub="Dentro de zona SER de Madrid" checked={serOnly} onChange={onSerChange} />
            </div>
          </section>

          <section className="filter-drawer__section">
            <h4 className="filter-drawer__section-title">Distrito</h4>
            <select
              className={`filter-drawer__select${districtFilter ? " filter-drawer__select--active" : ""}`}
              value={districtFilter}
              onChange={(e) => onDistrictChange(e.target.value)}
            >
              <option value="">Todos los distritos</option>
              {MADRID_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </section>

          <section className="filter-drawer__section">
            <h4 className="filter-drawer__section-title">Barrio</h4>
            <input
              type="text"
              className={`filter-drawer__text-input${neighborhoodFilter ? " filter-drawer__text-input--active" : ""}`}
              value={neighborhoodFilter}
              onChange={(e) => onNeighborhoodChange(e.target.value)}
              placeholder="Ej: Malasana, Lavapies..."
            />
          </section>
        </div>

        <div className="filter-drawer__footer">
          <span className="filter-drawer__footer-note">
            Los cambios se aplican al instante.
          </span>
          <button type="button" className="filter-drawer__apply" onClick={onClose}>
            Cerrar filtros
          </button>
        </div>
      </div>
    </>
  );
}
