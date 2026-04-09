import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type RequiredFrontier = {
  file: string;
  expected: string;
};

const REQUIRED_FRONTIERS: RequiredFrontier[] = [
  { file: "packages/ingestion/src/normalizers/center.ts", expected: "normalizeSourceText" },
  { file: "packages/mobility/src/sources/bicimadStations.ts", expected: "normalizeSourceText" },
  { file: "packages/mobility/src/sources/emtStops.ts", expected: "normalizeSourceText" },
  { file: "packages/mobility/src/sources/metroStations.ts", expected: "normalizeSourceText" },
  { file: "packages/mobility/src/sources/parkings.ts", expected: "normalizeSourceText" },
  { file: "scripts/ingest-callejero.ts", expected: "normalizeSourceText" },
  { file: "apps/web/worker/routes/geocode.ts", expected: "normalizeSourceText" },
];

const FORBIDDEN_FRONTEND_PATTERNS = [
  "sanitizeApiPayload",
  "repairUtf8Mojibake",
  "decodeHtmlEntitiesRepeatedly",
  "repairMojibake",
];

function readUtf8(relativePath: string): string {
  return readFileSync(resolve(relativePath), "utf8");
}

function ensureRequiredFrontiers(): void {
  for (const frontier of REQUIRED_FRONTIERS) {
    const fullPath = resolve(frontier.file);

    if (!existsSync(fullPath)) {
      throw new Error(`Missing required text frontier: ${frontier.file}`);
    }

    const source = readUtf8(frontier.file);

    if (!source.includes(frontier.expected)) {
      throw new Error(`Required text frontier does not use ${frontier.expected}: ${frontier.file}`);
    }
  }
}

function ensureFrontendHasNoLateSanitizers(): void {
  const frontendFiles = [
    "apps/web/src/features/centers/api.ts",
    "apps/web/src/features/centers/transportCopy.ts",
    "apps/web/src/features/origin/hooks/useOriginSearchController.ts",
  ];

  for (const file of frontendFiles) {
    const source = readUtf8(file);

    for (const pattern of FORBIDDEN_FRONTEND_PATTERNS) {
      if (source.includes(pattern)) {
        throw new Error(`Late frontend text sanitization is forbidden (${pattern}) in ${file}`);
      }
    }
  }

  if (existsSync(resolve("apps/web/src/lib/displayText.ts"))) {
    throw new Error("apps/web/src/lib/displayText.ts must not exist");
  }
}

function main(): void {
  ensureRequiredFrontiers();
  ensureFrontendHasNoLateSanitizers();
  console.log("ok: text frontiers use normalizeSourceText and frontend has no late sanitizers");
}

main();
