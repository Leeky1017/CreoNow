# Proposal: issue-565-s3-synopsis-injection

## Why

Sprint 3 的 AR-C25 要求将章节摘要持久化并在续写上下文中稳定注入。当前 Context Engine 没有 synopsis 存储与 fetcher 接线，续写只能依赖局部上下文，跨章一致性不足，且失败场景缺少结构化可观测信号。

## What Changes

- 新增 `synopsisStore`（SQLite）用于章节摘要 upsert 与检索。
- 新增 `synopsisFetcher` 并注册到 context layer 组装链路（并入 retrieved 层）。
- 在 DB migration 与 `db/init.ts` 增加 synopsis 表。
- 在 `ipc/context.ts` 注入 synopsis store 依赖。
- 增加 S3-SYN-INJ-S1/S2/S3 的 Red→Green 测试覆盖。

## Impact

- Affected specs: `openspec/changes/s3-synopsis-injection/specs/context-engine-delta.md`
- Affected code:
  - `apps/desktop/main/src/services/context/synopsisStore.ts`
  - `apps/desktop/main/src/services/context/fetchers/synopsisFetcher.ts`
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apps/desktop/main/src/db/migrations/0022_s3_synopsis_injection.sql`
  - `apps/desktop/main/src/db/init.ts`
  - `apps/desktop/main/src/ipc/context.ts`
- Breaking change: NO
- User benefit: 续写时可注入按章节顺序的前文摘要；无摘要和存储异常场景都有显式、可审计的降级语义。
