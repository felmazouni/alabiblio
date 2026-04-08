import type { GetCenterDetailResponse } from "@alabiblio/contracts/centers";
import type { CenterMobility, GetCenterMobilityResponse } from "@alabiblio/contracts/mobility";
import { useEffect, useMemo, useState } from "react";
import { fetchCenterDetail, fetchCenterMobility } from "../api";
import { useUserOrigin } from "../../location/useUserOrigin";

export function useCenterDetailRoute(slug: string | undefined) {
  const { origin } = useUserOrigin();
  const [detail, setDetail] = useState<GetCenterDetailResponse["item"] | null>(null);
  const [detailScope, setDetailScope] = useState<GetCenterDetailResponse["meta"]["scope"] | null>(null);
  const [mobility, setMobility] = useState<CenterMobility | null>(null);
  const [mobilityScope, setMobilityScope] = useState<GetCenterMobilityResponse["meta"]["scope"] | null>(null);
  const [detailResolvedSlug, setDetailResolvedSlug] = useState<string | null>(null);
  const [detailErrorState, setDetailErrorState] = useState<{ slug: string; message: string } | null>(null);
  const [mobilityResolvedKey, setMobilityResolvedKey] = useState<string | null>(null);
  const [mobilityErrorState, setMobilityErrorState] = useState<{ key: string; message: string } | null>(null);
  const requestKey = useMemo(
    () => `${slug ?? "missing"}:${origin?.lat ?? "none"}:${origin?.lon ?? "none"}`,
    [origin?.lat, origin?.lon, slug],
  );

  useEffect(() => {
    if (!slug) {
      return;
    }

    const controller = new AbortController();

    void fetchCenterDetail(slug, controller.signal)
      .then((detailResponse) => {
        if (!controller.signal.aborted) {
          setDetail(detailResponse.item);
          setDetailScope(detailResponse.meta.scope);
          setDetailResolvedSlug(slug);
          setDetailErrorState(null);
        }
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setDetail(null);
          setDetailScope(null);
          setDetailResolvedSlug(slug);
          setDetailErrorState({ slug, message: `No se pudo cargar el centro (${nextError.message}).` });
        }
      });

    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    const controller = new AbortController();

    void fetchCenterMobility(
      slug,
      origin ? { userLat: origin.lat, userLon: origin.lon } : undefined,
      controller.signal,
    )
      .then((response) => {
        if (!controller.signal.aborted) {
          setMobility(response.item);
          setMobilityScope(response.meta.scope);
          setMobilityResolvedKey(requestKey);
          setMobilityErrorState(null);
        }
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setMobility(null);
          setMobilityScope(null);
          setMobilityResolvedKey(requestKey);
          setMobilityErrorState({ key: requestKey, message: `No se pudo actualizar la movilidad (${nextError.message}).` });
        }
      });

    return () => controller.abort();
  }, [origin, requestKey, slug]);

  const detailMatches = detailResolvedSlug === slug;
  const mobilityMatches = mobilityResolvedKey === requestKey;
  const hasCurrentDetailError = detailErrorState !== null && detailErrorState.slug === slug;
  const hasCurrentMobilityError =
    mobilityErrorState !== null && mobilityErrorState.key === requestKey;
  const loading = slug !== undefined && !detailMatches && !hasCurrentDetailError;
  const mobilityLoading = !!slug && !mobilityMatches && !hasCurrentMobilityError;
  const detailError = hasCurrentDetailError ? detailErrorState.message : null;
  const mobilityError = hasCurrentMobilityError ? mobilityErrorState.message : null;

  return {
    origin,
    detail: detailMatches ? detail : null,
    detailScope: detailMatches ? detailScope : null,
    mobility: mobilityMatches ? mobility : null,
    mobilityScope: mobilityMatches ? mobilityScope : null,
    loading,
    mobilityLoading,
    mobilityError,
    detailError,
  };
}
