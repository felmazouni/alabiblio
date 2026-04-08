import { createContext, useState } from "react";
import type { UserOrigin } from "@alabiblio/contracts/origin";

export type GeolocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

export type UserOriginContextValue = {
  origin: UserOrigin | null;
  geolocationStatus: GeolocationStatus;
  requestGeolocation: () => void;
  setManualOrigin: (origin: UserOrigin) => void;
  clearOrigin: () => void;
};

type StoredOrigin = UserOrigin & {
  stored_at: string;
};

const STORAGE_KEY = "alabiblio:user-origin";

export const UserOriginContext = createContext<UserOriginContextValue | null>(null);

function isValidOrigin(value: unknown): value is UserOrigin {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<UserOrigin>;
  return (
    (candidate.kind === "geolocation"
      || candidate.kind === "manual_address"
      || candidate.kind === "preset_area")
    && typeof candidate.label === "string"
    && typeof candidate.lat === "number"
    && Number.isFinite(candidate.lat)
    && typeof candidate.lon === "number"
    && Number.isFinite(candidate.lon)
  );
}

function readStoredOrigin(): UserOrigin | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredOrigin;
    return isValidOrigin(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function storeOrigin(origin: UserOrigin): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...origin,
      stored_at: new Date().toISOString(),
    } satisfies StoredOrigin),
  );
}

export function useProvideUserOrigin(): UserOriginContextValue {
  const [origin, setOrigin] = useState<UserOrigin | null>(() =>
    typeof window === "undefined" ? null : readStoredOrigin(),
  );
  const [geolocationStatus, setGeolocationStatus] = useState<GeolocationStatus>(() => {
    if (typeof window === "undefined") {
      return "idle";
    }

    if (!("geolocation" in navigator)) {
      return "unavailable";
    }

    return readStoredOrigin()?.kind === "geolocation" ? "granted" : "idle";
  });

  function requestGeolocation(): void {
    if (!("geolocation" in navigator)) {
      setGeolocationStatus("unavailable");
      return;
    }

    setGeolocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextOrigin = {
          kind: "geolocation",
          label: "Mi ubicacion actual",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        } satisfies UserOrigin;

        setOrigin(nextOrigin);
        setGeolocationStatus("granted");
        storeOrigin(nextOrigin);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeolocationStatus("denied");
          return;
        }

        setGeolocationStatus("unavailable");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }

  function setManualOrigin(nextOrigin: UserOrigin): void {
    setOrigin(nextOrigin);
    storeOrigin(nextOrigin);
  }

  function clearOrigin(): void {
    setOrigin(null);
    setGeolocationStatus("idle");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return {
    origin,
    geolocationStatus,
    requestGeolocation,
    setManualOrigin,
    clearOrigin,
  };
}
