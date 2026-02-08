# Active Changes Execution Order

更新时间：2026-02-08 19:53

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 模式：**串行**
- 原因：`project-management-p1-lifecycle-switch-delete` 依赖 `project-management-p0-creation-metadata-dashboard` 的数据模型、IPC 命名与 schema 基线。

## 活跃 Change 列表

- `project-management-p0-creation-metadata-dashboard`
- `project-management-p1-lifecycle-switch-delete`

## 执行顺序

1. `project-management-p0-creation-metadata-dashboard`
2. `project-management-p1-lifecycle-switch-delete`

## 依赖说明

- `project-management-p0-creation-metadata-dashboard`
  - 依赖：无
  - 被依赖：`project-management-p1-lifecycle-switch-delete`
- `project-management-p1-lifecycle-switch-delete`
  - 依赖：`project-management-p0-creation-metadata-dashboard`（必须先合并）
  - 被依赖：无

## 归档记录

- `windows-e2e-startup-readiness` — PR #274 已合并（2026-02-08T07:52:11Z），归档至 `archive/`。
- `ai-panel-model-mode-wiring` — PR #275 已合并（2026-02-08T08:39:20Z），归档至 `archive/`。
- `document-management-p1-file-tree-organization` — 已归档至 `archive/`。
- `document-management-p1-reference-and-export` — 已归档至 `archive/`。
- `document-management-p2-hardening-and-gates` — 已归档至 `archive/`。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。
