import type {
  PublicCatalogQuery,
  PublicCatalogResponse,
  PublicCenterDetailResponse,
  PublicFiltersResponse,
} from "@alabiblio/contracts";
import {
  getCatalogFromStore,
  getCenterDetailFromStore,
  getFiltersFromStore,
} from "@alabiblio/infrastructure";

export const officialSources = {
  libraries:
    "https://datos.madrid.es/dataset/201747-0-bibliobuses-bibliotecas/resource/201747-2-bibliobuses-bibliotecas-json/download/201747-0-bibliobuses-bibliotecas.json",
  studyRooms:
    "https://datos.madrid.es/dataset/217921-0-salas-estudio/resource/217921-0-salas-estudio-json/download/217921-0-salas-estudio.json",
} as const;

export async function loadPublicCatalog(
  database?: unknown,
  query?: PublicCatalogQuery,
): Promise<PublicCatalogResponse> {
  return getCatalogFromStore(
    {
      database,
      sources: officialSources,
    },
    query,
  );
}

export async function loadPublicCenterDetail(
  slug: string,
  database?: unknown,
  query?: Pick<PublicCatalogQuery, "lat" | "lon">,
): Promise<PublicCenterDetailResponse | null> {
  return getCenterDetailFromStore(
    {
      database,
      sources: officialSources,
    },
    slug,
    query,
  );
}

export async function loadPublicFilters(
  database?: unknown,
  query?: PublicCatalogQuery,
): Promise<PublicFiltersResponse> {
  return getFiltersFromStore(
    {
      database,
      sources: officialSources,
    },
    query,
  );
}
