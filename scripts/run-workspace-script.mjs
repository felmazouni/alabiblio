import { spawn } from "node:child_process";

const [, , workspaceDir, scriptName, ...restArgs] = process.argv;

if (!workspaceDir || !scriptName) {
  console.error("Usage: node scripts/run-workspace-script.mjs <workspace-dir> <script-name> [...args]");
  process.exit(1);
}

if (!process.env.npm_execpath) {
  console.error("Missing npm_execpath. Run this helper through pnpm.");
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [
    process.env.npm_execpath,
    "--dir",
    workspaceDir,
    "run",
    scriptName,
    ...(restArgs.length > 0 ? ["--", ...restArgs] : []),
  ],
  {
    stdio: "inherit",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
