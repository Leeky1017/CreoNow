import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { hashJson, hashText, sha256Hex } from "@shared/hashUtils";
import { estimateUtf8TokenCount } from "@shared/tokenBudget";
import { nowTs } from "@shared/timeUtils";

type Hit = {
  file: string;
  line: number;
  text: string;
};

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../../../../../..");
const MAIN_SRC_ROOT = path.resolve(PROJECT_ROOT, "apps/desktop/main/src");
const PRELOAD_SRC_ROOT = path.resolve(PROJECT_ROOT, "apps/desktop/preload/src");
const AI_SERVICE_FILE = path.resolve(
  PROJECT_ROOT,
  "apps/desktop/main/src/services/ai/aiService.ts",
);
const SKILL_VALIDATOR_FILE = path.resolve(
  PROJECT_ROOT,
  "apps/desktop/main/src/services/skills/skillValidator.ts",
);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".worktrees"
    ) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") {
        continue;
      }
      out.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && /\.ts$/u.test(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
}

function scan(args: { roots: string[]; pattern: RegExp }): Hit[] {
  const hits: Hit[] = [];
  for (const root of args.roots) {
    for (const file of walk(root)) {
      const text = readFileSync(file, "utf8");
      const lines = text.split(/\r?\n/u);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? "";
        if (args.pattern.test(line)) {
          hits.push({
            file,
            line: i + 1,
            text: line.trim(),
          });
        }
      }
    }
  }
  return hits;
}

function formatHits(hits: Hit[]): string {
  if (hits.length === 0) {
    return "";
  }
  return hits
    .map((hit) => {
      const relative = path.relative(PROJECT_ROOT, hit.file);
      return `${relative}:${String(hit.line)} -> ${hit.text}`;
    })
    .join("\n");
}

function expectedSha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function expectedLegacyEstimate(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(Buffer.byteLength(text, "utf8") / 4));
}

function main(): void {
  const nowTsDefinitionHits = scan({
    roots: [MAIN_SRC_ROOT, PRELOAD_SRC_ROOT],
    pattern: /\b(function|const)\s+nowTs\b/u,
  });
  assert.equal(
    nowTsDefinitionHits.length,
    0,
    `AUD-C5-S1/AUD-C5-S8: local nowTs definitions must be zero\n${formatHits(nowTsDefinitionHits)}`,
  );

  const before = Date.now();
  const ts = nowTs();
  const after = Date.now();
  assert.equal(
    ts >= before && ts <= after,
    true,
    "AUD-C5-S2: shared nowTs should stay consistent with Date.now",
  );

  const estimateDefinitionHits = scan({
    roots: [MAIN_SRC_ROOT],
    pattern: /\bfunction\s+(estimateTokenCount|estimateMessageTokens)\s*\(/u,
  });
  assert.equal(
    estimateDefinitionHits.length,
    0,
    `AUD-C5-S3: local estimateTokenCount/estimateMessageTokens definitions must be zero\n${formatHits(estimateDefinitionHits)}`,
  );

  const estimateSamples = ["", "hello world", "你好，世界", "emoji🙂text"];
  for (const sample of estimateSamples) {
    assert.equal(
      estimateUtf8TokenCount(sample),
      expectedLegacyEstimate(sample),
      `AUD-C5-S4: estimateUtf8TokenCount should stay consistent for sample '${sample}'`,
    );
  }

  const hashDefinitionHits = scan({
    roots: [MAIN_SRC_ROOT],
    pattern: /\bfunction\s+(hashJson|sha256Hex|hashText)\s*\(/u,
  });
  assert.equal(
    hashDefinitionHits.length,
    0,
    `AUD-C5-S5/AUD-C5-S8: local hash function definitions must be zero\n${formatHits(hashDefinitionHits)}`,
  );

  const hashSample = '{"a":1,"b":"x"}';
  assert.equal(
    sha256Hex(hashSample),
    expectedSha256Hex(hashSample),
    "AUD-C5-S5: sha256Hex behavior must stay unchanged",
  );
  assert.equal(
    hashText(hashSample),
    expectedSha256Hex(hashSample),
    "AUD-C5-S5: hashText behavior must stay unchanged",
  );
  assert.equal(
    hashJson(hashSample),
    expectedSha256Hex(hashSample),
    "AUD-C5-S5: hashJson behavior must stay unchanged",
  );

  const aiServiceSource = readFileSync(AI_SERVICE_FILE, "utf8");
  assert.match(
    aiServiceSource,
    /max_tokens\s*:\s*DEFAULT_REQUEST_MAX_TOKENS_ESTIMATE/u,
    "AUD-C5-S6: aiService max_tokens should reference DEFAULT_REQUEST_MAX_TOKENS_ESTIMATE",
  );
  assert.doesNotMatch(
    aiServiceSource,
    /max_tokens\s*:\s*256/u,
    "AUD-C5-S6: aiService max_tokens should not use literal 256",
  );

  const skillValidatorSource = readFileSync(SKILL_VALIDATOR_FILE, "utf8");
  assert.match(
    skillValidatorSource,
    /MAX_SKILL_TIMEOUT_MS/u,
    "AUD-C5-S7: skillValidator should reference MAX_SKILL_TIMEOUT_MS",
  );
  assert.doesNotMatch(
    skillValidatorSource,
    /120000/u,
    "AUD-C5-S7: skillValidator should not use literal 120000",
  );

  console.log(
    "shared-runtime-utils-unification.guard.test.ts: all assertions passed",
  );
}

main();
