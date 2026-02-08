import assert from "node:assert/strict";

import { createPreloadIpcGateway } from "../../preload/src/ipcGateway";
import { assertIPCCall, createMockIPCRenderer } from "../helpers/ipc";

// S2: Preload API 转发可精确断言 channel 与参数 [ADDED]
// should assert forwarded channel and payload through mock ipcRenderer
{
  const payload = { title: "第一章", type: "chapter" };
  const renderer = createMockIPCRenderer({
    invokeResponse: {
      ok: true,
      data: { id: "doc-1", title: "第一章" },
    },
  });

  const gateway = createPreloadIpcGateway({
    allowedChannels: ["file:document:create"],
    rendererId: "renderer-test",
    invoke: renderer.invoke,
    requestIdFactory: () => "req-1",
    now: () => 1_718_000_000_000,
  });

  const response = await gateway.invoke("file:document:create", payload);

  assertIPCCall(renderer, "file:document:create", payload);
  assert.deepEqual(response, {
    ok: true,
    data: { id: "doc-1", title: "第一章" },
  });
}
