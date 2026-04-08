import type { UserOrigin } from "@alabiblio/contracts/origin";

type GeolocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

export function getOriginStatusText(
  origin: UserOrigin | null,
  geolocationStatus: GeolocationStatus,
): string {
  if (origin?.kind === "manual_address") return origin.label;
  if (origin?.kind === "preset_area") return origin.label;
  if (origin?.kind === "geolocation") return "Mi ubicacion actual";
  switch (geolocationStatus) {
    case "requesting": return "Buscando ubicacion";
    case "denied": return "Permiso denegado";
    case "unavailable": return "Ubicacion no disponible";
    default: return "Sin origen activo";
  }
}

export function getOriginTone(
  origin: UserOrigin | null,
  geolocationStatus: GeolocationStatus,
): "live" | "approx" | "idle" {
  if (origin?.kind === "geolocation" || geolocationStatus === "granted") return "live";
  if (origin?.kind === "manual_address" || origin?.kind === "preset_area") return "approx";
  return "idle";
}
