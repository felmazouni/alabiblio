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
  Minus,
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

type TabId = "general" | "zona" | "ordenar";

function transportIcon(mode: TransportMode) {
  switch (mode) {
    case "metro":
    case "cercanias":
    case "metro_ligero":
      return Train;
    case "emt_bus":
      return Bus;
    case "interurban_bus":
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
      return "Bus EMT";
    case "interurban_bus":
      return "Bus interurbano";
    case "bicimad":
      return "BiciMAD";
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
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold transition-all duration-200",
        active
          ? "bg-card text-foreground shadow-[0_6px_20px_rgba(15,23,42,0.15)]"
          : "text-foreground/70 hover:bg-card/50 hover:text-foreground",
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
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-all duration-150",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(15,91,167,0.28)]"
          : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/35",
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
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <div>
          <p className="text-[12px] font-medium text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SelectionBadge({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-foreground">
      {label}
      <button
        aria-label={`Quitar ${label}`}
        className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        onClick={onRemove}
        type="button"
      >
        <Minus className="size-3" />
      </button>
    </span>
  );
}

function SearchableMultiSelect({
  title,
  placeholder,
  emptyLabel,
  query,
  onQueryChange,
  isOpen,
  onToggle,
  onClear,
  selectedCount,
  options,
  isSelected,
  onSelect,
}: {
  title: string;
  placeholder: string;
  emptyLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
  selectedCount: number;
  options: Array<{ value: string; label: string; count?: number }>;
  isSelected: (value: string) => boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-muted-foreground">
          {title}
        </p>
        {selectedCount > 0 ? (
          <button
            className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            onClick={onClear}
            type="button"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      <div className="relative">
        <button
          className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-card px-3 text-[12px] text-foreground shadow-[0_6px_18px_rgba(15,23,42,0.08)]"
          onClick={onToggle}
          type="button"
        >
          <span className="truncate text-left">
            {selectedCount > 0 ? `${selectedCount} seleccionados` : placeholder}
          </span>
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition", isOpen && "rotate-180")} />
        </button>

        {isOpen ? (
          <div className="mt-2 w-full rounded-2xl border border-border bg-card p-2.5 shadow-[0_24px_56px_rgba(15,23,42,0.24)]">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/45 px-2.5">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                className="w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Buscar"
                type="text"
                value={query}
              />
            </div>

            <div className="mt-2 max-h-48 overflow-y-auto pr-1">
              {options.length > 0 ? (
                options.map((option) => {
                  const selected = isSelected(option.value);
                  return (
                    <button
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12px] text-left transition",
                        selected
                          ? "bg-primary/10 text-foreground"
                          : "text-foreground hover:bg-muted/45",
                      )}
                      key={option.value}
                      onClick={() => onSelect(option.value)}
                      type="button"
                    >
                      <span className="truncate">{option.label}</span>
                      <span className="ml-2 inline-flex items-center gap-2">
                        {typeof option.count === "number" ? (
                          <span className="text-[10px] text-muted-foreground">{option.count}</span>
                        ) : null}
                        {selected ? <Check className="size-3.5 text-primary" /> : null}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-2.5 py-2 text-[11px] text-muted-foreground">{emptyLabel}</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
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
  const [neighborhoodQuery, setNeighborhoodQuery] = useState("");
  const [isDistrictComboboxOpen, setIsDistrictComboboxOpen] = useState(false);
  const [isNeighborhoodComboboxOpen, setIsNeighborhoodComboboxOpen] = useState(false);

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
      setNeighborhoodQuery("");
      setIsDistrictComboboxOpen(false);
      setIsNeighborhoodComboboxOpen(false);
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
      localFilters.districts.map(
        (value) =>
          districtOptions.find((option) => option.value === value)?.label ??
          normalizeZoneLabel(value),
      ),
    [districtOptions, localFilters.districts],
  );

  const neighborhoodOptions = useMemo(
    () =>
      (metadata?.availableNeighborhoods ?? []).map((option) => ({
        ...option,
        label: normalizeZoneLabel(option.label || option.value),
      })),
    [metadata?.availableNeighborhoods],
  );

  const filteredNeighborhoodOptions = useMemo(() => {
    const needle = normalizeSearchText(neighborhoodQuery.trim());
    if (!needle) {
      return neighborhoodOptions;
    }

    return neighborhoodOptions.filter((option) =>
      normalizeSearchText(`${option.label} ${option.value}`).includes(needle),
    );
  }, [neighborhoodOptions, neighborhoodQuery]);

  const selectedNeighborhoodLabels = useMemo(
    () =>
      localFilters.neighborhoods.map(
        (value) =>
          neighborhoodOptions.find((option) => option.value === value)?.label ??
          normalizeZoneLabel(value),
      ),
    [localFilters.neighborhoods, neighborhoodOptions],
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
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-[12px] font-semibold text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition hover:bg-muted/55"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <SlidersHorizontal className="size-4" />
        Filtros
        {activeFiltersCount > 0 ? (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {activeFiltersCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[3px]">
          <div className="flex max-h-[82vh] w-full max-w-[580px] flex-col overflow-hidden rounded-[24px] border border-border/90 bg-card shadow-[0_36px_100px_rgba(2,6,23,0.42)]">
            <div className="flex items-center justify-between border-b border-border/80 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary">
                  <SlidersHorizontal className="size-4" />
                </div>
                <div>
                  <h3 className="text-[1.05rem] font-semibold text-foreground">Filtros</h3>
                  <p className="text-[11px] text-muted-foreground">Ajusta la busqueda con precision</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
                  onClick={handleClear}
                  type="button"
                >
                  <RotateCcw className="size-3.5" />
                  Limpiar
                </button>
                <button
                  className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="px-4 pt-3.5">
              <div className="grid grid-cols-3 rounded-2xl border border-border bg-muted/65 p-1">
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
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {activeTab === "general" ? (
                <div className="space-y-5">
                  <section>
                    <h4 className="mb-3 text-[11px] font-medium text-muted-foreground">
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
                    <h4 className="mb-3 text-[11px] font-medium text-muted-foreground">
                      Caracteristicas
                    </h4>
                    <div className="grid gap-2.5 sm:grid-cols-2">
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
                        checked={localFilters.openNow}
                        icon={Clock}
                        onCheckedChange={(value) =>
                          setLocalFilters((current) => ({ ...current, openNow: value }))
                        }
                        subtitle="Solo centros abiertos ahora"
                        title="Abierta ahora"
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
                    <h4 className="mb-3 text-[11px] font-medium text-muted-foreground">
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
                    <h4 className="mb-3 text-[11px] font-medium text-muted-foreground">
                      Radio de busqueda
                    </h4>
                    <div className="rounded-[18px] border border-border bg-card px-4 py-3.5 shadow-[0_12px_26px_rgba(15,23,42,0.08)]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                          <MapPin className="size-3.5" />
                          Cobertura
                        </span>
                        <span className="rounded-lg bg-accent px-2.5 py-1 text-[1.05rem] font-semibold leading-none text-primary">
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
                        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                          <span>5 km</span>
                          <span>60 km</span>
                          <span>120 km</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <SearchableMultiSelect
                      emptyLabel="No hay coincidencias."
                      isOpen={isDistrictComboboxOpen}
                      isSelected={(value) => localFilters.districts.includes(value)}
                      onClear={() =>
                        setLocalFilters((current) => ({ ...current, districts: [] }))
                      }
                      onQueryChange={setDistrictQuery}
                      onSelect={(value) => toggleStringValue("districts", value)}
                      onToggle={() => {
                        setIsNeighborhoodComboboxOpen(false);
                        setIsDistrictComboboxOpen((current) => !current);
                      }}
                      options={filteredDistrictOptions}
                      placeholder="Seleccionar distritos"
                      query={districtQuery}
                      selectedCount={localFilters.districts.length}
                      title="Distrito"
                    />

                    {selectedDistrictLabels.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedDistrictLabels.map((label, index) => (
                          <SelectionBadge
                            key={`${label}:${index}`}
                            label={label}
                            onRemove={() =>
                              setLocalFilters((current) => ({
                                ...current,
                                districts: current.districts.filter((_, currentIndex) => currentIndex !== index),
                              }))
                            }
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>

                  <section>
                    <SearchableMultiSelect
                      emptyLabel="No hay barrios disponibles con ese termino."
                      isOpen={isNeighborhoodComboboxOpen}
                      isSelected={(value) => localFilters.neighborhoods.includes(value)}
                      onClear={() =>
                        setLocalFilters((current) => ({ ...current, neighborhoods: [] }))
                      }
                      onQueryChange={setNeighborhoodQuery}
                      onSelect={(value) => toggleStringValue("neighborhoods", value)}
                      onToggle={() => {
                        setIsDistrictComboboxOpen(false);
                        setIsNeighborhoodComboboxOpen((current) => !current);
                      }}
                      options={filteredNeighborhoodOptions}
                      placeholder="Seleccionar barrios"
                      query={neighborhoodQuery}
                      selectedCount={localFilters.neighborhoods.length}
                      title="Barrio"
                    />

                    {selectedNeighborhoodLabels.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedNeighborhoodLabels.map((label, index) => (
                          <SelectionBadge
                            key={`${label}:${index}`}
                            label={label}
                            onRemove={() =>
                              setLocalFilters((current) => ({
                                ...current,
                                neighborhoods: current.neighborhoods.filter(
                                  (_, currentIndex) => currentIndex !== index,
                                ),
                              }))
                            }
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : null}

              {activeTab === "ordenar" ? (
                <div className="space-y-5">
                  <section>
                    <h4 className="mb-3 text-[11px] font-medium text-muted-foreground">
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

            </div>

            <div className="border-t border-border/80 bg-muted/35 px-4 py-3.5">
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Resultado estimado
                  </p>
                  <p className="mt-0.5 text-[1.2rem] font-semibold leading-none text-foreground">
                    {loading ? "..." : resultCount}
                  </p>
                </div>
                <p className="text-right text-[11px] text-muted-foreground">
                  Ajusta filtros y aplica para actualizar el listado.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] font-semibold text-foreground transition hover:bg-muted/40"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-[0_14px_26px_rgba(15,91,167,0.32)] transition hover:opacity-90"
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
