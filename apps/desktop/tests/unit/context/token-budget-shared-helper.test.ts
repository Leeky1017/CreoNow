import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const layerAssemblySource = readFileSync(
  path.resolve(
    import.meta.dirname,
    "../../../main/src/services/context/layerAssemblyService.ts",
  ),
  "utf8",
);
const contextAssemblerSource = readFileSync(
  path.resolve(
    import.meta.dirname,
    "../../../renderer/src/lib/ai/contextAssembler.ts",
  ),
  "utf8",
);
const ragServiceSource = readFileSync(
  path.resolve(
    import.meta.dirname,
    "../../../main/src/services/rag/ragService.ts",
  ),
  "utf8",
);

// S1: token estimation/truncation must use shared helper to avoid cross-layer drift [ADDED]
for (const [name, source] of [
  ["layerAssemblyService", layerAssemblySource],
  ["contextAssembler", contextAssemblerSource],
  ["ragService", ragServiceSource],
] as const) {
  assert.match(
    source,
    /@shared\/tokenBudget/,
    `${name} should import shared tokenBudget helper`,
  );
}

assert.doesNotMatch(
  layerAssemblySource,
  /function estimateTokenCount\(/,
  "layerAssemblyService should not define private token estimator",
);
assert.doesNotMatch(
  contextAssemblerSource,
  /function estimateTokens\(/,
  "contextAssembler should not define private token estimator",
);
assert.doesNotMatch(
  ragServiceSource,
  /function estimateTokens\(/,
  "ragService should not define private token estimator",
);
