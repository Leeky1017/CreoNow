/**
 * RED → GREEN test: validates that `precedingText` is declared in the
 * production IPC contract schema so that `wrapIpcRequestResponse` does NOT
 * reject a payload that carries it with VALIDATION_ERROR.
 *
 * Before the fix, `validateObjectSchema` flags unknown fields as
 * "is not allowed", causing any ai:skill:run call with `precedingText` to
 * be rejected before the handler is invoked.
 */

import type { IpcMainInvokeEvent } from "electron";
import { describe, expect, it } from "vitest";

import { ipcContract } from "../contract/ipc-contract";
import { s } from "../contract/schema";
import { wrapIpcRequestResponse } from "../runtime-validation";

/** Minimal event that satisfies ACL (file:// renderer, stable ID). */
function makeEvent(): IpcMainInvokeEvent {
  return {
    senderFrame: { url: "file://renderer" },
    sender: { id: 1 },
  } as unknown as IpcMainInvokeEvent;
}

/** Minimal valid ai:skill:run payload (no optional extras). */
function basePayload() {
  return {
    skillId: "builtin:continue",
    input: "",
    mode: "agent" as const,
    model: "gpt-4o",
    stream: false,
  };
}

describe("ai:skill:run IPC contract — precedingText", () => {
  it("contract schema must declare precedingText as optional field", () => {
    const contractSchema = ipcContract.channels["ai:skill:run"];
    expect(contractSchema).toBeDefined();

    const requestSchema = contractSchema.request;
    expect(requestSchema.kind).toBe("object");

    if (requestSchema.kind !== "object") return;
    expect(requestSchema.fields).toHaveProperty("precedingText");

    const ptField = requestSchema.fields["precedingText"];
    expect(ptField.kind).toBe("optional");
  });

  it("wrapIpcRequestResponse must NOT return VALIDATION_ERROR when precedingText is present", async () => {
    const contractSchema = ipcContract.channels["ai:skill:run"];
    let handlerInvoked = false;

    const wrapped = wrapIpcRequestResponse({
      channel: "ai:skill:run",
      requestSchema: contractSchema.request,
      responseSchema: s.object({ result: s.string() }),
      logger: { info: () => undefined, error: () => undefined },
      timeoutMs: 5_000,
      handler: async (_event, _payload) => {
        handlerInvoked = true;
        return { ok: true, data: { result: "ok" } };
      },
    });

    const response = (await wrapped(makeEvent(), {
      ...basePayload(),
      precedingText: "夜幕降临，街灯次第亮起。",
    })) as { ok: boolean; error?: { code: string } };

    expect(
      response.ok,
      `Expected ok:true but got error — response: ${JSON.stringify(response)}`,
    ).toBe(true);
    expect(handlerInvoked).toBe(true);
  });

  it("payload WITHOUT precedingText must still pass (no regression)", async () => {
    const contractSchema = ipcContract.channels["ai:skill:run"];
    let handlerInvoked = false;

    const wrapped = wrapIpcRequestResponse({
      channel: "ai:skill:run",
      requestSchema: contractSchema.request,
      responseSchema: s.object({ result: s.string() }),
      logger: { info: () => undefined, error: () => undefined },
      timeoutMs: 5_000,
      handler: async (_event, _payload) => {
        handlerInvoked = true;
        return { ok: true, data: { result: "ok" } };
      },
    });

    const response = (await wrapped(makeEvent(), basePayload())) as {
      ok: boolean;
      error?: { code: string };
    };

    expect(
      response.ok,
      `Payload without precedingText should pass — response: ${JSON.stringify(response)}`,
    ).toBe(true);
    expect(handlerInvoked).toBe(true);
  });
});
