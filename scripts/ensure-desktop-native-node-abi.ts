import { spawnSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DESKTOP_PACKAGE_JSON = path.join(REPO_ROOT, "apps/desktop/package.json");
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const RECOVERABLE_MARKERS = [
  "node_module_version",
  "compiled against a different node.js version",
  "could not locate the bindings file",
  "better_sqlite3.node",
  "cannot find module",
];

type ProbeResult = {
  ok: boolean;
  output: string;
};

function runProbe(): ProbeResult {
  const probeScript = `
const { createRequire } = require("node:module");
const requireFromDesktop = createRequire(${JSON.stringify(DESKTOP_PACKAGE_JSON)});

try {
  const Database = requireFromDesktop("better-sqlite3");
  const db = new Database(":memory:");
  db.close();
  process.exit(0);
} catch (error) {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(detail);
  process.exit(1);
}
`;

  const result = spawnSync(process.execPath, ["-e", probeScript], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });

  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

function isRecoverable(output: string): boolean {
  const lowered = output.toLowerCase();
  return RECOVERABLE_MARKERS.some((marker) => lowered.includes(marker));
}

function rebuildForNodeAbi(): void {
  const result = spawnSync(PNPM, ["-C", "apps/desktop", "rebuild", "better-sqlite3"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error("Failed to rebuild better-sqlite3 for Node runtime ABI");
  }
}

function ensureDesktopNativeNodeAbi(): void {
  const initialProbe = runProbe();
  if (initialProbe.ok) {
    return;
  }

  if (!isRecoverable(initialProbe.output)) {
    throw new Error(
      [
        "Unable to load apps/desktop better-sqlite3 for an unknown reason.",
        initialProbe.output,
      ].join("\n"),
    );
  }

  console.log("[native-abi] detected better-sqlite3 ABI drift, rebuilding for Node runtime...");
  rebuildForNodeAbi();

  const verifyProbe = runProbe();
  if (!verifyProbe.ok) {
    throw new Error(
      [
        "better-sqlite3 still failed to load after Node ABI rebuild.",
        verifyProbe.output,
      ].join("\n"),
    );
  }

  console.log("[native-abi] better-sqlite3 Node ABI restored.");
}

ensureDesktopNativeNodeAbi();
