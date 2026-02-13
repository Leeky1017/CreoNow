# Proposal: issue-499-fix-kg-aliases-ipc-contract

## Why

`p2-kg-aliases` 已在 KG service 层交付 `aliases` 字段，但 IPC contract 未同步，导致 runtime response 校验将合法 KG 响应转换为 `INTERNAL_ERROR`。Windows E2E 在 `knowledge:entity:list` 持续失败，属于跨模块契约漂移缺陷，必须用独立 OPEN issue 修复并重新走交付门禁。

## What Changes

- 新建 OpenSpec active change：`openspec/changes/issue-499-fix-kg-aliases-ipc-contract/`（proposal/tasks/spec delta）。
- 更新 `openspec/changes/EXECUTION_ORDER.md`，纳入 F499 执行顺序与依赖关系。
- 新增 Red→Green 回归测试，复现并锁定 `knowledge:entity:list` 的 aliases 契约漂移。
- 修复 `ipc-contract.ts` 的 KG entity/create/update schema，补齐 `aliases`。
- 更新 `knowledgeGraph.ts` payload 类型与 `packages/shared/types/ipc-generated.ts`。
- 完成 RUN_LOG、preflight、PR auto-merge，并收口到控制面 `main`。

## Impact

- Affected specs:
  - `openspec/changes/issue-499-fix-kg-aliases-ipc-contract/specs/ipc/spec.md`
  - `openspec/changes/issue-499-fix-kg-aliases-ipc-contract/tasks.md`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/ipc/knowledgeGraph.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/unit/kg/entity-list-runtime-contract-aliases.test.ts`
- Breaking change: NO
- User benefit: `knowledge:entity:list` / `create` / `update` 在 aliases 场景下恢复契约一致性，不再误报 `INTERNAL_ERROR`。
