# Proposal: issue-546-s2-wave3-governed-delivery

## Why

需要执行 `openspec/changes/EXECUTION_ORDER.md` 的 Sprint 2 Wave3 六个 change，并由主会话对多子代理实现进行统一审计与纠偏，确保 Spec/TDD/证据/门禁/归档/主线收口全部满足 OpenSpec + Rulebook + GitHub 治理约束。

## What Changes

- 交付并审计 6 个 Wave3 change：
  - `s2-fetcher-detected`
  - `s2-write-button`
  - `s2-bubble-ai`
  - `s2-slash-framework`
  - `s2-demo-params-cleanup`
  - `s2-dual-field-migrate`
- 主会话整合子代理提交并修复审计发现的问题（包括类型契约与 story registry 漂移）。
- 完成 6 个 change 的 `tasks.md` 勾选与归档（移动到 `openspec/changes/archive/`）。
- 同步更新 `openspec/changes/EXECUTION_ORDER.md` 活跃拓扑。
- 记录 RUN_LOG、执行 preflight、PR auto-merge、main 同步与 worktree 清理。

## Impact

- Affected specs:
  - `openspec/changes/archive/s2-fetcher-detected/**`
  - `openspec/changes/archive/s2-write-button/**`
  - `openspec/changes/archive/s2-bubble-ai/**`
  - `openspec/changes/archive/s2-slash-framework/**`
  - `openspec/changes/archive/s2-demo-params-cleanup/**`
  - `openspec/changes/archive/s2-dual-field-migrate/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/services/context/**`
  - `apps/desktop/main/src/ipc/**`
  - `apps/desktop/renderer/src/features/editor/**`
  - `apps/desktop/renderer/src/components/features/AiDialogs/**`
  - `apps/desktop/renderer/src/surfaces/surfaceRegistry.ts`
  - `apps/desktop/tests/unit/**`
- Breaking change: NO
- User benefit: Wave3 交互能力与债务修复在同一治理闭环下落地，确保 Wave4+ 依赖链可稳定推进。
