import assert from "node:assert/strict";

import {
  SKILL_STREAM_CHUNK_CHANNEL,
  SKILL_STREAM_DONE_CHANNEL,
} from "@shared/types/ai";
import {
  createAiStreamSubscriptionRegistry,
  MAX_AI_STREAM_SUBSCRIPTIONS,
} from "../../preload/src/aiStreamSubscriptions";
import {
  createPreloadIpcGateway,
  MAX_IPC_PAYLOAD_BYTES,
} from "../../preload/src/ipcGateway";

type AuditEvent = {
  event: string;
  rendererId: string;
  channel: string;
  timestamp: number;
  details?: Record<string, unknown>;
};

// S1: 调用未暴露通道被网关拒绝 [ADDED]
{
  const auditEvents: AuditEvent[] = [];
  let invoked = false;

  const gateway = createPreloadIpcGateway({
    allowedChannels: ["app:system:ping"],
    rendererId: "renderer-1",
    now: () => 1_717_171_000_000,
    requestIdFactory: () => "req-unauthorized",
    invoke: async () => {
      invoked = true;
      return { ok: true, data: {} };
    },
    auditLog: (event) => {
      auditEvents.push(event);
    },
  });

  const res = await gateway.invoke("unknown:channel:attack", {});
  assert.equal(invoked, false);
  assert.equal(res.ok, false);
  if (res.ok) {
    assert.fail("expected forbidden response");
  }
  assert.equal(res.error.code, "IPC_CHANNEL_FORBIDDEN");
  assert.equal(res.error.message, "通道未授权");
  assert.deepEqual(auditEvents, [
    {
      event: "ipc_channel_forbidden",
      rendererId: "renderer-1",
      channel: "unknown:channel:attack",
      timestamp: 1_717_171_000_000,
    },
  ]);
}

// S3: 超大 payload 被拒绝并阻断业务处理 [ADDED]
{
  const auditEvents: AuditEvent[] = [];
  let invoked = false;

  const gateway = createPreloadIpcGateway({
    allowedChannels: ["app:system:ping"],
    rendererId: "renderer-2",
    now: () => 1_717_171_000_100,
    requestIdFactory: () => "req-payload",
    invoke: async () => {
      invoked = true;
      return { ok: true, data: {} };
    },
    auditLog: (event) => {
      auditEvents.push(event);
    },
  });

  const hugePayload = {
    blob: "x".repeat(MAX_IPC_PAYLOAD_BYTES + 1),
  };

  const res = await gateway.invoke("app:system:ping", hugePayload);
  assert.equal(invoked, false);
  assert.equal(res.ok, false);
  if (res.ok) {
    assert.fail("expected payload-too-large response");
  }
  assert.equal(res.error.code, "IPC_PAYLOAD_TOO_LARGE");
  assert.equal(typeof res.error.details, "object");
  assert.equal(auditEvents.length, 1);
  assert.equal(auditEvents[0]?.event, "ipc_payload_too_large");
  assert.equal(auditEvents[0]?.rendererId, "renderer-2");
  assert.equal(auditEvents[0]?.channel, "app:system:ping");
}

// S4: 订阅数量超过上限被拒绝 [ADDED]
{
  const auditEvents: AuditEvent[] = [];
  let nextId = 0;

  const registry = createAiStreamSubscriptionRegistry({
    rendererId: "renderer-3",
    maxSubscriptions: 2,
    now: () => 1_717_171_000_200,
    idFactory: () => `sub-${++nextId}`,
    auditLog: (event) => {
      auditEvents.push(event);
    },
  });

  const first = registry.register();
  const second = registry.register();
  const third = registry.register();

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, false);
  if (third.ok) {
    assert.fail("expected subscription-limit response");
  }
  assert.equal(third.error.code, "IPC_SUBSCRIPTION_LIMIT_EXCEEDED");
  assert.equal(registry.count(), 2);

  assert.equal(auditEvents.length, 1);
  assert.equal(auditEvents[0]?.event, "ipc_subscription_limit_exceeded");
  assert.equal(auditEvents[0]?.rendererId, "renderer-3");
  assert.equal(auditEvents[0]?.channel, SKILL_STREAM_CHUNK_CHANNEL);

  // ensure both stream channels are exported from shared contract constants
  assert.equal(SKILL_STREAM_DONE_CHANNEL, "skill:stream:done");

  assert.equal(MAX_AI_STREAM_SUBSCRIPTIONS, 500);
}
