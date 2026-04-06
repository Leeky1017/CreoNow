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
  derivedCoverageFloor?: number;
  updatedAt: string;
};

export type SpecTestMappingResult = {
  ok: boolean;
  scopeMode: "all" | "changed";
  scopeSpecFiles: string[];
  usedFallbackBaseline: boolean;
  baselineMode: "primary" | "no-spec-change-fallback" | "exception-fallback";
  baselineFile: string;
  fallbackError: string | null;
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
  derivedCoverageFloor: number;
  derivedIgnored: boolean;
  derivedQualityRegressed: boolean;
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
const DEFAULT_DERIVED_COVERAGE_FLOOR = DERIVED_COVERAGE_THRESHOLD;

const LEGACY_SCENARIO_ID_FRAGMENT = String.raw`S-[A-Z]+(?:-[A-Z]+)*-\d+`;
const PREFIXED_SCENARIO_ID_FRAGMENT = String.raw`(?:BE|FE|AUD|IPC)-[A-Z0-9]+(?:-[A-Z0-9]+)*-S\d+`;
const EXPLICIT_SCENARIO_ID_FRAGMENT = String.raw`(?:${LEGACY_SCENARIO_ID_FRAGMENT}|${PREFIXED_SCENARIO_ID_FRAGMENT})`;
const SCENARIO_ID_RE = new RegExp(
  String.raw`###\s+Scenario\s+(${EXPLICIT_SCENARIO_ID_FRAGMENT})(?=$|[\s:：])`,
  "g",
);
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
  analysisSourceFile: ts.SourceFile;
  literalStringConsts: Map<string, string>;
  typeChecker: ts.TypeChecker | null;
  symbolResolutionCache: Map<string, boolean>;
};

