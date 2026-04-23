import type { CenterRatingVoteInput, TransportOption } from "@alabiblio/contracts";
import {
  ArrowLeft,
  Bike,
  Bus,
  Car,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Pencil,
  Star,
  Train,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { RatingStars, SubratingSegments } from "../components/LibraryCard";
import { PublicChrome } from "../components/PublicChrome";
import { cn } from "../lib/cn";
import {
  fetchGoogleAuthConfig,
  getSchedulePresentation,
  submitCenterRating,
  todayRangeLabel,
  type ScheduleWeekdayRow,
  useCenterRatings,
  usePublicCenterDetail,
} from "../lib/publicCatalog";
import { formatNeighborhoodDistrict } from "../lib/presentationText";
import { useUserLocation } from "../lib/userLocation";

interface GoogleIdApi {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: Record<string, string | number>,
      ) => void;
      prompt: () => void;
      cancel: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdApi;
  }
}

const ratingLabels: Array<keyof CenterRatingVoteInput> = [
  "silence",
  "wifi",
  "cleanliness",
  "plugs",
  "temperature",
  "lighting",
];

const ratingLabelText: Record<keyof CenterRatingVoteInput, string> = {
  silence: "Silencio",
  wifi: "WiFi",
  cleanliness: "Limpieza",
  plugs: "Enchufes",
  temperature: "Temperatura",
  lighting: "Iluminacion",
};

const emptyVote: CenterRatingVoteInput = {
  silence: 0,
  wifi: 0,
  cleanliness: 0,
  plugs: 0,
  temperature: 0,
  lighting: 0,
};

function averageLabel(value: number | null): string {
  if (value === null) {
    return "Sin valoraciones";
  }

  return value.toFixed(1);
}

