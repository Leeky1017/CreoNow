# 提案：aud-m5-coverage-gate-artifacts

## Why（问题与目标）

覆盖率门禁若缺少可追溯产物与 CI 接线约束，会导致：

- 覆盖率结果无法回溯（无法定位哪个 suite/文件导致跌破阈值）。
- `ci` 汇总门禁可能在未执行覆盖率门禁的情况下误通过（治理漂移）。

本 change 的目标是：在 CI 中引入独立 `coverage-gate` job，并上传覆盖率产物；同时强制 `ci` 汇总门禁依赖该 job，从而将覆盖率验证纳入 required checks 的真实保护范围。

## What（交付内容）

- CI workflow 增加 `coverage-gate` job（Coverage gate）。
- 该 job 必须上传覆盖率产物（Upload coverage artifacts）。
- `ci` 汇总门禁必须显式 `needs: coverage-gate`（避免覆盖率 gate 被绕过）。
- 新增回归测试：`apps/desktop/tests/unit/coverage-gate-ci.spec.ts`（静态校验 workflow 接线与 steps）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-m5-coverage-gate-artifacts/specs/cross-module-integration-spec/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/coverage-gate-ci.spec.ts`

## Out of Scope（不做什么）

- 不在本 change 内重构覆盖率计算器或更换工具链（仅接线门禁与产物）。
- 不在本 change 内引入新的 required checks 名称（保持 `ci` 聚合语义）。

## Evidence（可追溯证据）

- Wave2 RUN_LOG：`openspec/_ops/task_runs/ISSUE-593.md`
- Wave2 PR：https://github.com/Leeky1017/CreoNow/pull/594

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
