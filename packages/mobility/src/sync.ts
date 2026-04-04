import { createHash, randomUUID } from "node:crypto";
import { bicimadStationsSource, loadBicimadStationNodes } from "./sources/bicimadStations";
import { emtStopsSource, loadEmtStopNodes } from "./sources/emtStops";
import { loadMetroStationNodes, metroStationsSource } from "./sources/metroStations";
import { emtParkingsSource, loadParkingNodes } from "./sources/parkings";
import { buildCenterTransportLinks } from "./linking";
import { loadCanonicalCenterCoordinates } from "./centers";
import type {
  CenterTransportLinkRecord,
  MobilitySourceDefinition,
  MobilitySyncBuildResult,
  TransportNodeRecord,
} from "./types";

function buildChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function sqlValue(value: boolean | number | string | null): string {
  if (value === null) {
    return "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  return `'${value.replace(/'/g, "''")}'`;
}

async function loadAllNodeSyncInputs(): Promise<
  Array<{
    source: MobilitySourceDefinition;
    nodes: TransportNodeRecord[];
    checksum: string;
  }>
> {
  const [emtStops, bicimadStations, metroStations, parkings] = await Promise.all([
    loadEmtStopNodes(),
    loadBicimadStationNodes(),
    loadMetroStationNodes(),
    loadParkingNodes(),
  ]);

  return [
    {
      source: emtStopsSource,
      nodes: emtStops,
      checksum: buildChecksum(JSON.stringify(emtStops)),
    },
    {
      source: bicimadStationsSource,
      nodes: bicimadStations,
      checksum: buildChecksum(JSON.stringify(bicimadStations)),
    },
    {
      source: metroStationsSource,
      nodes: metroStations,
      checksum: buildChecksum(JSON.stringify(metroStations)),
    },
    {
      source: emtParkingsSource,
      nodes: parkings,
      checksum: buildChecksum(JSON.stringify(parkings)),
    },
  ];
}

function buildSourceRunSql(input: {
  runId: string;
  startedAt: string;
  finishedAt: string;
  source: MobilitySourceDefinition;
  nodes: TransportNodeRecord[];
  checksum: string;
}): string {
  const nodeStatements = input.nodes.map((node) => {
    return `INSERT INTO transport_nodes (
      id, kind, source_id, external_id, name, address_line, lat, lon, metadata_json, is_active, created_at, updated_at
    ) VALUES (
      ${sqlValue(node.id)},
      ${sqlValue(node.kind)},
      ${sqlValue(node.source_id)},
      ${sqlValue(node.external_id)},
      ${sqlValue(node.name)},
      ${sqlValue(node.address_line)},
      ${sqlValue(node.lat)},
      ${sqlValue(node.lon)},
      ${sqlValue(node.metadata_json)},
      ${sqlValue(node.is_active)},
      ${sqlValue(input.finishedAt)},
      ${sqlValue(input.finishedAt)}
    )
    ON CONFLICT(id) DO UPDATE SET
      kind = excluded.kind,
      source_id = excluded.source_id,
      external_id = excluded.external_id,
      name = excluded.name,
      address_line = excluded.address_line,
      lat = excluded.lat,
      lon = excluded.lon,
      metadata_json = excluded.metadata_json,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at;`;
  });

  return [
    `INSERT INTO ingestion_runs (
      id, source_id, status, started_at, finished_at, row_count_raw, row_count_valid,
      row_count_rejected, warning_count, error_count, checksum,
      triggered_by, meta_json
    ) VALUES (
      ${sqlValue(input.runId)},
      ${sqlValue(input.source.code)},
      'running',
      ${sqlValue(input.startedAt)},
      NULL,
      ${sqlValue(input.nodes.length)},
      0,
      0,
      0,
      0,
      ${sqlValue(input.checksum)},
      'script',
      NULL
    )
    ON CONFLICT(id) DO NOTHING;`,
    `UPDATE transport_nodes SET
      is_active = 0,
      updated_at = ${sqlValue(input.finishedAt)}
    WHERE source_id = ${sqlValue(input.source.code)};`,
    ...nodeStatements,
    `UPDATE ingestion_runs SET
      status = 'completed',
      finished_at = ${sqlValue(input.finishedAt)},
      row_count_valid = ${sqlValue(input.nodes.length)},
      row_count_rejected = 0,
      warning_count = 0,
      error_count = 0
    WHERE id = ${sqlValue(input.runId)};`,
  ].join("\n");
}

function buildLinksSql(
  finishedAt: string,
  links: CenterTransportLinkRecord[],
): string {
  const statements = links.map((link) => {
    return `INSERT INTO center_transport_links (
      center_id, transport_node_id, distance_m, rank_order, created_at, updated_at
    ) VALUES (
      ${sqlValue(link.center_id)},
      ${sqlValue(link.transport_node_id)},
      ${sqlValue(link.distance_m)},
      ${sqlValue(link.rank_order)},
      ${sqlValue(finishedAt)},
      ${sqlValue(finishedAt)}
    )
    ON CONFLICT(center_id, transport_node_id) DO UPDATE SET
      distance_m = excluded.distance_m,
      rank_order = excluded.rank_order,
      updated_at = excluded.updated_at;`;
  });

  return [
    "DELETE FROM center_transport_links;",
    ...statements,
  ].join("\n");
}

export async function buildMobilitySyncSql(): Promise<MobilitySyncBuildResult> {
  const finishedAt = new Date().toISOString();
  const startedAt = finishedAt;
  const [sources, centers] = await Promise.all([
    loadAllNodeSyncInputs(),
    loadCanonicalCenterCoordinates(),
  ]);
  const nodes = sources.flatMap((source) => source.nodes);
  const links = buildCenterTransportLinks(centers, nodes);
  const sql = [
    ...sources.map((source) =>
      buildSourceRunSql({
        runId: `run_${source.source.code}_${randomUUID()}`,
        startedAt,
        finishedAt,
        source: source.source,
        nodes: source.nodes,
        checksum: source.checksum,
      }),
    ),
    buildLinksSql(finishedAt, links),
    "",
  ].join("\n");

  return {
    sql,
    counts: {
      centers: centers.length,
      emt_stops: sources.find((source) => source.source.code === "emt_stops")?.nodes.length ?? 0,
      bicimad_stations:
        sources.find((source) => source.source.code === "bicimad_stations")?.nodes.length ?? 0,
      metro_stations:
        sources.find((source) => source.source.code === "metro_crtm_stations")?.nodes.length ?? 0,
      parkings:
        sources.find((source) => source.source.code === "emt_parkings")?.nodes.length ?? 0,
      center_transport_links: links.length,
    },
  };
}
