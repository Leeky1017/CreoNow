# Proposal: issue-497-p2-kg-aliases

## Why

`p2-kg-aliases` 是 C10/C12 引用检测链路的前置数据能力。当前 KG 实体缺少 `aliases` 持久化字段，导致同一角色的别称无法命中，`when_detected` 注入会漏检，破坏 Phase-2 的上下文一致性。

## What Changes

- 在 `KnowledgeEntity` 新增 `aliases: string[]` 字段，create/update/list/read/query 全链路支持。
- 在 `kgService.ts` 增加 aliases 校验与规范化：仅接受数组，过滤空白项，非法输入返回 `VALIDATION_ERROR`。
- 新增 `0019_kg_aliases.sql` migration，并在 `db/init.ts` 注册 version 19。
- 新增 `kgService.aliases.test.ts`（S1-S5）并保留 Red→Green 证据。
- 更新 OpenSpec change tasks 与 RUN_LOG。

## Impact

- Affected specs:
  - `openspec/changes/p2-kg-aliases/specs/knowledge-graph/spec.md`
  - `openspec/changes/p2-kg-aliases/tasks.md`
- Affected code:
  - `apps/desktop/main/src/services/kg/kgService.ts`
  - `apps/desktop/main/src/services/kg/__tests__/kgService.aliases.test.ts`
  - `apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
  - `apps/desktop/tests/helpers/kg/harness.ts`
  - `apps/desktop/main/src/db/migrations/0019_kg_aliases.sql`
  - `apps/desktop/main/src/db/init.ts`
- Breaking change: NO
- User benefit: KG 能稳定识别实体别名，后续 retrieved 层按名称/别名匹配实体时不再漏掉常见称呼。
