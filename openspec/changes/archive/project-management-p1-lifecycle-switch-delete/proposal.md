# 提案：project-management-p1-lifecycle-switch-delete

## 背景

PM 主规范中的多项目切换、删除与生命周期闭环是 P1 阶段的关键可靠性能力，直接影响数据一致性与误删风险。

本 change 必须建立在 PM-1 的数据模型与 CRUD 契约之上，优先解决切换保存、删除确认、生命周期状态机与关键失败路径，形成可回归、可审计的项目生命周期闭环。

## 变更内容

- 仅覆盖 PM 主 spec 中 3 个 requirement：
  - 多项目切换（保存当前内容、超时加载指示）
  - 项目删除（确认删除、名称不匹配阻断）
  - 项目生命周期闭环（归档→恢复→清除、活跃直接删除阻断）
- 依赖约束：`project-management-p0-creation-metadata-dashboard`（PM-1）合并后再进入实现。
- 定义切换与生命周期 IPC 契约：
  - `project:project:switch`
  - `project:lifecycle:archive`
  - `project:lifecycle:restore`
  - `project:lifecycle:purge`
  - `project:lifecycle:get`
- 明确 `project:project:switch` 需调用 KG/MS 上下文切换预留接口（mock/no-op 占位），暂不接入真实引擎。
- 生命周期必须实现为代码级状态机（transition map/guard），禁止散落式 `if/else` 硬编码。
- 删除确认必须采用「输入项目名二次确认」机制。
- 在测试中建立 NFR benchmark 基线，覆盖 `project:project:switch` 与 lifecycle IPC 阈值。
- 纳入跨切边界场景：并发删除冲突、权限不足、数据库写入失败。

## 受影响模块

- `openspec/changes/project-management-p1-lifecycle-switch-delete/**`
- `apps/desktop/main/src/services/projects/**`
- `apps/desktop/main/src/ipc/project.ts`
- `apps/desktop/renderer/src/features/projects/**`
- `apps/desktop/renderer/src/features/dashboard/**`
- `apps/desktop/renderer/src/stores/projectStore.tsx`
- `packages/shared/**`（IPC 类型、生命周期错误码）

## 不做什么

- 不实现 KG/MS 实际上下文切换（仅保留 mock/no-op 适配口）。
- 不做并发切换压测与 Dashboard 分页性能优化。
- 不修改 PM-1 定义的数据模型基础与主 spec。
- 不引入新的生命周期状态名或状态跳转路径。

## 审阅状态

- Owner 审阅：`PENDING`
