## 1. Implementation

- [x] 1.1 创建 OPEN issue、隔离 worktree 与 Rulebook task
- [x] 1.2 执行 Wave5（`s2-shortcuts` / `s2-debug-channel-gate` / `s2-service-error-decouple`）并完成主会话审计
- [x] 1.3 执行 Wave6（`s2-store-race-fix` / `s2-memory-panel-error`）并完成主会话审计
- [x] 1.4 修正子代理交付中发现的实现偏差与遗漏，确保符合 change spec
- [x] 1.5 归档 5 个完成 change 并同步 `openspec/changes/EXECUTION_ORDER.md`

## 2. Testing

- [x] 2.1 完成五个 change 的 Red/Green 目标测试与主会话复验
- [x] 2.2 运行受影响模块回归测试（editor/memory/store/document/ipc）并通过
- [x] 2.3 运行 `pnpm typecheck` 并通过

## 3. Governance

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-551.md`（含 Dependency Sync Check 与 Main Session Audit）
- [x] 3.2 创建 PR、启用 auto-merge，并满足 `ci` / `openspec-log-guard` / `merge-serial`
- [x] 3.3 合并后同步控制面 `main`、清理 worktree、归档 Rulebook task
