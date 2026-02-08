import assert from "node:assert/strict";

import { validateIpcScenarioTestMapping } from "../../../../scripts/ipc-testability-mapping-gate";

// S4: 场景映射缺失触发门禁失败 [ADDED]
// should fail when scenario id has no mapped test case
{
  const result = validateIpcScenarioTestMapping({
    scenarios: ["S1", "S2", "S3", "S4"],
    mappedScenarios: ["S1", "S2", "S3"],
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("expected mapping failure");
  }
  assert.deepEqual(result.missingScenarioIds, ["S4"]);
}
