import assert from "node:assert/strict";

import type { MemoryService } from "../../memory/memoryService";
import { createSettingsFetcher } from "../fetchers/settingsFetcher";

const BASE_REQUEST = {
  projectId: "proj-memory-injection",
  documentId: "doc-1",
  cursorPosition: 8,
  skillId: "continue-writing",
};

// Scenario: MS-S2-MI-S2
// should degrade with warning marker when preview returns empty memory items
{
  const previewInjection: MemoryService["previewInjection"] = () => ({
    ok: true,
    data: {
      mode: "deterministic",
      items: [],
    },
  });

  const fetcher = createSettingsFetcher({
    memoryService: {
      previewInjection,
    },
  });

  const result = await fetcher(BASE_REQUEST);

  assert.deepEqual(result.chunks, []);
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(result.warnings?.[0]?.includes("MEMORY_DEGRADED"), true);
}

// Scenario: MS-S2-MI-S2
// should degrade with MEMORY_UNAVAILABLE marker when preview throws
{
  const previewInjection: MemoryService["previewInjection"] = () => {
    throw new Error("db locked");
  };

  const fetcher = createSettingsFetcher({
    memoryService: {
      previewInjection,
    },
  });

  const result = await fetcher(BASE_REQUEST);

  assert.deepEqual(result.chunks, []);
  assert.equal(result.warnings?.[0]?.includes("MEMORY_UNAVAILABLE"), true);
}

console.log("settingsFetcher.memoryInjection.test.ts: all assertions passed");
