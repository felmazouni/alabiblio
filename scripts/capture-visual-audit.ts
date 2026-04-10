import path from "node:path";
import { mkdir } from "node:fs/promises";
import chromeCdp from "../tests/support/chrome-cdp.ts";
import localAppServer from "../tests/support/local-app-server.ts";

const { openChromeSession } = chromeCdp;
const { startLocalAppServer } = localAppServer;

const THEME_KEY = "alabiblio.theme";
const ORIGIN_KEY = "alabiblio:user-origin";

async function ensureDirectory(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

async function main(): Promise<void> {
  const target = process.argv[2] ?? "local";
  const outputDirArg = process.argv[3] ?? path.join(".tmp-visual", "lot-8b");

  const localServer = target === "local" ? await startLocalAppServer() : null;
  const baseUrl = localServer?.baseUrl ?? target;
  const outputDir = path.resolve(process.cwd(), outputDirArg);
  const session = await openChromeSession();
  const listResponse = await fetch(new URL("/api/centers?limit=1&sort_by=open_now", baseUrl));
  const listPayload = await listResponse.json() as { items?: Array<{ slug?: string }> };
  const detailSlug = listPayload.items?.[0]?.slug;

  if (!detailSlug) {
    throw new Error("capture_slug_missing");
  }

  const originJson = JSON.stringify({
    kind: "manual_address",
    label: "Mi ubicacion actual",
    lat: 40.4502,
    lon: -3.6898,
    stored_at: "2026-04-09T12:00:00.000Z",
  });

  async function prepareRoute(routePath: string, theme: "light" | "dark"): Promise<void> {
    await session.navigate(baseUrl, { waitFor: "document.readyState === 'complete'" });
    await session.evaluate(`
      (() => {
        window.localStorage.setItem("${THEME_KEY}", "${theme}");
        window.localStorage.setItem("${ORIGIN_KEY}", '${originJson}');
        document.documentElement.dataset.theme = "${theme}";
        document.documentElement.style.colorScheme = "${theme}";
        return true;
      })()
    `);
    await session.navigate(new URL(routePath, baseUrl).toString(), {
      waitFor: "document.readyState === 'complete'",
      timeoutMs: 20000,
    });
    await session.waitForFunction(`document.documentElement.dataset.theme === "${theme}"`, 8000);
  }

  async function capture(fileName: string): Promise<void> {
    await session.screenshot(path.join(outputDir, `${fileName}.png`));
  }

  await ensureDirectory(outputDir);
  await session.setViewport({ width: 1600, height: 1280 });

  await prepareRoute("/", "dark");
  await session.waitForFunction("Boolean(document.querySelector('.top-picks-grid, .entry-screen'))", 15000);
  await capture("top-dark");

  await prepareRoute("/", "light");
  await session.waitForFunction("Boolean(document.querySelector('.top-picks-grid, .entry-screen'))", 15000);
  await capture("top-light");

  await prepareRoute("/listado", "dark");
  await session.waitForFunction("Boolean(document.querySelector('.list-topbar'))", 15000);
  await capture("list-dark");

  await prepareRoute("/listado", "light");
  await session.waitForFunction("Boolean(document.querySelector('.list-topbar'))", 15000);
  await capture("list-light");

  await prepareRoute("/listado", "dark");
  await session.waitForFunction("Boolean(document.querySelector('.controls-bar__filters-btn'))", 15000);
  await session.click(".controls-bar__filters-btn");
  await session.waitForFunction("document.querySelector('.filter-drawer')?.classList.contains('filter-drawer--open') ?? false", 8000);
  await capture("filters-dark");

  await prepareRoute(`/centers/${detailSlug}`, "dark");
  await session.waitForFunction("Boolean(document.querySelector('.detail-screen__hero'))", 15000);
  await capture("detail-dark");

  await prepareRoute(`/centers/${detailSlug}`, "light");
  await session.waitForFunction("Boolean(document.querySelector('.detail-screen__hero'))", 15000);
  await capture("detail-light");

  await prepareRoute(`/centers/${detailSlug}`, "light");
  await session.waitForFunction(
    "Boolean(document.querySelector('.detail-screen__map, .detail-screen__fallback'))",
    15000,
  );
  await session.evaluate("window.scrollTo({ top: document.body.scrollHeight * 0.45, behavior: 'auto' })");
  await capture("detail-map-light");

  console.log(JSON.stringify({ baseUrl, outputDir, detailSlug }, null, 2));

  await session.close();
  if (localServer) {
    await localServer.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
