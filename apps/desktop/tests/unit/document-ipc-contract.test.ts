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
    "version:branch:create",
    "version:branch:list",
    "version:branch:switch",
    "version:branch:merge",
    "version:conflict:resolve",
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
 * P4 contract: hardening error codes must be present.
 */
{
  const errorCodes = ipcContract.errorCodes as readonly string[];
  const required = [
    "VERSION_SNAPSHOT_COMPACTED",
    "VERSION_DIFF_PAYLOAD_TOO_LARGE",
    "VERSION_ROLLBACK_CONFLICT",
  ] as const;
  for (const code of required) {
    assert.equal(
      errorCodes.includes(code),
      true,
      `missing hardening error code: ${code}`,
    );
  }
}

/**
 * P3 contract: branch merge/conflict channels must exist with core fields.
 */
{
  const channels = ipcContract.channels as unknown as Record<
    string,
    { request: unknown; response: unknown }
  >;

  const createReq = asObjectSchema(channels["version:branch:create"]?.request);
  assert.equal(
    Object.prototype.hasOwnProperty.call(createReq.fields, "documentId"),
    true,
    "version:branch:create request should include documentId",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(createReq.fields, "name"),
    true,
    "version:branch:create request should include name",
  );

  const listReq = asObjectSchema(channels["version:branch:list"]?.request);
  assert.equal(
    Object.prototype.hasOwnProperty.call(listReq.fields, "documentId"),
    true,
    "version:branch:list request should include documentId",
  );

  const switchReq = asObjectSchema(channels["version:branch:switch"]?.request);
  assert.equal(
    Object.prototype.hasOwnProperty.call(switchReq.fields, "documentId"),
    true,
    "version:branch:switch request should include documentId",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(switchReq.fields, "name"),
    true,
    "version:branch:switch request should include name",
  );

  const mergeReq = asObjectSchema(channels["version:branch:merge"]?.request);
  assert.equal(
    Object.prototype.hasOwnProperty.call(mergeReq.fields, "documentId"),
    true,
    "version:branch:merge request should include documentId",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(mergeReq.fields, "sourceBranchName"),
    true,
    "version:branch:merge request should include sourceBranchName",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(mergeReq.fields, "targetBranchName"),
    true,
    "version:branch:merge request should include targetBranchName",
  );

  const resolveReq = asObjectSchema(
    channels["version:conflict:resolve"]?.request,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(resolveReq.fields, "documentId"),
    true,
    "version:conflict:resolve request should include documentId",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(resolveReq.fields, "mergeSessionId"),
    true,
    "version:conflict:resolve request should include mergeSessionId",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(resolveReq.fields, "resolutions"),
    true,
    "version:conflict:resolve request should include resolutions",
  );
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

  const createRes = asObjectSchema(
    channels["version:snapshot:create"]?.response,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(createRes.fields, "compaction"),
    true,
    "version:snapshot:create response should include optional compaction event",
  );

  const saveRes = asObjectSchema(channels["file:document:save"]?.response);
  assert.equal(
    Object.prototype.hasOwnProperty.call(saveRes.fields, "compaction"),
    true,
    "file:document:save response should include optional compaction event",
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
