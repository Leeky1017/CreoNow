import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const STORYBOOK_OUTPUT_DIR = path.join("apps", "desktop", "storybook-static");
const WARN_THRESHOLD_BYTES = 500 * 1024;
const FAIL_THRESHOLD_BYTES = Number(process.env.STORYBOOK_CHUNK_HARD_CAP_BYTES ?? "0");
const GATE_NAME = "STORYBOOK_CHUNK_BUDGET";

type AssetInfo = {
  file: string;
  size: number;
};

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)}KiB`;
}

export function collectStorybookJsAssets(rootDir: string = "."): AssetInfo[] {
  const outputDir = path.join(rootDir, STORYBOOK_OUTPUT_DIR);
  return walk(outputDir)
    .filter((filePath) => filePath.endsWith(".js") || filePath.endsWith(".mjs"))
    .map((filePath) => ({
      file: path.relative(path.join(rootDir, STORYBOOK_OUTPUT_DIR), filePath),
      size: statSync(filePath).size,
    }))
    .sort((a, b) => b.size - a.size);
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith("storybook-chunk-budget.ts") ||
    process.argv[1].endsWith("storybook-chunk-budget.js"))
) {
  const assets = collectStorybookJsAssets();
  if (assets.length === 0) {
    console.log(`[${GATE_NAME}] FAIL  build output missing: ${STORYBOOK_OUTPUT_DIR}`);
    process.exit(1);
  }

  const warnAssets = assets.filter((asset) => asset.size > WARN_THRESHOLD_BYTES);
  const failAssets =
    FAIL_THRESHOLD_BYTES > 0
      ? assets.filter((asset) => asset.size > FAIL_THRESHOLD_BYTES)
      : [];

  console.log(`[${GATE_NAME}] scanned ${assets.length} js chunks in ${STORYBOOK_OUTPUT_DIR}`);
  for (const asset of assets.slice(0, 10)) {
    console.log(`  - ${asset.file}: ${formatSize(asset.size)}`);
  }

  if (warnAssets.length > 0) {
    console.log(
      `[${GATE_NAME}] WARN  ${warnAssets.length} chunk(s) exceed ${formatSize(WARN_THRESHOLD_BYTES)}. Please track split opportunities and vendor trimming.`,
    );
    for (const asset of warnAssets) {
      console.log(`  warn: ${asset.file} (${formatSize(asset.size)})`);
    }
  } else {
    console.log(`[${GATE_NAME}] WARN threshold clear (${formatSize(WARN_THRESHOLD_BYTES)})`);
  }

  if (FAIL_THRESHOLD_BYTES <= 0) {
    console.log(`[${GATE_NAME}] HARD-CAP disabled (set STORYBOOK_CHUNK_HARD_CAP_BYTES to enable blocking)`);
  } else if (failAssets.length > 0) {
    console.log(
      `[${GATE_NAME}] FAIL  ${failAssets.length} chunk(s) exceed hard cap ${formatSize(FAIL_THRESHOLD_BYTES)}.`,
    );
    for (const asset of failAssets) {
      console.log(`  fail: ${asset.file} (${formatSize(asset.size)})`);
    }
    process.exit(1);
  }

  if (FAIL_THRESHOLD_BYTES > 0) {
    console.log(`[${GATE_NAME}] PASS  hard cap ${formatSize(FAIL_THRESHOLD_BYTES)}`);
  } else {
    console.log(`[${GATE_NAME}] PASS  warning-only mode`);
  }
}
