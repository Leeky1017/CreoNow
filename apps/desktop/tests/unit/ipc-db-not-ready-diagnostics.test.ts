import assert from "node:assert/strict";

import { createDbNotReadyErrorFromInitError } from "../../main/src/ipc/dbError";

{
  const err = createDbNotReadyErrorFromInitError(null);
  assert.equal(err.code, "DB_ERROR");
  assert.equal(err.message, "Database not ready");
}

{
  const source = {
    code: "DB_ERROR" as const,
    message:
      "Database native module ABI mismatch. Run pnpm -C apps/desktop rebuild:native and restart app.",
    details: {
      category: "native_module_abi_mismatch",
      remediation: {
        command: "pnpm -C apps/desktop rebuild:native",
        restartRequired: true,
      },
    },
  };

  const err = createDbNotReadyErrorFromInitError(source);
  assert.equal(err.code, "DB_ERROR");
  assert.equal(err.message, source.message);
  assert.deepEqual(err.details, source.details);
}

