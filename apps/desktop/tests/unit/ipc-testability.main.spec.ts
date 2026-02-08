import assert from "node:assert/strict";

import { createMockIPCHandler } from "../helpers/ipc";

// S1: 主进程 handler 单测不依赖 Electron runtime [ADDED]
// should execute handler unit tests with mock ipcMain only
{
  const payload = { title: "第一章", type: "chapter" };
  const handler = createMockIPCHandler("file:document:create", {
    ok: true,
    data: { id: "doc-1" },
  });

  const response = await handler.invoke(payload);

  assert.equal(handler.channel, "file:document:create");
  assert.deepEqual(handler.calls(), [payload]);
  assert.deepEqual(response, {
    ok: true,
    data: { id: "doc-1" },
  });
}
