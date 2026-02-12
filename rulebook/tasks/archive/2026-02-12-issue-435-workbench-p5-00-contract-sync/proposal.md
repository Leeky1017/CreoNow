# Proposal: issue-435-workbench-p5-00-contract-sync

## Why

`openspec/changes/workbench-p5-00-contract-sync` 定义了 Workbench P5 的 Phase A 基线（IPC 通道命名、IconBar 列表、RightPanel tab 类型对齐）。若不按交付流程完成该 change 的任务核验与证据收口，下游 `workbench-p5-01~05` 将继续基于漂移规范推进，带来实现返工与验收分歧。

## What Changes

- 完成 `workbench-p5-00-contract-sync/tasks.md` 的全部核验项与证据项（Spec-only 执行路径）。
- 记录 Dependency Sync Check 结论（本 change 无上游依赖，结论 N/A）。
- 执行现有漂移防护测试与门禁校验，证明 Spec-only 改动无回归。
- 归档已完成的 `workbench-p5-00-contract-sync` change 到 `openspec/changes/archive/`。
- 同步更新 `openspec/changes/EXECUTION_ORDER.md` 的活跃 change 数量、阶段顺序与依赖说明。
- 维护 `openspec/_ops/task_runs/ISSUE-435.md`，并完成 PR + auto-merge + main 收口证据。

## Impact

- Affected specs:
  - `openspec/changes/archive/workbench-p5-00-contract-sync/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `rulebook/tasks/issue-435-workbench-p5-00-contract-sync/**`
  - `openspec/_ops/task_runs/ISSUE-435.md`
- Breaking change: NO
- User benefit: Workbench P5 Phase A 契约基线完成收口，下游 change 可按一致规范进入实现，降低跨 change 漂移风险。
