import assert from "node:assert/strict";
import type { IpcErrorCode } from "@shared/types/ipc-generated";
import { ipcOk, ipcError } from "../ipcResult";

// ---------------------------------------------------------------------------
// S1: ipcOk wraps data correctly
// ---------------------------------------------------------------------------
{
  const result = ipcOk(42);
  assert.equal(result.ok, true);
  assert.equal(result.data, 42);

  const objResult = ipcOk({ name: "test" });
  assert.equal(objResult.ok, true);
  assert.deepStrictEqual(objResult.data, { name: "test" });
}

// ---------------------------------------------------------------------------
// S2: ipcError creates correct error structure
// ---------------------------------------------------------------------------
{
  const code: IpcErrorCode = "INTERNAL_ERROR";
  const result = ipcError(code, "something broke", { extra: 1 });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "INTERNAL_ERROR");
  assert.equal(result.error.message, "something broke");
  assert.deepStrictEqual(result.error.details, { extra: 1 });
  assert.equal(result.error.traceId, undefined);
  assert.equal(result.error.retryable, undefined);
}

// ---------------------------------------------------------------------------
// S3: ipcError with traceId and retryable options
// ---------------------------------------------------------------------------
{
  const code: IpcErrorCode = "INTERNAL_ERROR";
  const result = ipcError(code, "transient", undefined, {
    traceId: "trace-123",
    retryable: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.traceId, "trace-123");
  assert.equal(result.error.retryable, true);

  // retryable=false should also be included
  const result2 = ipcError(code, "permanent", undefined, {
    retryable: false,
  });
  assert.equal(result2.error.retryable, false);
  assert.equal(result2.error.traceId, undefined);
}

console.log("ipcResult.test.ts: all assertions passed");
