import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const require = createRequire(import.meta.url);
const { Linter } = require("eslint") as {
  Linter: new () => {
    verify: (
      source: string,
      config: {
        parserOptions: { ecmaVersion: number; sourceType: "module" };
        rules: Record<string, unknown>;
      },
    ) => unknown[];
  };
};

function collectNoRestrictedSyntaxEntries(): unknown[] {
  const eslintConfig = require(path.join(repoRoot, ".eslintrc.cjs")) as {
    rules?: Record<string, unknown>;
    overrides?: Array<{ rules?: Record<string, unknown> }>;
  };

  const entries: unknown[] = [];
  const pushEntries = (value: unknown): void => {
    if (!Array.isArray(value) || value.length < 2) {
      return;
    }
    for (const item of value.slice(1)) {
      entries.push(item);
    }
  };

  pushEntries(eslintConfig.rules?.["no-restricted-syntax"]);
  for (const override of eslintConfig.overrides ?? []) {
    pushEntries(override.rules?.["no-restricted-syntax"]);
  }
  return entries;
}

const restrictedEntries = collectNoRestrictedSyntaxEntries();

// C1C-S1: renderer must define lint guard against bare void async IIFE [ADDED]
assert.ok(
  restrictedEntries.length > 0,
  "expected no-restricted-syntax entries for fire-and-forget guard",
);

const hasVoidAsyncIifeSelector = restrictedEntries.some((entry) => {
  if (typeof entry === "string") {
    return (
      entry.includes("UnaryExpression") &&
      entry.includes("operator='void'") &&
      entry.includes("CallExpression")
    );
  }
  if (typeof entry !== "object" || entry === null) {
    return false;
  }
  const selector = (entry as { selector?: unknown }).selector;
  return (
    typeof selector === "string" &&
    selector.includes("UnaryExpression") &&
    selector.includes("operator='void'") &&
    selector.includes("CallExpression")
  );
});

assert.equal(
  hasVoidAsyncIifeSelector,
  true,
  "expected selector that blocks bare `void (async () => ...)()`",
);

const linter = new Linter();
const messages = linter.verify(
  "void (async () => { await Promise.resolve(); })();",
  {
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    rules: {
      "no-restricted-syntax": ["error", ...restrictedEntries],
    },
  },
);

// C1C-S2: guard should reject bare async fire-and-forget entrypoint [ADDED]
assert.ok(
  messages.length > 0,
  "expected lint violation for bare void async IIFE",
);
