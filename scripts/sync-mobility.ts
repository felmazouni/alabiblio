import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildMobilitySyncSql } from "../packages/mobility/src";
import { getDatabaseName } from "../packages/ingestion/src";

async function main(): Promise<void> {
  const target = process.argv[2];

  if (!target) {
    throw new Error("Missing target. Use local, staging or production.");
  }

  const output = await buildMobilitySyncSql();
  const outputDir = resolve("tmp");
  const outputFile = resolve(outputDir, `sync-mobility.${target}.sql`);

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
      `../../tmp/sync-mobility.${target}.sql`,
    ],
    {
      cwd: resolve("apps/web"),
      stdio: "inherit",
    },
  );
}

void main();
