# Spec Delta: ipc (ISSUE-254)

本任务交付 IPC 主 spec 的后续 3 个 requirement change 规划，不修改主 spec，仅在 `openspec/changes/` 新增可执行 delta：

- `ipc-p1-channel-naming-governance`
- `ipc-p1-ipc-testability-harness`
- `ipc-p2-acceptance-slo-and-benchmark-gates`

并新增 `openspec/changes/EXECUTION_ORDER.md` 维护多活跃 change 的串行执行顺序与依赖关系。

## Acceptance

- 三个 change 均包含 `proposal.md`、`tasks.md`、`specs/ipc/spec.md`。
- `tasks.md` 满足固定 1-6 章节顺序与 Scenario→测试映射要求。
- `EXECUTION_ORDER.md` 包含执行策略、执行顺序、依赖说明、更新时间（`YYYY-MM-DD HH:mm`）。
