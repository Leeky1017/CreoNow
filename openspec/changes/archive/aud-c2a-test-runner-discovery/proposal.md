# 提案：aud-c2a-test-runner-discovery

## Why（问题与目标）

历史上 `test:unit` / `test:integration` 存在“入口不一致 + discovery roots 漏配”的风险，导致：

- 部分 suite 被写入仓库但从未被执行（漏测）。
- 本地/CI 执行集合不一致，无法机器证明覆盖面真实生效。

本 change 的目标是建立发现式 test runner 基线：统一 unit/integration 的执行入口，并明确 discovery roots（至少覆盖 integration + perf），用最小测试锁定入口与 roots 不可漂移。

## What（交付内容）

- `package.json` 的 `test:unit` / `test:integration` 必须统一走 `scripts/run-discovered-tests.ts` 入口。
- `scripts/run-discovered-tests.ts` 必须包含 integration 与 perf 的 discovery roots（避免 suite 漏发现）。
- 新增回归测试：`apps/desktop/tests/unit/test-runner-discovery.spec.ts`
  - 覆盖 Scenario `CMI-AUD-C2A-S1..S2`（对应注释 S1/S2）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-c2a-test-runner-discovery/specs/cross-module-integration-spec/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/test-runner-discovery.spec.ts`

## Out of Scope（不做什么）

- 不在本 change 内决定具体的 bucket 切分策略与执行计划细节（由后续 c2b/c2c 收敛）。
- 不在本 change 内引入新的测试框架（仅统一入口与 roots）。

## Evidence（可追溯证据）

- Wave0 RUN_LOG：`openspec/_ops/task_runs/ISSUE-589.md`
- Wave0 PR：https://github.com/Leeky1017/CreoNow/pull/590

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
