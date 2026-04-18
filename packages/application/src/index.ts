import type { PublicCatalogResponse } from "@alabiblio/contracts";
import { getCatalogFromStore } from "@alabiblio/infrastructure";

export const officialSources = {
  libraries:
    "https://datos.madrid.es/dataset/201747-0-bibliobuses-bibliotecas/resource/201747-2-bibliobuses-bibliotecas-json/download/201747-0-bibliobuses-bibliotecas.json",
  studyRooms:
    "https://datos.madrid.es/dataset/217921-0-salas-estudio/resource/217921-0-salas-estudio-json/download/217921-0-salas-estudio.json",
} as const;

export async function loadPublicCatalog(database?: unknown): Promise<PublicCatalogResponse> {
  return getCatalogFromStore({
    database,
    sources: officialSources,
  });
}
