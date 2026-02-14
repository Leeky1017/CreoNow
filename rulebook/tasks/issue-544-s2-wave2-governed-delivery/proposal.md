# Proposal: issue-544-s2-wave2-governed-delivery

## Why

需要执行 `openspec/changes/EXECUTION_ORDER.md` 的 Sprint 2 Wave2 六个 change，并由主会话对多子代理实现进行统一审计与纠偏，确保 Spec/TDD/证据/门禁/归档/主线收口全部满足 OpenSpec + Rulebook + GitHub 治理约束。

## What Changes

- 交付并审计 6 个 Wave2 change：
  - `s2-entity-matcher`
  - `s2-fetcher-always`
  - `s2-writing-skills`
  - `s2-conversation-skills`
  - `s2-kg-metrics-split`
  - `s2-judge-hook`
- 主会话整合子代理提交并修复不符合规格或质量问题。
- 完成 6 个 change 的 `tasks.md` 勾选与归档（移动到 `openspec/changes/archive/`）。
- 同步更新 `openspec/changes/EXECUTION_ORDER.md` 活跃拓扑。
- 记录 RUN_LOG、执行 preflight、PR auto-merge、main 同步与 worktree 清理。

## Impact

- Affected specs:
  - `openspec/changes/archive/s2-entity-matcher/**`
  - `openspec/changes/archive/s2-fetcher-always/**`
  - `openspec/changes/archive/s2-writing-skills/**`
  - `openspec/changes/archive/s2-conversation-skills/**`
  - `openspec/changes/archive/s2-kg-metrics-split/**`
  - `openspec/changes/archive/s2-judge-hook/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/services/kg/**`
  - `apps/desktop/main/src/services/context/**`
  - `apps/desktop/main/src/services/skills/**`
  - `apps/desktop/main/skills/packages/pkg.creonow.builtin/1.0.0/skills/**`
  - `apps/desktop/renderer/src/features/settings/**`
  - `apps/desktop/renderer/src/features/rightpanel/**`
  - `apps/desktop/renderer/src/hooks/**`
  - `apps/desktop/tests/unit/**`
  - `apps/desktop/tests/integration/**`
- Breaking change: NO
- User benefit: Wave2 能力与债务项在同一治理闭环下完成，保障后续 Wave3/4 依赖稳定推进。
