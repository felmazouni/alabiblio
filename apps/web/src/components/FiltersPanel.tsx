import { useEffect, useState } from "react";
import { Bike, Bus, Calendar, Car, Check, Clock, MapPin, RotateCcw, SlidersHorizontal, Star, Volume2, Plug, Wifi, Thermometer, Sparkles, Lightbulb, Train, X } from "lucide-react";
import { cn } from "../lib/cn";

export interface PublicFilters {
  query: string;
  openNow: boolean;
  onlyLibraries: boolean;
  onlyStudyRooms: boolean;
  withWifi: boolean;
  accessible: boolean;
}

export const defaultPublicFilters: PublicFilters = {
  query: "",
  openNow: false,
  onlyLibraries: false,
  onlyStudyRooms: false,
  withWifi: false,
  accessible: false,
};

type TabId = "general" | "horarios" | "calidad";

function ToggleChip({
  selected,
  onClick,
  children,
  icon: Icon,
  size = "default",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ElementType;
  size?: "default" | "sm";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-medium transition-all border",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        selected
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/50",
      )}
      onClick={onClick}
      type="button"
    >
      {Icon ? <Icon className={size === "sm" ? "size-3" : "size-4"} /> : null}
      {children}
      {selected ? <Check className={size === "sm" ? "size-3" : "size-3.5"} /> : null}
    </button>
  );
}

