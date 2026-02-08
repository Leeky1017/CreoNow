# Active Changes Execution Order

更新时间：2026-02-08 16:56

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 3。
- 执行模式：串行（跨模块变更并行风险较高，统一串行减少规格顺序漂移与冲突回滚成本）。

## 执行顺序

1. `windows-e2e-startup-readiness`
2. `document-management-p1-file-tree-organization`
3. `ai-panel-model-mode-wiring`

## 依赖说明

- `windows-e2e-startup-readiness` 依赖 `Issue #273` 的已合并基线（PR #274）并补齐收尾证据。
- `document-management-p1-file-tree-organization` 依赖 `openspec/changes/archive/document-management-p0-crud-types-status/` 的 P0 基线输出。
- `document-management-p1-reference-and-export` 已归档至 `openspec/changes/archive/document-management-p1-reference-and-export/`，不再计入活跃执行序列。
- `ai-panel-model-mode-wiring` 依赖已归档 IPC P0/P1 的契约与校验基线，并为后续模型目录发现能力提供 mode/model 透传前提。
- `ai-model-catalog-discovery` 已归档至 `openspec/changes/archive/ai-model-catalog-discovery/`，作为后续审计基线输入。
- 历史 IPC changes 已归档在 `openspec/changes/archive/`，作为后续审计基线输入。

## 维护规则

- 活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。
