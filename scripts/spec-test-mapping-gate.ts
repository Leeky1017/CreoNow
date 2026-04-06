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
import { execSync } from "node:child_process";
import path from "node:path";
import ts from "typescript";

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
  scopeMode: "all" | "changed";
  scopeSpecFiles: string[];
  usedFallbackBaseline: boolean;
  baselineFile: string;
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
  derivedBaseline: number;
  derivedCoverage: number;
  derivedCoverageThreshold: number;
  derivedIgnored: boolean;
  derivedUnmappedOverLimit: boolean;
  dilutedDerivedBaseline: boolean;
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
const FALLBACK_BASELINE_PATH = path.join(
  "openspec",
  "guards",
  "spec-test-mapping-fallback-baseline.json",
);

const GATE_NAME = "SPEC_TEST_MAP";
const DERIVED_COVERAGE_THRESHOLD = 0.6;

const SCENARIO_ID_RE = /###\s+Scenario\s+(S-[A-Z]+(?:-[A-Z]+)*-\d+)/g;
const SCENARIO_TITLE_RE = /####\s+Scenario:\s+(.+)/;
const PREFIXED_ID_RE = /^((?:BE|FE|AUD|IPC|P\d+)[-\w]*\s*)/;

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

function isExecutableTestTitle(
  callee: string,
  modifiers: string,
  title: string,
): boolean {
  if (callee === "describe") {
    return false;
  }
  const modifierTokens = modifiers
    .split(".")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (modifierTokens.includes("skip") || modifierTokens.includes("todo")) {
    return false;
  }
  if (title.trim().length < 2) {
    return false;
  }
  if (
    /(?:^|\s)(?:todo|wip|skip|pending|placeholder|待实现|待补充|占位)(?:\s|$|[:：])/iu.test(
      title,
    )
  ) {
    return false;
  }
  return true;
}

function scriptKindFromPath(filePath: string): ts.ScriptKind {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".ts")) return ts.ScriptKind.TS;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function parseTestCallee(
  expr: ts.LeftHandSideExpression | ts.Expression,
): { callee: string; modifiers: string[] } | null {
  if (ts.isIdentifier(expr)) {
    if (expr.text === "describe" || expr.text === "it" || expr.text === "test") {
      return { callee: expr.text, modifiers: [] };
    }
    return null;
  }
  if (ts.isPropertyAccessExpression(expr)) {
    const base = parseTestCallee(expr.expression);
    if (!base) return null;
    return {
      callee: base.callee,
      modifiers: [...base.modifiers, expr.name.text],
    };
  }
  if (ts.isCallExpression(expr)) {
    return parseTestCallee(expr.expression);
  }
  return null;
}

function extractLiteralTitle(arg: ts.Expression | undefined): string | null {
  if (!arg) return null;
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
    return arg.text;
  }
  return null;
}

function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function isExecutableExpression(expression: ts.Expression): boolean {
  const normalized = unwrapExpression(expression);
  return ts.isArrowFunction(normalized) || ts.isFunctionExpression(normalized);
}

type CallbackMetadata = {
  callableIdentifiers: Set<string>;
  callableObjectProps: Map<string, Set<string>>;
  literalStringConsts: Map<string, string>;
};

