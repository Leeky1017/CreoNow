# Proposal: issue-32-p0-013-constraints-judge

## Why

为 CN V1 Workbench 提供最小可用的写作约束（constraints）与质量门禁（judge）基础能力：约束配置可读写且以 `.creonow/rules/constraints.json` 为唯一 SSOT；judge 模型的状态可见且可触发 ensure，并在 Windows CI 上可测（允许可观测的降级路径，禁止 silent failure）。

## What Changes

- Add: `constraints:get/set` IPC handlers（SSOT=`.creonow/rules/constraints.json`；缺失返回默认值；参数校验失败→`INVALID_ARGUMENT`）。
- Add: `judge:model:getState/ensure` IPC handlers（返回稳定状态枚举；ensure 可触发状态变化或返回可读错误码）。
- Add: `JudgeService`（状态机：`not_ready/downloading/ready/error`；可观测日志）。
- Add: renderer Settings 最小入口中的 `JudgeSection`（展示状态 + ensure 操作）。
- Add: tests：
  - Integration：constraints roundtrip + invalid args。
  - Windows E2E：Settings 可见 judge 状态；ensure 可触发变化或可读错误。

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-013-constraints-and-judge-minimal.md`
  - `openspec/specs/creonow-v1-workbench/design/04-context-engineering.md`
- Affected code:
  - `apps/desktop/main/src/ipc/**`
  - `apps/desktop/main/src/services/**`
  - `apps/desktop/renderer/src/**`
  - `apps/desktop/tests/**`
- Breaking change: NO
- User benefit: 用户可配置写作约束并触发/观察 judge 模型准备状态，为后续质量门禁与一致性检查提供可验收的 P0 基座。
