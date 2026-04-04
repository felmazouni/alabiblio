import { loadLibraryRows } from "@alabiblio/ingestion/sources/libraries";
import { normalizeMadridCenterRecord } from "@alabiblio/ingestion/normalizers/center";
import { loadStudyRoomRows } from "@alabiblio/ingestion/sources/studyRooms";
import type { CenterKind } from "@alabiblio/contracts/centers";

export type CanonicalCenterCoordinateRecord = {
  id: string;
  slug: string;
  lat: number | null;
  lon: number | null;
};

export async function loadCanonicalCenterCoordinates(): Promise<
  CanonicalCenterCoordinateRecord[]
> {
  const [studyRooms, libraries] = await Promise.all([
    loadStudyRoomRows(),
    loadLibraryRows(),
  ]);
  const rows = [
    ...studyRooms.rows.map((row) => ({
      row,
      sourceCode: "study_rooms" as const,
      kind: "study_room" as CenterKind,
    })),
    ...libraries.rows.map((row) => ({
      row,
      sourceCode: "libraries" as const,
      kind: "library" as CenterKind,
    })),
  ];

  return rows
    .map(({ row, sourceCode, kind }) =>
      normalizeMadridCenterRecord(row, {
        sourceCode,
        sourceId: sourceCode,
        kind,
        sourceRecordUpdatedAt: null,
      }),
    )
    .filter((record): record is NonNullable<typeof record> => record !== null)
    .map(({ center }) => ({
      id: center.id,
      slug: center.slug,
      lat: center.lat,
      lon: center.lon,
    }));
}
