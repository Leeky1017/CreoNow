import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".worktrees",
]);

function collectFiles(rootDir: string): string[] {
  const files: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) {
      continue;
    }

    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          stack.push(path.join(currentDir, entry.name));
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name);
      if (!SOURCE_EXTENSIONS.has(extension)) {
        continue;
      }

      files.push(path.join(currentDir, entry.name));
    }
  }

  return files;
}

const DEEP_RELATIVE_SHARED_IMPORT =
  /(?:\bfrom\s*["'](?:\.\.\/)+packages\/shared\/|\bimport\s*\(\s*["'](?:\.\.\/)+packages\/shared\/)/;

function findDeepRelativeSharedImports(repoRoot: string): string[] {
  const scanRoots = [
    path.join(repoRoot, "apps/desktop"),
    path.join(repoRoot, "packages"),
  ];

  const matches: string[] = [];

  for (const scanRoot of scanRoots) {
    const files = collectFiles(scanRoot);
    for (const filePath of files) {
      const relativePath = path.relative(repoRoot, filePath);
      const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line) {
          continue;
        }
        if (DEEP_RELATIVE_SHARED_IMPORT.test(line)) {
          matches.push(`${relativePath}:${i + 1}:${line.trim()}`);
        }
      }
    }
  }

  return matches;
}

const repoRoot = path.resolve(import.meta.dirname, "../..");

// S1-PA-3
// should report zero deep relative imports that target packages/shared after migration
{
  const residualImports = findDeepRelativeSharedImports(repoRoot);

  assert.equal(
    residualImports.length,
    0,
    [
      "Found deep relative packages/shared imports:",
      ...residualImports.slice(0, 50),
      residualImports.length > 50
        ? `... and ${residualImports.length - 50} more`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}
