/**
 * G0-05: Spec-Test Mapping Gate
 *
 * Strict rule:
 * - 显式 Scenario ID（例如 BE-SLA-S2 / AUD-C1-S4 / S-XXX-NN）必须被测试标题显式引用。
 * - derived Scenario 不能整体忽略，必须至少有一部分形成可追溯映射证据。
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export type Tier2Dimension =
  | "negation"
  | "capability"
  | "cjk"
  | "rejection"
  | "general";

export type ScenarioEntry = {
  id: string;
  title: string;
  specFile: string;
  dimension: Tier2Dimension;
  mappingMode: "explicit" | "derived";
};

export type MappingEvidence = {
  file: string;
  line: number;
  snippet: string;
  kind: "exact-title" | "derived-title";
};

export type MappingResult = {
  scenario: ScenarioEntry;
  mapped: boolean;
  exactMapped: boolean;
  testFiles: string[];
  exactMatchedFiles: string[];
  fuzzyMatchedFiles: string[];
  evidences: MappingEvidence[];
};

export type Tier2Summary = {
  negation: { mapped: number; total: number };
  capability: { mapped: number; total: number };
  cjk: { mapped: number; total: number };
  rejection: { mapped: number; total: number };
};

export type SpecTestMappingBaseline = {
  count: number;
  explicitUnmappedCount?: number;
  derivedUnmappedCount?: number;
  updatedAt: string;
};

export type SpecTestMappingResult = {
  ok: boolean;
  mappings: MappingResult[];
  unmapped: MappingResult[];
  total: number;
  mapped: number;
  baseline: number;
  tier2: Tier2Summary;
  explicitTotal: number;
  explicitMapped: number;
  explicitUnmapped: MappingResult[];
  derivedTotal: number;
  derivedMapped: number;
  derivedUnmapped: MappingResult[];
  derivedIgnored: boolean;
  dilutedBaseline: boolean;
};

const SPEC_DIRS = [
  path.join("openspec", "specs"),
  path.join("openspec", "changes"),
];

const TEST_DIRS = [
  path.join("apps", "desktop"),
  path.join("packages", "shared"),
  path.join("scripts"),
];

const BASELINE_PATH = path.join(
  "openspec",
  "guards",
  "spec-test-mapping-baseline.json",
);

const GATE_NAME = "SPEC_TEST_MAP";

const SCENARIO_ID_RE = /###\s+Scenario\s+(S-[A-Z]+(?:-[A-Z]+)*-\d+)/g;
const SCENARIO_TITLE_RE = /####\s+Scenario:\s+(.+)/;
const PREFIXED_ID_RE = /^((?:BE|FE|AUD|IPC|P\d+)[-\w]*\s*)/;
const TEST_TITLE_RE =
  /(describe|it|test)\s*(?:\.\w+)?\s*\(\s*("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)/g;

const DIMENSION_RULES: Array<{
  dimension: Tier2Dimension;
  tagPattern: RegExp;
  titlePattern: RegExp;
}> = [
  {
    dimension: "negation",
    tagPattern: /@negation\b/i,
    titlePattern: /\bshould\s+NOT\b/i,
  },
  {
    dimension: "capability",
    tagPattern: /@capability\b/i,
    titlePattern: /(声称支持|capability|能力声明)/i,
  },
  {
    dimension: "cjk",
    tagPattern: /@cjk\b/i,
    titlePattern: /(CJK|中文|日文|韩文|\bChinese\b|\bJapanese\b|\bKorean\b)/i,
  },
  {
    dimension: "rejection",
    tagPattern: /@rejection\b/i,
    titlePattern: /(拒绝|\breject\b|\bdeny\b|失败|\bdenied\b)/i,
  },
];

function walk(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".git" || entry === "dist") {
        continue;
      }
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function classifyDimension(title: string): Tier2Dimension {
  for (const rule of DIMENSION_RULES) {
    if (rule.tagPattern.test(title) || rule.titlePattern.test(title)) {
      return rule.dimension;
    }
  }
  return "general";
}

function scenarioTitleToId(
  title: string,
  specFile: string,
): { id: string; mappingMode: "explicit" | "derived" } {
  const trimmed = title.trim();

  const prefixMatch = PREFIXED_ID_RE.exec(trimmed);
  if (prefixMatch) {
    return { id: prefixMatch[1].trim(), mappingMode: "explicit" };
  }

  const parts = specFile.split("/");
  const specIdx = parts.indexOf("specs");
  const module =
    specIdx >= 0 && specIdx + 1 < parts.length ? parts[specIdx + 1] : "unknown";

  const slug = trimmed
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80);

  return { id: `${module}/${slug}`, mappingMode: "derived" };
}

export function extractScenarios(rootDir: string = "."): ScenarioEntry[] {
  const scenarios: ScenarioEntry[] = [];

  for (const specDir of SPEC_DIRS) {
    const fullDir = path.join(rootDir, specDir);
    const files = walk(fullDir);

    for (const filePath of files) {
      if (!filePath.endsWith("spec.md") && !filePath.endsWith(".spec.md")) {
        continue;
      }

      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const relPath = path.relative(rootDir, filePath);

      for (const line of lines) {
        SCENARIO_ID_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = SCENARIO_ID_RE.exec(line)) !== null) {
          const id = match[1];
          scenarios.push({
            id,
            title: line.replace(/^###\s+Scenario\s+/, "").trim(),
            specFile: relPath,
            dimension: classifyDimension(line),
            mappingMode: "explicit",
          });
        }

        const titleMatch = SCENARIO_TITLE_RE.exec(line);
        if (titleMatch) {
          const rawTitle = titleMatch[1].trim();
          const idMeta = scenarioTitleToId(rawTitle, relPath);
          scenarios.push({
            id: idMeta.id,
            title: rawTitle,
            specFile: relPath,
            dimension: classifyDimension(rawTitle),
            mappingMode: idMeta.mappingMode,
          });
        }
      }
    }
  }

  return scenarios;
}

function splitCjk(text: string): string[] {
  const cjkChars = text.replace(/[^\u4e00-\u9fff]/g, "");
  if (cjkChars.length < 2) return [text];
  const grams: string[] = [];
  for (let i = 0; i < cjkChars.length - 1; i++) {
    grams.push(cjkChars.slice(i, i + 2));
  }
  return grams;
}

function extractKeywords(title: string): string[] {
  const tokens = title
    .split(/[\s,;:—/（）()、，。]+/)
    .map((token) => token.trim().toLocaleLowerCase())
    .filter((w) => w.length >= 2);

  if (tokens.length >= 2) return tokens;
  const cjkGrams = splitCjk(title).map((token) => token.toLocaleLowerCase());
  if (cjkGrams.length >= 2) return cjkGrams;
  return tokens;
}

function offsetToLine(source: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset && index < source.length; index += 1) {
    if (source[index] === "\n") {
      line += 1;
    }
  }
  return line;
}

function collectTestTitles(content: string): Array<{ title: string; line: number }> {
  const titles: Array<{ title: string; line: number }> = [];
  let match: RegExpExecArray | null;
  TEST_TITLE_RE.lastIndex = 0;
  while ((match = TEST_TITLE_RE.exec(content)) !== null) {
    const rawLiteral = match[2];
    const quote = rawLiteral[0];
    const title = rawLiteral.slice(1, -1);
    if (quote === "`" && title.includes("${")) {
      continue;
    }
    titles.push({
      title,
      line: offsetToLine(content, match.index),
    });
  }
  return titles;
}

export function findTestMappings(
  scenarios: ScenarioEntry[],
  rootDir: string = ".",
): MappingResult[] {
  const testFiles: string[] = [];
  for (const testDir of TEST_DIRS) {
    const fullDir = path.join(rootDir, testDir);
    for (const filePath of walk(fullDir)) {
      if (
        filePath.match(/\.(test|spec)\.(ts|tsx|js|jsx|cjs|mjs)$/) &&
        !filePath.includes("node_modules")
      ) {
        testFiles.push(filePath);
      }
    }
  }

  const testFileContents = new Map<string, string>();
  for (const filePath of testFiles) {
    testFileContents.set(filePath, readFileSync(filePath, "utf-8"));
  }

  return scenarios.map((scenario) => {
    const exactMatchedFiles: string[] = [];
    const fuzzyMatchedFiles: string[] = [];
    const evidences: MappingEvidence[] = [];
    const keywords = extractKeywords(scenario.title);

    for (const [filePath, content] of testFileContents) {
      const relPath = path.relative(rootDir, filePath);
      const testTitles = collectTestTitles(content);

      const exactTitle = testTitles.find((entry) => entry.title.includes(scenario.id));
      if (exactTitle) {
        exactMatchedFiles.push(relPath);
        evidences.push({
          file: relPath,
          line: exactTitle.line,
          snippet: exactTitle.title.slice(0, 180),
          kind: "exact-title",
        });
        continue;
      }

      if (scenario.mappingMode === "derived" && keywords.length >= 1) {
        const derivedTitle = testTitles.find((entry) => {
          const normalizedTitle = entry.title.toLocaleLowerCase();
          const hits = keywords.filter((kw) => normalizedTitle.includes(kw)).length;
          return hits >= Math.max(1, Math.ceil(keywords.length * 0.6));
        });
        if (derivedTitle) {
          fuzzyMatchedFiles.push(relPath);
          evidences.push({
            file: relPath,
            line: derivedTitle.line,
            snippet: derivedTitle.title.slice(0, 180),
            kind: "derived-title",
          });
        }
      }
    }

    const testFilesForScenario = Array.from(
      new Set([...exactMatchedFiles, ...fuzzyMatchedFiles]),
    );
    const exactMapped = exactMatchedFiles.length > 0;
    const derivedMapped =
      scenario.mappingMode === "derived" && fuzzyMatchedFiles.length > 0;

    return {
      scenario,
      mapped: exactMapped || derivedMapped,
      exactMapped,
      testFiles: testFilesForScenario,
      exactMatchedFiles,
      fuzzyMatchedFiles,
      evidences,
    };
  });
}

export function computeTier2Summary(mappings: MappingResult[]): Tier2Summary {
  const dims: Tier2Dimension[] = [
    "negation",
    "capability",
    "cjk",
    "rejection",
  ];
  const summary: Tier2Summary = {
    negation: { mapped: 0, total: 0 },
    capability: { mapped: 0, total: 0 },
    cjk: { mapped: 0, total: 0 },
    rejection: { mapped: 0, total: 0 },
  };

  for (const m of mappings) {
    const dim = m.scenario.dimension;
    if (dims.includes(dim)) {
      const key = dim as keyof Tier2Summary;
      summary[key].total++;
      if (m.mapped) summary[key].mapped++;
    }
  }

  return summary;
}

export function readBaseline(
  rootDir: string = ".",
): SpecTestMappingBaseline {
  const baselinePath = path.join(rootDir, BASELINE_PATH);
  if (!existsSync(baselinePath)) {
    return {
      count: 0,
      explicitUnmappedCount: 0,
      derivedUnmappedCount: 0,
      updatedAt: "1970-01-01T00:00:00.000Z",
    };
  }
  const parsed = JSON.parse(
    readFileSync(baselinePath, "utf-8"),
  ) as SpecTestMappingBaseline;
  return {
    count: parsed.count,
    explicitUnmappedCount: parsed.explicitUnmappedCount,
    derivedUnmappedCount: parsed.derivedUnmappedCount,
    updatedAt: parsed.updatedAt,
  };
}

export function writeBaseline(
  explicitUnmappedCount: number,
  derivedUnmappedCount: number = 0,
  rootDir: string = ".",
): void {
  const baselinePath = path.join(rootDir, BASELINE_PATH);
  const data: SpecTestMappingBaseline = {
    count: explicitUnmappedCount,
    explicitUnmappedCount,
    derivedUnmappedCount,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(baselinePath, JSON.stringify(data, null, 2) + "\n");
}

export function runGate(rootDir: string = "."): SpecTestMappingResult {
  const scenarios = extractScenarios(rootDir);
  const mappings = findTestMappings(scenarios, rootDir);

  const explicitMappings = mappings.filter(
    (m) => m.scenario.mappingMode === "explicit",
  );
  const explicitUnmapped = explicitMappings.filter((m) => !m.exactMapped);

  const derivedMappings = mappings.filter(
    (m) => m.scenario.mappingMode === "derived",
  );
  const derivedUnmapped = derivedMappings.filter((m) => !m.mapped);
  const derivedIgnored =
    derivedMappings.length > 0 && derivedMappings.every((m) => !m.mapped);

  const baseline = readBaseline(rootDir);
  const baselineLimit = baseline.explicitUnmappedCount ?? baseline.count;
  const tier2 = computeTier2Summary(mappings);

  const unmapped = mappings.filter((m) => !m.mapped);
  const dilutedBaseline = baselineLimit > explicitUnmapped.length;

  return {
    ok:
      explicitUnmapped.length <= baselineLimit &&
      !dilutedBaseline &&
      !derivedIgnored,
    mappings,
    unmapped,
    total: scenarios.length,
    mapped: mappings.filter((m) => m.mapped).length,
    baseline: baselineLimit,
    tier2,
    explicitTotal: explicitMappings.length,
    explicitMapped: explicitMappings.length - explicitUnmapped.length,
    explicitUnmapped,
    derivedTotal: derivedMappings.length,
    derivedMapped: derivedMappings.length - derivedUnmapped.length,
    derivedUnmapped,
    derivedIgnored,
    dilutedBaseline,
  };
}

function pct(mapped: number, total: number): string {
  if (total === 0) return "N/A";
  return `${Math.round((mapped / total) * 100)}%`;
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith("spec-test-mapping-gate.ts") ||
    process.argv[1].endsWith("spec-test-mapping-gate.js"))
) {
  const updateBaselineMode = process.argv.includes("--update-baseline");
  const result = runGate();

  if (updateBaselineMode) {
    if (result.explicitUnmapped.length > result.baseline) {
      console.log(
        `[${GATE_NAME}] REFUSE baseline update: explicit-unmapped ${result.explicitUnmapped.length} exceeds baseline ${result.baseline}.`,
      );
      process.exit(1);
    }
    writeBaseline(result.explicitUnmapped.length, result.derivedUnmapped.length);
    console.log(
      `[${GATE_NAME}] Baseline updated: explicit unmapped ${result.explicitUnmapped.length}, derived unmapped ${result.derivedUnmapped.length}`,
    );
    process.exit(0);
  }

  console.log(
    `[${GATE_NAME}] coverage: ${result.mapped}/${result.total} (${pct(result.mapped, result.total)})`,
  );
  console.log(
    `[${GATE_NAME}] explicit-id coverage: ${result.explicitMapped}/${result.explicitTotal} (${pct(result.explicitMapped, result.explicitTotal)})`,
  );
  console.log(
    `[${GATE_NAME}] derived coverage: ${result.derivedMapped}/${result.derivedTotal} (${pct(result.derivedMapped, result.derivedTotal)})`,
  );

  const t2 = result.tier2;
  console.log(`[${GATE_NAME}] Tier-2 summary:`);
  console.log(
    `  negation:   ${t2.negation.mapped}/${t2.negation.total} (${pct(t2.negation.mapped, t2.negation.total)})`,
  );
  console.log(
    `  capability: ${t2.capability.mapped}/${t2.capability.total} (${pct(t2.capability.mapped, t2.capability.total)})`,
  );
  console.log(
    `  cjk:        ${t2.cjk.mapped}/${t2.cjk.total} (${pct(t2.cjk.mapped, t2.cjk.total)})`,
  );
  console.log(
    `  rejection:  ${t2.rejection.mapped}/${t2.rejection.total} (${pct(t2.rejection.mapped, t2.rejection.total)})`,
  );

  if (result.ok) {
    console.log(
      `[${GATE_NAME}] PASS  explicit-unmapped: ${result.explicitUnmapped.length} (baseline: ${result.baseline})`,
    );
    const evidenceSamples = result.mappings
      .filter((m) => m.evidences.length > 0)
      .slice(0, 20);
    if (evidenceSamples.length > 0) {
      console.log(`[${GATE_NAME}] evidence sample (scenario -> test@line):`);
      for (const mapping of evidenceSamples) {
        for (const evidence of mapping.evidences.slice(0, 2)) {
          console.log(
            `  - ${mapping.scenario.id} -> ${evidence.file}:${evidence.line} [${evidence.kind}] ${evidence.snippet}`,
          );
        }
      }
    }
  } else {
    if (result.dilutedBaseline) {
      console.log(
        `[${GATE_NAME}] FAIL  baseline diluted: baseline ${result.baseline} > current explicit-unmapped ${result.explicitUnmapped.length}. Run --update-baseline to ratchet down.`,
      );
      process.exit(1);
    }
    if (result.derivedIgnored) {
      console.log(
        `[${GATE_NAME}] FAIL  derived scenarios are fully unmapped (${result.derivedUnmapped.length}/${result.derivedTotal}).`,
      );
    }
    const newCount = result.explicitUnmapped.length - result.baseline;
    console.log(
      `[${GATE_NAME}] FAIL  explicit-unmapped: ${result.explicitUnmapped.length} (baseline: ${result.baseline})  +${newCount} new:`,
    );
    for (const m of result.explicitUnmapped) {
      console.log(
        `  - ${m.scenario.specFile}: ${m.scenario.id} — ${m.scenario.title}`,
      );
      if (m.evidences.length > 0) {
        for (const evidence of m.evidences) {
          console.log(
            `    evidence: ${evidence.file}:${evidence.line} [${evidence.kind}] ${evidence.snippet}`,
          );
        }
      }
      if (m.fuzzyMatchedFiles.length > 0) {
        console.log(`    fuzzy-hints: ${m.fuzzyMatchedFiles.join(", ")}`);
      }
    }
    process.exit(1);
  }
}
