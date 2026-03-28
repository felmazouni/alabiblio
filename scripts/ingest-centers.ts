import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCentersIngestionSql,
  getDatabaseName,
} from "../packages/ingestion/src/index";

async function main(): Promise<void> {
  const target = process.argv[2];

  if (!target) {
    throw new Error("Missing target. Use local, staging or production.");
  }

  const sql = await buildCentersIngestionSql();
  const outputDir = resolve("tmp");
  const outputFile = resolve(outputDir, `ingest-centers.${target}.sql`);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputFile, sql, "utf8");

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
      `../../tmp/ingest-centers.${target}.sql`,
    ],
    {
      cwd: resolve("apps/web"),
      stdio: "inherit",
    },
  );
}

void main();
