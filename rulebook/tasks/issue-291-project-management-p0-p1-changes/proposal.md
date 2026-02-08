# Proposal: issue-291-project-management-p0-p1-changes

## Why

`project-management` 主 spec 规模较大，若不拆分将同时引入数据模型、删除安全和生命周期状态机风险。需要先完成 PM-1 的 P0 基础，再推进 PM-2 的生命周期闭环，确保依赖顺序清晰并可追踪交付证据。

## What Changes

- 新建 PM-1 change：`project-management-p0-creation-metadata-dashboard`
  - 覆盖创建、元数据、Dashboard
  - 定义 CRUD 数据模型、IPC 命名与 Zod 契约
  - 覆盖容量溢出与非法枚举边界
- 新建 PM-2 change：`project-management-p1-lifecycle-switch-delete`
  - 覆盖多项目切换、删除确认、生命周期闭环
  - 定义 lifecycle IPC 与状态机约束
  - 覆盖并发删除冲突、权限不足、数据库写失败
- 更新 `openspec/changes/EXECUTION_ORDER.md`，声明 PM-1 → PM-2 串行依赖
- 记录 `openspec/_ops/task_runs/ISSUE-291.md`

## Impact

- Affected specs:
  - `openspec/changes/project-management-p0-creation-metadata-dashboard/**`
  - `openspec/changes/project-management-p1-lifecycle-switch-delete/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - OpenSpec/Rulebook 文档层改动；无生产代码变更
- Breaking change: NO
- User benefit:
  - 明确 PM 模块分阶段落地路径，降低实施风险并提高验收可追踪性
