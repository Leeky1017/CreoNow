# P1-006: State SSOT（移除 projectId/documentId 冗余）

Status: todo

## Goal

消除 renderer 内部 `projectId/documentId` 多处冗余存储，避免项目/文档切换时不同 store 不一致导致状态错乱。

## Dependencies

- Spec: `../spec.md#cnmvp-req-008`
- Design: `../design/07-state-ssot-and-redundancy.md`

## Expected File Changes（高影响，需拆分 PR）

| 操作 | 文件路径 |
| --- | --- |
| Add | `apps/desktop/renderer/src/lib/appContext.ts`（AppContext SSOT 抽象） |
| Update | `apps/desktop/renderer/src/App.tsx`（把 context 注入 store factories） |
| Update | `apps/desktop/renderer/src/components/layout/AppShell.tsx`（切换项目/文档时通过 context 驱动） |
| Update | `apps/desktop/renderer/src/stores/fileStore.ts` |
| Update | `apps/desktop/renderer/src/stores/editorStore.tsx` |
| Update | `apps/desktop/renderer/src/stores/memoryStore.ts` |
| Update | `apps/desktop/renderer/src/stores/kgStore.ts` |
| Update | `apps/desktop/renderer/src/stores/searchStore.ts` |
| Add/Update | `apps/desktop/renderer/src/stores/*.test.tsx`（必须覆盖快速切换竞态） |

## Detailed Breakdown（建议拆分 PR）

1. PR-A：引入 AppContext（不改行为）
   - 新增 `appContext.ts` + 在 `App.tsx` 构建并注入（依赖显式传入）
2. PR-B：逐个 store 去冗余（每个 store 一个 PR 或按域合并）
   - 对每个 store：
     - 移除 `projectId/documentId` 作为事实源字段
     - 使用 `deps.getContext()` 获取当前 id（或由 actions 显式传参）
     - 补对应 tests（至少 1 个竞态用例）
3. PR-C：AppShell 快速切换竞态测试
   - 添加一个“快速切换项目/文档”场景（Vitest 或 E2E）

## Acceptance Criteria

- [ ] `projectId` 只存在一个 SSOT（`projectStore.current`）
- [ ] `documentId` 只存在一个 SSOT（`editorStore.documentId`）
- [ ] 其他 store 不再持有可能不一致的副本
- [ ] 快速切换项目/文档不会触发重复 bootstrap 竞态（有测试覆盖）

## Tests

- [ ] `pnpm -C apps/desktop test:run`
- [ ]（按需）`pnpm -C apps/desktop test:e2e` 增加竞态回归门禁

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