function collectCallbackMetadata(sourceFile: ts.SourceFile): CallbackMetadata {
  const callableIdentifiers = new Set<string>();
  const callableObjectProps = new Map<string, Set<string>>();
  const literalStringConsts = new Map<string, string>();

  const markCallableProperty = (objectName: string, propertyName: string): void => {
    const existing = callableObjectProps.get(objectName);
    if (existing) {
      existing.add(propertyName);
      return;
    }
    callableObjectProps.set(objectName, new Set([propertyName]));
  };

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      callableIdentifiers.add(node.name.text);
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const variableName = node.name.text;
      const normalizedInit = unwrapExpression(node.initializer);
      if (isExecutableExpression(normalizedInit)) {
        callableIdentifiers.add(variableName);
      } else if (ts.isObjectLiteralExpression(normalizedInit)) {
        for (const prop of normalizedInit.properties) {
          if (ts.isPropertyAssignment(prop)) {
            const propertyName = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
              ? prop.name.text
              : null;
            if (propertyName && isExecutableExpression(prop.initializer)) {
              markCallableProperty(variableName, propertyName);
            }
          } else if (ts.isMethodDeclaration(prop)) {
            const propertyName = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
              ? prop.name.text
              : null;
            if (propertyName) {
              markCallableProperty(variableName, propertyName);
            }
          }
        }
      } else if (ts.isStringLiteral(normalizedInit) || ts.isNoSubstitutionTemplateLiteral(normalizedInit)) {
        literalStringConsts.set(variableName, normalizedInit.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return { callableIdentifiers, callableObjectProps, literalStringConsts };
}

function resolveElementAccessPropertyName(
  access: ts.ElementAccessExpression,
  metadata: CallbackMetadata,
): string | null {
  const argument = access.argumentExpression;
  if (!argument) {
    return null;
  }
  const normalizedArg = unwrapExpression(argument);
  if (ts.isStringLiteral(normalizedArg) || ts.isNoSubstitutionTemplateLiteral(normalizedArg)) {
    return normalizedArg.text;
  }
  if (ts.isIdentifier(normalizedArg)) {
    return metadata.literalStringConsts.get(normalizedArg.text) ?? null;
  }
  return null;
}

function hasExecutableCallback(
  node: ts.CallExpression,
  metadata: CallbackMetadata,
): boolean {
  const callback = node.arguments[1];
  if (!callback) {
    return false;
  }
  if (isExecutableExpression(callback)) {
    return true;
  }
  const normalized = unwrapExpression(callback);
  if (ts.isIdentifier(normalized)) {
    return metadata.callableIdentifiers.has(normalized.text);
  }
  if (ts.isPropertyAccessExpression(normalized)) {
    if (!ts.isIdentifier(normalized.expression)) {
      return false;
    }
    return metadata.callableObjectProps
      .get(normalized.expression.text)
      ?.has(normalized.name.text) ?? false;
  }
  if (ts.isElementAccessExpression(normalized)) {
    if (!ts.isIdentifier(normalized.expression)) {
      return false;
    }
    const propertyName = resolveElementAccessPropertyName(normalized, metadata);
    if (!propertyName) {
      return false;
    }
    return metadata.callableObjectProps
      .get(normalized.expression.text)
      ?.has(propertyName) ?? false;
  }
  return false;
}

function collectTestTitles(
  content: string,
  filePath: string,
): Array<{ title: string; line: number }> {
  const titles: Array<{ title: string; line: number }> = [];
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFromPath(filePath),
  );
  const callbackMetadata = collectCallbackMetadata(sourceFile);

  const visit = (node: ts.Node): void => {
    if (!ts.isCallExpression(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const calleeMeta = parseTestCallee(node.expression);
    if (!calleeMeta) {
      ts.forEachChild(node, visit);
      return;
    }

    const title = extractLiteralTitle(node.arguments[0]);
    if (title === null) {
      ts.forEachChild(node, visit);
      return;
    }

    if (
      ts.isNoSubstitutionTemplateLiteral(node.arguments[0]) &&
      node.arguments[0].text.includes("${")
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    if (
      !isExecutableTestTitle(
        calleeMeta.callee,
        calleeMeta.modifiers.map((token) => `.${token}`).join(""),
        title,
      )
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    if (
      (calleeMeta.callee === "it" || calleeMeta.callee === "test")
      && !hasExecutableCallback(node, callbackMetadata)
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    const titleArg = node.arguments[0];
    const line = sourceFile.getLineAndCharacterOfPosition(titleArg.getStart(sourceFile)).line + 1;
    titles.push({
      title,
      line,
    });
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
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
      const testTitles = collectTestTitles(content, filePath);

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
  baselinePath: string = BASELINE_PATH,
): SpecTestMappingBaseline {
  const fullBaselinePath = path.join(rootDir, baselinePath);
  if (!existsSync(fullBaselinePath)) {
    return {
      count: 0,
      explicitUnmappedCount: 0,
      derivedUnmappedCount: 0,
      updatedAt: "1970-01-01T00:00:00.000Z",
    };
  }
  const parsed = JSON.parse(
    readFileSync(fullBaselinePath, "utf-8"),
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

function resolveScopeSpecFiles(rootDir: string): string[] | null {
  const forceAll = process.argv.includes("--all") || process.env.SPEC_TEST_MAP_SCOPE === "all";
  if (forceAll) {
    return null;
  }

  const gitDir = path.join(rootDir, ".git");
  if (!existsSync(gitDir)) {
    return null;
  }

  const diffTargets = ["origin/main...HEAD", "HEAD~1...HEAD"];
  for (const target of diffTargets) {
    try {
      const raw = execSync(`git --no-pager diff --name-only --diff-filter=ACMRTUXB ${target}`, {
        cwd: rootDir,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (raw.length === 0) {
        continue;
      }
      const changedSpecFiles = raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.endsWith("spec.md") || line.endsWith(".spec.md"))
        .sort();
      if (changedSpecFiles.length === 0) {
        return null;
      }
      return changedSpecFiles;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${GATE_NAME}] WARN  unable to resolve changed spec files from ${target}: ${message}`);
      continue;
    }
  }
  return null;
}

function shouldUseFallbackBaseline(rootDir: string): boolean {
  const forceAll = process.argv.includes("--all") || process.env.SPEC_TEST_MAP_SCOPE === "all";
  if (forceAll) {
    return false;
  }

  const gitDir = path.join(rootDir, ".git");
  if (!existsSync(gitDir)) {
    return false;
  }

  const diffTargets = ["origin/main...HEAD", "HEAD~1...HEAD"];
  for (const target of diffTargets) {
    try {
      const raw = execSync(`git --no-pager diff --name-only --diff-filter=ACMRTUXB ${target}`, {
        cwd: rootDir,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (raw.length === 0) {
        continue;
      }
      const changedSpecFiles = raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.endsWith("spec.md") || line.endsWith(".spec.md"))
        .sort();
      if (changedSpecFiles.length === 0) {
        return true;
      }
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${GATE_NAME}] WARN  unable to resolve changed spec files from ${target}: ${message}`);
      continue;
    }
  }
  return true;
}

export function runGate(rootDir: string = "."): SpecTestMappingResult {
  const useFallbackBaseline = shouldUseFallbackBaseline(rootDir);
  const scopeSpecFiles = resolveScopeSpecFiles(rootDir);
  const scopeMode: "all" | "changed" = scopeSpecFiles === null ? "all" : "changed";
  const scopedSpecFiles = scopeSpecFiles ?? [];
  const scenarios = extractScenarios(rootDir).filter((scenario) => {
    if (scopeMode === "all") return true;
    return scopedSpecFiles.includes(scenario.specFile);
  });
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

  const baselineFile = useFallbackBaseline ? FALLBACK_BASELINE_PATH : BASELINE_PATH;
  const baseline = readBaseline(rootDir, baselineFile);
  const baselineLimit = baseline.explicitUnmappedCount ?? baseline.count;
  const derivedBaselineLimit = baseline.derivedUnmappedCount ?? 0;
  const tier2 = computeTier2Summary(mappings);

  const unmapped = mappings.filter((m) => !m.mapped);
  const dilutedBaseline = baselineLimit > explicitUnmapped.length;
  const dilutedDerivedBaseline = derivedBaselineLimit > derivedUnmapped.length;
  const derivedCoverage =
    derivedMappings.length === 0
      ? 1
      : (derivedMappings.length - derivedUnmapped.length) / derivedMappings.length;
  const derivedUnmappedOverLimit = derivedUnmapped.length > derivedBaselineLimit;
  const enforceDerivedCoverage = useFallbackBaseline === false;

  return {
    ok:
      explicitUnmapped.length <= baselineLimit &&
      !dilutedBaseline &&
      !derivedUnmappedOverLimit &&
      !dilutedDerivedBaseline &&
      (!enforceDerivedCoverage || (!derivedIgnored && derivedCoverage >= DERIVED_COVERAGE_THRESHOLD)) &&
      mappings.length > 0,
    scopeMode,
    scopeSpecFiles: scopedSpecFiles,
    usedFallbackBaseline: useFallbackBaseline,
    baselineFile,
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
    derivedBaseline: derivedBaselineLimit,
    derivedCoverage,
    derivedCoverageThreshold: DERIVED_COVERAGE_THRESHOLD,
    derivedIgnored,
    derivedUnmappedOverLimit,
    dilutedDerivedBaseline,
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

  if (result.scopeMode === "changed") {
    console.log(`[${GATE_NAME}] scope: changed spec files (${result.scopeSpecFiles.length})`);
    for (const specFile of result.scopeSpecFiles) {
      console.log(`  - ${specFile}`);
    }
  } else {
    console.log(`[${GATE_NAME}] scope: all spec files`);
  }
  if (result.usedFallbackBaseline) {
    console.log(`[${GATE_NAME}] baseline strategy: fallback (${result.baselineFile})`);
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
  console.log(
    `[${GATE_NAME}] derived threshold: coverage >= ${Math.round(result.derivedCoverageThreshold * 100)}%, unmapped <= ${result.derivedBaseline}`,
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
    if (result.dilutedDerivedBaseline) {
      console.log(
        `[${GATE_NAME}] FAIL  derived baseline diluted: baseline ${result.derivedBaseline} > current derived-unmapped ${result.derivedUnmapped.length}. Run --update-baseline to ratchet down.`,
      );
      process.exit(1);
    }
    if (result.derivedIgnored && !result.usedFallbackBaseline) {
      console.log(
        `[${GATE_NAME}] FAIL  derived scenarios are fully unmapped (${result.derivedUnmapped.length}/${result.derivedTotal}).`,
      );
    }
    if (result.derivedUnmappedOverLimit) {
      console.log(
        `[${GATE_NAME}] FAIL  derived-unmapped ${result.derivedUnmapped.length} exceeds baseline ${result.derivedBaseline}.`,
      );
    }
    if (result.derivedCoverage < result.derivedCoverageThreshold && !result.usedFallbackBaseline) {
      console.log(
        `[${GATE_NAME}] FAIL  derived coverage ${Math.round(result.derivedCoverage * 100)}% is below threshold ${Math.round(result.derivedCoverageThreshold * 100)}%.`,
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
