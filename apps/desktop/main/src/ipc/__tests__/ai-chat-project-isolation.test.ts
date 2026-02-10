import assert from "node:assert/strict";

import type { IpcMain } from "electron";

import type { Logger } from "../../logging/logger";
import { registerAiIpcHandlers } from "../ai";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

const handlers = new Map<string, Handler>();
const ipcMain = {
  handle: (channel: string, listener: Handler) => {
    handlers.set(channel, listener);
  },
} as unknown as IpcMain;

registerAiIpcHandlers({
  ipcMain,
  db: null,
  userDataDir: "<test-user-data>",
  builtinSkillsDir: "<test-skills>",
  logger: createLogger(),
  env: process.env,
});

const chatSend = handlers.get("ai:chat:send");
const chatList = handlers.get("ai:chat:list");
const chatClear = handlers.get("ai:chat:clear");

assert.ok(chatSend, "expected ai:chat:send handler to be registered");
assert.ok(chatList, "expected ai:chat:list handler to be registered");
assert.ok(chatClear, "expected ai:chat:clear handler to be registered");

const projectA = "project-a";
const projectB = "project-b";

const sendA = (await chatSend?.(
  {},
  {
    projectId: projectA,
    message: "Message from A",
  },
)) as {
  ok: boolean;
};
assert.equal(sendA.ok, true);

const sendB = (await chatSend?.(
  {},
  {
    projectId: projectB,
    message: "Message from B",
  },
)) as {
  ok: boolean;
};
assert.equal(sendB.ok, true);

const listA = (await chatList?.(
  {},
  {
    projectId: projectA,
  },
)) as {
  ok: boolean;
  data?: { items: Array<{ content: string; projectId: string }> };
};

assert.equal(listA.ok, true);
assert.equal(
  listA.data?.items.length,
  1,
  "project A should only see its own chat history",
);
assert.equal(listA.data?.items[0]?.projectId, projectA);
assert.equal(listA.data?.items[0]?.content, "Message from A");

const clearA = (await chatClear?.(
  {},
  {
    projectId: projectA,
  },
)) as {
  ok: boolean;
};
assert.equal(clearA.ok, true);

const listAAfterClear = (await chatList?.(
  {},
  {
    projectId: projectA,
  },
)) as {
  ok: boolean;
  data?: { items: Array<{ content: string; projectId: string }> };
};
assert.equal(listAAfterClear.ok, true);
assert.equal(
  listAAfterClear.data?.items.length,
  0,
  "project A history should be empty after clear",
);

const listBAfterClearA = (await chatList?.(
  {},
  {
    projectId: projectB,
  },
)) as {
  ok: boolean;
  data?: { items: Array<{ content: string; projectId: string }> };
};
assert.equal(listBAfterClearA.ok, true);
assert.equal(
  listBAfterClearA.data?.items.length,
  1,
  "project B history should not be cleared by project A operation",
);
assert.equal(listBAfterClearA.data?.items[0]?.projectId, projectB);
assert.equal(listBAfterClearA.data?.items[0]?.content, "Message from B");
