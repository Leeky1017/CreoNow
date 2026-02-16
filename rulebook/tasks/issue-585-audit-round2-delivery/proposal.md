# Proposal: issue-585-audit-round2-delivery

## Why

`docs/CN-全量代码严格审计报告-2026-02-15-第二轮.md` 已给出当前代码库关键风险（C/H/M），但尚未进入受治理的 OpenSpec + Rulebook + GitHub 交付链路。若不先完成治理交付，后续 change 拆解与执行将缺少统一基线与可追溯证据。

## What Changes

- 将审计报告纳入仓库版本管理并完成规则化交付。
- 新增本任务 Rulebook 工件（proposal/spec/tasks）以承载执行与验收约束。
- 新增 `openspec/_ops/task_runs/ISSUE-585.md`，记录关键命令与主会话审计结论。
- 以 `task/585-audit-round2-delivery` 分支创建 PR，满足 required checks 与 auto-merge 门禁。

## Impact

- Affected specs:
  - `rulebook/tasks/issue-585-audit-round2-delivery/specs/governance/spec.md`
- Affected code:
  - `docs/CN-全量代码严格审计报告-2026-02-15-第二轮.md`
  - `openspec/_ops/task_runs/ISSUE-585.md`
  - `rulebook/tasks/issue-585-audit-round2-delivery/.metadata.json`
  - `rulebook/tasks/issue-585-audit-round2-delivery/proposal.md`
  - `rulebook/tasks/issue-585-audit-round2-delivery/tasks.md`
  - `rulebook/tasks/issue-585-audit-round2-delivery/specs/governance/spec.md`
- Breaking change: NO
- User benefit: 审计问题清单进入正式治理闭环，后续细粒度 change 拆解与执行可直接基于同一证据基线推进。