function ScheduleRulesBlock({
  rows,
  showResolvedState,
}: {
  rows: ScheduleWeekdayRow[];
  showResolvedState: boolean;
}) {
  return (
    <div className="divide-y divide-border/40">
      {rows.map((row) => (
        <div
          className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
          key={row.label}
        >
          <span className="w-7 text-[12px] font-medium text-foreground">{row.label}</span>
          <span className="flex-1 text-[12px] text-muted-foreground">
            {row.status === "open"
              ? row.entries.join(", ")
              : row.status === "closed"
                ? "Cerrado"
                : "No informado"}
          </span>
          {showResolvedState ? (
            <span
              className={cn(
                "size-1.5 rounded-full",
                row.status === "open"
                  ? "bg-emerald-400 dark:bg-emerald-500"
                  : row.status === "closed"
                    ? "bg-rose-400/50 dark:bg-rose-500/35"
                    : "bg-slate-300/90 dark:bg-slate-600/80",
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function normalizeInfoText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldRenderScheduleNotes(notes: string | null, officialText: string | null): boolean {
  if (!notes) {
    return false;
  }

  if (!officialText) {
    return true;
  }

  return !normalizeInfoText(officialText).includes(normalizeInfoText(notes));
}

function transportModeIcon(mode: TransportOption["mode"]) {
  switch (mode) {
    case "metro":
    case "cercanias":
    case "metro_ligero":
      return Train;
    case "emt_bus":
    case "interurban_bus":
      return Bus;
    case "bicimad":
      return Bike;
    case "car":
      return Car;
  }
}

function transportModeColor(mode: TransportOption["mode"]) {
  switch (mode) {
    case "metro":          return "border border-red-300/60 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300";
    case "cercanias":      return "border border-indigo-300/60 bg-indigo-100 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-300";
    case "metro_ligero":   return "border border-violet-300/60 bg-violet-100 text-violet-700 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-300";
    case "emt_bus":        return "border border-teal-300/60 bg-teal-100 text-teal-700 dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-300";
    case "interurban_bus": return "border border-orange-300/60 bg-orange-100 text-orange-700 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-300";
    case "bicimad":        return "border border-green-300/60 bg-green-100 text-green-700 dark:border-green-500/30 dark:bg-green-950/40 dark:text-green-300";
    case "car":            return "border border-slate-200/70 bg-slate-100 text-slate-500 dark:border-slate-600/25 dark:bg-slate-800/40 dark:text-slate-400";
  }
}

function statusBadge(status: string) {
  if (status === "Abierta") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-950/45 dark:text-emerald-200";
  }
  if (status === "Cerrada") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-600/40 dark:bg-rose-950/45 dark:text-rose-200";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/40 dark:bg-amber-950/45 dark:text-amber-200";
}

function loadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window_unavailable"));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("google_script_failed")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("google_script_failed"));
    document.head.appendChild(script);
  });
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.05 5.05 0 0 1-2.2 3.31v2.74h3.57c2.08-1.92 3.27-4.74 3.27-8.06Z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.99 7.28-2.69l-3.57-2.74c-.99.66-2.26 1.06-3.71 1.06-2.85 0-5.27-1.93-6.14-4.52H2.18v2.82A11 11 0 0 0 12 23Z" fill="#34A853"/>
      <path d="M5.86 14.11a6.61 6.61 0 0 1 0-4.22V7.07H2.18a11 11 0 0 0 0 9.86l3.68-2.82Z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.68 2.82c.87-2.59 3.29-4.51 6.14-4.51Z" fill="#EA4335"/>
    </svg>
  );
}

function VoteStarsRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/25 px-3.5 py-3">
      <span className="text-[13px] font-semibold text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            className="inline-flex items-center justify-center"
            key={score}
            onClick={() => onChange(score)}
            type="button"
          >
            <Star
              className={cn(
                "size-5 transition",
                value >= score
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/35",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function CenterDetailRoute() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { location } = useUserLocation();
  const { center, data, error, loading } = usePublicCenterDetail(slug, location);

  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [voteDraft, setVoteDraft] = useState<CenterRatingVoteInput>(emptyVote);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const googleButtonHostRef = useRef<HTMLDivElement | null>(null);
  const [isGoogleReady, setIsGoogleReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedToken = window.localStorage.getItem("alabiblio_google_id_token");
    if (storedToken) {
      setGoogleIdToken(storedToken);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchGoogleAuthConfig(controller.signal)
      .then((payload) => {
        setGoogleAuthEnabled(payload.enabled);
        setGoogleClientId(payload.clientId);
      })
      .catch(() => {
        setGoogleAuthEnabled(false);
        setGoogleClientId(null);
      });

    return () => controller.abort();
  }, []);

  const {
    data: ratingsData,
    refresh: refreshRatings,
  } = useCenterRatings(slug, googleIdToken);

  useEffect(() => {
    const userVote = ratingsData?.item.userVote;
    if (userVote) {
      setVoteDraft({
        silence: userVote.silence,
        wifi: userVote.wifi,
        cleanliness: userVote.cleanliness,
        plugs: userVote.plugs,
        temperature: userVote.temperature,
        lighting: userVote.lighting,
      });
      return;
    }

    setVoteDraft(emptyVote);
  }, [ratingsData?.item.userVote]);

  useEffect(() => {
    if (searchParams.get("opinar") !== "1") {
      return;
    }

    setIsVoteModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("opinar");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!isVoteModalOpen || googleIdToken || !googleAuthEnabled || !googleClientId) {
      return;
    }

    if (!googleButtonHostRef.current) {
      return;
    }

    let mounted = true;

    loadGoogleScript()
      .then(() => {
        if (!mounted || !googleButtonHostRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (!response.credential) {
              setVoteError("No se pudo completar el login de Google.");
              return;
            }

            setGoogleIdToken(response.credential);
            window.localStorage.setItem("alabiblio_google_id_token", response.credential);
            setVoteError(null);
          },
        });

        googleButtonHostRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonHostRef.current, {
          type: "standard",
          shape: "pill",
          theme: "outline",
          text: "signin_with",
          size: "large",
          locale: "es",
        });
        setIsGoogleReady(true);
      })
      .catch(() => {
        setIsGoogleReady(false);
        setVoteError("No se pudo cargar Google Sign-In.");
      });

    return () => {
      mounted = false;
      window.google?.accounts?.id?.cancel();
      setIsGoogleReady(false);
    };
  }, [isVoteModalOpen, googleAuthEnabled, googleClientId, googleIdToken]);

  const requestGoogleSignIn = async () => {
    setVoteError(null);

    if (!googleAuthEnabled || !googleClientId) {
      setVoteError("Google no esta configurado.");
      return;
    }

    try {
      await loadGoogleScript();
      if (!window.google?.accounts?.id) {
        setVoteError("Google Sign-In no disponible.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (!response.credential) {
            setVoteError("No se pudo completar el login de Google.");
            return;
          }

          setGoogleIdToken(response.credential);
          window.localStorage.setItem("alabiblio_google_id_token", response.credential);
          setVoteError(null);
        },
      });

      if (googleButtonHostRef.current) {
        googleButtonHostRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonHostRef.current, {
          type: "standard",
          shape: "pill",
          theme: "outline",
          text: "signin_with",
          size: "large",
          locale: "es",
        });
      }

      window.google.accounts.id.prompt();
      setIsGoogleReady(true);
    } catch {
      setVoteError("No se pudo cargar Google Sign-In.");
    }
  };

  const ratingSummary = useMemo(() => {
    const item = ratingsData?.item;
    if (!item) {
      return {
        ratingAverage: center?.ratingAverage ?? null,
        ratingCount: center?.ratingCount ?? 0,
        attributes: null,
      };
    }

    return {
      ratingAverage: item.ratingAverage,
      ratingCount: item.ratingCount,
      attributes: item.attributes,
    };
  }, [ratingsData?.item, center?.ratingAverage, center?.ratingCount]);

  const hasUserVote = Boolean(ratingsData?.item?.userVote);
  const schedulePresentation = useMemo(
    () => (center ? getSchedulePresentation(center) : null),
    [center],
  );

  const submitVote = async () => {
    if (!slug || !googleIdToken) {
      setVoteError("Inicia sesion con Google para votar.");
      return;
    }

    const completed = ratingLabels.every((key) => voteDraft[key] >= 1 && voteDraft[key] <= 5);
    if (!completed) {
      setVoteError("Completa las 6 valoraciones (1 a 5). ");
      return;
    }

    setVoteSubmitting(true);
    setVoteError(null);
    try {
      await submitCenterRating(slug, voteDraft, googleIdToken);
      await refreshRatings();
      setIsVoteModalOpen(false);
    } catch {
      setVoteError("No se pudo guardar tu voto.");
    } finally {
      setVoteSubmitting(false);
    }
  };

  const logoutGoogle = () => {
    setGoogleIdToken(null);
    window.localStorage.removeItem("alabiblio_google_id_token");
  };

  const handleBackToListing = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/listado");
  };

  return (
    <PublicChrome backTo="/listado" compact>
      <main className="mx-auto max-w-[860px] space-y-4">
        {loading ? (
          <div className="rounded-[22px] border border-border bg-card p-6 text-sm text-muted-foreground shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            Cargando centro...
          </div>
        ) : error ? (
          <div className="rounded-[22px] border border-destructive/20 bg-destructive/8 p-6 text-sm text-destructive shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            {error}
          </div>
        ) : !center || !data ? (
          <div className="rounded-[22px] border border-border bg-card p-6 text-sm text-muted-foreground shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            Centro no encontrado.
          </div>
        ) : (
          <>
            <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {center.kindLabel}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    statusBadge(schedulePresentation?.statusLabel ?? center.headlineStatus),
                  )}
                >
                  {schedulePresentation?.statusLabel ?? center.headlineStatus}
                </span>
              </div>

              <h1 className="mt-2.5 text-[1.3rem] font-semibold leading-tight text-foreground">
                {center.name}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                {center.addressLine ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {center.addressLine}
                  </span>
                ) : null}
                {center.distanceLabel && center.distanceOrigin !== "not_available" ? (
                  <span className="font-medium text-primary">{center.distanceLabel}</span>
                ) : null}
              </div>
              {formatNeighborhoodDistrict(center.neighborhood, center.district) ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatNeighborhoodDistrict(center.neighborhood, center.district)}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span className="font-medium text-foreground">{schedulePresentation?.todayLabel ?? todayRangeLabel(center) ?? center.scheduleLabel}</span>
                </span>
                {center.capacityOrigin !== "not_available" && center.capacityValue !== null ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    <span className="font-medium text-foreground">{center.capacityValue} plazas</span>
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {center.wifi ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/45 px-2.5 py-1 text-[11px] font-medium text-foreground">
                    <Wifi className="size-3.5" />
                    WiFi
                  </span>
                ) : null}
                {center.accessibility ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/45 px-2.5 py-1 text-[11px] font-medium text-foreground">
                    Accesible
                  </span>
                ) : null}
              </div>

              {center.operationalNote ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-600/40 dark:bg-amber-950/35 dark:text-amber-200">
                  <span className="font-semibold">Aviso:</span> {center.operationalNote}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2.5">
                {center.mapsUrl ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition hover:opacity-90"
                    href={center.mapsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Navigation className="size-4" />
                    Ir ahora
                  </a>
                ) : null}
                {data.item.contact.websiteUrl ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/45 px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-muted/65"
                    href={data.item.contact.websiteUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="size-3.5" />
                    Ver ficha oficial
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[11px] font-medium text-muted-foreground">
                  Valoraciones
                </h2>
              </div>

              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                {ratingSummary.ratingCount > 0 && ratingSummary.ratingAverage !== null ? (
                  <div className="flex items-end gap-4">
                    <span className="text-[2.35rem] font-bold leading-none tracking-tight text-foreground">
                      {ratingSummary.ratingAverage.toFixed(1)}
                    </span>
                    <div className="flex flex-col gap-1.5 pb-1">
                      <RatingStars value={ratingSummary.ratingAverage ?? 0} size="size-[1.05rem]" />
                      <span className="text-[12px] text-muted-foreground">
                        {ratingSummary.ratingCount} {ratingSummary.ratingCount === 1 ? "opinión" : "opiniones"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[16px] border border-border/60 bg-muted/20 px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <RatingStars value={0} size="size-[1rem]" />
                      <span className="text-[12px] font-medium text-foreground">Sin opiniones</span>
                    </div>
                    <p className="mt-1.5 text-[12px] text-muted-foreground">
                      Sé el primero en valorar este centro.
                    </p>
                  </div>
                )}
                <button
                  className="inline-flex items-center gap-1.5 rounded-[11px] border border-border/60 bg-card px-3.5 py-2 text-[12px] font-semibold text-foreground shadow-[0_1px_5px_rgba(15,23,42,0.08)] transition hover:bg-muted/55 hover:text-primary dark:shadow-none"
                  onClick={() => setIsVoteModalOpen(true)}
                  type="button"
                >
                  {!hasUserVote ? (
                    <GoogleLogo className="size-4" />
                  ) : (
                    <Pencil className="size-3.5" />
                  )}
                  {hasUserVote ? "Editar mi valoración" : "Valorar con Google"}
                </button>
              </div>

              {ratingSummary.ratingCount > 0 && ratingSummary.attributes ? (
                <div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {ratingLabels.map((key) => {
                    const val = ratingSummary.attributes![key] ?? null;
                    return (
                      <div className="grid grid-cols-[5.25rem_auto_2rem] items-center gap-x-3.5" key={key}>
                        <span className="text-[12px] text-muted-foreground">
                          {ratingLabelText[key]}
                        </span>
                        <SubratingSegments value={val} />
                        <span className="text-right text-[12px] font-semibold text-foreground">
                          {val !== null ? val.toFixed(1) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {center.transportOptions.filter((o) => o.mode !== "car").length > 0 ? (
              <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                <h2 className="mb-4 text-[11px] font-medium text-muted-foreground">
                  Cómo llegar
                </h2>
                <div className="divide-y divide-border/40">
                  {center.transportOptions
                    .filter((o) => o.mode !== "car")
                    .filter((o) => o.metrics.walkDistanceMeters === null || o.metrics.walkDistanceMeters <= 500)
                    .slice(0, 6)
                    .map((option) => {
                      const Icon = transportModeIcon(option.mode);
                      return (
                        <div
                          className="flex items-start gap-3 py-2.5 first:pt-0"
                          key={option.id}
                        >
                        <div className={cn(
                            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                            transportModeColor(option.mode),
                          )}>
                            <Icon className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-foreground">{option.title}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{option.summary}</p>
                            {option.lines.length > 0 ? (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {option.lines.map((line) => (
                                  <span
                                    className="inline-flex h-5 items-center rounded-md border border-border/60 bg-card px-1.5 text-[10px] font-medium text-foreground"
                                    key={line}
                                  >
                                    {line}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          {option.metrics.walkDistanceMeters !== null && option.metrics.walkDistanceMeters > 0 ? (
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {Math.round(option.metrics.walkDistanceMeters)} m
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : null}

            <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
              <h2 className="mb-4 text-[11px] font-medium text-muted-foreground">
                Horario
              </h2>
              <div className="rounded-xl border border-border/60 bg-muted/18 px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-[13px] font-semibold text-foreground">
                    {schedulePresentation?.todayLabel ?? todayRangeLabel(center) ?? center.scheduleLabel}
                  </span>
                </div>
                {center.schedule.specialScheduleActive ? (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Hay un horario especial activo para este centro.
                  </p>
                ) : null}
              </div>
              {schedulePresentation ? (
                <div
                  className={cn(
                    "mt-3 rounded-lg border px-3 py-2 text-[11px]",
                    schedulePresentation.validationTone === "warning"
                      ? "border-amber-200/60 bg-amber-50/60 text-amber-800 dark:border-amber-600/25 dark:bg-amber-950/15 dark:text-amber-300"
                      : schedulePresentation.validationTone === "provisional"
                        ? "border-border/60 bg-muted/20 text-muted-foreground"
                        : "border-emerald-200/60 bg-emerald-50/60 text-emerald-800 dark:border-emerald-600/25 dark:bg-emerald-950/15 dark:text-emerald-300",
                  )}
                >
                  <p className="font-medium uppercase tracking-[0.08em] text-[10px] opacity-75">
                    Estado de validación
                  </p>
                  <p className="mt-1 text-[12px] font-semibold">
                    {schedulePresentation.validationLabel}
                  </p>
                  {schedulePresentation.validationHelpText ? (
                    <p className="mt-1.5 text-[11px] font-normal leading-4 opacity-90">
                      {schedulePresentation.validationHelpText}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {schedulePresentation?.canRenderWeeklyTable ? (
                <div className="mt-4">
                  <p className="mb-2 text-[10.5px] font-medium text-muted-foreground">
                    Tabla semanal
                  </p>
                  <ScheduleRulesBlock
                    rows={schedulePresentation.weeklyRows}
                    showResolvedState={!schedulePresentation.weeklyRowsArePartial}
                  />
                </div>
              ) : null}
              {schedulePresentation?.officialText ? (
                <div className="mt-4 border-t border-border/50 pt-3">
                  <p className="text-[10.5px] font-medium text-muted-foreground">
                    Texto oficial
                  </p>
                  <p className="mt-1.5 text-[13px] text-muted-foreground">
                    {schedulePresentation.officialText}
                  </p>
                </div>
              ) : null}
              {shouldRenderScheduleNotes(center.schedule.notesUnparsed, schedulePresentation?.officialText ?? null) ? (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  {center.schedule.notesUnparsed}
                </p>
              ) : null}
            </div>

            {data.item.equipment.length > 0 ? (
              <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                <h2 className="mb-4 text-[11px] font-medium text-muted-foreground">
                  Equipamiento
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.item.equipment.map((equipment) => (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium",
                        equipment.available
                          ? "border-border bg-muted/45 text-foreground"
                          : "border-border/40 bg-transparent text-muted-foreground/50",
                      )}
                      key={equipment.key}
                    >
                      {equipment.label}
                      {equipment.available && equipment.value ? (
                        <span className="ml-1 font-normal text-muted-foreground">· {equipment.value}</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {(data.item.contact.phone || data.item.contact.email) ? (
              <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                <h2 className="mb-3 text-[11px] font-medium text-muted-foreground">
                  Contacto
                </h2>
                <div className="space-y-1.5">
                  {data.item.contact.phone ? (
                    <p className="text-[13px] text-foreground">{data.item.contact.phone}</p>
                  ) : null}
                  {data.item.contact.email ? (
                    <p className="text-[13px] text-muted-foreground">{data.item.contact.email}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="pb-2">
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-foreground transition hover:bg-muted/55"
                onClick={handleBackToListing}
                type="button"
              >
                <ArrowLeft className="size-4" />
                Volver al listado
              </button>
            </div>
          </>
        )}

        {isVoteModalOpen ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-[480px] rounded-[22px] border border-border bg-card p-4 shadow-[0_28px_80px_rgba(2,6,23,0.4)]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[1rem] font-semibold text-foreground">Tu valoracion</h3>
                  <p className="text-[11px] text-muted-foreground">Valora 6 aspectos para construir el score global</p>
                </div>
                <button
                  className="rounded-md border border-border px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground"
                  onClick={() => setIsVoteModalOpen(false)}
                  type="button"
                >
                  <X className="size-4" />
                </button>
              </div>

              {!googleAuthEnabled ? (
                <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  Login Google no configurado en este entorno.
                </p>
              ) : null}

              {googleAuthEnabled && !googleIdToken ? (
                <div className="mb-3 rounded-xl border border-border bg-muted/20 px-3 py-4">
                  <p className="mb-3 text-center text-[12px] text-muted-foreground">
                    Accede con Google para enviar tu voto.
                  </p>
                  <div ref={googleButtonHostRef} className="flex justify-center" />
                  {!isGoogleReady ? (
                    <p className="mt-2 text-center text-[11px] text-muted-foreground">
                      Cargando Google Sign-In...
                    </p>
                  ) : null}
                </div>
              ) : null}

              {googleIdToken ? (
                <button
                  className="mb-3 text-[12px] font-medium text-muted-foreground underline"
                  onClick={logoutGoogle}
                  type="button"
                >
                  Cerrar sesion Google
                </button>
              ) : null}

              <div className="space-y-2.5">
                {ratingLabels.map((key) => (
                  <VoteStarsRow
                    key={key}
                    label={ratingLabelText[key]}
                    onChange={(next) =>
                      setVoteDraft((current) => ({
                        ...current,
                        [key]: next,
                      }))
                    }
                    value={voteDraft[key]}
                  />
                ))}
              </div>

              {voteError ? (
                <p className="mt-3 text-[12px] text-destructive">{voteError}</p>
              ) : null}

              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] font-semibold text-foreground"
                  onClick={() => setIsVoteModalOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-[0_12px_24px_rgba(15,91,167,0.28)] disabled:opacity-60"
                  disabled={voteSubmitting || !googleIdToken}
                  onClick={submitVote}
                  type="button"
                >
                  {voteSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </PublicChrome>
  );
}
