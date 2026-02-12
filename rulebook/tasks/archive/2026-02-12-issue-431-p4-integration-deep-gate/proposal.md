# Proposal: issue-431-p4-integration-deep-gate

## Why

P4 阶段（Editor / Skill System / Version Control）相关 change 已归档，但缺少一次“归档后”的最细粒度跨模块集成复核。需要在最新 `origin/main` 基线上执行完整门禁，识别潜在契约漂移、行为回归与边界缺口，并以 TDD 方式完成修复与优化，确保 P4 不是“通过单模块”而是“通过全链路”。

## What Changes

- 执行 P4 全量集成门禁：`typecheck`、`lint`、`contract:check`、`cross-module:check`、`test:unit`、`test:integration`。
- 对失败项进行分类：`IMPLEMENTATION_ALIGNMENT_REQUIRED` / `NEW_CONTRACT_ADDITION_CANDIDATE` / `SAFE_BASELINE_CLEANUP`。
- 对确认为实现侧问题的项，按 Red → Green → Refactor 修复并补齐测试。
- 输出 P4 集成 Delta Report（Implemented / Partial / Missing）。

## Impact

- Affected specs:
  - `openspec/changes/issue-431-p4-integration-deep-gate/specs/cross-module-integration-spec/spec.md`
- Affected code:
  - `package.json`（`test:integration` / `test:unit` 门禁接线）
- Affected tests:
  - `apps/desktop/tests/unit/p4-integration-gate-coverage.spec.ts`
- Breaking change: NO
- User benefit: P4 阶段实现具备跨模块一致性与可验证稳定性，降低归档后回归风险。
