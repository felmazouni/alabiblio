import type { PublicFiltersResponse, TransportMode } from "@alabiblio/contracts";
import {
  Bike,
  Bus,
  Calendar,
  Car,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  RotateCcw,
  Search,
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
import { normalizeZoneLabel } from "../lib/presentationText";
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
        "inline-flex h-7 items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-medium transition",
        active
          ? "bg-card text-foreground"
          : "text-foreground/75 hover:bg-card/40",
        disabled && "cursor-not-allowed text-muted-foreground/60 hover:bg-transparent",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-3" />
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
        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/35 hover:bg-muted/35",
      )}
      onClick={onClick}
      type="button"
    >
      {Icon ? <Icon className="size-3" /> : null}
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
    <div className="flex items-center justify-between rounded-[12px] border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-3.5" />
        </div>
        <div>
          <p className="text-[12px] font-medium text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function normalizeSearchText(input: string): string {
  return input
    .toLocaleLowerCase("es-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  const [districtQuery, setDistrictQuery] = useState("");
  const [isDistrictComboboxOpen, setIsDistrictComboboxOpen] = useState(false);

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

  useEffect(() => {
    if (activeTab !== "zona") {
      setDistrictQuery("");
      setIsDistrictComboboxOpen(false);
    }
  }, [activeTab]);

  const districtOptions = useMemo(
    () =>
      (metadata?.availableDistricts ?? []).map((option) => ({
        ...option,
        label: normalizeZoneLabel(option.label || option.value),
      })),
    [metadata?.availableDistricts],
  );

  const filteredDistrictOptions = useMemo(() => {
    const needle = normalizeSearchText(districtQuery.trim());
    if (!needle) {
      return districtOptions;
    }

    return districtOptions.filter((option) => {
      const haystack = `${option.label} ${option.value}`;
      return normalizeSearchText(haystack).includes(needle);
    });
  }, [districtOptions, districtQuery]);

  const selectedDistrictLabels = useMemo(
    () =>
      localFilters.districts
        .map(
          (value) =>
            districtOptions.find((option) => option.value === value)?.label ??
            normalizeZoneLabel(value),
        )
        .join(", "),
    [districtOptions, localFilters.districts],
  );

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
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-[12px] font-medium text-foreground shadow-sm transition hover:bg-muted/55"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <SlidersHorizontal className="size-3.5" />
        Filtros
        {activeFiltersCount > 0 ? (
          <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {activeFiltersCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/36 p-4">
          <div className="flex max-h-[82vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_20px_64px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-lg bg-accent text-primary">
                  <SlidersHorizontal className="size-3.5" />
                </div>
                <h3 className="text-[1rem] font-semibold text-foreground">Filtros</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex items-center gap-1 text-[12px] text-muted-foreground transition hover:text-foreground"
                  onClick={handleClear}
                  type="button"
                >
                  <RotateCcw className="size-3" />
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

            <div className="px-4 pt-3">
              <div className="grid grid-cols-4 rounded-xl bg-muted/75 p-0.5">
                <TabButton
                  active={activeTab === "general"}
                  icon={SlidersHorizontal}
                  onClick={() => setActiveTab("general")}
                >
                  General
                </TabButton>
                <TabButton
                  active={activeTab === "zona"}
                  icon={MapPin}
                  onClick={() => setActiveTab("zona")}
                >
                  Zona
                </TabButton>
                <TabButton
                  active={activeTab === "ordenar"}
                  icon={ChevronDown}
                  onClick={() => setActiveTab("ordenar")}
                >
                  Ordenar
                </TabButton>
                <TabButton
                  active={activeTab === "horarios"}
                  icon={Calendar}
                  onClick={() => setActiveTab("horarios")}
                >
                  Horarios
                </TabButton>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {activeTab === "general" ? (
                <div className="space-y-4">
                  <section>
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Tipo de espacio
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
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
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
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
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Transporte cercano
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
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
                <div className="space-y-4">
                  <section>
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Radio de busqueda
                    </h4>
                    <div className="rounded-[14px] border border-border bg-card px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <MapPin className="size-3" />
                          Radio
                        </span>
                        <span className="text-[1.2rem] font-bold leading-none text-primary">
                          {Math.round(localFilters.radiusMeters / 1000)} km
                        </span>
                      </div>
                      <div className="mt-2">
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
                        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                          <span>5 km</span>
                          <span>60 km</span>
                          <span>120 km</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Distrito
                    </h4>
                    <div className="relative">
                      <button
                        className="flex h-8 w-full items-center justify-between rounded-lg border border-border bg-card px-2.5 text-[12px] text-foreground"
                        onClick={() => setIsDistrictComboboxOpen((current) => !current)}
                        type="button"
                      >
                        <span className="truncate text-left">
                          {localFilters.districts.length > 0
                            ? `${localFilters.districts.length} seleccionados`
                            : "Seleccionar distritos"}
                        </span>
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </button>

                      {isDistrictComboboxOpen ? (
                        <div className="mt-1 w-full rounded-lg border border-border bg-card p-2 shadow-[0_10px_30px_rgba(15,23,42,0.18)]">
                          <div className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2">
                            <Search className="size-3 text-muted-foreground" />
                            <input
                              className="w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
                              onChange={(event) => setDistrictQuery(event.target.value)}
                              placeholder="Buscar distrito"
                              type="text"
                              value={districtQuery}
                            />
                          </div>

                          <div className="mt-2 max-h-44 overflow-y-auto">
                            {filteredDistrictOptions.length > 0 ? (
                              filteredDistrictOptions.map((option) => {
                                const selected = localFilters.districts.includes(option.value);
                                return (
                                  <button
                                    className={cn(
                                      "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[12px] text-left transition",
                                      selected
                                        ? "bg-primary/10 text-foreground"
                                        : "text-foreground hover:bg-muted/45",
                                    )}
                                    key={option.value}
                                    onClick={() => toggleStringValue("districts", option.value)}
                                    type="button"
                                  >
                                    <span className="truncate">{option.label}</span>
                                    {selected ? <Check className="size-3 text-primary" /> : null}
                                  </button>
                                );
                              })
                            ) : (
                              <p className="px-2 py-1 text-[11px] text-muted-foreground">
                                No hay coincidencias.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {selectedDistrictLabels ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {selectedDistrictLabels}
                      </p>
                    ) : null}
                  </section>
                </div>
              ) : null}

              {activeTab === "ordenar" ? (
                <div className="space-y-4">
                  <section>
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Ordenacion
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
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
                <div className="space-y-4">
                  <section>
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
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

            <div className="border-t border-border bg-muted/35 px-4 py-2.5">
              <p className="mb-2 text-[12px] text-muted-foreground">
                {loading ? "..." : resultCount} resultados
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground transition hover:bg-muted/40"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 rounded-xl bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground transition hover:opacity-90"
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
