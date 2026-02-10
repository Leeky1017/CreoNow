# Proposal: issue-372-context-engine-p3-constraints-rules-injection

## Why

`openspec/changes/context-engine-p3-constraints-rules-injection` 进入 Phase A 后，代码层仍停留在 `constraints:policy:get/set` 与字符串数组规则，缺少可判定 CRUD 契约、用户/知识图谱约束优先级注入与超预算裁剪日志，导致 Constraints 相关能力无法满足 CE-4 规格，也无法为 CE-4 下游硬化任务提供稳定前提。

## What Changes

- 按 CE-4 delta spec 落地 Constraints CRUD：
  - 新增 `constraints:policy:list/create/update/delete` IPC 契约；
  - 返回统一 `ok: true|false` envelope；
  - 补齐错误码：`CONSTRAINT_VALIDATION_ERROR`、`CONSTRAINT_NOT_FOUND`、`CONSTRAINT_CONFLICT`、`CONTEXT_SCOPE_VIOLATION`。
- 在 Context Engine 中实现 Rules 注入闭环：
  - 约束注入固定格式 `[创作约束 - 不可违反]`；
  - 注入排序规则：`source=user > source=kg`，同级按 `updatedAt desc`、`id asc` 稳定排序。
- 实现约束膨胀裁剪策略：
  - 先裁剪低优先级 `kg` 约束，再裁剪 `user` 中可降级约束；
  - 记录结构化裁剪日志（`constraintId`、`reason`、`tokenFreed`）。
- 通过 TDD 交付 3 个 CE-4 场景测试，并更新 contract codegen、RUN_LOG、preflight、PR 自动合并与主干收口。

## Impact

- Affected specs:
  - `openspec/changes/context-engine-p3-constraints-rules-injection/proposal.md`
  - `openspec/changes/context-engine-p3-constraints-rules-injection/specs/context-engine-delta.md`
  - `openspec/changes/context-engine-p3-constraints-rules-injection/tasks.md`
- Affected code:
  - `apps/desktop/main/src/ipc/constraints.ts`
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/unit/context/constraints-crud-contract.test.ts`
  - `apps/desktop/tests/unit/context/constraints-priority-injection.test.ts`
  - `apps/desktop/tests/unit/context/constraints-overbudget-trim.test.ts`
- Breaking change: NO（保留 `constraints:policy:get/set` 兼容通道）
- User benefit: Constraints 管理与 Rules 注入行为可预测、可审计，且在超预算场景不再 silently degrade。
