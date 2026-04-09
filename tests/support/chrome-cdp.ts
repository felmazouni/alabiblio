import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";

type ChromeSession = {
  navigate: (url: string, options?: { waitFor?: string; timeoutMs?: number }) => Promise<void>;
  evaluate: <T>(expression: string) => Promise<T>;
  waitForFunction: (expression: string, timeoutMs?: number) => Promise<void>;
  click: (selector: string) => Promise<void>;
  type: (selector: string, value: string) => Promise<void>;
  close: () => Promise<void>;
};

type ProtocolMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message?: string };
};

const DEFAULT_TIMEOUT_MS = 10_000;

async function findFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("free_port_missing"));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

function resolveChromePath(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter((value): value is string => Boolean(value));

  const resolved = candidates.find((candidate) => {
    return existsSync(candidate);
  });

  if (!resolved) {
    throw new Error("chrome_not_found");
  }

  return resolved;
}

async function waitFor<T>(
  callback: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const startedAt = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await callback();
    } catch (error) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function createProtocolConnection(
  debuggingPort: number,
): Promise<{
  socket: WebSocket;
  send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
}> {
  const pageTarget = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`);
    if (!response.ok) {
      throw new Error(`chrome_target_${response.status}`);
    }
    const targets = await response.json() as Array<{ type?: string; webSocketDebuggerUrl?: string }>;
    const target = targets.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
    if (!target) {
      throw new Error("chrome_page_target_missing");
    }
    return target;
  }, DEFAULT_TIMEOUT_MS);

  const webSocketDebuggerUrl = pageTarget.webSocketDebuggerUrl;
  assert.ok(webSocketDebuggerUrl, "Missing Chrome websocket debugger URL");

  const socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", (event) => reject(event), { once: true });
  });

  let messageId = 0;
  const pending = new Map<number, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void }>();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ProtocolMessage;
    if (!message.id) {
      return;
    }

    const entry = pending.get(message.id);
    if (!entry) {
      return;
    }

    pending.delete(message.id);

    if (message.error) {
      entry.reject(new Error(message.error.message ?? "chrome_protocol_error"));
      return;
    }

    entry.resolve(message.result ?? {});
  });

  return {
    socket,
    send(method, params = {}) {
      messageId += 1;
      const id = messageId;
      return new Promise<Record<string, unknown>>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

function escapeForTemplate(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
}

export async function openChromeSession(): Promise<ChromeSession> {
  const debuggingPort = await findFreePort();
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "alabiblio-chrome-"));
  const chromePath = resolveChromePath();
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    {
      stdio: "ignore",
    },
  ) as ChildProcessWithoutNullStreams;

  const { socket, send } = await createProtocolConnection(debuggingPort);
  await send("Page.enable");
  await send("Runtime.enable");

  async function evaluate<T>(expression: string): Promise<T> {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return result.result && "value" in result.result
      ? result.result.value as T
      : undefined as T;
  }

  async function waitForFunction(expression: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
    const startedAt = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const value = await evaluate<boolean>(expression);
      if (value) {
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error(`wait_for_function_timeout: ${expression}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async function navigate(url: string, options?: { waitFor?: string; timeoutMs?: number }): Promise<void> {
    await send("Page.navigate", { url });
    const waitFor = options?.waitFor ?? "document.readyState === 'complete'";
    await waitForFunction(waitFor, options?.timeoutMs);
  }

  async function click(selector: string): Promise<void> {
    const escaped = escapeForTemplate(selector);
    const clicked = await evaluate<boolean>(`(() => {
      const element = document.querySelector(\`${escaped}\`);
      if (!(element instanceof HTMLElement)) return false;
      element.click();
      return true;
    })()`);
    assert.equal(clicked, true, `Element not found for click: ${selector}`);
  }

  async function type(selector: string, value: string): Promise<void> {
    const escapedSelector = escapeForTemplate(selector);
    const escapedValue = escapeForTemplate(value);
    const typed = await evaluate<boolean>(`(() => {
      const element = document.querySelector(\`${escapedSelector}\`);
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
        return false;
      }
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(element, \`${escapedValue}\`);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
    assert.equal(typed, true, `Input not found for type: ${selector}`);
  }

  async function close(): Promise<void> {
    socket.close();
    chrome.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 150));
    await rm(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 6,
      retryDelay: 150,
    });
  }

  return {
    navigate,
    evaluate,
    waitForFunction,
    click,
    type,
    close,
  };
}

export default {
  openChromeSession,
};
