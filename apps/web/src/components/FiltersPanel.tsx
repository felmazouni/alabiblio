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

type TabId = "general" | "zona" | "ordenar" | "horarios";

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

function sortLabel(sort: string) {
  switch (sort) {
    case "relevance":
      return "Relevancia";
    case "distance":
      return "Distancia";
    case "closing":
      return "Hora de cierre";
    case "capacity":
      return "Aforo";
    case "name":
      return "Nombre";
    default:
      return sort;
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
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-xl px-3 text-[12px] font-medium transition",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-foreground/80 hover:bg-card/50",
        disabled && "cursor-not-allowed text-muted-foreground/60 hover:bg-transparent",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-3.5" />
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
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/35 hover:bg-muted/35",
      )}
      onClick={onClick}
      type="button"
    >
      {Icon ? <Icon className="size-3.5" /> : null}
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
    <div className="flex items-center justify-between rounded-[14px] border border-border bg-card px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
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
        filters.districts.length > 0,
        filters.openNow,
        filters.accessible,
        filters.withWifi,
        filters.withCapacity,
        filters.withSer,
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

  const toggleStringValue = (
    field: "districts" | "neighborhoods",
    value: string,
  ) => {
    setLocalFilters((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
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
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-xl bg-accent text-primary">
                  <SlidersHorizontal className="size-4" />
                </div>
                <h3 className="text-[1.15rem] font-semibold text-foreground">
                  Filtros
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <button
                  className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition hover:text-foreground"
                  onClick={handleClear}
                  type="button"
                >
                  <RotateCcw className="size-3.5" />
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

            <div className="px-5 pt-3.5">
              <div className="grid grid-cols-4 rounded-2xl bg-muted p-1">
                <TabButton active={activeTab === "general"} icon={SlidersHorizontal} onClick={() => setActiveTab("general")}>
                  General
                </TabButton>
                <TabButton active={activeTab === "zona"} icon={MapPin} onClick={() => setActiveTab("zona")}>
                  Zona
                </TabButton>
                <TabButton active={activeTab === "ordenar"} icon={ChevronDown} onClick={() => setActiveTab("ordenar")}>
                  Ordenar
                </TabButton>
                <TabButton active={activeTab === "horarios"} icon={Calendar} onClick={() => setActiveTab("horarios")}>
                  Horarios
                </TabButton>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {activeTab === "general" ? (
                <div className="space-y-5">
                  <section>
                    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Tipo de espacio
                    </h4>
                    <div className="flex flex-wrap gap-2">
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
                        Sala de estudio
                      </ToggleChip>
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Caracteristicas
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <SettingCard
                        checked={localFilters.accessible}
                        icon={MapPin}
                        onCheckedChange={(value) =>
                          setLocalFilters((current) => ({ ...current, accessible: value }))
                        }
                        subtitle="Accesibilidad indicada"
                        title="Accesible"
                      />
                      <SettingCard
                        checked={localFilters.withWifi}
                        icon={Wifi}
                        onCheckedChange={(value) =>
                          setLocalFilters((current) => ({ ...current, withWifi: value }))
                        }
                        subtitle="WiFi disponible"
                        title="Con WiFi"
                      />
                      <SettingCard
                        checked={localFilters.withCapacity}
                        icon={Calendar}
                        onCheckedChange={(value) =>
                          setLocalFilters((current) => ({ ...current, withCapacity: value }))
                        }
                        subtitle="Aforo informado"
                        title="Con aforo"
                      />
                      <SettingCard
                        checked={localFilters.withSer}
                        icon={Car}
                        onCheckedChange={(value) =>
                          setLocalFilters((current) => ({ ...current, withSer: value }))
                        }
                        subtitle="Cobertura SER cercana"
                        title="Con SER"
                      />
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Transporte cercano
                    </h4>
                    <div className="flex flex-wrap gap-2">
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

              {activeTab === "zona" ? (
                <div className="space-y-5">
                  <section>
                    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Radio de busqueda
                    </h4>
                    <div className="rounded-[16px] border border-border bg-card px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
                          <MapPin className="size-3.5" />
                          Radio
                        </span>
                        <span className="text-[1.4rem] font-bold leading-none text-primary">
                          {Math.round(localFilters.radiusMeters / 1000)} km
                        </span>
                      </div>
                      <div className="mt-3">
                        <input
                          className="w-full accent-primary"
                          disabled={!metadata?.canUseDistanceFilter}
                          max={120000}
                          min={5000}
                          onChange={(event) =>
                            setLocalFilters((current) => ({
                              ...current,
                              radiusMeters: Number(event.target.value),
                            }))
                          }
                          step={1000}
                          type="range"
                          value={localFilters.radiusMeters}
                        />
                        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                          <span>5 km</span>
                          <span>60 km</span>
                          <span>120 km</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Distrito
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(metadata?.availableDistricts ?? []).map((option) => (
                        <ToggleChip
                          active={localFilters.districts.includes(option.value)}
                          key={option.value}
                          onClick={() => toggleStringValue("districts", option.value)}
                        >
                          {option.label}
                        </ToggleChip>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}

              {activeTab === "ordenar" ? (
                <div className="space-y-5">
                  <section>
                    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Ordenacion
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(metadata?.availableSortModes ?? []).map((option) => (
                        <ToggleChip
                          active={localFilters.sort === option.value}
                          key={option.value}
                          onClick={() =>
                            setLocalFilters((current) => ({ ...current, sort: option.value }))
                          }
                        >
                          {sortLabel(option.value)}
                        </ToggleChip>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}

              {activeTab === "horarios" ? (
                <div className="space-y-5">
                  <section>
                    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Estado actual
                    </h4>
                    <SettingCard
                      checked={localFilters.openNow}
                      icon={Clock}
                      onCheckedChange={(value) =>
                        setLocalFilters((current) => ({ ...current, openNow: value }))
                      }
                      subtitle="Solo espacios abiertos ahora"
                      title="Abierta ahora"
                    />
                  </section>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border bg-muted/35 px-5 py-3.5">
              <p className="mb-3 text-center text-[13px] text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {loading ? "..." : resultCount}
                </span>{" "}
                resultados encontrados
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 rounded-2xl border border-border bg-card px-4 py-2.5 text-[14px] font-medium text-foreground transition hover:bg-muted/40"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 rounded-2xl bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition hover:opacity-90"
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
