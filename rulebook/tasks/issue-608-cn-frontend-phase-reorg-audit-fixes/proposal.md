# Proposal: issue-608-cn-frontend-phase-reorg-audit-fixes

更新时间：2026-02-22 12:31

## Why

Issue-606 的 phase 重组已合并，但仍存在治理收口漂移、i18n 门禁语义冲突、依赖描述不一致和 Scenario 映射覆盖缺口，影响 OpenSpec/Rulebook 可审计性与后续执行可靠性。

## What Changes

- 修复 issue-606 RUN_LOG 与 Rulebook 完成态漂移。
- 将 Phase 4 i18n 规则统一为“立即阻断”。
- 对齐 Phase 3 依赖关系描述与 `EXECUTION_ORDER.md`。
- 补齐 Phase 3/4 `tasks.md` 对全部 Scenario 的映射。
- 澄清 Phase 1 原生元素受限例外语义。
- 为 Phase 2/4 proposal 增补来源到场景映射表。

## Impact

- Affected specs:
  - `openspec/changes/issue-606-phase-1-stop-bleeding/**`
  - `openspec/changes/issue-606-phase-2-shell-decomposition/**`
  - `openspec/changes/issue-606-phase-3-quality-uplift/**`
  - `openspec/changes/issue-606-phase-4-polish-and-delivery/**`
- Affected code: none (doc/governance only)
- Breaking change: NO
- User benefit: 规范一致、证据闭环、后续 phase 执行门禁明确可依赖
