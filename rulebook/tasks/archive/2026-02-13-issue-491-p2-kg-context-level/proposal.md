# Proposal: issue-491-p2-kg-context-level

## Why

`openspec/changes/p2-kg-context-level` 定义了 Knowledge Graph 实体的 `aiContextLevel` 四级注入控制，但当前 `kgService`、IPC contract、测试 harness 与 DB migration 均未支持该字段。若不交付，C10/C11/C12 将无法按级别过滤实体，Phase-2 Codex 上下文主线被阻断。

## What Changes

- 按 change 的 S1-S4 场景补充 Red→Green→Refactor 测试与实现。
- 在 `kgService.ts` 增加 `AiContextLevel` 类型、导出常量、输入校验、默认值、更新/查询过滤与行映射。
- 新增 SQLite migration：为 `kg_entities` 添加 `ai_context_level` 列（默认 `when_detected`）。
- 同步更新 IPC contract schema 与生成类型，确保 `knowledge:entity:create|list|update` 契约包含 `aiContextLevel`。
- 更新测试 schema/harness 与 RUN_LOG，完成 preflight、PR auto-merge、change 归档与 main 收口。

## Impact

- Affected specs:
  - `openspec/changes/p2-kg-context-level/proposal.md`
  - `openspec/changes/p2-kg-context-level/specs/knowledge-graph/spec.md`
  - `openspec/changes/p2-kg-context-level/tasks.md`
- Affected code:
  - `apps/desktop/main/src/services/kg/kgService.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/main/src/db/init.ts`
  - `apps/desktop/main/src/db/migrations/0018_kg_ai_context_level.sql`
  - `apps/desktop/tests/helpers/kg/harness.ts`
  - `apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
- Breaking change: NO（向后兼容默认值 `when_detected`）
- User benefit: KG 实体可声明 AI 注入级别，后续实体检测与 context fetcher 可基于统一字段实现可预测注入行为。
