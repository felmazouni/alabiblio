import type { PublicFiltersResponse, TransportMode } from "@alabiblio/contracts";
import {
  Bike,
  Bus,
  Calendar,
  Car,
  ChevronDown,
  Clock,
  MapPin,
  RotateCcw,
  SlidersHorizontal,
  Train,
  Wifi,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn";
import {
  defaultPublicFilters,
  type PublicFiltersState,
} from "../lib/publicCatalog";

type TabId = "general" | "horarios";

function transportIcon(mode: TransportMode) {
  switch (mode) {
    case "metro":
    case "cercanias":
    case "metro_ligero":
      return Train;
    case "emt_bus":
      return Bus;
    case "bicimad":
      return Bike;
    case "car":
      return Car;
  }
}

function transportLabel(mode: TransportMode) {
  switch (mode) {
    case "metro":
      return "Metro";
    case "cercanias":
      return "Cercanias";
    case "metro_ligero":
      return "Metro ligero";
    case "emt_bus":
      return "Bus";
    case "bicimad":
      return "Bici";
    case "car":
      return "Coche";
  }
}

function TabButton({
  active,
  children,
  icon: Icon,
  onClick,
  disabled = false,
}: {
  active: boolean;
  children: ReactNode;
  icon: ElementType;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-2xl px-4 text-[14px] font-medium transition",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-foreground/80 hover:bg-card/50",
        disabled && "cursor-not-allowed text-muted-foreground/60 hover:bg-transparent",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function ToggleChip({
  active,
  children,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  icon?: ElementType;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/35 hover:bg-muted/35",
      )}
      onClick={onClick}
      type="button"
    >
      {Icon ? <Icon className="size-4" /> : null}
      {children}
    </button>
  );
}

function Switch({
  checked,
  disabled,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <button
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        disabled
          ? "cursor-not-allowed bg-input opacity-60"
          : checked
            ? "bg-primary"
            : "bg-input",
      )}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      type="button"
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-card shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function SettingCard({
  icon: Icon,
  title,
  subtitle,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  icon: ElementType;
  title: string;
  subtitle: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-border bg-card px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-foreground">{title}</p>
          <p className="text-[12px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SelectLike({
  value,
  disabled = false,
}: {
  value: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-[14px] text-foreground",
        disabled && "cursor-not-allowed opacity-70",
      )}
      disabled={disabled}
      type="button"
    >
      <span>{value}</span>
      <ChevronDown className="size-4 text-muted-foreground" />
    </button>
  );
}

