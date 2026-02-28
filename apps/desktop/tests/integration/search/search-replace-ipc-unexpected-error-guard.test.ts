import assert from "node:assert/strict";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import type { Logger } from "../../../main/src/logging/logger";
import {
  asIpcMain,
  createIpcHarness,
  createReplaceDbStub,
} from "./replace-test-harness";

type LoggedError = {
  event: string;
  payload: unknown;
};

function createErrorCollectingLogger(loggedErrors: LoggedError[]): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: (event, payload) => {
      loggedErrors.push({ event, payload });
    },
  };
}

function createExplodingTrimError(message: string): string {
  return {
    trim: () => {
      throw new Error(message);
    },
  } as unknown as string;
}

{
  const loggedErrors: LoggedError[] = [];
  const logger = createErrorCollectingLogger(loggedErrors);
  const db = createReplaceDbStub({
    projectId: "proj_1",
    documents: [
      {
        documentId: "doc_1",
        title: "Chapter One",
        text: "warehouse hero warehouse",
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

  const previewRes = (await preview(
    {},
    {
      projectId: "proj_1",
      scope: "wholeProject",
      query: createExplodingTrimError("preview query trim exploded"),
      replaceWith: "factory",
    },
  )) as IpcResponse<unknown>;

  assert.equal(previewRes.ok, false);
  if (!previewRes.ok) {
    assert.equal(previewRes.error.code, "INTERNAL_ERROR");
    assert.equal(previewRes.error.message, "Internal error");
  }

  const execute = handlers.get("search:replace:execute");
  assert.ok(execute, "Missing handler search:replace:execute");
  if (!execute) {
    throw new Error("Missing handler search:replace:execute");
  }

  const executeRes = (await execute(
    {},
    {
      projectId: "proj_1",
      documentId: "doc_1",
      scope: "currentDocument",
      query: createExplodingTrimError("execute query trim exploded"),
      replaceWith: "factory",
    },
  )) as IpcResponse<unknown>;

  assert.equal(executeRes.ok, false);
  if (!executeRes.ok) {
    assert.equal(executeRes.error.code, "INTERNAL_ERROR");
    assert.equal(executeRes.error.message, "Internal error");
  }

  const errorEvents = loggedErrors.map((item) => item.event);
  assert.ok(errorEvents.includes("search_replace_preview_exception"));
  assert.ok(errorEvents.includes("search_replace_execute_exception"));

  const previewException = loggedErrors.find(
    (item) => item.event === "search_replace_preview_exception",
  );
  const executeException = loggedErrors.find(
    (item) => item.event === "search_replace_execute_exception",
  );

  assert.deepEqual(previewException?.payload, {
    message: "preview query trim exploded",
  });
  assert.deepEqual(executeException?.payload, {
    message: "execute query trim exploded",
  });
}
