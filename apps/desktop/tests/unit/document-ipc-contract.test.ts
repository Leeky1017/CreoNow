import assert from "node:assert/strict";

import { ipcContract } from "../../main/src/ipc/contract/ipc-contract";

type IpcChannelMap = Record<string, unknown>;
type ObjectSchema = { kind: "object"; fields: Record<string, unknown> };

function asObjectSchema(value: unknown): ObjectSchema {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as { kind?: string }).kind !== "object"
  ) {
    throw new Error("expected object schema");
  }
  return value as ObjectSchema;
}

/**
 * S1: CRUD IPC channels match P0 baseline naming and remove legacy aliases.
 */
{
  const channels = Object.keys(ipcContract.channels as IpcChannelMap);
  const required = [
    "file:document:create",
    "file:document:read",
    "file:document:update",
    "file:document:save",
    "file:document:delete",
    "file:document:list",
    "file:document:getcurrent",
    "file:document:reorder",
    "file:document:updatestatus",
  ] as const;
  const legacy = ["file:document:rename", "file:document:write"] as const;

  for (const channel of required) {
    assert.equal(
      channels.includes(channel),
      true,
      `missing required channel: ${channel}`,
    );
  }

  for (const channel of legacy) {
    assert.equal(
      channels.includes(channel),
      false,
      `legacy channel should be removed: ${channel}`,
    );
  }
}

/**
 * S1/S3: create/list/read contract includes document type + status fields.
 */
{
  const channels = ipcContract.channels as unknown as Record<
    string,
    { request: unknown; response: unknown }
  >;

  const createReq = asObjectSchema(channels["file:document:create"]?.request);
  assert.equal(
    Object.prototype.hasOwnProperty.call(createReq.fields, "type"),
    true,
    "create request should accept optional type",
  );

  const listRes = asObjectSchema(channels["file:document:list"]?.response);
  const itemsSchema = listRes.fields.items as { kind: "array"; element: unknown };
  assert.equal(itemsSchema.kind, "array");
  const itemObject = asObjectSchema(itemsSchema.element);
  assert.equal(
    Object.prototype.hasOwnProperty.call(itemObject.fields, "type"),
    true,
    "list item should include type",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(itemObject.fields, "status"),
    true,
    "list item should include status",
  );
}

console.log("document-ipc-contract.test.ts: all assertions passed");
