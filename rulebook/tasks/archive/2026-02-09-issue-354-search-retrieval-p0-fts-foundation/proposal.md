# Proposal: issue-354-search-retrieval-p0-fts-foundation

## Why
`openspec/specs/search-and-retrieval/spec.md` 已将 FTS IPC 约定固定为 `search:fts:query` / `search:fts:reindex`，但当前实现仍是 `search:fulltext:query`，且缺失重建状态回传、定位锚点与高亮区间结构，导致 SearchPanel 场景与主 spec 漂移。该任务用于把 P0 FTS 基座收口到可验收状态，并为后续 SR P1/P2 提供稳定前置。

## What Changes
- 将主进程搜索 IPC 收敛为：
  - `search:fts:query`
  - `search:fts:reindex`
- 扩展 FTS 响应结构：`results/total/hasMore/indexState` + `highlights/anchor`。
- 在索引损坏错误下触发自动重建并返回 `indexState="rebuilding"`。
- 更新 renderer 搜索 store 与 SearchPanel：
  - 消费新契约字段
  - 点击结果触发文档跳转与短暂高亮反馈
  - 无结果提示与重建提示可见
- 补齐/修订测试：
  - `SR1-R1-S1~S4` 场景映射测试
  - 兼容契约重命名后的既有集成/E2E 测试
- 更新 Storybook 三态：`WithResults`、`Empty`、`Loading`。

## Impact
- Affected specs:
  - `openspec/changes/search-retrieval-p0-fts-foundation/**`
- Affected code:
  - `apps/desktop/main/src/services/search/ftsService.ts`
  - `apps/desktop/main/src/ipc/search.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/renderer/src/stores/searchStore.ts`
  - `apps/desktop/renderer/src/features/search/SearchPanel.tsx`
  - `apps/desktop/renderer/src/features/search/SearchPanel.stories.tsx`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/integration/**`（search/rag）
  - `apps/desktop/tests/e2e/search-rag.spec.ts`
- Breaking change: NO（按 spec 收敛 IPC 命名与结构）
- User benefit: FTS 查询与索引重建行为可见、可判定、可测试，搜索跳转与反馈完整闭环。
