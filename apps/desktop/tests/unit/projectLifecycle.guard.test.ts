import assert from "node:assert/strict";

import {
  evaluateLifecycleTransition,
  type ProjectLifecycleState,
} from "../../main/src/services/projects/projectLifecycleStateMachine";

/**
 * PM2-S6
 * should reject active->deleted transition with PROJECT_DELETE_REQUIRES_ARCHIVE
 */
function main(): void {
  const from: ProjectLifecycleState = "active";
  const to: ProjectLifecycleState = "deleted";

  const res = evaluateLifecycleTransition({
    from,
    to,
    traceId: "trace-guard-test",
  });

  assert.equal(res.ok, false);
  if (res.ok) {
    throw new Error("expected guard rejection for active->deleted");
  }

  assert.equal(res.error.code, "PROJECT_DELETE_REQUIRES_ARCHIVE");
}

main();