function collectCallbackMetadata(sourceFile: ts.SourceFile): CallbackMetadata {
  const literalStringConsts = new Map<string, string>();
  const program = ts.createProgram([sourceFile.fileName], {
    allowJs: true,
    checkJs: true,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
    strict: false,
    target: ts.ScriptTarget.ES2022,
  });
  const resolvedSourceFile = program.getSourceFile(sourceFile.fileName) ?? sourceFile;
  const typeChecker =
    resolvedSourceFile.fileName === sourceFile.fileName ? program.getTypeChecker() : null;

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const variableName = node.name.text;
      const normalizedInit = unwrapExpression(node.initializer);
      if (ts.isStringLiteral(normalizedInit) || ts.isNoSubstitutionTemplateLiteral(normalizedInit)) {
        literalStringConsts.set(variableName, normalizedInit.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(resolvedSourceFile);
  return {
    analysisSourceFile: resolvedSourceFile,
    literalStringConsts,
    typeChecker,
    symbolResolutionCache: new Map<string, boolean>(),
  };
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
  return isCallableReferenceExpression(normalized, metadata, new Set());
}

function getSymbolCacheKey(symbol: ts.Symbol): string {
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (!declaration) {
    return symbol.name;
  }
  return `${declaration.getSourceFile().fileName}:${declaration.pos}:${symbol.name}`;
}

function resolveAliasedSymbol(
  symbol: ts.Symbol,
  typeChecker: ts.TypeChecker,
): ts.Symbol {
  if ((symbol.flags & ts.SymbolFlags.Alias) === 0) {
    return symbol;
  }
  try {
    return typeChecker.getAliasedSymbol(symbol);
  } catch {
    return symbol;
  }
}

function getCallablePropertySymbol(
  expression: ts.Expression,
  propertyName: string,
  metadata: CallbackMetadata,
): ts.Symbol | null {
  if (!metadata.typeChecker) {
    return null;
  }

  const normalizedExpression = unwrapExpression(expression);
  if (ts.isIdentifier(normalizedExpression)) {
    const baseSymbol = metadata.typeChecker.getSymbolAtLocation(normalizedExpression);
    if (!baseSymbol) {
      return null;
    }
    const resolvedBaseSymbol = resolveAliasedSymbol(baseSymbol, metadata.typeChecker);
    for (const declaration of resolvedBaseSymbol.getDeclarations() ?? []) {
      if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) {
        continue;
      }
      const initializer = unwrapExpression(declaration.initializer);
      if (!ts.isObjectLiteralExpression(initializer)) {
        continue;
      }
      for (const property of initializer.properties) {
        if (ts.isPropertyAssignment(property)) {
          const currentPropertyName =
            ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
              ? property.name.text
              : null;
          if (currentPropertyName === propertyName) {
            const propertySymbol = metadata.typeChecker.getSymbolAtLocation(property.name);
            if (propertySymbol) {
              return resolveAliasedSymbol(propertySymbol, metadata.typeChecker);
            }
          }
        } else if (ts.isMethodDeclaration(property)) {
          const currentPropertyName =
            ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
              ? property.name.text
              : null;
          if (currentPropertyName === propertyName) {
            const propertySymbol = metadata.typeChecker.getSymbolAtLocation(property.name);
            if (propertySymbol) {
              return resolveAliasedSymbol(propertySymbol, metadata.typeChecker);
            }
          }
        } else if (ts.isShorthandPropertyAssignment(property) && property.name.text === propertyName) {
          const propertySymbol = metadata.typeChecker.getShorthandAssignmentValueSymbol(property);
          if (propertySymbol) {
            return resolveAliasedSymbol(propertySymbol, metadata.typeChecker);
          }
        }
      }
    }
  }

  const expressionType = metadata.typeChecker.getTypeAtLocation(normalizedExpression);
  const propertySymbol = expressionType.getProperty(propertyName);
  return propertySymbol ? resolveAliasedSymbol(propertySymbol, metadata.typeChecker) : null;
}

function hasCallableType(
  symbol: ts.Symbol,
  metadata: CallbackMetadata,
): boolean {
  if (!metadata.typeChecker) {
    return false;
  }
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (!declaration) {
    return false;
  }
  const type = metadata.typeChecker.getTypeOfSymbolAtLocation(symbol, declaration);
  return type.getCallSignatures().length > 0;
}

function isSymbolCallable(
  symbol: ts.Symbol,
  metadata: CallbackMetadata,
  seenSymbols: Set<string>,
): boolean {
  if (!metadata.typeChecker) {
    return false;
  }

  const resolvedSymbol = resolveAliasedSymbol(symbol, metadata.typeChecker);
  const cacheKey = getSymbolCacheKey(resolvedSymbol);
  const cached = metadata.symbolResolutionCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  if (seenSymbols.has(cacheKey)) {
    return false;
  }
  seenSymbols.add(cacheKey);

  let hasConcreteValueDeclaration = false;

  for (const declaration of resolvedSymbol.getDeclarations() ?? []) {
    if (
      ts.isFunctionDeclaration(declaration)
      || ts.isMethodDeclaration(declaration)
      || ts.isArrowFunction(declaration)
      || ts.isFunctionExpression(declaration)
    ) {
      metadata.symbolResolutionCache.set(cacheKey, true);
      seenSymbols.delete(cacheKey);
      return true;
    }
    if (ts.isVariableDeclaration(declaration)) {
      hasConcreteValueDeclaration = true;
      if (!declaration.initializer) {
        continue;
      }
      const result = isCallableReferenceExpression(
        declaration.initializer,
        metadata,
        seenSymbols,
      );
      metadata.symbolResolutionCache.set(cacheKey, result);
      seenSymbols.delete(cacheKey);
      return result;
    }
    if (ts.isPropertyAssignment(declaration)) {
      hasConcreteValueDeclaration = true;
      const result = isCallableReferenceExpression(
        declaration.initializer,
        metadata,
        seenSymbols,
      );
      metadata.symbolResolutionCache.set(cacheKey, result);
      seenSymbols.delete(cacheKey);
      return result;
    }
    if (ts.isShorthandPropertyAssignment(declaration)) {
      hasConcreteValueDeclaration = true;
      const shorthandValueSymbol =
        metadata.typeChecker.getShorthandAssignmentValueSymbol(declaration);
      const result = shorthandValueSymbol
        ? isSymbolCallable(shorthandValueSymbol, metadata, seenSymbols)
        : false;
      metadata.symbolResolutionCache.set(cacheKey, result);
      seenSymbols.delete(cacheKey);
      return result;
    }
  }

  const result = !hasConcreteValueDeclaration && hasCallableType(resolvedSymbol, metadata);
  metadata.symbolResolutionCache.set(cacheKey, result);
  seenSymbols.delete(cacheKey);
  return result;
}

function isCallableReferenceExpression(
  expression: ts.Expression,
  metadata: CallbackMetadata,
  seenSymbols: Set<string>,
): boolean {
  const normalized = unwrapExpression(expression);
  if (isExecutableExpression(normalized)) {
    return true;
  }
  if (!metadata.typeChecker) {
    return false;
  }
  if (ts.isIdentifier(normalized)) {
    const symbol = metadata.typeChecker.getSymbolAtLocation(normalized);
    return symbol ? isSymbolCallable(symbol, metadata, seenSymbols) : false;
  }
  if (ts.isPropertyAccessExpression(normalized)) {
    const symbol =
      metadata.typeChecker.getSymbolAtLocation(normalized.name)
      ?? metadata.typeChecker.getSymbolAtLocation(normalized);
    return symbol ? isSymbolCallable(symbol, metadata, seenSymbols) : false;
  }
  if (ts.isElementAccessExpression(normalized)) {
    const propertyName = resolveElementAccessPropertyName(normalized, metadata);
    if (!propertyName) {
      return false;
    }
    const propertySymbol = getCallablePropertySymbol(
      normalized.expression,
      propertyName,
      metadata,
    );
    return propertySymbol ? isSymbolCallable(propertySymbol, metadata, seenSymbols) : false;
  }
  return false;
}

function collectTestTitles(
  content: string,
  filePath: string,
): Array<{ title: string; line: number }> {
  const titles: Array<{ title: string; line: number }> = [];
  const parsedSourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFromPath(filePath),
  );
  const callbackMetadata = collectCallbackMetadata(parsedSourceFile);
  const sourceFile = callbackMetadata.analysisSourceFile;

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

function escapeRegExp(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasScenarioIdToken(title: string, scenarioId: string): boolean {
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9-])${escapeRegExp(scenarioId)}(?=$|[^A-Za-z0-9-])`,
  );
  return pattern.test(title);
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
  const testTitlesByFile = new Map<
    string,
    Array<{ title: string; line: number }>
  >();
  for (const [filePath, content] of testFileContents) {
    testTitlesByFile.set(filePath, collectTestTitles(content, filePath));
  }

  return scenarios.map((scenario) => {
    const exactMatchedFiles: string[] = [];
    const fuzzyMatchedFiles: string[] = [];
    const evidences: MappingEvidence[] = [];
    const keywords = extractKeywords(scenario.title);

    for (const filePath of testFileContents.keys()) {
      const relPath = path.relative(rootDir, filePath);
      const testTitles = testTitlesByFile.get(filePath) ?? [];

      const exactTitle = testTitles.find((entry) =>
        hasScenarioIdToken(entry.title, scenario.id)
      );
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
      derivedCoverageFloor: DEFAULT_DERIVED_COVERAGE_FLOOR,
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
    derivedCoverageFloor:
      parsed.derivedCoverageFloor ?? DEFAULT_DERIVED_COVERAGE_FLOOR,
    updatedAt: parsed.updatedAt,
  };
}

export function writeBaseline(
  explicitUnmappedCount: number,
  derivedUnmappedCount: number = 0,
  rootDir: string = ".",
  derivedCoverageFloor?: number,
): void {
  const baselinePath = path.join(rootDir, BASELINE_PATH);
  const persistedFloor = readBaseline(rootDir).derivedCoverageFloor;
  const effectiveDerivedCoverageFloor =
    derivedCoverageFloor ?? persistedFloor ?? DEFAULT_DERIVED_COVERAGE_FLOOR;
  const data: SpecTestMappingBaseline = {
    count: explicitUnmappedCount,
    explicitUnmappedCount,
    derivedUnmappedCount,
    derivedCoverageFloor: effectiveDerivedCoverageFloor,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(baselinePath, JSON.stringify(data, null, 2) + "\n");
}

type GitDiffRunner = (target: string, rootDir: string) => string;

function defaultGitDiffRunner(target: string, rootDir: string): string {
  return execSync(`git --no-pager diff --name-only --diff-filter=ACMRTUXB ${target}`, {
    cwd: rootDir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function resolveScopePlan(
  rootDir: string,
  gitDiffRunner: GitDiffRunner,
): {
  scopeSpecFiles: string[] | null;
  baselineMode: "primary" | "no-spec-change-fallback" | "exception-fallback";
  fallbackError: string | null;
} {
  const forceAll = process.argv.includes("--all") || process.env.SPEC_TEST_MAP_SCOPE === "all";
  if (forceAll) {
    return {
      scopeSpecFiles: null,
      baselineMode: "primary",
      fallbackError: null,
    };
  }

  const gitDir = path.join(rootDir, ".git");
  if (!existsSync(gitDir)) {
    return {
      scopeSpecFiles: null,
      baselineMode: "primary",
      fallbackError: null,
    };
  }

  const diffTargets = ["origin/main...HEAD", "HEAD~1...HEAD"];
  const errors: string[] = [];
  let sawSuccessfulDiff = false;
  for (const target of diffTargets) {
    try {
      const raw = gitDiffRunner(target, rootDir);
      sawSuccessfulDiff = true;
      if (raw.length === 0) {
        continue;
      }
      const changedSpecFiles = raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.endsWith("spec.md") || line.endsWith(".spec.md"))
        .sort();
      if (changedSpecFiles.length === 0) {
        return {
          scopeSpecFiles: null,
          baselineMode: "no-spec-change-fallback",
          fallbackError: null,
        };
      }
      return {
        scopeSpecFiles: changedSpecFiles,
        baselineMode: "primary",
        fallbackError: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${target}: ${message}`);
      continue;
    }
  }
  if (errors.length > 0 && !sawSuccessfulDiff) {
    return {
      scopeSpecFiles: null,
      baselineMode: "exception-fallback",
      fallbackError: errors.join(" | "),
    };
  }
  return {
    scopeSpecFiles: null,
    baselineMode: "no-spec-change-fallback",
    fallbackError: null,
  };
}

