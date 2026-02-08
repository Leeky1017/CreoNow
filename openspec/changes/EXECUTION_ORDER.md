# Active Changes Execution Order

更新时间：2026-02-08 15:59

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 3。
- 执行模式：串行（避免同模块文档并发修改造成顺序漂移）。

## 执行顺序

1. `windows-e2e-startup-readiness`
2. `document-management-p1-file-tree-organization`
3. `document-management-p1-reference-and-export`

## 依赖说明

- `windows-e2e-startup-readiness` 依赖 `Issue #273` 的已合并基线（PR #274）并补齐收尾证据。
- `document-management-p1-file-tree-organization` 依赖 `openspec/changes/archive/document-management-p0-crud-types-status/` 的 P0 基线输出。
- `document-management-p1-reference-and-export` 依赖 `openspec/changes/archive/document-management-p0-crud-types-status/` 的 P0 基线输出。
- 两个 `document-management-p1-*` changes 在规格层无硬依赖；当前按顺序 2 -> 3 串行推进，减少同模块冲突。
- 历史 IPC changes 已归档在 `openspec/changes/archive/`，作为后续审计基线输入。

## 维护规则

- 活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。
