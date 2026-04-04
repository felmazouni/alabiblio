import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { getDatabaseName } from "../packages/ingestion/src";

function getExecutionMode(target: string): "--local" | "--remote" {
  return target === "local" ? "--local" : "--remote";
}

function getSeedFiles(): string[] {
  const directory = resolve("sql/seeds");

  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => resolve(directory, fileName));
}

function executeSeed(target: string, seedFile: string): void {
  execFileSync(
    "cmd.exe",
    [
      "/c",
      resolve("apps/web/node_modules/.bin/wrangler.CMD"),
      "d1",
      "execute",
      getDatabaseName(target),
      getExecutionMode(target),
      "--file",
      seedFile,
    ],
    {
      cwd: resolve("apps/web"),
      stdio: "inherit",
    },
  );
}

function main(): void {
  const target = process.argv[2];

  if (!target) {
    throw new Error("Missing target. Use local, staging or production.");
  }

  for (const seedFile of getSeedFiles()) {
    executeSeed(target, seedFile);
  }
}

main();
