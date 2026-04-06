/**
 * projectLifecycleStateMachine — vitest 全覆盖
 *
 * 验证 PM-2 状态机的全部转换路径：
 * active → archived（唯一合法出路）
 * archived → active | deleted
 * deleted → 无合法出路（终态）
 * self-loop 允许
 * active → deleted 返回专用错误码
 */
import { describe, it, expect } from "vitest";

import {
  evaluateLifecycleTransition,
  type ProjectLifecycleState,
} from "../projectLifecycleStateMachine";

describe("evaluateLifecycleTransition", () => {
  // ── 合法转换 ─────────────────────────────────────────────────

  describe("allowed transitions", () => {
    it("active → archived 返回 ok", () => {
      const result = evaluateLifecycleTransition({ from: "active", to: "archived" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ from: "active", to: "archived" });
      }
    });

    it("archived → active 返回 ok（恢复）", () => {
      const result = evaluateLifecycleTransition({ from: "archived", to: "active" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ from: "archived", to: "active" });
      }
    });

    it("archived → deleted 返回 ok（清除）", () => {
      const result = evaluateLifecycleTransition({ from: "archived", to: "deleted" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ from: "archived", to: "deleted" });
      }
    });
  });

  // ── self-loop ────────────────────────────────────────────────

  describe("self-loop (no-op) transitions", () => {
    const states: ProjectLifecycleState[] = ["active", "archived", "deleted"];

    for (const state of states) {
      it(`${state} → ${state} 视为 ok（幂等）`, () => {
        const result = evaluateLifecycleTransition({ from: state, to: state });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data).toEqual({ from: state, to: state });
        }
      });
    }
  });

  // ── 非法转换 ─────────────────────────────────────────────────

  describe("blocked transitions", () => {
    it("active → deleted 返回 PROJECT_DELETE_REQUIRES_ARCHIVE", () => {
      const result = evaluateLifecycleTransition({
        from: "active",
        to: "deleted",
        traceId: "trace-1",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("PROJECT_DELETE_REQUIRES_ARCHIVE");
        expect(result.error.message).toBe("请先归档项目再删除");
        expect(result.error.traceId).toBe("trace-1");
      }
    });

    it("deleted → active 返回 INVALID_ARGUMENT", () => {
      const result = evaluateLifecycleTransition({
        from: "deleted",
        to: "active",
        traceId: "trace-2",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.traceId).toBe("trace-2");
        expect(result.error.details).toEqual({ from: "deleted", to: "active" });
      }
    });

    it("deleted → archived 返回 INVALID_ARGUMENT", () => {
      const result = evaluateLifecycleTransition({
        from: "deleted",
        to: "archived",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.details).toEqual({ from: "deleted", to: "archived" });
      }
    });
  });

  // ── traceId 透传 ─────────────────────────────────────────────

  describe("traceId propagation", () => {
    it("合法转换不含 traceId 字段（traceId 省略时）", () => {
      const result = evaluateLifecycleTransition({ from: "active", to: "archived" });
      expect(result.ok).toBe(true);
    });

    it("非法转换在 error 中携带 traceId", () => {
      const result = evaluateLifecycleTransition({
        from: "active",
        to: "deleted",
        traceId: "trace-abc",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.traceId).toBe("trace-abc");
      }
    });

    it("非法转换无 traceId 时 error.traceId 为 undefined", () => {
      const result = evaluateLifecycleTransition({
        from: "deleted",
        to: "active",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.traceId).toBeUndefined();
      }
    });
  });
});
