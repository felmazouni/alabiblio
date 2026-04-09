import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const CRITICAL_FRONTEND_DIRS = [
  path.join(ROOT, "apps", "web", "src", "app"),
  path.join(ROOT, "apps", "web", "src", "features", "centers", "screens"),
  path.join(ROOT, "apps", "web", "src", "features", "centers", "hooks"),
  path.join(ROOT, "apps", "web", "src", "features", "location"),
];

const FRONTEND_FETCH_ALLOWLIST = new Set([
  path.join(ROOT, "apps", "web", "src", "features", "centers", "api.ts"),
]);

const WORKER_FETCH_ALLOWLIST = new Set([
  path.join(ROOT, "apps", "web", "worker", "index.ts"),
  path.join(ROOT, "apps", "web", "worker", "routes", "geocode.ts"),
]);

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return await collectFiles(resolved);
      }
      return [resolved];
    }),
  );
  return files.flat();
}

function containsBareFetch(contents: string): boolean {
  return /(?<![\w.])fetch\s*\(/u.test(contents);
}

async function ensureCriticalLineCounts(): Promise<void> {
  for (const dir of CRITICAL_FRONTEND_DIRS) {
    const files = (await collectFiles(dir)).filter((file) => /\.(ts|tsx)$/.test(file));
    for (const file of files) {
      const contents = await readFile(file, "utf8");
      const lines = contents.split(/\r?\n/u).length;
      assert.ok(lines <= 400, `Critical frontend file exceeds 400 lines: ${path.relative(ROOT, file)} (${lines})`);
    }
  }
}

async function ensureNoDomainImportsInUi(): Promise<void> {
  const uiFiles = (await collectFiles(path.join(ROOT, "apps", "web", "src"))).filter((file) => /\.(ts|tsx)$/.test(file));
  for (const file of uiFiles) {
    const contents = await readFile(file, "utf8");
    assert.ok(!contents.includes("@alabiblio/domain"), `UI file imports domain logic directly: ${path.relative(ROOT, file)}`);
    assert.ok(!contents.includes("packages/domain"), `UI file imports packages/domain directly: ${path.relative(ROOT, file)}`);
  }
}

async function ensureFrontendFetchDiscipline(): Promise<void> {
  const uiFiles = (await collectFiles(path.join(ROOT, "apps", "web", "src"))).filter((file) => /\.(ts|tsx)$/.test(file));
  for (const file of uiFiles) {
    const contents = await readFile(file, "utf8");
    if (!containsBareFetch(contents)) {
      continue;
    }
    assert.ok(
      FRONTEND_FETCH_ALLOWLIST.has(file),
      `Unexpected raw fetch in frontend: ${path.relative(ROOT, file)}`,
    );
    assert.ok(contents.includes("FETCH_TIMEOUT_MS"), "Frontend API module must keep timeout enforcement");
    assert.ok(contents.includes("fetchWithRetry("), "Frontend API module must route fetches through fetchWithRetry");
  }
}

async function ensureWorkerFetchDiscipline(): Promise<void> {
  const workerFiles = (await collectFiles(path.join(ROOT, "apps", "web", "worker"))).filter((file) => /\.(ts|tsx)$/.test(file));
  for (const file of workerFiles) {
    const contents = await readFile(file, "utf8");
    if (!containsBareFetch(contents)) {
      continue;
    }
    assert.ok(
      WORKER_FETCH_ALLOWLIST.has(file),
      `Unexpected raw fetch in worker: ${path.relative(ROOT, file)}`,
    );
    if (file.endsWith(path.join("routes", "geocode.ts"))) {
      assert.ok(contents.includes("fetchWithTimeout("), "Geocode route must keep fetchWithTimeout wrapper");
    }
  }
}

async function ensureAppShellStaysThin(): Promise<void> {
  const appFile = path.join(ROOT, "apps", "web", "src", "App.tsx");
  const contents = await readFile(appFile, "utf8");
  const lines = contents.split(/\r?\n/u).length;
  assert.ok(lines <= 80, `App.tsx must remain a thin shell (${lines} lines)`);
}

async function ensureRoadmapExists(): Promise<void> {
  const roadmapPath = path.join(ROOT, "ROADMAP.md");
  const roadmapStats = await stat(roadmapPath);
  assert.ok(roadmapStats.isFile(), "ROADMAP.md must exist");
}

async function main(): Promise<void> {
  await ensureRoadmapExists();
  await ensureAppShellStaysThin();
  await ensureCriticalLineCounts();
  await ensureNoDomainImportsInUi();
  await ensureFrontendFetchDiscipline();
  await ensureWorkerFetchDiscipline();

  console.log(JSON.stringify({
    check: "architecture",
    status: "ok",
  }));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
