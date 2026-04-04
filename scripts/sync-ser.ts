import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSerCoverageSql, loadSerBandFeatures } from "../packages/geo/src";
import { getDatabaseName } from "../packages/ingestion/src";
import { loadCanonicalCenterCoordinates } from "../packages/mobility/src";

async function main(): Promise<void> {
  const target = process.argv[2];

  if (!target) {
    throw new Error("Missing target. Use local, staging or production.");
  }

  const [centers, bands] = await Promise.all([
    loadCanonicalCenterCoordinates(),
    loadSerBandFeatures(),
  ]);
  const output = buildSerCoverageSql({
    centers,
    bands,
    sourceId: "ser_bands",
  });
  const outputDir = resolve("tmp");
  const outputFile = resolve(outputDir, `sync-ser.${target}.sql`);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputFile, output.sql, "utf8");

  console.log(JSON.stringify(output.counts, null, 2));

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
      `../../tmp/sync-ser.${target}.sql`,
    ],
    {
      cwd: resolve("apps/web"),
      stdio: "inherit",
    },
  );
}

void main();
