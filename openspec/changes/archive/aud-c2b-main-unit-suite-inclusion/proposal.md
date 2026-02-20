# 提案：aud-c2b-main-unit-suite-inclusion

## Why（问题与目标）

在 discovery runner 基线（c2a）之后，仍存在 unit suite 漏纳入的审计风险：

- `apps/desktop/main/src/**/__tests__` 与部分 `apps/desktop/tests/unit/**` 可能被发现但未进入执行计划，导致漏测。
- 治理脚本需要可导入、无副作用的 execution plan（用于后续一致性/coverage 门禁），否则导入就可能触发执行副作用。

本 change 的目标是补齐 unit suite 的“纳入 + 可导入执行计划”约束，并用最小测试锁定：

- unit discovery roots 必须包含 `tests/unit` 与 `main/src`。
- runner 必须导出执行计划构建函数，并通过 entrypoint guard 避免 import side effects。

## What（交付内容）

- discovery runner 的 unit roots 必须包含：
  - `apps/desktop/tests/unit`
  - `apps/desktop/main/src`
- runner 必须导出 `discoverUnitBuckets` / `buildUnitExecutionPlan`（用于治理门禁）。
- runner 入口必须通过 `isEntrypoint(import.meta.url)` guard，确保被 import 时不执行副作用。
- 新增回归测试：`apps/desktop/tests/unit/test-runner-discovery.spec.ts`
  - 覆盖 Scenario `CMI-AUD-C2B-S1..S2`（对应注释 S3/S4）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-c2b-main-unit-suite-inclusion/specs/cross-module-integration-spec/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/test-runner-discovery.spec.ts`

## Out of Scope（不做什么）

- 不在本 change 内调整 integration/perf roots（由上游 c2a 定义）。
- 不在本 change 内引入新的 bucket 类型（仅保证纳入与导出能力）。

## Evidence（可追溯证据）

- Wave1 RUN_LOG：`openspec/_ops/task_runs/ISSUE-591.md`
- Wave1 PR：https://github.com/Leeky1017/CreoNow/pull/592

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
