import type { GeocodeAddressOption, OriginPreset } from "@alabiblio/contracts/origin";
import { useEffect, useRef, useState } from "react";
import { fetchGeocodeOptions, fetchOriginPresets } from "../../centers/api";

const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 350;

export function useOriginSearchController() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeAddressOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<OriginPreset[]>([]);
  const [presetsError, setPresetsError] = useState<string | null>(null);
  const searchController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetchOriginPresets(controller.signal)
      .then((response) => setPresets(response.items))
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setPresetsError(`No se pudieron cargar las zonas (${nextError.message}).`);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      return;
    }

    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;

    const timer = window.setTimeout(() => {
      void fetchGeocodeOptions(trimmedQuery, controller.signal)
        .then((response) => {
          if (!controller.signal.aborted) {
            setResults(response.items);
            setError(
              response.items.length === 0
                ? "No encuentro esa direccion. Prueba con calle, barrio o estacion."
                : null,
            );
            setLoading(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setError("No se pudo buscar la direccion. Intentalo de nuevo.");
            setResults([]);
            setLoading(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function handleQueryChange(value: string): void {
    setQuery(value);

    if (value.trim().length < MIN_QUERY_LENGTH) {
      searchController.current?.abort();
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
  }

  function resetSearch(nextQuery = ""): void {
    searchController.current?.abort();
    setQuery(nextQuery);
    setResults([]);
    setError(null);
    setLoading(false);
  }

  return {
    query,
    results,
    loading,
    error,
    presets,
    presetsError,
    handleQueryChange,
    resetSearch,
  };
}
