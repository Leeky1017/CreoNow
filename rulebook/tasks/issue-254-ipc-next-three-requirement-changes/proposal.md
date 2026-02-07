# Proposal: issue-254-ipc-next-three-requirement-changes

## Why
IPC 主 spec 仍有 3 个 requirement 未进入可执行 change（通道命名规范、可测试性、模块级可验收标准）。若不继续补齐，会导致后续 IPC 迭代缺少统一优先级、变更边界和门禁映射。

## What Changes
- 新增并交付 3 个活跃 OpenSpec changes：
  - `ipc-p1-channel-naming-governance`
  - `ipc-p1-ipc-testability-harness`
  - `ipc-p2-acceptance-slo-and-benchmark-gates`
- 新增 `openspec/changes/EXECUTION_ORDER.md`，声明串行执行顺序与依赖。
- 将 3 个 change 的审阅状态更新为 Owner `APPROVED`。

## Impact
- Affected specs:
  - `openspec/changes/ipc-p1-channel-naming-governance/specs/ipc/spec.md`
  - `openspec/changes/ipc-p1-ipc-testability-harness/specs/ipc/spec.md`
  - `openspec/changes/ipc-p2-acceptance-slo-and-benchmark-gates/specs/ipc/spec.md`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code: None (spec/task docs only)
- Breaking change: NO
- User benefit: IPC 后续三项 requirement 已具备可执行变更入口，可直接进入 TDD 实施。
