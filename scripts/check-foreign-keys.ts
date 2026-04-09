import { spawnSync } from "node:child_process";
import { readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { getDatabaseName } from "../packages/ingestion/src";

function getWranglerExecutable(): string {
  return resolve("apps/web", "node_modules", "wrangler", "bin", "wrangler.js");
}

function getMigrationFiles(): string[] {
  const directory = resolve("sql/migrations");

  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => resolve(directory, fileName));
}

function runWrangler(args: string[], cwd: string): string {
  const result = spawnSync(process.execPath, [getWranglerExecutable(), ...args], {
    cwd,
    env: process.env,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `wrangler failed with code ${result.status}`);
  }

  return result.stdout || result.stderr || "";
}

function main(): void {
  const target = process.argv[2] ?? "local";
  const databaseName = getDatabaseName(target);
  const workdir = resolve("apps/web");
  const stateDir = mkdtempSync(resolve(tmpdir(), "alabiblio-d1-fk-check-"));

  try {
    for (const migrationFile of getMigrationFiles()) {
      runWrangler(
        [
          "d1",
          "execute",
          databaseName,
          "--config",
          "wrangler.jsonc",
          "--local",
          "--persist-to",
          stateDir,
          "--file",
          migrationFile,
        ],
        workdir,
      );
    }

    const foreignKeyOutput = runWrangler(
      [
        "d1",
        "execute",
        databaseName,
        "--config",
        "wrangler.jsonc",
        "--local",
        "--persist-to",
        stateDir,
        "--json",
        "--command",
        "SELECT COUNT(*) AS violation_count FROM pragma_foreign_key_check;",
      ],
      workdir,
    );

    const trimmedOutput = foreignKeyOutput.trim();

    if (trimmedOutput === "") {
      throw new Error("foreign_key_check produced no output");
    }

    const parsed = JSON.parse(trimmedOutput) as Array<{
      success?: boolean;
      errors?: string[];
      results?: Array<Record<string, unknown>>;
    }>;
    const result = parsed[0];

    if (!result?.success) {
      throw new Error(`foreign_key_check failed: ${JSON.stringify(result?.errors ?? parsed)}`);
    }

    const violationCount = Number(result.results?.[0]?.violation_count ?? Number.NaN);

    if (!Number.isFinite(violationCount)) {
      throw new Error(`foreign_key_check returned unexpected payload: ${JSON.stringify(result)}`);
    }

    if (violationCount > 0) {
      throw new Error(`foreign_key_check returned ${violationCount} violations`);
    }

    console.log(`ok: foreign_key_check passed after ${getMigrationFiles().length} migrations`);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
}

main();
