## 1. Implementation

- [x] 1.1 新增并执行 `ipc-testability` Red 测试（S1~S4）并记录失败证据。
- [x] 1.2 实现统一 IPC 测试 helper（main/preload/push + 调用断言）。
- [x] 1.3 实现 Scenario→测试映射门禁脚本并接入测试链路。
- [x] 1.4 让新增 Red 用例全绿并保持既有 IPC 相关单测全绿。

## 2. Testing

- [x] 2.1 Red 证据：新增测试在实现前失败（缺 helper/缺门禁）。
- [x] 2.2 Green 证据：`pnpm test:unit` 全绿。
- [x] 2.3 质量门禁：`pnpm typecheck`、`pnpm lint`、`pnpm contract:check` 全绿。

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/ipc-p1-ipc-testability-harness/tasks.md` 完成状态。
- [x] 3.2 记录并维护 `openspec/_ops/task_runs/ISSUE-260.md`（含 Red/Green 证据）。
- [ ] 3.3 合并后归档 Rulebook task（阶段 6）。
