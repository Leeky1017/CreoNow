import assert from "node:assert/strict";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import {
  asIpcMain,
  createIpcHarness,
  createLogger,
  createReplaceDbStub,
} from "./replace-test-harness";

// Scenario Mapping: SR3-R1-S1
{
  const logger = createLogger();
  const db = createReplaceDbStub({
    projectId: "proj_1",
    documents: [
      {
        documentId: "doc_1",
        title: "Chapter One",
        text: "hero and hero at the gate",
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

  const previewRes = (await preview({}, {
    projectId: "proj_1",
    documentId: "doc_1",
    scope: "currentDocument",
    query: "hero",
    replaceWith: "mage",
    regex: false,
    caseSensitive: true,
    wholeWord: false,
  })) as IpcResponse<{
    affectedDocuments: number;
    totalMatches: number;
  }>;
  if (!previewRes.ok) {
    throw new Error(previewRes.error.message);
  }
  assert.equal(previewRes.data.affectedDocuments, 1);
  assert.equal(previewRes.data.totalMatches, 2);

  const executeRes = (await execute({}, {
    projectId: "proj_1",
    documentId: "doc_1",
    scope: "currentDocument",
    query: "hero",
    replaceWith: "mage",
    regex: false,
    caseSensitive: true,
    wholeWord: false,
  })) as IpcResponse<{
    replacedCount: number;
    affectedDocumentCount: number;
    snapshotIds: string[];
    skipped: unknown[];
  }>;

  if (!executeRes.ok) {
    throw new Error(executeRes.error.message);
  }
  assert.equal(executeRes.data.replacedCount, 2);
  assert.equal(executeRes.data.affectedDocumentCount, 1);
  assert.equal(executeRes.data.snapshotIds.length, 0);
  assert.equal(executeRes.data.skipped.length, 0);

  const updated = db.readDocument("doc_1");
  assert.ok(updated);
  assert.equal(updated?.contentText, "mage and mage at the gate");
}
