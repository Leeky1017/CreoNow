import assert from "node:assert/strict";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import {
  asIpcMain,
  createIpcHarness,
  createLogger,
  createReplaceDbStub,
} from "./replace-test-harness";

// Scenario Mapping: SR5-R2-S3
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
    ],
    conflictOnUpdateDocumentIds: ["doc_1"],
  });
  const { ipcMain, handlers } = createIpcHarness();

  registerSearchIpcHandlers({
    ipcMain: asIpcMain(ipcMain),
    db,
    logger,
  });

  const execute = handlers.get("search:replace:execute");
  assert.ok(execute, "Missing handler search:replace:execute");
  if (!execute) {
    throw new Error("Missing handler search:replace:execute");
  }

  const response = (await execute(
    {},
    {
      projectId: "proj_1",
      scope: "currentDocument",
      documentId: "doc_1",
      query: "warehouse",
      replaceWith: "factory",
      regex: false,
      caseSensitive: false,
      wholeWord: true,
    },
  )) as IpcResponse<unknown>;

  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, "SEARCH_CONCURRENT_WRITE_CONFLICT");
  }
}
