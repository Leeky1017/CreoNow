/**
 * 导出进度生命周期事件契约测试
 * Spec: openspec/specs/document-management/spec.md
 *   — "P3 将项目导出为 Word 文件" (export:progress:update 实时推送)
 *   — "导出进度推送载荷" ExportLifecycleEvent 类型守卫
 *
 * 验证 ExportProgressBridge 的类型守卫正确识别所有生命周期事件，
 * 确保 export-started → export-progress → export-completed/export-failed 闭环。
 */

import { describe, it, expect } from "vitest";

// 纯函数类型守卫——与 preload/src/exportProgressBridge.ts 保持一致
// 这里复制守卫逻辑而非直接 import，因为 preload 依赖 electron ipcRenderer

type ExportFormat = "markdown" | "docx" | "pdf" | "txt";

type ExportStartedEvent = {
  type: "export-started";
  exportId: string;
  projectId: string;
  format: ExportFormat;
  currentDocument: string;
  timestamp: number;
};

type ExportProgressEvent = {
  type: "export-progress";
  exportId: string;
  stage: "parsing" | "converting" | "writing";
  progress: number;
  currentDocument: string;
};

type ExportCompletedEvent = {
  type: "export-completed";
  exportId: string;
  timestamp: number;
  projectId: string;
  format: ExportFormat;
  documentCount: number;
  success: true;
};

type ExportFailedEvent = {
  type: "export-failed";
  exportId: string;
  timestamp: number;
  projectId: string;
  format: ExportFormat;
  currentDocument: string;
  success: false;
  error: { code: string; message: string };
};

type ExportLifecycleEvent =
  | ExportStartedEvent
  | ExportProgressEvent
  | ExportCompletedEvent
  | ExportFailedEvent;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isExportFormat(x: unknown): x is ExportFormat {
  return x === "markdown" || x === "docx" || x === "pdf" || x === "txt";
}

function isExportStartedEvent(x: unknown): x is ExportStartedEvent {
  return (
    isRecord(x) &&
    x["type"] === "export-started" &&
    typeof x["exportId"] === "string" &&
    typeof x["projectId"] === "string" &&
    isExportFormat(x["format"]) &&
    typeof x["currentDocument"] === "string" &&
    typeof x["timestamp"] === "number"
  );
}

function isExportProgressEvent(x: unknown): x is ExportProgressEvent {
  return (
    isRecord(x) &&
    x["type"] === "export-progress" &&
    typeof x["exportId"] === "string" &&
    (x["stage"] === "parsing" || x["stage"] === "converting" || x["stage"] === "writing") &&
    typeof x["progress"] === "number" &&
    typeof x["currentDocument"] === "string"
  );
}

function isExportCompletedEvent(x: unknown): x is ExportCompletedEvent {
  return (
    isRecord(x) &&
    x["type"] === "export-completed" &&
    typeof x["exportId"] === "string" &&
    x["success"] === true &&
    typeof x["projectId"] === "string" &&
    isExportFormat(x["format"]) &&
    typeof x["documentCount"] === "number" &&
    typeof x["timestamp"] === "number"
  );
}

function isExportFailedEvent(x: unknown): x is ExportFailedEvent {
  return (
    isRecord(x) &&
    x["type"] === "export-failed" &&
    typeof x["exportId"] === "string" &&
    x["success"] === false &&
    typeof x["projectId"] === "string" &&
    isExportFormat(x["format"]) &&
    typeof x["currentDocument"] === "string" &&
    isRecord(x["error"]) &&
    typeof x["error"]["code"] === "string" &&
    typeof x["error"]["message"] === "string" &&
    typeof x["timestamp"] === "number"
  );
}

function isExportLifecycleEvent(x: unknown): x is ExportLifecycleEvent {
  return (
    isExportStartedEvent(x) ||
    isExportProgressEvent(x) ||
    isExportCompletedEvent(x) ||
    isExportFailedEvent(x)
  );
}

