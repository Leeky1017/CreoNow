import assert from "node:assert/strict";

import type { IpcMain } from "electron";

import type { IpcResponse } from "../../../../packages/shared/types/ipc-generated";
import {
  JUDGE_RESULT_CHANNEL,
  type JudgeResultEvent,
} from "../../../../packages/shared/types/judge";
import type { Logger } from "../../main/src/logging/logger";
import { registerJudgeIpcHandlers } from "../../main/src/ipc/judge";
import { createJudgeQualityService } from "../../main/src/services/ai/judgeQualityService";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

type PushEvent = {
  channel: string;
  payload: unknown;
};

const handlers = new Map<string, Handler>();
const pushEvents: PushEvent[] = [];

const ipcMain = {
  handle: (channel: string, listener: Handler) => {
    handlers.set(channel, listener);
  },
} as unknown as IpcMain;

registerJudgeIpcHandlers({
  ipcMain,
  judgeService: {
    getState: () => ({ status: "ready" }),
    ensure: async () => ({ ok: true, data: { status: "ready" } }),
  },
  judgeQualityService: createJudgeQualityService({
    logger: createLogger(),
  }),
  logger: createLogger(),
});

const evaluate = handlers.get("judge:quality:evaluate");
assert.ok(evaluate, "expected judge:quality:evaluate handler to be registered");
if (!evaluate) {
  throw new Error("expected judge:quality:evaluate handler to be registered");
}

const response = (await evaluate(
  {
    sender: {
      send: (channel: string, payload: unknown) => {
        pushEvents.push({ channel, payload });
      },
    },
  },
  {
    projectId: "project-judge-s1",
    traceId: "trace-s1",
    text: "他看着窗外，呼吸急促。",
    contextSummary: "严格第一人称叙述",
  },
)) as IpcResponse<{ accepted: true; result: JudgeResultEvent }>;

assert.equal(response.ok, true);
assert.equal(pushEvents.length, 1);
assert.equal(pushEvents[0]?.channel, JUDGE_RESULT_CHANNEL);

const event = pushEvents[0]?.payload as JudgeResultEvent;
assert.equal(event.severity, "high");
assert.ok(
  event.labels.includes("检测到叙述视角不一致"),
  "expected human-readable high-severity label",
);
