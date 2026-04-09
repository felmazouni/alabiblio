/**
 * Ingest Madrid's official callejero (street directory) into D1.
 *
 * Source: https://datos.madrid.es/dataset/213605-0-callejero-oficial-madrid
 * CSV: direccionesvigentes_YYYYMMDD.csv
 *
 * Usage:
 *   pnpm ingest:callejero:local
 *   pnpm ingest:callejero:staging
 *   pnpm ingest:callejero:production
 *
 * The script auto-detects the latest CSV from the CKAN API.
 * Column format: COD_VIA;VIA_CLASE;VIA_PAR;VIA_NOMBRE;VIA_NOMBRE_ACENTOS;CLASE_APP;NUMERO;
 *                CALIFICADOR;TIPO_NDP;COD_NDP;DISTRITO;BARRIO;COD_POSTAL;UTMX_ED;UTMY_ED;
 *                UTMX_ETRS;UTMY_ETRS;LATITUD;LONGITUD;ANGULO_ROTULACION
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseCsv } from "csv-parse/sync";
import { getDatabaseName } from "../packages/ingestion/src";
import { normalizeSourceText } from "../packages/ingestion/src/text";

// Default: direcciones vigentes — has street+number+district+barrio+coords
const DEFAULT_CSV_URL =
  "https://datos.madrid.es/dataset/213605-0-callejero-oficial-madrid/resource/213605-4-callejero-oficial-madrid-csv/download/direccionesvigentes_20260329.csv";

// Madrid bounding box sanity check for WGS84 coords
const MADRID_BBOX = {
  latMin: 40.30,
  latMax: 40.70,
  lonMin: -3.90,
  lonMax: -3.50,
};

// Madrid district code → text name (official Madrid district numbering)
const DISTRICT_CODE_TO_NAME: Record<number, string> = {
  1: "CENTRO",
  2: "ARGANZUELA",
  3: "RETIRO",
  4: "SALAMANCA",
  5: "CHAMARTIN",
  6: "TETUAN",
  7: "CHAMBERI",
  8: "FUENCARRAL-EL PARDO",
  9: "MONCLOA-ARAVACA",
  10: "LATINA",
  11: "CARABANCHEL",
  12: "USERA",
  13: "PUENTE DE VALLECAS",
  14: "MORATALAZ",
  15: "CIUDAD LINEAL",
  16: "HORTALEZA",
  17: "VILLAVERDE",
  18: "VILLA DE VALLECAS",
  19: "VICALVARO",
  20: "SAN BLAS-CANILLEJAS",
  21: "BARAJAS",
};

// Madrid barrio code → text name (barrio codes are 2-digit within district)
// The CSV BARRIO column is the barrio number within the district
// We build barrio names from the vialesvigentesdistritosbarrios, but since
// we don't have them inline here, we just store "Barrio N" for now —
// the important fields for autocomplete are via_type, via_name, district.
// Barrio name lookup would require a second CSV pass; omit for now.

// ── Coordinate parsers ────────────────────────────────────────────────────────

function utm30nToWgs84(easting: number, northing: number): { lat: number; lon: number } {
  const k0 = 0.9996;
  const a = 6378137.0;
  const e2 = 0.00669437999014;
  const ep2 = e2 / (1.0 - e2);
  const lon0Rad = (-3.0) * (Math.PI / 180.0);

  const x = easting - 500000.0;
  const y = northing;

  const e1 = (1.0 - Math.sqrt(1.0 - e2)) / (1.0 + Math.sqrt(1.0 - e2));
  const M = y / k0;
  const mu =
    M /
    (a *
      (1.0 -
        e2 / 4.0 -
        (3.0 * e2 * e2) / 64.0 -
        (5.0 * Math.pow(e2, 3)) / 256.0));

  const phi1 =
    mu +
    (1.5 * e1 - (27.0 * Math.pow(e1, 3)) / 32.0) * Math.sin(2.0 * mu) +
    ((21.0 * e1 * e1) / 16.0 - (55.0 * Math.pow(e1, 4)) / 32.0) *
      Math.sin(4.0 * mu) +
    ((151.0 * Math.pow(e1, 3)) / 96.0) * Math.sin(6.0 * mu) +
    ((1097.0 * Math.pow(e1, 4)) / 512.0) * Math.sin(8.0 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const N1 = a / Math.sqrt(1.0 - e2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = ep2 * cosPhi1 * cosPhi1;
  const R1 = (a * (1.0 - e2)) / Math.pow(1.0 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * k0);

  const lat =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      (D * D / 2.0 -
        ((5.0 + 3.0 * T1 + 10.0 * C1 - 4.0 * C1 * C1 - 9.0 * ep2) *
          Math.pow(D, 4)) /
          24.0 +
        ((61.0 +
          90.0 * T1 +
          298.0 * C1 +
          45.0 * T1 * T1 -
          252.0 * ep2 -
          3.0 * C1 * C1) *
          Math.pow(D, 6)) /
          720.0);

  const lon =
    lon0Rad +
    (D -
      ((1.0 + 2.0 * T1 + C1) * Math.pow(D, 3)) / 6.0 +
      ((5.0 - 2.0 * C1 + 28.0 * T1 - 3.0 * C1 * C1 + 8.0 * ep2 + 24.0 * T1 * T1) *
        Math.pow(D, 5)) /
        120.0) /
    cosPhi1;

  return {
    lat: lat * (180.0 / Math.PI),
    lon: lon * (180.0 / Math.PI),
  };
}

// Parse DMS string like "40°29'21.84'' N" → decimal degrees
// Also handles "40°29'21,84'' N" (comma decimal separator)
function parseDms(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/,/g, ".").replace(/['']/g, "'");
  // Pattern: degrees°minutes'seconds'' [N|S|E|W]
  const m = cleaned.match(/(\d+)[°º](\d+)'([\d.]+)'\s*([NSEW])?/i);
  if (!m) return null;
  const deg = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  const dir = m[4]?.toUpperCase() ?? "";
  let decimal = deg + min / 60 + sec / 3600;
  if (dir === "S" || dir === "W") decimal = -decimal;
  return Number.isFinite(decimal) ? decimal : null;
}

// ── Column name normalizer ────────────────────────────────────────────────────
function normalizeColName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[áàâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôö]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/[ñ]/g, "n")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type CallejeroRow = Record<string, string>;

function cleanText(value: string | null | undefined): string | null {
  return normalizeSourceText(value);
}

function mapColumns(row: CallejeroRow): {
  via_type: string;
  via_name: string;
  num_from: number | null;
  num_to: number | null;
  district: string | null;
  neighborhood: string | null;
  lat: number | null;
  lon: number | null;
} {
  const norm: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    norm[normalizeColName(k)] = v?.trim() ?? "";
  }

  // Via type — new CSV uses VIA_CLASE, old used TIPO_VIA
  const via_type =
    cleanText(
      norm.via_clase ??
      norm.tipo_via ??
      norm.tipovia ??
      norm.tipo ??
      "",
    ) ?? "";

  // Via name — prefer accented version
  const via_name =
    cleanText(
      norm.via_nombre_acentos ??
      norm.via_nombre ??
      norm.nombre_via_acentuado ??
      norm.nombre_via ??
      norm.nombrevia ??
      norm.nombre ??
      "",
    ) ?? "";

  // House number — single number in new CSV
  const numRaw = norm.numero ?? norm.num ?? norm.primero ?? norm.num_inicio ?? "";
  const num_from = numRaw !== "" && /^\d+$/.test(numRaw) ? Number(numRaw) : null;

  // District — new CSV uses numeric code
  const districtRaw = norm.distrito ?? norm.desc_distrito ?? norm.descripcion_distrito ?? "";
  let district: string | null = null;
  const districtCode = districtRaw !== "" ? Number(districtRaw) : NaN;
  if (!isNaN(districtCode) && DISTRICT_CODE_TO_NAME[districtCode]) {
    district = DISTRICT_CODE_TO_NAME[districtCode] ?? null;
  } else if (districtRaw !== "" && !/^\d+$/.test(districtRaw)) {
    // Already a text name (old CSV format)
    district = cleanText(districtRaw)?.toUpperCase() ?? null;
  }

  // Neighborhood — new CSV uses numeric barrio code; old CSV may have text
  const barrioRaw = norm.barrio ?? norm.desc_barrio ?? norm.descripcion_barrio ?? norm.nombre_barrio ?? "";
  let neighborhood: string | null = null;
  if (barrioRaw !== "" && !/^\d+$/.test(barrioRaw)) {
    neighborhood = cleanText(barrioRaw); // text name from old CSV
  }
  // For new CSV, barrio is just a code — we leave neighborhood null
  // (not needed for autocomplete, district is sufficient)

  // Coordinates — new CSV has LATITUD (DMS) and UTMX_ETRS/UTMY_ETRS
  let lat: number | null = null;
  let lon: number | null = null;

  const latRaw = norm.latitud ?? "";
  const lonRaw = norm.longitud ?? "";

  if (latRaw !== "") {
    // DMS format: "40°29'21.84'' N"
    lat = parseDms(latRaw);
    lon = parseDms(lonRaw);
  }

  // Fallback: UTM ETRS89 (more accurate than ED50)
  if ((lat === null || lon === null)) {
    const xRaw = norm.utmx_etrs ?? norm.utmx_ed ?? norm.utmx ?? norm.coordx_centroide ?? norm.coord_x ?? "";
    const yRaw = norm.utmy_etrs ?? norm.utmy_ed ?? norm.utmy ?? norm.coordy_centroide ?? norm.coord_y ?? "";
    if (xRaw !== "" && yRaw !== "") {
      const x = Number(xRaw.replace(",", "."));
      const y = Number(yRaw.replace(",", "."));
      if (Number.isFinite(x) && Number.isFinite(y) && x > 400000 && x < 500000) {
        const wgs = utm30nToWgs84(x, y);
        lat = wgs.lat;
        lon = wgs.lon;
      }
    }
  }

  // Sanity-check coords
  if (lat !== null && lon !== null) {
    if (
      lat < MADRID_BBOX.latMin || lat > MADRID_BBOX.latMax ||
      lon < MADRID_BBOX.lonMin || lon > MADRID_BBOX.lonMax
    ) {
      lat = null;
      lon = null;
    }
  }

  return { via_type, via_name, num_from, num_to: num_from, district, neighborhood, lat, lon };
}

function sqlEscape(value: string | null | number): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

async function main(): Promise<void> {
  const target = process.argv[2];
  const csvUrl = process.argv[3] ?? DEFAULT_CSV_URL;

  if (!target) {
    throw new Error("Missing target. Use: local | staging | production");
  }

  console.log(`[callejero] Fetching CSV from ${csvUrl}`);
  const response = await fetch(csvUrl, {
    headers: { "user-agent": "alabiblio-ingest/0.1 (+https://alabiblio.org)" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching callejero CSV`);
  }

  // datos.madrid.es returns latin1/ISO-8859-1 despite the Content-Type claiming UTF-8
  const rawBuffer = await response.arrayBuffer();
  const rawText = Buffer.from(rawBuffer).toString("latin1");
  console.log(`[callejero] Downloaded ${(rawText.length / 1024).toFixed(1)} KB`);

  // Pre-process: the Madrid CSV has unquoted newlines inside some fields.
  // Continuation lines are identified by NOT starting with a digit (data rows start
  // with the numeric COD_VIA code like "31001337;..."), and not being the first line.
  // The header itself may also be broken — header continuation starts with ";".
  const rawLines = rawText.replace(/^\uFEFF/, "").split(/\r?\n/);

  const fixedLines: string[] = [];
  for (const line of rawLines) {
    if (line.trim() === "") continue;
    // A new record or header starts with a digit or "COD_VIA"
    const isNewRecord = /^\d/.test(line) || line.startsWith("COD_VIA");
    if (isNewRecord || fixedLines.length === 0) {
      fixedLines.push(line);
    } else {
      // Continuation — append to the last line with a space (trim leading space/semicolon noise)
      const prev = fixedLines[fixedLines.length - 1] ?? "";
      // If continuation starts with ";", the previous line ended mid-field
      fixedLines[fixedLines.length - 1] = prev + line;
    }
  }
  const fixedText = fixedLines.join("\n");

  // Parse CSV with semicolon delimiter
  let rows: CallejeroRow[] = [];
  for (const delimiter of [";", ","]) {
    try {
      rows = parseCsv(fixedText, {
        delimiter,
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
        // This CSV uses no quoting convention — disable to avoid failures on
        // street names like 'EDUARDO GARCIA "EL PINTOR"'
        quote: false,
      }) as CallejeroRow[];
      if (rows.length > 100) {
        console.log(`[callejero] Parsed ${rows.length} rows (delimiter: "${delimiter}")`);
        break;
      }
    } catch (e) {
      console.error(`[callejero] csv-parse failed with delimiter "${delimiter}":`, e instanceof Error ? e.message.slice(0, 200) : String(e));
    }
  }

  if (rows.length === 0) {
    // Show some fixed lines to verify merge
    console.error("[callejero] First 3 fixed lines:");
    fixedLines.slice(0, 3).forEach((l, i) => console.error(` ${i}: ${l.slice(0, 200)}`));
    throw new Error("Could not parse callejero CSV — check delimiter and encoding");
  }

  const firstRow = rows[0];
  if (firstRow) {
    console.log("[callejero] Columns detected:", Object.keys(firstRow).join(" | "));
    // Debug: trace coordinate extraction on first row
    const norm0: Record<string, string> = {};
    for (const [k, v] of Object.entries(firstRow)) {
      norm0[normalizeColName(k)] = (v as string)?.trim() ?? "";
    }
    console.log("[callejero] DEBUG row0 LATITUD raw:", JSON.stringify(norm0.latitud));
    console.log("[callejero] DEBUG row0 LONGITUD raw:", JSON.stringify(norm0.longitud));
    console.log("[callejero] DEBUG row0 UTMX_ETRS raw:", JSON.stringify(norm0.utmx_etrs));
    console.log("[callejero] DEBUG row0 UTMY_ETRS raw:", JSON.stringify(norm0.utmy_etrs));
    console.log("[callejero] DEBUG parseDms lat:", parseDms(norm0.latitud));
    console.log("[callejero] DEBUG parseDms lon:", parseDms(norm0.longitud));
  }

  // Build SQL — deduplicated: one representative row per (via_name, district)
  // We keep the first encountered row for each street+district combination
  // to avoid 600k+ redundant address rows becoming noise in autocomplete.
  const statements: string[] = [];
  statements.push("DELETE FROM madrid_streets;");
  statements.push("DELETE FROM madrid_streets_fts;");

  const seenStreets = new Set<string>();
  let inserted = 0;
  let skipped = 0;
  const batchSize = 200;
  const batch: string[] = [];

  function flushBatch(): void {
    if (batch.length === 0) return;
    statements.push(
      `INSERT INTO madrid_streets (via_type, via_name, full_via, num_from, num_to, district, neighborhood, lat, lon) VALUES ${batch.join(",\n")};`,
    );
    batch.length = 0;
  }

  for (const raw of rows) {
    const { via_type, via_name, num_from, num_to, district, neighborhood, lat, lon } =
      mapColumns(raw);

    if (!via_name || via_name.length < 2) {
      skipped++;
      continue;
    }

    // Deduplicate by (via_name, district) — keep first occurrence which has coords
    const key = `${via_name.toUpperCase()}:${district ?? ""}`;
    if (seenStreets.has(key)) {
      skipped++;
      continue;
    }
    seenStreets.add(key);

    const fullVia = [via_type, via_name].filter(Boolean).join(" ").toUpperCase();

    batch.push(
      `(${sqlEscape(via_type)}, ${sqlEscape(via_name)}, ${sqlEscape(fullVia)}, ${sqlEscape(num_from)}, ${sqlEscape(num_to)}, ${sqlEscape(district)}, ${sqlEscape(neighborhood)}, ${sqlEscape(lat)}, ${sqlEscape(lon)})`,
    );
    inserted++;

    if (batch.length >= batchSize) {
      flushBatch();
    }
  }
  flushBatch();

  // Rebuild FTS index
  statements.push(
    "INSERT INTO madrid_streets_fts (rowid, full_via, district, neighborhood) SELECT id, full_via, district, neighborhood FROM madrid_streets;",
  );

  console.log(`[callejero] ${inserted} streets inserted (deduplicated), ${skipped} skipped`);

  const sql = statements.join("\n");
  const outputDir = resolve("tmp");
  const outputFile = resolve(outputDir, `ingest-callejero.${target}.sql`);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputFile, sql, "utf8");

  console.log(`[callejero] SQL written to ${outputFile} (${(sql.length / 1024).toFixed(0)} KB)`);

  execFileSync(
    "cmd.exe",
    [
      "/c",
      resolve("apps/web/node_modules/.bin/wrangler.CMD"),
      "d1",
      "execute",
      getDatabaseName(target),
      ...(target === "local" ? ["--local"] : ["--remote"]),
      "--file",
      `../../tmp/ingest-callejero.${target}.sql`,
    ],
    {
      cwd: resolve("apps/web"),
      stdio: "inherit",
    },
  );

  console.log(`[callejero] Done. Callejero loaded into ${target} database.`);
}

void main().catch((err: unknown) => {
  console.error("[callejero] Fatal:", err);
  process.exit(1);
});
