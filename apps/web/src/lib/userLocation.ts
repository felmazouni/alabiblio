import { useEffect, useState } from "react";

export interface UserLocation {
  lat: number;
  lon: number;
}

const STORAGE_KEY = "alabiblio:user-location";

function readStoredLocation(): UserLocation | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as UserLocation;

    if (typeof parsed.lat === "number" && typeof parsed.lon === "number") {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocation(readStoredLocation());
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocalización no disponible en este navegador.");
      return;
    }

    setRequesting(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        } satisfies UserLocation;

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLocation));
        setLocation(nextLocation);
        setRequesting(false);
      },
      (geoError) => {
        setError(geoError.message || "No se pudo obtener la ubicación.");
        setRequesting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  };

  const clearLocation = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setLocation(null);
    setError(null);
  };

  return {
    location,
    requesting,
    error,
    requestLocation,
    clearLocation,
  };
}