export function runGate(
  rootDir: string = ".",
  options: { gitDiffRunner?: GitDiffRunner } = {},
): SpecTestMappingResult {
  const scopePlan = resolveScopePlan(
    rootDir,
    options.gitDiffRunner ?? defaultGitDiffRunner,
  );
  const useFallbackBaseline = scopePlan.baselineMode !== "primary";
  const scopeSpecFiles = scopePlan.scopeSpecFiles;
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
  const derivedCoverageFloor =
    scopePlan.baselineMode === "primary"
      ? DERIVED_COVERAGE_THRESHOLD
      : baseline.derivedCoverageFloor ?? DEFAULT_DERIVED_COVERAGE_FLOOR;
  const derivedQualityRegressed =
    derivedMappings.length > 0 && derivedCoverage < derivedCoverageFloor;
  const derivedUnmappedOverLimit = derivedUnmapped.length > derivedBaselineLimit;

  return {
    ok:
      explicitUnmapped.length <= baselineLimit &&
      !dilutedBaseline &&
      !derivedUnmappedOverLimit &&
      !dilutedDerivedBaseline &&
      scopePlan.baselineMode !== "exception-fallback" &&
      !derivedQualityRegressed &&
      (!derivedIgnored || scopePlan.baselineMode === "no-spec-change-fallback") &&
      mappings.length > 0,
    scopeMode,
    scopeSpecFiles: scopedSpecFiles,
    usedFallbackBaseline: useFallbackBaseline,
    baselineMode: scopePlan.baselineMode,
    baselineFile,
    fallbackError: scopePlan.fallbackError,
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
    derivedCoverageFloor,
    derivedIgnored,
    derivedQualityRegressed,
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
    console.log(
      `[${GATE_NAME}] baseline strategy: ${result.baselineMode} (${result.baselineFile})`,
    );
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
    `[${GATE_NAME}] derived threshold: coverage >= ${Math.round(result.derivedCoverageFloor * 100)}%, unmapped <= ${result.derivedBaseline}`,
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
    if (result.baselineMode === "exception-fallback") {
      console.log(
        `[${GATE_NAME}] FAIL  exception fallback triggered while resolving diff scope: ${result.fallbackError ?? "unknown error"}`,
      );
      process.exit(1);
    }
    if (result.derivedIgnored && result.baselineMode === "primary") {
      console.log(
        `[${GATE_NAME}] FAIL  derived scenarios are fully unmapped (${result.derivedUnmapped.length}/${result.derivedTotal}).`,
      );
    }
    if (result.derivedUnmappedOverLimit) {
      console.log(
        `[${GATE_NAME}] FAIL  derived-unmapped ${result.derivedUnmapped.length} exceeds baseline ${result.derivedBaseline}.`,
      );
    }
    if (result.derivedQualityRegressed) {
      console.log(
        `[${GATE_NAME}] FAIL  derived coverage ${Math.round(result.derivedCoverage * 100)}% is below required floor ${Math.round(result.derivedCoverageFloor * 100)}% for ${result.baselineMode}.`,
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
