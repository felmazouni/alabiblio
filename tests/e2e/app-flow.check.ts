import assert from "node:assert/strict";
import localAppServer from "../support/local-app-server.ts";
import chromeCdp from "../support/chrome-cdp.ts";

const { startLocalAppServer } = localAppServer;
const { openChromeSession } = chromeCdp;

const SUSPICIOUS_TEXT_PATTERN = /(?:Ã.|Â.|â€™|â€”|\ufffd)/u;

type E2EReport = {
  navigationMs: number;
  detailNavigationMs: number;
  listNavigationMs: number;
};

function assertNoSuspiciousText(text: string, context: string): void {
  assert.ok(!SUSPICIOUS_TEXT_PATTERN.test(text), `Suspicious text in ${context}: ${text}`);
}

async function run(): Promise<E2EReport> {
  const server = await startLocalAppServer();
  const browser = await openChromeSession();

  try {
    const startTop = Date.now();
    await browser.navigate(server.baseUrl, {
      waitFor: "document.querySelector('.entry-screen, .top-picks-grid') !== null",
    });
    const navigationMs = Date.now() - startTop;

    await browser.click("button.entry-screen__secondary");
    await browser.waitForFunction("document.querySelector('.origin-sheet__surface') !== null");
    await browser.type("input.origin-search__input", "Gran Via 32");
    await browser.waitForFunction("document.querySelector('.origin-search__suggestion:not(.origin-search__suggestion--loading)') !== null", 12_000);
    await browser.click(".origin-search__suggestion:not(.origin-search__suggestion--loading)");
    await browser.waitForFunction(
      "document.querySelector('.top-pick-card') !== null && document.body.innerText.includes('ORIGEN')",
      12_000,
    );

    const topBody = await browser.evaluate<string>("document.body.innerText");
    assert.match(topBody, /Llegada orientativa|Llegada estimada|Llegada resuelta/);
    assertNoSuspiciousText(topBody, "top");

    const startDetail = Date.now();
    await browser.click(".top-pick-card");
    await browser.waitForFunction("window.location.pathname.startsWith('/centers/')", 12_000);
    await browser.waitForFunction("document.querySelectorAll('.transport-v1-row').length >= 3", 12_000);
    const detailNavigationMs = Date.now() - startDetail;

    const detailChecks = await browser.evaluate<{
      bodyText: string;
      rowCount: number;
      confidenceMentions: number;
    }>(`(() => {
      const bodyText = document.body.innerText;
      const rowCount = document.querySelectorAll('.transport-v1-row').length;
      const confidenceMentions = [...document.querySelectorAll('.transport-v1-row__note')]
        .filter((node) => node.textContent && node.textContent.trim().length > 0)
        .length;
      return { bodyText, rowCount, confidenceMentions };
    })()`);
    assert.ok(detailChecks.rowCount >= 3, "Detail view must show transport rows");
    assert.ok(detailChecks.confidenceMentions >= 1, "Detail view must expose transport confidence notes");
    assertNoSuspiciousText(detailChecks.bodyText, "detail");

    const startList = Date.now();
    await browser.navigate(`${server.baseUrl}/listado`, {
      waitFor: "document.querySelectorAll('.center-list__grid .decision-card, .center-list__rows .decision-card').length > 0 || document.querySelectorAll('.center-card, .center-row-item').length > 0 || document.body.innerText.includes('Catalogo de bibliotecas y salas')",
    });
    const listNavigationMs = Date.now() - startList;

    const listChecksBeforeFilters = await browser.evaluate<{
      bodyText: string;
      hasBaseSemantics: boolean;
      hasArrivalCopy: boolean;
    }>(`(() => {
      const bodyText = document.body.innerText;
      return {
        bodyText,
        hasBaseSemantics: /listado base|exploracion base|sin llegada contextual|no ordena por llegada/i.test(bodyText),
        hasArrivalCopy: /Llegar ahora|ORIGEN/.test(bodyText),
      };
    })()`);
    assert.equal(listChecksBeforeFilters.hasBaseSemantics, true);
    assert.equal(listChecksBeforeFilters.hasArrivalCopy, false);
    assertNoSuspiciousText(listChecksBeforeFilters.bodyText, "list");

    await browser.click("button.controls-bar__filters-btn");
    await browser.waitForFunction("document.querySelector('.filter-drawer--open') !== null");
    await browser.click("button.filter-drawer__apply");
    await browser.waitForFunction("document.querySelector('.filter-drawer--open') === null");

    const accessibilityIssues = await browser.evaluate<Array<{ tag: string; text: string }>>(`(() => {
      const getLabelText = (element) => {
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
        const labelledBy = element.getAttribute('aria-labelledby');
        if (labelledBy) {
          const labelText = labelledBy
            .split(/\\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
            .join(' ')
            .trim();
          if (labelText) return labelText;
        }
        const text = element.textContent?.trim() ?? '';
        if (text) return text;
        const placeholder = element.getAttribute('placeholder');
        if (placeholder && placeholder.trim()) return placeholder.trim();
        return '';
      };

      return [...document.querySelectorAll('button, input, select, a[href], [role=\"button\"]')]
        .filter((element) => element instanceof HTMLElement)
        .filter((element) => {
          const style = window.getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' && !element.hasAttribute('disabled');
        })
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          text: getLabelText(element),
        }))
        .filter((entry) => entry.text === '');
    })()`);
    assert.deepEqual(accessibilityIssues, []);

    return {
      navigationMs,
      detailNavigationMs,
      listNavigationMs,
    };
  } finally {
    await browser.close();
    await server.close();
  }
}

void run()
  .then((report) => {
    console.log(
      JSON.stringify({
        e2e: "app_flow",
        status: "ok",
        navigation_ms: report.navigationMs,
        detail_navigation_ms: report.detailNavigationMs,
        list_navigation_ms: report.listNavigationMs,
      }),
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
