import assert from "node:assert/strict";

import type { IpcMain } from "electron";

import type { Logger } from "../../logging/logger";
import { registerAiIpcHandlers } from "../ai";
import { createProjectSessionBindingRegistry } from "../projectSessionBinding";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createHarness(args?: { useProjectSessionBinding?: boolean }): {
  chatSend: Handler;
  chatList: Handler;
  chatClear: Handler;
  binding: ReturnType<typeof createProjectSessionBindingRegistry> | null;
} {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  const binding = args?.useProjectSessionBinding
    ? createProjectSessionBindingRegistry()
    : null;

  registerAiIpcHandlers({
    ipcMain,
    db: null,
    userDataDir: "<test-user-data>",
    builtinSkillsDir: "<test-skills>",
    logger: createLogger(),
    env: process.env,
    ...(binding ? { projectSessionBinding: binding } : {}),
  });

  const chatSend = handlers.get("ai:chat:send");
  const chatList = handlers.get("ai:chat:list");
  const chatClear = handlers.get("ai:chat:clear");

  assert.ok(chatSend, "expected ai:chat:send handler to be registered");
  assert.ok(chatList, "expected ai:chat:list handler to be registered");
  assert.ok(chatClear, "expected ai:chat:clear handler to be registered");

  return {
    chatSend: chatSend as Handler,
    chatList: chatList as Handler,
    chatClear: chatClear as Handler,
    binding,
  };
}

function createEvent(webContentsId: number): { sender: { id: number } } {
  return {
    sender: { id: webContentsId },
  };
}

// Scenario: chat history must remain isolated by project id [ADDED]
{
  const { chatSend, chatList, chatClear } = createHarness();
  const projectA = "project-a";
  const projectB = "project-b";

  const sendA = (await chatSend(createEvent(1), {
    projectId: projectA,
    message: "Message from A",
  })) as {
    ok: boolean;
  };
  assert.equal(sendA.ok, true);

  const sendB = (await chatSend(createEvent(2), {
    projectId: projectB,
    message: "Message from B",
  })) as {
    ok: boolean;
  };
  assert.equal(sendB.ok, true);

  const listA = (await chatList(createEvent(1), {
    projectId: projectA,
  })) as {
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

  const clearA = (await chatClear(createEvent(1), {
    projectId: projectA,
  })) as {
    ok: boolean;
  };
  assert.equal(clearA.ok, true);

  const listAAfterClear = (await chatList(createEvent(1), {
    projectId: projectA,
  })) as {
    ok: boolean;
    data?: { items: Array<{ content: string; projectId: string }> };
  };
  assert.equal(listAAfterClear.ok, true);
  assert.equal(
    listAAfterClear.data?.items.length,
    0,
    "project A history should be empty after clear",
  );

  const listBAfterClearA = (await chatList(createEvent(2), {
    projectId: projectB,
  })) as {
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
}

// Scenario: session-bound project id must reject mismatched payloads [ADDED]
{
  const { chatSend, chatList, binding } = createHarness({
    useProjectSessionBinding: true,
  });
  assert.ok(binding, "project session binding should be enabled");

  binding.bind({
    webContentsId: 11,
    projectId: "project-bound",
  });

  const mismatched = (await chatSend(createEvent(11), {
    projectId: "project-other",
    message: "should fail",
  })) as {
    ok: boolean;
    error?: { code?: string };
  };
  assert.equal(mismatched.ok, false);
  assert.equal(mismatched.error?.code, "FORBIDDEN");

  const boundSend = (await chatSend(createEvent(11), {
    message: "uses bound project",
  })) as {
    ok: boolean;
  };
  assert.equal(boundSend.ok, true);

  const boundList = (await chatList(createEvent(11), {})) as {
    ok: boolean;
    data?: { items: Array<{ projectId: string; content: string }> };
  };
  assert.equal(boundList.ok, true);
  assert.equal(boundList.data?.items.length, 1);
  assert.equal(boundList.data?.items[0]?.projectId, "project-bound");
  assert.equal(boundList.data?.items[0]?.content, "uses bound project");
}