describe("导出进度事件类型守卫", () => {
  const EXPORT_ID = "exp-001";
  const PROJECT_ID = "proj-暗流";
  const NOW = Date.now();

  // ── Valid events ──

  const validStarted: ExportStartedEvent = {
    type: "export-started",
    exportId: EXPORT_ID,
    projectId: PROJECT_ID,
    format: "docx",
    currentDocument: "第一章",
    timestamp: NOW,
  };

  const validProgress: ExportProgressEvent = {
    type: "export-progress",
    exportId: EXPORT_ID,
    stage: "converting",
    progress: 50,
    currentDocument: "第六章",
  };

  const validCompleted: ExportCompletedEvent = {
    type: "export-completed",
    exportId: EXPORT_ID,
    timestamp: NOW + 5000,
    projectId: PROJECT_ID,
    format: "docx",
    documentCount: 12,
    success: true,
  };

  const validFailed: ExportFailedEvent = {
    type: "export-failed",
    exportId: EXPORT_ID,
    timestamp: NOW + 3000,
    projectId: PROJECT_ID,
    format: "docx",
    currentDocument: "第三章",
    success: false,
    error: { code: "EXPORT_WRITE_ERROR", message: "权限不足" },
  };

  it("export-started 事件通过验证", () => {
    expect(isExportStartedEvent(validStarted)).toBe(true);
    expect(isExportLifecycleEvent(validStarted)).toBe(true);
  });

  it("export-progress 事件通过验证", () => {
    expect(isExportProgressEvent(validProgress)).toBe(true);
    expect(isExportLifecycleEvent(validProgress)).toBe(true);
  });

  it("export-completed 事件通过验证", () => {
    expect(isExportCompletedEvent(validCompleted)).toBe(true);
    expect(isExportLifecycleEvent(validCompleted)).toBe(true);
  });

  it("export-failed 事件通过验证", () => {
    expect(isExportFailedEvent(validFailed)).toBe(true);
    expect(isExportLifecycleEvent(validFailed)).toBe(true);
  });

  // ── 闭环约束 ──

  it("生命周期闭环：started → progress → completed 的 exportId 一致", () => {
    const events: ExportLifecycleEvent[] = [
      validStarted,
      validProgress,
      validCompleted,
    ];

    const ids = events.map((e) => e.exportId);
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe(EXPORT_ID);
  });

  it("生命周期闭环：started → progress → failed 的 exportId 一致", () => {
    const events: ExportLifecycleEvent[] = [
      validStarted,
      validProgress,
      validFailed,
    ];

    const ids = events.map((e) => e.exportId);
    expect(new Set(ids).size).toBe(1);
  });

  // ── Invalid payloads 被拒绝 ──

  it("null 不是合法事件", () => {
    expect(isExportLifecycleEvent(null)).toBe(false);
  });

  it("缺少 type 字段不是合法事件", () => {
    expect(isExportLifecycleEvent({ exportId: "x" })).toBe(false);
  });

  it("未知 type 不是合法事件", () => {
    expect(isExportLifecycleEvent({ type: "export-unknown", exportId: "x" })).toBe(false);
  });

  it("export-started 缺少 format 不通过", () => {
    const bad = { ...validStarted, format: undefined };
    expect(isExportStartedEvent(bad)).toBe(false);
  });

  it("export-progress 的 stage 不合法不通过", () => {
    const bad = { ...validProgress, stage: "invalid-stage" };
    expect(isExportProgressEvent(bad)).toBe(false);
  });

  it("export-completed 的 success 必须为 true", () => {
    const bad = { ...validCompleted, success: false };
    expect(isExportCompletedEvent(bad)).toBe(false);
  });

  it("export-failed 的 success 必须为 false", () => {
    const bad = { ...validFailed, success: true };
    expect(isExportFailedEvent(bad)).toBe(false);
  });

  it("export-failed 缺少 error.code 不通过", () => {
    const bad = { ...validFailed, error: { message: "x" } };
    expect(isExportFailedEvent(bad)).toBe(false);
  });

  // ── 格式覆盖 ──

  it("所有导出格式 (markdown/docx/pdf/txt) 均合法", () => {
    for (const fmt of ["markdown", "docx", "pdf", "txt"] as const) {
      const evt: ExportStartedEvent = { ...validStarted, format: fmt };
      expect(isExportStartedEvent(evt)).toBe(true);
    }
  });

  it("不合法格式被拒绝", () => {
    const bad = { ...validStarted, format: "html" };
    expect(isExportStartedEvent(bad)).toBe(false);
  });
});
