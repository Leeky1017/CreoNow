import assert from "node:assert/strict";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import {
  asIpcMain,
  createIpcHarness,
  createLogger,
  createReplaceDbStub,
} from "./replace-test-harness";

// Scenario Mapping: SR3-R1-S2
{
  const logger = createLogger();
  const db = createReplaceDbStub({
    projectId: "proj_1",
    documents: [
      {
        documentId: "doc_1",
        title: "Chapter One",
        text: "warehouse hero warehouse",
      },
      {
        documentId: "doc_2",
        title: "Chapter Two",
        text: "old warehouse in the rain",
      },
    ],
  });
  const { ipcMain, handlers } = createIpcHarness();

  registerSearchIpcHandlers({
    ipcMain: asIpcMain(ipcMain),
    db,
    logger,
  });

  const preview = handlers.get("search:replace:preview");
  assert.ok(preview, "Missing handler search:replace:preview");
  if (!preview) {
    throw new Error("Missing handler search:replace:preview");
  }

  const execute = handlers.get("search:replace:execute");
  assert.ok(execute, "Missing handler search:replace:execute");
  if (!execute) {
    throw new Error("Missing handler search:replace:execute");
  }

  const blocked = (await execute(
    {},
    {
      projectId: "proj_1",
      scope: "wholeProject",
      query: "warehouse",
      replaceWith: "factory",
      regex: false,
      caseSensitive: false,
      wholeWord: true,
      confirmed: true,
    },
  )) as IpcResponse<unknown>;
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.error.code, "VALIDATION_ERROR");
  }

  const previewRes = (await preview(
    {},
    {
      projectId: "proj_1",
      scope: "wholeProject",
      query: "warehouse",
      replaceWith: "factory",
      regex: false,
      caseSensitive: false,
      wholeWord: true,
    },
  )) as IpcResponse<{
    affectedDocuments: number;
    totalMatches: number;
    previewId: string;
  }>;
  if (!previewRes.ok) {
    throw new Error(previewRes.error.message);
  }
  assert.equal(previewRes.data.affectedDocuments, 2);
  assert.equal(previewRes.data.totalMatches, 3);
  assert.ok(previewRes.data.previewId.length > 0);

  const executeRes = (await execute(
    {},
    {
      projectId: "proj_1",
      scope: "wholeProject",
      query: "warehouse",
      replaceWith: "factory",
      regex: false,
      caseSensitive: false,
      wholeWord: true,
      previewId: previewRes.data.previewId,
      confirmed: true,
    },
  )) as IpcResponse<{
    replacedCount: number;
    affectedDocumentCount: number;
  }>;
  if (!executeRes.ok) {
    throw new Error(executeRes.error.message);
  }
  assert.equal(executeRes.data.replacedCount, 3);
  assert.equal(executeRes.data.affectedDocumentCount, 2);
}
