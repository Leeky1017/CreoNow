# Proposal: issue-551-s2-wave5-wave6-governed-delivery

## Why

Sprint 2 Wave5/Wave6 仍有 5 个活跃 change 未交付（`s2-shortcuts`、`s2-debug-channel-gate`、`s2-service-error-decouple`、`s2-store-race-fix`、`s2-memory-panel-error`）。需要按 Wave 间串行、子代理分工执行并由主会话统一审计，完成 OpenSpec + Rulebook + GitHub 门禁闭环后合并回控制面 `main`。

## What Changes

- 在 `task/551-s2-wave5-wave6-governed-delivery` 中完成 Wave5+6 全量实现与测试。
- 以多子代理会话分工执行 5 个 change，主会话进行代码与规格一致性审计，不符合即修正。
- 落盘 Red/Green 证据、Dependency Sync Check、Main Session Audit。
- 归档 5 个已完成 change 并同步 `openspec/changes/EXECUTION_ORDER.md` 到最新拓扑。

## Impact

- Affected specs:
  - `openspec/changes/s2-shortcuts/**`
  - `openspec/changes/s2-debug-channel-gate/**`
  - `openspec/changes/s2-service-error-decouple/**`
  - `openspec/changes/s2-store-race-fix/**`
  - `openspec/changes/s2-memory-panel-error/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/ipc/**`
  - `apps/desktop/main/src/services/documents/**`
  - `apps/desktop/renderer/src/features/editor/**`
  - `apps/desktop/renderer/src/features/memory/**`
  - `apps/desktop/renderer/src/stores/**`
- Breaking change: NO
- User benefit:
  - 写作快捷键触发能力稳定可用
  - 生产环境 debug IPC 暴露面收敛
  - 文档 service 错误边界解耦，IPC 契约稳定
  - KG/Search 竞态覆盖问题修复
  - MemoryPanel 异常可见化，避免静默失败
