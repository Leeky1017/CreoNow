/**
 * Design Token Gate
 *
 * Scans renderer component files (.tsx) for hardcoded color values
 * and Tailwind raw utility classes that bypass the design token system.
 *
 * Violations detected:
 *   - Hardcoded hex color values (#RGB, #RRGGBB, etc.)
 *   - Hardcoded rgba() calls
 *   - Tailwind raw color classes (e.g. bg-red-500)
 *   - Tailwind built-in shadow classes (e.g. shadow-lg)
 *
 * Usage:
 *   pnpm gate:design-token
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// ── Types ──────────────────────────────────────────────────────────

type ViolationType =
  | "hardcoded-hex"
  | "hardcoded-rgba"
  | "tailwind-raw-color"
  | "tailwind-builtin-shadow";

type Violation = {
  file: string;
  line: number;
  content: string;
  type: ViolationType;
};

// ── Config ─────────────────────────────────────────────────────────

const COMPONENTS_DIR = path.resolve(
  "apps/desktop/renderer/src/components"
);

const EXCLUDED_SUFFIXES = [".stories.tsx", ".test.tsx"];

// ── Patterns ───────────────────────────────────────────────────────

const HEX_PATTERN = /#[0-9A-Fa-f]{3,8}\b/;
const RGBA_PATTERN = /rgba?\s*\(/;
const TAILWIND_RAW_COLOR =
  /\b(bg|text|border|ring|shadow|outline|fill|stroke)-(red|blue|green|yellow|purple|pink|orange|gray|slate|zinc|neutral|stone|amber|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-\d+/;
const TAILWIND_BUILTIN_SHADOW =
  /\bshadow-(sm|md|lg|xl|2xl|inner|none)\b/;

// ── Helpers ────────────────────────────────────────────────────────

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];

  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    return results;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsxFiles(fullPath));
    } else if (
      entry.name.endsWith(".tsx") &&
      !EXCLUDED_SUFFIXES.some((s) => entry.name.endsWith(s))
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

function isCommentLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("//") || trimmed.startsWith("*");
}

function checkLine(
  line: string,
  lineNum: number,
  file: string
): Violation[] {
  if (isCommentLine(line)) return [];

  const violations: Violation[] = [];
  const relFile = path.relative(process.cwd(), file);

  if (HEX_PATTERN.test(line)) {
    violations.push({
      file: relFile,
      line: lineNum,
      content: line.trimEnd(),
      type: "hardcoded-hex",
    });
  }

  if (RGBA_PATTERN.test(line)) {
    violations.push({
      file: relFile,
      line: lineNum,
      content: line.trimEnd(),
      type: "hardcoded-rgba",
    });
  }

  if (TAILWIND_RAW_COLOR.test(line)) {
    violations.push({
      file: relFile,
      line: lineNum,
      content: line.trimEnd(),
      type: "tailwind-raw-color",
    });
  }

  if (TAILWIND_BUILTIN_SHADOW.test(line)) {
    violations.push({
      file: relFile,
      line: lineNum,
      content: line.trimEnd(),
      type: "tailwind-builtin-shadow",
    });
  }

  return violations;
}

// ── Main ───────────────────────────────────────────────────────────

function main(): void {
  const files = collectTsxFiles(COMPONENTS_DIR);

  if (files.length === 0) {
    console.log("Design Token Gate: no component files found.");
    process.exit(0);
  }

  const allViolations: Violation[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      allViolations.push(...checkLine(lines[i], i + 1, file));
    }
  }

  if (allViolations.length === 0) {
    console.log(
      `Design Token Gate: ${files.length} component files scanned — no violations found.`
    );
    process.exit(0);
  }

  console.error(
    `\nDesign Token Gate: ${allViolations.length} violation(s) found:\n`
  );

  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line}  [${v.type}]`);
    console.error(`    ${v.content}\n`);
  }

  console.error(
    "Use semantic design tokens (CSS variables / Tailwind token classes) instead of hardcoded values."
  );
  console.error(
    "See AGENTS.md §五 and docs/references/frontend-visual-quality.md for details.\n"
  );

  process.exit(1);
}

main();
