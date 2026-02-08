import assert from "node:assert/strict";

import { formatDbErrorDescription } from "./AiPanel";

{
  const text = formatDbErrorDescription({
    message: "Database native module ABI mismatch.",
    details: {
      category: "native_module_abi_mismatch",
      remediation: {
        command: "pnpm -C apps/desktop rebuild:native",
        restartRequired: true,
      },
    },
  });

  assert.equal(text.includes("rebuild:native"), true);
  assert.equal(text.includes("restart the app"), true);
}

{
  const text = formatDbErrorDescription({
    message: "Database not ready",
    details: undefined,
  });

  assert.equal(text, "Database not ready");
}

