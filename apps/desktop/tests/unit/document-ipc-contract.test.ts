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
    "version:snapshot:create",
    "version:snapshot:list",
    "version:snapshot:read",
    "version:snapshot:diff",
    "version:snapshot:rollback",
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
 * P2 contract: version:snapshot:diff and version:snapshot:rollback schemas must exist.
 */
{
  const channels = ipcContract.channels as unknown as Record<
    string,
    { request: unknown; response: unknown }
  >;

  const diffReq = asObjectSchema(channels["version:snapshot:diff"]?.request);
  assert.equal(
    Object.prototype.hasOwnProperty.call(diffReq.fields, "documentId"),
    true,
    "version:snapshot:diff request should include documentId",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(diffReq.fields, "baseVersionId"),
    true,
    "version:snapshot:diff request should include baseVersionId",
  );

  const diffRes = asObjectSchema(channels["version:snapshot:diff"]?.response);
  assert.equal(
    Object.prototype.hasOwnProperty.call(diffRes.fields, "diffText"),
    true,
    "version:snapshot:diff response should include diffText",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(diffRes.fields, "hasDifferences"),
    true,
    "version:snapshot:diff response should include hasDifferences",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(diffRes.fields, "stats"),
    true,
    "version:snapshot:diff response should include stats",
  );

  const rollbackReq = asObjectSchema(
    channels["version:snapshot:rollback"]?.request,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(rollbackReq.fields, "documentId"),
    true,
    "version:snapshot:rollback request should include documentId",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(rollbackReq.fields, "versionId"),
    true,
    "version:snapshot:rollback request should include versionId",
  );

  const rollbackRes = asObjectSchema(
    channels["version:snapshot:rollback"]?.response,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(rollbackRes.fields, "restored"),
    true,
    "version:snapshot:rollback response should include restored",
  );
}

/**
 * Snapshot contract: must expose create channel + wordCount in list/read payloads.
 */
{
  const channels = ipcContract.channels as unknown as Record<
    string,
    { request: unknown; response: unknown }
  >;

  const createReq = asObjectSchema(
    channels["version:snapshot:create"]?.request,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(createReq.fields, "documentId"),
    true,
    "version:snapshot:create request should include documentId",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(createReq.fields, "contentJson"),
    true,
    "version:snapshot:create request should include contentJson",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(createReq.fields, "actor"),
    true,
    "version:snapshot:create request should include actor",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(createReq.fields, "reason"),
    true,
    "version:snapshot:create request should include reason",
  );

  const listRes = asObjectSchema(channels["version:snapshot:list"]?.response);
  const listItems = listRes.fields.items as { kind: "array"; element: unknown };
  assert.equal(listItems.kind, "array");
  const listItem = asObjectSchema(listItems.element);
  assert.equal(
    Object.prototype.hasOwnProperty.call(listItem.fields, "wordCount"),
    true,
    "version list item should include wordCount",
  );

  const readRes = asObjectSchema(channels["version:snapshot:read"]?.response);
  assert.equal(
    Object.prototype.hasOwnProperty.call(readRes.fields, "wordCount"),
    true,
    "version read response should include wordCount",
  );
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
  const itemsSchema = listRes.fields.items as {
    kind: "array";
    element: unknown;
  };
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