export function FiltersPanel({
  filters,
  forceOpen = false,
  metadata,
  loading,
  onChange,
  resultCount,
}: {
  filters: PublicFiltersState;
  forceOpen?: boolean;
  metadata: PublicFiltersResponse | null;
  loading: boolean;
  onChange: (filters: PublicFiltersState) => void;
  resultCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [filters, isOpen]);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const activeFiltersCount = useMemo(
    () =>
      [
        filters.kinds.length > 0,
        filters.transportModes.length > 0,
        filters.openNow,
        filters.accessible,
        filters.withWifi,
        filters.withCapacity,
        metadata?.canUseDistanceFilter &&
          filters.radiusMeters !== defaultPublicFilters.radiusMeters,
      ].filter(Boolean).length,
    [filters, metadata?.canUseDistanceFilter],
  );

  const handleClear = () => {
    setLocalFilters(defaultPublicFilters);
  };

  const handleApply = () => {
    onChange(localFilters);
    setIsOpen(false);
  };

  const toggleKind = (kind: "library" | "study_room") => {
    setLocalFilters((current) => ({
      ...current,
      kinds: current.kinds.includes(kind)
        ? current.kinds.filter((value) => value !== kind)
        : [...current.kinds, kind],
    }));
  };

  const toggleTransportMode = (mode: TransportMode) => {
    setLocalFilters((current) => ({
      ...current,
      transportModes: current.transportModes.includes(mode)
        ? current.transportModes.filter((value) => value !== mode)
        : [...current.transportModes, mode],
    }));
  };

  return (
    <>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-[13px] font-medium text-foreground shadow-sm transition hover:bg-muted/55"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <SlidersHorizontal className="size-4" />
        Filtros
        {activeFiltersCount > 0 ? (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
            {activeFiltersCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/36 p-4">
          <div className="flex max-h-[86vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div className="flex items-start gap-4">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
                  <SlidersHorizontal className="size-5" />
                </div>
                <div>
                  <h3 className="text-[1.6rem] font-semibold leading-none text-foreground">
                    Filtros avanzados
                  </h3>
                  <p className="mt-1.5 text-[13px] text-muted-foreground">
                    Personaliza tu busqueda para encontrar el espacio perfecto
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <button
                  className="inline-flex items-center gap-2 text-[14px] text-muted-foreground transition hover:text-foreground"
                  onClick={handleClear}
                  type="button"
                >
                  <RotateCcw className="size-4" />
                  Limpiar
                </button>
                <button
                  className="text-muted-foreground transition hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="px-5 pt-4">
              <div className="grid grid-cols-2 rounded-2xl bg-muted p-1">
                <TabButton active={activeTab === "general"} icon={MapPin} onClick={() => setActiveTab("general")}> 
                  General
                </TabButton>
                <TabButton active={activeTab === "horarios"} icon={Calendar} onClick={() => setActiveTab("horarios")}> 
                  Horarios
                </TabButton>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {activeTab === "general" ? (
                <div className="space-y-6">
                  <section>
                    <h4 className="text-[1rem] font-semibold text-foreground">
                      Distancia maxima
                    </h4>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Define el radio de busqueda desde tu ubicacion
                    </p>

                    <div className="mt-3 rounded-[18px] border border-border bg-card px-4 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-[14px] text-muted-foreground">
                          <MapPin className="size-4" />
                          Radio de busqueda
                        </span>
                        <span className="text-[1.7rem] font-bold leading-none text-primary">
                          {Math.round(localFilters.radiusMeters / 1000)} km
                        </span>
                      </div>

                      <div className="mt-4">
                        <input
                          className="w-full accent-primary"
                          disabled={!metadata?.canUseDistanceFilter}
                          max={10000}
                          min={500}
                          onChange={(event) =>
                            setLocalFilters((current) => ({
                              ...current,
                              radiusMeters: Number(event.target.value),
                            }))
                          }
                          step={250}
                          type="range"
                          value={localFilters.radiusMeters}
                        />
                        <div className="mt-3 flex justify-between text-[12px] text-muted-foreground">
                          <span>500m</span>
                          <span>5 km</span>
                          <span>10 km</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[1rem] font-semibold text-foreground">
                      Tipo de espacio
                    </h4>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Selecciona el tipo de establecimiento
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <ToggleChip
                        active={localFilters.kinds.includes("library")}
                        onClick={() => toggleKind("library")}
                      >
                        Biblioteca
                      </ToggleChip>
                      <ToggleChip
                        active={localFilters.kinds.includes("study_room")}
                        onClick={() => toggleKind("study_room")}
                      >
                        Sala de Estudio
                      </ToggleChip>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[1rem] font-semibold text-foreground">
                      Transporte disponible
                    </h4>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Filtra por opciones de transporte cercanas
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {(metadata?.availableTransportModes ?? []).map((option) => {
                        const Icon = transportIcon(option.mode);
                        return (
                          <ToggleChip
                            active={localFilters.transportModes.includes(option.mode)}
                            icon={Icon}
                            key={option.mode}
                            onClick={() => toggleTransportMode(option.mode)}
                          >
                            {transportLabel(option.mode)}
                          </ToggleChip>
                        );
                      })}
                    </div>
                  </section>
                </div>
              ) : null}

              {activeTab === "horarios" ? (
                <div className="space-y-6">
                  <section>
                    <h4 className="text-[1rem] font-semibold text-foreground">
                      Estado actual
                    </h4>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Filtra espacios que ahora mismo están abiertos.
                    </p>
                    <div className="mt-4">
                      <SettingCard
                        checked={localFilters.openNow}
                        icon={Clock}
                        onCheckedChange={(value) =>
                          setLocalFilters((current) => ({ ...current, openNow: value }))
                        }
                        subtitle="Solo espacios abiertos"
                        title="Abierta ahora"
                      />
                    </div>
                  </section>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border bg-muted/35 px-5 py-4">
              <p className="mb-3 text-center text-[13px] text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {loading ? "..." : resultCount}
                </span>{" "}
                resultados encontrados
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-[14px] font-medium text-foreground transition hover:bg-muted/40"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 rounded-2xl bg-primary px-4 py-3 text-[14px] font-medium text-primary-foreground transition hover:opacity-90"
                  onClick={handleApply}
                  type="button"
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
