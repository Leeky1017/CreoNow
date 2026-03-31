/**
 * 线性快照 P1 测试
 * Spec: openspec/specs/version-control/spec.md — Linear Snapshots
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证自动创建快照、内容完整性、回退、快照列表、三阶段提交、reason 枚举。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { SnapshotReason } from "../linearSnapshotStore";
import { createLinearSnapshotStore } from "../linearSnapshotStore";

// ─── helpers ────────────────────────────────────────────────────────

/** Create a minimal ProseMirror State JSON */
function makeProseMirrorState(text: string) {
  return {
    doc: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text }],
        },
      ],
    },
    selection: { type: "text", anchor: 0, head: 0 },
  };
}

const DOC_ID = "doc-test-001";
const PROJECT_ID = "proj-test-001";

// ─── tests ──────────────────────────────────────────────────────────

describe("LinearSnapshotStore", () => {
  let store: ReturnType<typeof createLinearSnapshotStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    store = createLinearSnapshotStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── 自动创建快照 ──────────────────────────────────────────────

  describe("Auto Snapshot — 自动创建快照", () => {
    it("AI 写入前（pre-write）自动创建快照", async () => {
      const snapshot = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("原始内容"),
        actor: "auto",
        reason: "pre-write",
      });

      expect(snapshot).toBeDefined();
      expect(snapshot.reason).toBe("pre-write");
      expect(snapshot.actor).toBe("auto");
    });

    it("手动保存（Cmd+S）创建快照", async () => {
      const snapshot = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("手动保存的内容"),
        actor: "user",
        reason: "manual-save",
      });

      expect(snapshot.reason).toBe("manual-save");
      expect(snapshot.actor).toBe("user");
    });

    it("自动保存（500ms debounce）创建快照", async () => {
      const snapshot = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("自动保存的内容"),
        actor: "auto",
        reason: "autosave",
      });

      expect(snapshot.reason).toBe("autosave");
    });
  });

  // ── 快照内容完整性 ──────────────────────────────────────────

  describe("Snapshot Integrity — 快照内容完整性", () => {
    it("快照包含所有必要字段", async () => {
      const content = makeProseMirrorState("完整性测试");
      const snapshot = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content,
        actor: "user",
        reason: "manual-save",
      });

      expect(snapshot.id).toBeDefined();
      expect(typeof snapshot.id).toBe("string");
      expect(snapshot.documentId).toBe(DOC_ID);
      expect(snapshot.projectId).toBe(PROJECT_ID);
      expect(snapshot.content).toEqual(content);
      expect(snapshot.reason).toBe("manual-save");
      expect(snapshot.createdAt).toBeDefined();
      expect(snapshot.actor).toBe("user");
      expect(typeof snapshot.wordCount).toBe("number");
    });

    it("快照的 content 为 ProseMirror State JSON 格式", async () => {
      const content = makeProseMirrorState("格式检查");
      const snapshot = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content,
        actor: "user",
        reason: "manual-save",
      });

      expect(snapshot.content).toHaveProperty("doc");
      expect(snapshot.content.doc).toHaveProperty("type", "doc");
      expect(snapshot.content.doc).toHaveProperty("content");
    });

    it("每个快照有唯一 ID", async () => {
      const snap1 = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("快照1"),
        actor: "user",
        reason: "manual-save",
      });
      const snap2 = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("快照2"),
        actor: "user",
        reason: "manual-save",
      });

      expect(snap1.id).not.toBe(snap2.id);
    });

    it("parentSnapshotId 形成线性链", async () => {
      const snap1 = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("第一版"),
        actor: "user",
        reason: "manual-save",
      });
      const snap2 = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("第二版"),
        actor: "user",
        reason: "manual-save",
      });
      const snap3 = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("第三版"),
        actor: "user",
        reason: "manual-save",
      });

      expect(snap1.parentSnapshotId).toBeNull();
      expect(snap2.parentSnapshotId).toBe(snap1.id);
      expect(snap3.parentSnapshotId).toBe(snap2.id);
    });
  });

  // ── 一键回退 ──────────────────────────────────────────────────

  describe("Rollback — 一键回退", () => {
    it("rollbackTo(snapshotId) → 文档内容恢复到该快照状态", async () => {
      const originalContent = makeProseMirrorState("原始内容");
      const snap1 = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: originalContent,
        actor: "user",
        reason: "manual-save",
      });

      await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("修改后的内容"),
        actor: "ai",
        reason: "ai-accept",
      });

      const rollbackSnapshot = await store.rollbackTo(DOC_ID, snap1.id);

      expect(rollbackSnapshot.content).toEqual(originalContent);
      expect(rollbackSnapshot.reason).toBe("rollback");
    });

    it("回退前自动创建 pre-rollback 快照", async () => {
      const snap1 = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("原始"),
        actor: "user",
        reason: "manual-save",
      });

      await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("当前"),
        actor: "user",
        reason: "manual-save",
      });

      await store.rollbackTo(DOC_ID, snap1.id);

      const history = await store.listSnapshots(DOC_ID);
      const preRollback = history.find((s) => s.reason === "pre-rollback");
      expect(preRollback).toBeDefined();
    });

    it("回退到不存在的 snapshotId → 抛出错误", async () => {
      await expect(
        store.rollbackTo(DOC_ID, "nonexistent-snap-id"),
      ).rejects.toThrow();
    });

    it("回退后可再次回退到 pre-rollback 快照来撤销", async () => {
      // snap1(content=A)
      const snap1 = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("内容A"),
        actor: "user",
        reason: "manual-save",
      });

      // snap2(content=B)
      await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("内容B"),
        actor: "user",
        reason: "manual-save",
      });

      // Rollback to snap1 → content=A, creates pre-rollback snap(content=B)
      const rollback1 = await store.rollbackTo(DOC_ID, snap1.id);
      expect(rollback1.content).toEqual(makeProseMirrorState("内容A"));

      // Find the pre-rollback snapshot (which preserved content=B)
      const history = await store.listSnapshots(DOC_ID);
      const preRollbackSnap = history.find((s) => s.reason === "pre-rollback");
      expect(preRollbackSnap).toBeDefined();

      // Rollback to pre-rollback → content reverts to B
      const rollback2 = await store.rollbackTo(DOC_ID, preRollbackSnap!.id);
      expect(rollback2.content).toEqual(makeProseMirrorState("内容B"));
    });
  });

  // ── 快照列表 ──────────────────────────────────────────────────

  describe("List — 快照列表", () => {
    it("按时间倒序列出所有快照", async () => {
      vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
      await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("第一版"),
        actor: "user",
        reason: "manual-save",
      });

      vi.setSystemTime(new Date("2025-01-01T01:00:00Z"));
      await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("第二版"),
        actor: "user",
        reason: "manual-save",
      });

      vi.setSystemTime(new Date("2025-01-01T02:00:00Z"));
      await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("第三版"),
        actor: "user",
        reason: "manual-save",
      });

      const snapshots = await store.listSnapshots(DOC_ID);

      expect(snapshots).toHaveLength(3);
      // 倒序：最新在前
      expect(new Date(snapshots[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(snapshots[1].createdAt).getTime(),
      );
      expect(new Date(snapshots[1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(snapshots[2].createdAt).getTime(),
      );
    });

    it("空文档返回空数组", async () => {
      const snapshots = await store.listSnapshots("nonexistent-doc");
      expect(snapshots).toEqual([]);
    });

    it("不同文档的快照互不干扰", async () => {
      await store.createSnapshot({
        documentId: "doc-A",
        projectId: PROJECT_ID,
        content: makeProseMirrorState("文档A"),
        actor: "user",
        reason: "manual-save",
      });
      await store.createSnapshot({
        documentId: "doc-B",
        projectId: PROJECT_ID,
        content: makeProseMirrorState("文档B"),
        actor: "user",
        reason: "manual-save",
      });

      const snapsA = await store.listSnapshots("doc-A");
      const snapsB = await store.listSnapshots("doc-B");

      expect(snapsA).toHaveLength(1);
      expect(snapsB).toHaveLength(1);
    });
  });

  // ── 三阶段提交 ────────────────────────────────────────────────

  describe("Three-Phase Commit — 三阶段提交", () => {
    it("createSnapshot → confirm → 快照保留，文档保持新内容", async () => {
      // Phase 1: Create pre-write snapshot
      const preWriteSnap = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("写入前内容"),
        actor: "auto",
        reason: "pre-write",
      });
      expect(preWriteSnap.reason).toBe("pre-write");

      // Phase 2: AI writes (simulated by creating ai-accept snapshot)
      const aiWriteSnap = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("AI 生成的内容"),
        actor: "ai",
        reason: "ai-accept",
      });
      expect(aiWriteSnap.reason).toBe("ai-accept");
      expect(aiWriteSnap.parentSnapshotId).toBe(preWriteSnap.id);

      // Phase 3: Confirm — no rollback needed, snapshots preserved
      const history = await store.listSnapshots(DOC_ID);
      expect(history).toHaveLength(2);
      expect(history[0].content).toEqual(makeProseMirrorState("AI 生成的内容"));
    });

    it("createSnapshot → rollback → 文档恢复到快照内容", async () => {
      const originalContent = makeProseMirrorState("原始内容");

      // Phase 1: Pre-write snapshot
      const preWriteSnap = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: originalContent,
        actor: "auto",
        reason: "pre-write",
      });

      // Phase 2: AI writes (bad content)
      await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("AI 写了不好的内容"),
        actor: "ai",
        reason: "ai-accept",
      });

      // Phase 3: User rolls back
      const rollback = await store.rollbackTo(DOC_ID, preWriteSnap.id);

      expect(rollback.content).toEqual(originalContent);
    });
  });

  // ── reason 枚举 ───────────────────────────────────────────────

  describe("Snapshot Reason — reason 枚举", () => {
    const reasons: SnapshotReason[] = [
      "manual-save",
      "autosave",
      "pre-write",
      "ai-accept",
      "pre-rollback",
      "rollback",
    ];

    for (const reason of reasons) {
      it(`reason="${reason}" 可正确创建快照`, async () => {
        const actor = reason === "ai-accept" ? "ai" : reason === "autosave" || reason === "pre-write" ? "auto" : "user";
        const snapshot = await store.createSnapshot({
          documentId: DOC_ID,
          projectId: PROJECT_ID,
          content: makeProseMirrorState(`reason: ${reason}`),
          actor,
          reason,
        });

        expect(snapshot.reason).toBe(reason);
      });
    }
  });

  // ── wordCount ─────────────────────────────────────────────────

  describe("Word Count — 字数统计", () => {
    it("快照包含正确的 wordCount", async () => {
      const snapshot = await store.createSnapshot({
        documentId: DOC_ID,
        projectId: PROJECT_ID,
        content: makeProseMirrorState("这是五个字"),
        actor: "user",
        reason: "manual-save",
      });

      expect(snapshot.wordCount).toBe(5);
    });
  });
});
