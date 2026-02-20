# 提案：aud-c2c-executed-vs-discovered-gate

## Why（问题与目标）

发现式测试执行（discovery runner）解决了“测试入口不一致/套件漏执行”的基线问题，但若“发现集合”与“实际执行集合”发生漂移，CI 仍可能出现：

- 部分测试被发现但未执行（漏测）。
- 非法执行目标进入执行计划（误测/污染）。
- 无法机器证明“当前执行计划覆盖发现集合”。

本 change 的目标是引入一致性门禁：对 `buildUnitExecutionPlan/buildIntegrationExecutionPlan` 的“发现集合”与“执行集合”进行精确比对，任何 mismatch 必须在本地/CI 阻断。

## What（交付内容）

- 新增 gate 脚本：`scripts/test-discovery-consistency-gate.ts`
  - 输出 discovered/executed 的计数与 missing/extra 明细。
  - mismatch 时必须以确定性错误失败（阻断交付）。
- 新增回归测试：`apps/desktop/tests/unit/test-discovery-consistency-gate.spec.ts`

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-c2c-executed-vs-discovered-gate/specs/cross-module-integration-spec/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/test-discovery-consistency-gate.spec.ts`

## Out of Scope（不做什么）

- 不在本 change 内扩展 discovery roots（roots 由上游 c2a/c2b 定义）。
- 不在本 change 内引入新的 test runner（仅对既有执行计划做一致性校验）。

## Evidence（可追溯证据）

- Wave2 RUN_LOG：`openspec/_ops/task_runs/ISSUE-593.md`
- Wave2 PR：https://github.com/Leeky1017/CreoNow/pull/594

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
