import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import workerScopeHarness from "./worker-scope-harness.ts";

const { createWorkerScopeHarness } = workerScopeHarness;

type LocalAppServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function resolveClientDistDir(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), "apps", "web", "dist", "client"),
    path.join(process.cwd(), "apps", "web", "dist"),
  ];

  for (const candidate of candidates) {
    try {
      await access(path.join(candidate, "index.html"));
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error("client_dist_not_found");
}

function buildStaticPath(clientDir: string, pathname: string): string {
  const relativePath = pathname === "/"
    ? "index.html"
    : pathname.replace(/^\/+/, "");
  const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(clientDir, safePath);
}

async function serveStatic(
  clientDir: string,
  pathname: string,
  response: ServerResponse,
): Promise<void> {
  const target = buildStaticPath(clientDir, pathname);

  try {
    const body = await readFile(target);
    response.writeHead(200, {
      "content-type": MIME_TYPES[path.extname(target)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(body);
    return;
  } catch {
    const indexHtml = await readFile(path.join(clientDir, "index.html"));
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(indexHtml);
  }
}

async function serveApi(
  harness: ReturnType<typeof createWorkerScopeHarness>,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const workerResponse = await harness.request(url.pathname + url.search);
  const body = Buffer.from(await workerResponse.arrayBuffer());
  const headers = Object.fromEntries(workerResponse.headers.entries());

  response.writeHead(workerResponse.status, headers);
  response.end(body);
}

export async function startLocalAppServer(): Promise<LocalAppServer> {
  const clientDir = await resolveClientDistDir();
  const harness = createWorkerScopeHarness();

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname.startsWith("/api/")) {
        await serveApi(harness, request, response);
        return;
      }

      await serveStatic(clientDir, url.pathname, response);
    } catch (error) {
      response.writeHead(500, {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end(error instanceof Error ? error.message : "local_server_failed");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("local_server_address_missing");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      harness.cleanup();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

export default {
  startLocalAppServer,
};
