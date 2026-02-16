# Proposal: issue-589-wave0-audit-remediation

## Why

`docs/CN-全量代码严格审计报告-2026-02-15-第二轮.md` 的 Wave0 基线问题（C1a/C2a/C3a/H1/H2a/H3/H5/M1/M2）需要先落地，建立后续 Wave1-3 的依赖基础，并在同一治理链路中沉淀可追溯证据。

## What Changes

- 实现 renderer 侧 `safeInvoke` 基础契约，统一 IPC reject/错误信封收敛。
- 将 `test:unit` / `test:integration` 切换到发现式测试执行器，消除手工白名单漏测。
- 增加 `webContentsId -> projectId` 会话绑定，并在 `ai:chat:*` 执行绑定校验。
- 采用 stream write 导出 project bundle，降低大项目导出内存峰值。
- 将 contextFs 热路径同步 I/O 迁移到异步实现。
- watcher error 增加状态回收与可恢复机制。
- preload payload 大小检查改为遍历估算+超限短路，避免全量 stringify 预开销。
- AI runtime 限流参数集中到治理配置。
- 提取 `@shared/tokenBudget` 并迁移核心模块复用。

## Impact

- Affected specs:
  - `openspec/changes/aud-c1a-renderer-safeinvoke-contract/tasks.md`
  - `openspec/changes/aud-c2a-test-runner-discovery/tasks.md`
  - `openspec/changes/aud-c3a-ipc-session-project-binding/tasks.md`
  - `openspec/changes/aud-h1-export-stream-write/tasks.md`
  - `openspec/changes/aud-h2a-main-hotpath-async-io/tasks.md`
  - `openspec/changes/aud-h3-watcher-error-recovery-state/tasks.md`
  - `openspec/changes/aud-h5-preload-payload-size-protocol/tasks.md`
  - `openspec/changes/aud-m1-ai-runtime-config-centralization/tasks.md`
  - `openspec/changes/aud-m2-shared-token-budget-helper/tasks.md`
- Affected code:
  - `apps/desktop/renderer/src/lib/ipcClient.ts`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/main/src/ipc/projectSessionBinding.ts`
  - `apps/desktop/main/src/services/export/exportService.ts`
  - `apps/desktop/main/src/services/context/contextFs.ts`
  - `apps/desktop/main/src/services/context/watchService.ts`
  - `apps/desktop/preload/src/ipcGateway.ts`
  - `packages/shared/tokenBudget.ts`
  - `scripts/run-discovered-tests.ts`
- Breaking change: NO
- User benefit: Wave0 风险基线闭环，后续 Wave1-3 能在稳定契约上推进。
