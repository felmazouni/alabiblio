import assert from "node:assert/strict";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import localAppServer from "../tests/support/local-app-server.ts";
import chromeCdp from "../tests/support/chrome-cdp.ts";

const { startLocalAppServer } = localAppServer;
const { openChromeSession } = chromeCdp;

const ROOT = process.cwd();
const CLIENT_DIST_DIR = path.join(ROOT, "apps", "web", "dist", "client");
const WORKER_DIST_FILE = path.join(ROOT, "apps", "web", "dist", "alabiblio_api", "index.js");

const BUDGETS = {
  initialJsBytes: 500_000,
  cssBytes: 170_000,
  workerBytes: 350_000,
  apiTtfbMs: 250,
  listHtmlTtfbMs: 250,
  listLoadMs: 2_500,
} as const;

function extractAssetPath(indexHtml: string, pattern: RegExp, label: string): string {
  const match = indexHtml.match(pattern);
  assert.ok(match?.[1], `Missing ${label} asset in build output`);
  return match[1];
}

function extractInitialJsAssets(indexHtml: string): string[] {
  const assets = new Set<string>();
  const patterns = [
    /<script[^>]+src="([^"]+\.js)"/gu,
    /<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/gu,
  ];

  for (const pattern of patterns) {
    for (const match of indexHtml.matchAll(pattern)) {
      if (match[1]) {
        assets.add(match[1]);
      }
    }
  }

  assert.ok(assets.size > 0, "Missing initial JS assets in build output");
  return [...assets];
}

async function readBuildSizes() {
  const indexHtml = await readFile(path.join(CLIENT_DIST_DIR, "index.html"), "utf8");
  const jsAssets = extractInitialJsAssets(indexHtml);
  const cssAsset = extractAssetPath(indexHtml, /<link[^>]+href="([^"]+index[^"]+\.css)"/u, "entry css");
  const [jsStats, cssStat, workerStat] = await Promise.all([
    Promise.all(jsAssets.map((asset) => stat(path.join(CLIENT_DIST_DIR, asset.replace(/^\//u, ""))))),
    stat(path.join(CLIENT_DIST_DIR, cssAsset.replace(/^\//u, ""))),
    stat(WORKER_DIST_FILE),
  ]);

  return {
    jsBytes: jsStats.reduce((total, asset) => total + asset.size, 0),
    jsAssetCount: jsAssets.length,
    cssBytes: cssStat.size,
    workerBytes: workerStat.size,
  };
}

async function measureApiTtfb(baseUrl: string): Promise<number> {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/centers?limit=1&sort_by=open_now`);
  await response.arrayBuffer();
  return Date.now() - startedAt;
}

async function measureHtmlTtfb(baseUrl: string): Promise<number> {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/listado`);
  await response.text();
  return Date.now() - startedAt;
}

async function measureListLoad(baseUrl: string): Promise<number> {
  const browser = await openChromeSession();

  try {
    await browser.navigate(`${baseUrl}/listado`, {
      waitFor: "document.querySelector('.list-topbar__title') !== null",
      timeoutMs: 15_000,
    });
    return await browser.evaluate<number>(`(() => {
      const entry = performance.getEntriesByType('navigation')[0];
      return entry ? Math.round(entry.loadEventEnd) : 0;
    })()`);
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const sizes = await readBuildSizes();
  assert.ok(
    sizes.jsBytes <= BUDGETS.initialJsBytes,
    `Initial JS chunk exceeds budget: ${sizes.jsBytes} > ${BUDGETS.initialJsBytes}`,
  );
  assert.ok(
    sizes.cssBytes <= BUDGETS.cssBytes,
    `Initial CSS exceeds budget: ${sizes.cssBytes} > ${BUDGETS.cssBytes}`,
  );
  assert.ok(
    sizes.workerBytes <= BUDGETS.workerBytes,
    `Worker bundle exceeds budget: ${sizes.workerBytes} > ${BUDGETS.workerBytes}`,
  );

  const server = await startLocalAppServer();
  try {
    const [apiTtfbMs, listHtmlTtfbMs, listLoadMs] = await Promise.all([
      measureApiTtfb(server.baseUrl),
      measureHtmlTtfb(server.baseUrl),
      measureListLoad(server.baseUrl),
    ]);

    assert.ok(apiTtfbMs <= BUDGETS.apiTtfbMs, `API TTFB exceeds budget: ${apiTtfbMs}ms`);
    assert.ok(listHtmlTtfbMs <= BUDGETS.listHtmlTtfbMs, `List HTML TTFB exceeds budget: ${listHtmlTtfbMs}ms`);
    assert.ok(listLoadMs <= BUDGETS.listLoadMs, `List load exceeds budget: ${listLoadMs}ms`);

    console.log(JSON.stringify({
      check: "performance",
      status: "ok",
      initial_js_bytes: sizes.jsBytes,
      initial_js_asset_count: sizes.jsAssetCount,
      css_bytes: sizes.cssBytes,
      worker_bytes: sizes.workerBytes,
      api_ttfb_ms: apiTtfbMs,
      list_html_ttfb_ms: listHtmlTtfbMs,
      list_load_ms: listLoadMs,
      budgets: BUDGETS,
    }));
  } finally {
    await server.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
