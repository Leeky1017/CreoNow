## 1. Implementation

- [x] 1.1 新增并执行 `ipc-p2` Red 测试（S1~S4）并记录失败证据。
- [x] 1.2 实现 `scripts/ipc-acceptance-gate.ts`（统一统计 + 阈值门禁 + 报告输出）。
- [x] 1.3 新增 `test:ipc:acceptance` 并接入 CI `ipc-acceptance` 任务。

## 2. Testing

- [x] 2.1 Green 证据：4 个 perf acceptance 测试全部通过。
- [x] 2.2 Green 证据：`pnpm test:ipc:acceptance` 输出全部 PASS 且 gate=PASS。
- [x] 2.3 质量门禁：`pnpm typecheck`、`pnpm lint`、`pnpm contract:check`、`pnpm test:unit` 全绿。

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-262.md`（含 Red/Green 证据）。
- [x] 3.2 更新 `scripts/README.md` 新增 acceptance gate 脚本说明。
- [ ] 3.3 合并后归档 Rulebook task（阶段 6）。
