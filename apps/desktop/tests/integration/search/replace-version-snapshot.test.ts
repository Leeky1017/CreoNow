import assert from "node:assert/strict";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import {
  asIpcMain,
  createIpcHarness,
  createLogger,
  createReplaceDbStub,
} from "./replace-test-harness";

// Scenario Mapping: SR3-R1-S3
{
  const logger = createLogger();
  const db = createReplaceDbStub({
    projectId: "proj_1",
    documents: [
      {
        documentId: "doc_1",
        title: "Chapter One",
        text: "warehouse and warehouse",
      },
      {
        documentId: "doc_2",
        title: "Chapter Two",
        text: "warehouse remains here",
      },
    ],
    failSnapshotForDocumentIds: ["doc_2"],
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
    previewId: string;
  }>;
  if (!previewRes.ok) {
    throw new Error(previewRes.error.message);
  }

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
    snapshotIds: string[];
    skipped: Array<{ documentId: string; reason: string }>;
  }>;

  if (!executeRes.ok) {
    throw new Error(executeRes.error.message);
  }

  assert.equal(executeRes.data.replacedCount, 2);
  assert.equal(executeRes.data.affectedDocumentCount, 1);
  assert.equal(executeRes.data.snapshotIds.length, 1);
  assert.equal(executeRes.data.skipped.length, 1);
  assert.equal(executeRes.data.skipped[0]?.documentId, "doc_2");
  assert.equal(executeRes.data.skipped[0]?.reason, "SNAPSHOT_FAILED");

  assert.equal(db.readDocument("doc_1")?.contentText, "factory and factory");
  assert.equal(db.readDocument("doc_2")?.contentText, "warehouse remains here");

  const doc1Versions = db.listVersions("doc_1");
  assert.equal(doc1Versions.length, 2);
  assert.equal(doc1Versions[0]?.reason, "pre-search-replace");
  assert.equal(doc1Versions[1]?.reason, "search-replace");
}
