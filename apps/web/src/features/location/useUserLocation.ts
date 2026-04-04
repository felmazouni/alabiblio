import { useState } from "react";
import type { UserLocationInput } from "@alabiblio/contracts/centers";

type UserLocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

type StoredLocation = UserLocationInput & {
  stored_at: string;
};

const STORAGE_KEY = "alabiblio:user-location";

function readStoredLocation(): UserLocationInput | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredLocation;

    if (
      typeof parsed?.lat === "number" &&
      Number.isFinite(parsed.lat) &&
      typeof parsed?.lon === "number" &&
      Number.isFinite(parsed.lon)
    ) {
      return {
        lat: parsed.lat,
        lon: parsed.lon,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function storeLocation(location: UserLocationInput): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...location,
      stored_at: new Date().toISOString(),
    } satisfies StoredLocation),
  );
}

export function useUserLocation(): {
  location: UserLocationInput | null;
  status: UserLocationStatus;
  requestLocation: () => void;
  clearLocation: () => void;
} {
  const [location, setLocation] = useState<UserLocationInput | null>(() =>
    typeof window === "undefined" ? null : readStoredLocation(),
  );
  const [status, setStatus] = useState<UserLocationStatus>(() => {
    if (typeof window === "undefined") {
      return "idle";
    }

    if (!("geolocation" in navigator)) {
      return "unavailable";
    }

    return readStoredLocation() ? "granted" : "idle";
  });

  function requestLocation(): void {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }

    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        } satisfies UserLocationInput;

        setLocation(nextLocation);
        setStatus("granted");
        storeLocation(nextLocation);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
          return;
        }

        setStatus("unavailable");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }

  function clearLocation(): void {
    setLocation(null);
    setStatus("idle");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return {
    location,
    status,
    requestLocation,
    clearLocation,
  };
}
