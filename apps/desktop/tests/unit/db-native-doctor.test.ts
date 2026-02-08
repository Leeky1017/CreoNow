import assert from "node:assert/strict";

import {
  REBUILD_NATIVE_COMMAND,
  createDbInitIpcError,
  diagnoseDbInitFailure,
} from "../../main/src/db/nativeDoctor";

{
  const diagnosed = diagnoseDbInitFailure(
    "The module was compiled against a different Node.js version using NODE_MODULE_VERSION 141. This version of Node.js requires NODE_MODULE_VERSION 143.",
  );

  assert.equal(diagnosed.category, "native_module_abi_mismatch");
  assert.equal(diagnosed.remediation.command, REBUILD_NATIVE_COMMAND);
  assert.equal(diagnosed.remediation.restartRequired, true);
}

{
  const diagnosed = diagnoseDbInitFailure(
    "Could not locate the bindings file. Tried: ... better_sqlite3.node",
  );

  assert.equal(diagnosed.category, "native_module_missing_binding");
  assert.equal(diagnosed.remediation.command, REBUILD_NATIVE_COMMAND);
}

{
  const diagnosed = diagnoseDbInitFailure("database is locked");
  assert.equal(diagnosed.category, "db_init_failed");
}

{
  const error = createDbInitIpcError(
    "compiled against a different Node.js version using NODE_MODULE_VERSION 141",
  );

  assert.equal(error.code, "DB_ERROR");
  assert.equal(
    error.message.includes("rebuild:native") ||
      error.message.includes("rebuild native"),
    true,
  );
  assert.equal(
    (error.details as { category?: string } | undefined)?.category,
    "native_module_abi_mismatch",
  );
}

