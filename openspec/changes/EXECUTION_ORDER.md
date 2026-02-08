# Active Changes Execution Order

更新时间：2026-02-08 17:31

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 2。
- 执行模式：串行（跨模块并行会提升契约漂移和冲突回滚成本）。

## 执行顺序

1. `windows-e2e-startup-readiness`
2. `ai-panel-model-mode-wiring`

## 依赖说明

- `windows-e2e-startup-readiness` 依赖 `Issue #273` 相关失败链路与其已合并基线。
- `ai-panel-model-mode-wiring` 依赖 IPC P0/P1 契约与运行时校验基线。
- `document-management-p1-file-tree-organization` 已完成并归档至 `openspec/changes/archive/document-management-p1-file-tree-organization/`，不再属于活跃队列。
- `document-management-p1-reference-and-export` 已归档至 `openspec/changes/archive/document-management-p1-reference-and-export/`，不再属于活跃队列。

## 维护规则

- 活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。