function Switch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <button
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-input",
      )}
      onClick={() => onCheckedChange(!checked)}
      type="button"
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-5 rounded-full bg-card shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function FilterSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {description ? <p className="text-xs text-muted-foreground mt-0.5">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function FiltersPanel({
  filters,
  onChange,
  resultCount,
}: {
  filters: PublicFilters;
  onChange: (filters: PublicFilters) => void;
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

  const activeFiltersCount = [
    filters.openNow,
    filters.onlyLibraries,
    filters.onlyStudyRooms,
    filters.withWifi,
    filters.accessible,
  ].filter(Boolean).length;

  const updateLocal = (updates: Partial<PublicFilters>) => {
    setLocalFilters((current) => ({ ...current, ...updates }));
  };

  const handleApply = () => {
    onChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalFilters(defaultPublicFilters);
  };

  const transportOptions = [
    { key: "metro", label: "Metro", icon: Train },
    { key: "bus", label: "Bus", icon: Bus },
    { key: "bike", label: "Bici", icon: Bike },
    { key: "car", label: "Coche", icon: Car },
  ] as const;

  const aspectOptions = [
    { key: "silencio", label: "Silencio", icon: Volume2 },
    { key: "enchufes", label: "Enchufes", icon: Plug },
    { key: "wifi", label: "WiFi", icon: Wifi },
    { key: "temperatura", label: "Temperatura", icon: Thermometer },
    { key: "limpieza", label: "Limpieza", icon: Sparkles },
    { key: "iluminacion", label: "Iluminacion", icon: Lightbulb },
  ] as const;

  return (
    <>
      <button
        className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-9 px-4 py-2 border border-border bg-card text-foreground hover:bg-muted/50"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <SlidersHorizontal className="size-4" />
        <span className="hidden sm:inline">Filtros</span>
        {activeFiltersCount > 0 ? (
          <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            {activeFiltersCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0 w-full rounded-2xl border border-border bg-card shadow-2xl">
            <div className="px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <SlidersHorizontal className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Filtros avanzados</h3>
                    <p className="text-sm text-muted-foreground">
                      Personaliza tu busqueda para encontrar el espacio perfecto
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm"
                    onClick={handleReset}
                    type="button"
                  >
                    <RotateCcw className="size-4" />
                    Limpiar
                  </button>
                  <button className="text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)} type="button">
                    <X className="size-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="mx-6 mt-4 grid grid-cols-3 rounded-xl bg-muted p-1">
                <button
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    activeTab === "general" ? "bg-card shadow-sm" : "hover:bg-transparent",
                  )}
                  onClick={() => setActiveTab("general")}
                  type="button"
                >
                  <MapPin className="size-4" />
                  General
                </button>
                <button
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    activeTab === "horarios" ? "bg-card shadow-sm" : "hover:bg-transparent",
                  )}
                  onClick={() => setActiveTab("horarios")}
                  type="button"
                >
                  <Calendar className="size-4" />
                  Horarios
                </button>
                <button
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    activeTab === "calidad" ? "bg-card shadow-sm" : "hover:bg-transparent",
                  )}
                  onClick={() => setActiveTab("calidad")}
                  type="button"
                >
                  <Star className="size-4" />
                  Calidad
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {activeTab === "general" ? (
                  <div className="space-y-6">
                    <FilterSection title="Distancia maxima" description="Define el radio de busqueda desde tu ubicacion">
                      <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="size-4" />
                            Radio de busqueda
                          </span>
                          <span className="text-lg font-bold text-primary">5 km</span>
                        </div>
                        <div className="space-y-4">
                          <div className="h-1.5 rounded-full bg-input">
                            <div className="h-1.5 w-1/2 rounded-full bg-primary relative">
                              <span className="absolute -right-2 -top-1.5 size-4 rounded-full bg-primary" />
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>500m</span>
                            <span>5 km</span>
                            <span>10 km</span>
                          </div>
                        </div>
                      </div>
                    </FilterSection>

                    <FilterSection title="Tipo de espacio" description="Selecciona el tipo de establecimiento">
                      <div className="flex flex-wrap gap-2">
                        <ToggleChip
                          onClick={() => updateLocal({ onlyLibraries: !localFilters.onlyLibraries, onlyStudyRooms: localFilters.onlyLibraries ? localFilters.onlyStudyRooms : false })}
                          selected={localFilters.onlyLibraries}
                        >
                          Biblioteca
                        </ToggleChip>
                        <ToggleChip
                          onClick={() => updateLocal({ onlyStudyRooms: !localFilters.onlyStudyRooms, onlyLibraries: localFilters.onlyStudyRooms ? localFilters.onlyLibraries : false })}
                          selected={localFilters.onlyStudyRooms}
                        >
                          Sala de Estudio
                        </ToggleChip>
                      </div>
                    </FilterSection>

                    <FilterSection title="Transporte disponible" description="Filtra por opciones de transporte cercanas">
                      <div className="flex flex-wrap gap-2">
                        {transportOptions.map(({ key, label, icon }) => (
                          <ToggleChip key={key} icon={icon} onClick={() => undefined} selected={false}>
                            {label}
                          </ToggleChip>
                        ))}
                      </div>
                    </FilterSection>
                  </div>
                ) : null}

                {activeTab === "horarios" ? (
                  <div className="space-y-6">
                    <FilterSection title="Estado actual">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                            localFilters.openNow ? "bg-primary/5 border-primary" : "bg-card border-border hover:border-primary/50",
                          )}
                          onClick={() => updateLocal({ openNow: !localFilters.openNow })}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("size-10 rounded-lg flex items-center justify-center", localFilters.openNow ? "bg-primary/10" : "bg-muted")}>
                              <Clock className={cn("size-5", localFilters.openNow ? "text-primary" : "text-muted-foreground")} />
                            </div>
                            <div>
                              <p className="font-medium">Abierta ahora</p>
                              <p className="text-xs text-muted-foreground">Solo espacios abiertos</p>
                            </div>
                          </div>
                          <Switch checked={localFilters.openNow} onCheckedChange={(value) => updateLocal({ openNow: value })} />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border bg-card border-border">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg flex items-center justify-center bg-muted">
                              <span className="text-sm font-bold text-muted-foreground">24h</span>
                            </div>
                            <div>
                              <p className="font-medium">Abierta 24h</p>
                              <p className="text-xs text-muted-foreground">Horario ininterrumpido</p>
                            </div>
                          </div>
                          <Switch checked={false} onCheckedChange={() => undefined} />
                        </div>
                      </div>
                    </FilterSection>

                    <FilterSection title="Horario de fin de semana" description="Filtra por disponibilidad en sabados y domingos">
                      <div className="p-4 rounded-xl border bg-card border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg flex items-center justify-center bg-muted">
                              <Calendar className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">Abierta fines de semana</p>
                              <p className="text-xs text-muted-foreground">Filtrar por dias especificos</p>
                            </div>
                          </div>
                          <Switch checked={false} onCheckedChange={() => undefined} />
                        </div>
                      </div>
                    </FilterSection>

                    <FilterSection title="Hora de cierre minima" description="Encuentra espacios abiertos hasta cierta hora">
                      <div className="p-4 rounded-xl bg-card border border-border">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Clock className="size-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-2">Abierta al menos hasta</p>
                            <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground">
                              <span>Cualquier hora</span>
                              <span className="text-muted-foreground">⌄</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </FilterSection>
                  </div>
                ) : null}

                {activeTab === "calidad" ? (
                  <div className="space-y-6">
                    <FilterSection title="Valoracion general" description="Puntuacion minima de los usuarios">
                      <div className="p-4 rounded-xl bg-muted/30 border border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="size-4 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-medium">Cualquier valoracion</span>
                        </div>
                        <div className="flex gap-2">
                          {[
                            { label: "Todas", selected: true },
                            { label: "3 ★", selected: false },
                            { label: "3.5 ★", selected: false },
                            { label: "4 ★", selected: false },
                            { label: "4.5 ★", selected: false },
                          ].map(({ label, selected }) => (
                            <button
                              className={cn(
                                "flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border transition-all",
                                selected
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-card text-foreground border-border hover:border-primary/50",
                              )}
                              key={label}
                              type="button"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </FilterSection>

                    <FilterSection title="Requisitos por aspecto" description="Establece puntuaciones minimas por categoria">
                      <div className="grid gap-2">
                        {aspectOptions.map(({ key, label, icon: Icon }) => (
                          <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                            <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Icon className="size-4 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium flex-1">{label}</span>
                            <div className="flex gap-1.5">
                              {["-", "3+", "4+", "5+"].map((rating, index) => (
                                <button
                                  className={cn(
                                    "size-9 rounded-lg text-xs font-semibold border transition-all",
                                    index === 0
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                      : "bg-muted/50 text-foreground border-transparent hover:border-primary/50",
                                  )}
                                  key={rating}
                                  type="button"
                                >
                                  {rating}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </FilterSection>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/30">
              <p className="text-sm text-center text-muted-foreground mb-3">
                <span className="font-semibold text-foreground">{resultCount}</span> resultados encontrados
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
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
