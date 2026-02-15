## 1. Implementation

- [x] 1.1 创建 OPEN issue、隔离 worktree 与 `task/553-sprint3-change-scaffold` 分支
- [x] 1.2 并行派发 4 个子代理，分组起草 Sprint 3 全部 17 个 change 三件套
- [x] 1.3 主会话审计并修正子代理遗漏（含 spec 的 Out-of-Scope 补齐）
- [x] 1.4 更新 `openspec/changes/EXECUTION_ORDER.md` 为 Sprint 3 活跃拓扑

## 2. Testing

- [ ] 2.1 执行结构化审计（17/17 change 的文件完整性、章节顺序、标签和关键字检查）
- [ ] 2.2 运行格式与 preflight 校验，清零治理阻断项

## 3. Governance

- [ ] 3.1 更新 `openspec/_ops/task_runs/ISSUE-553.md`（含子代理证据、主会话审计、Dependency Sync 结论）
- [ ] 3.2 创建 PR、开启 auto-merge、确认 `ci / openspec-log-guard / merge-serial` 全绿
- [ ] 3.3 合并后同步控制面 `main`、清理 worktree、归档 Rulebook task
