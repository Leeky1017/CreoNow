# Proposal: issue-542-s2-wave1-governed-delivery

## Why

需要执行 `openspec/changes/EXECUTION_ORDER.md` 的 Sprint 2 Wave1 六个 change，并由主会话对多子代理输出进行统一审计与纠偏，确保实现、测试、归档、门禁与主线收口全部满足 OpenSpec + Rulebook + GitHub 治理要求。

## What Changes

- 交付并审计 6 个 Wave1 change：
  - `s2-kg-context-level`
  - `s2-kg-aliases`
  - `s2-memory-injection`
  - `s2-dead-code-cleanup`
  - `s2-settings-disable`
  - `s2-type-convergence`
- 主会话整合子代理提交并修复冲突（KG Panel / kgStore 交叉改动）。
- 完成 6 个 change 的 `tasks.md` 勾选与归档（移动到 `openspec/changes/archive/`）。
- 同步更新 `openspec/changes/EXECUTION_ORDER.md` 活跃拓扑。
- 记录 RUN_LOG、执行 preflight、PR auto-merge、main 同步与 worktree 清理。

## Impact

- Affected specs:
  - `openspec/changes/archive/s2-kg-context-level/**`
  - `openspec/changes/archive/s2-kg-aliases/**`
  - `openspec/changes/archive/s2-memory-injection/**`
  - `openspec/changes/archive/s2-dead-code-cleanup/**`
  - `openspec/changes/archive/s2-settings-disable/**`
  - `openspec/changes/archive/s2-type-convergence/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/services/kg/**`
  - `apps/desktop/main/src/services/context/**`
  - `apps/desktop/main/src/services/memory/**`
  - `apps/desktop/main/src/index.ts`
  - `apps/desktop/renderer/src/features/kg/**`
  - `apps/desktop/renderer/src/features/settings-dialog/**`
  - `apps/desktop/renderer/src/features/version-history/**`
  - `apps/desktop/tests/unit/**`
- Breaking change: NO
- User benefit: Wave1 基线能力闭环落地，为 Wave2+ 迭代提供可验证的稳定起点。
