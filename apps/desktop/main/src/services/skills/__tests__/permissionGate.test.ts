import { describe, expect, it, vi } from "vitest";

import { createPermissionGate, PermissionGateError } from "../permissionGate";

describe("permissionGate", () => {
  it("auto-allow 请求直接放行（read-only passthrough）", async () => {
    const gate = createPermissionGate();
    await expect(
      gate.requestPermission({
        requestId: "req-auto",
        level: "auto-allow",
        description: "read-only",
      }),
    ).resolves.toBe(true);
  });

  it("preview-confirm 需要 resolve 才放行", async () => {
    const gate = createPermissionGate();
    const pending = gate.requestPermission({
      requestId: "req-preview",
      level: "preview-confirm",
      description: "confirm write",
    });
    gate.resolve("req-preview", true);
    await expect(pending).resolves.toBe(true);
  });

  it("budget-confirm 超时返回 false（fail-closed）", async () => {
    vi.useFakeTimers();
    const gate = createPermissionGate({ confirmTimeoutMs: 200 });
    const pending = gate.requestPermission({
      requestId: "req-budget",
      level: "budget-confirm",
      description: "expensive run",
      estimatedTokenCost: 1200,
    });
    await vi.advanceTimersByTimeAsync(200);
    await expect(pending).resolves.toBe(false);
    vi.useRealTimers();
  });

  it("releasePendingPermission 会释放挂起请求并返回 false", async () => {
    const gate = createPermissionGate();
    const pending = gate.requestPermission({
      requestId: "req-release",
      level: "must-confirm-snapshot",
      description: "snapshot then confirm",
    });
    gate.releasePendingPermission("req-release");
    await expect(pending).resolves.toBe(false);
  });

  it("evaluate 会把非法 level fail-safe 到 preview-confirm", async () => {
    const gate = createPermissionGate();
    await expect(gate.evaluate({ level: "invalid-level" })).resolves.toEqual({
      level: "preview-confirm",
      granted: false,
    });
  });

  it("onPermissionRequested 抛错时返回 PERMISSION_IPC_ERROR", async () => {
    const gate = createPermissionGate({
      onPermissionRequested: () => {
        throw new Error("ipc broken");
      },
    });
    await expect(
      gate.requestPermission({
        requestId: "req-hook-error",
        level: "preview-confirm",
        description: "broken hook",
      }),
    ).rejects.toMatchObject({
      code: "PERMISSION_IPC_ERROR",
    } satisfies Partial<PermissionGateError>);
  });

  it("rejectAll 会批量拒绝所有 pending 请求", async () => {
    const gate = createPermissionGate();
    const p1 = gate.requestPermission({
      requestId: "req-batch-1",
      level: "preview-confirm",
      description: "batch one",
    });
    const p2 = gate.requestPermission({
      requestId: "req-batch-2",
      level: "budget-confirm",
      description: "batch two",
      estimatedTokenCost: 999,
    });
    await Promise.resolve();
    gate.rejectAll();
    await expect(Promise.all([p1, p2])).resolves.toEqual([false, false]);
  });
});
