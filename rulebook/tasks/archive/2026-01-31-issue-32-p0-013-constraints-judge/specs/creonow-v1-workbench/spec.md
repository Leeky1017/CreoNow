# Spec Delta: creonow-v1-workbench (ISSUE-32)

本任务实现 `P0-013`（Constraints / Judge 最小可用 + Windows 可测降级），为 CN V1 Workbench 引入可验收的规则约束 SSOT 与 judge 模型状态基座。

## Changes

- Add: `constraints:get/set` IPC（SSOT=`.creonow/rules/constraints.json`；缺失返回默认值；参数校验失败→`INVALID_ARGUMENT`）。
- Add: `judge:model:getState/ensure` IPC（稳定状态枚举：`not_ready/downloading/ready/error`；Windows E2E 可测且可观测的降级路径）。
- Add: Settings UI 最小入口中的 judge 状态展示与 ensure 操作。

## Acceptance

- 满足 `P0-013` task card 的 Acceptance Criteria（含 Integration + Windows E2E）。
