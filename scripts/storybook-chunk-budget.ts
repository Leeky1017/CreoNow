import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const STORYBOOK_OUTPUT_DIR = path.join("apps", "desktop", "storybook-static");
const WARN_THRESHOLD_BYTES = 500 * 1024;
const DEFAULT_FAIL_THRESHOLD_BYTES = 700 * 1024;
const FAIL_THRESHOLD_BYTES = Number(
  process.env.STORYBOOK_CHUNK_HARD_CAP_BYTES ?? String(DEFAULT_FAIL_THRESHOLD_BYTES),
);
const GATE_NAME = "STORYBOOK_CHUNK_BUDGET";
const HARD_CAP_EXCLUSIONS = [
  /^sb-manager\//,
  /^sb-addons\//,
  /^assets\/DocsRenderer-/,
  /^assets\/axe-/,
];

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

function excludedFromHardCap(file: string): boolean {
  return HARD_CAP_EXCLUSIONS.some((pattern) => pattern.test(file));
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
  if (!Number.isFinite(FAIL_THRESHOLD_BYTES) || FAIL_THRESHOLD_BYTES <= 0) {
    console.log(`[${GATE_NAME}] FAIL  invalid hard cap: ${String(process.env.STORYBOOK_CHUNK_HARD_CAP_BYTES)}`);
    process.exit(1);
  }
  const failAssets = assets.filter((asset) => {
    if (excludedFromHardCap(asset.file)) {
      return false;
    }
    return asset.size > FAIL_THRESHOLD_BYTES;
  });

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

  const excludedAssetCount = assets.filter((asset) => excludedFromHardCap(asset.file)).length;
  if (excludedAssetCount > 0) {
    console.log(
      `[${GATE_NAME}] hard-cap exclusions: ${excludedAssetCount} Storybook runtime/addon chunk(s) excluded from blocking threshold`,
    );
  }

  if (failAssets.length > 0) {
    console.log(
      `[${GATE_NAME}] FAIL  ${failAssets.length} chunk(s) exceed hard cap ${formatSize(FAIL_THRESHOLD_BYTES)}.`,
    );
    for (const asset of failAssets) {
      console.log(`  fail: ${asset.file} (${formatSize(asset.size)})`);
    }
    process.exit(1);
  }

  console.log(`[${GATE_NAME}] PASS  hard cap ${formatSize(FAIL_THRESHOLD_BYTES)}`);
}
