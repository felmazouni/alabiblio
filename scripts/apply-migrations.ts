import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { getDatabaseName } from "../packages/ingestion/src";

function getExecutionMode(target: string): "--local" | "--remote" {
  return target === "local" ? "--local" : "--remote";
}

function getMigrationFiles(): string[] {
  const directory = resolve("sql/migrations");

  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => resolve(directory, fileName));
}

function executeMigration(target: string, migrationFile: string): void {
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
      migrationFile,
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

  for (const migrationFile of getMigrationFiles()) {
    executeMigration(target, migrationFile);
  }
}

main();
