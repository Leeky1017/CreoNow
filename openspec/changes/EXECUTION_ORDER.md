# Active Changes Execution Order

更新时间：2026-02-08 16:45

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 5。
- 执行模式：串行（跨模块并发变更冲突风险较高，统一串行推进）。

## 执行顺序

1. `windows-e2e-startup-readiness`
2. `document-management-p1-file-tree-organization`
3. `document-management-p1-reference-and-export`
4. `ai-panel-model-mode-wiring`
5. `db-native-binding-doctor`

## 依赖说明

- `windows-e2e-startup-readiness` 基于当前主分支启动就绪基线。
- `document-management-p1-file-tree-organization` 与 `document-management-p1-reference-and-export` 依赖 P0 文档管理归档基线。
- `ai-panel-model-mode-wiring` 依赖 IPC 已归档基线并作为 AI 面板链路前置。
- `db-native-binding-doctor` 依赖 AI 面板现有错误展示链路，仅增强 DB_ERROR 诊断信息与修复指引。
- 历史 changes 已归档在 `openspec/changes/archive/`，作为审计基线输入。

## 维护规则

- 活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。

