## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #381 + `task/381-context-engine-p4-hardening-boundary` worktree
- [x] 1.2 Rulebook task 创建并 `validate` 通过
- [x] 1.3 Dependency Sync Check：核对 CE-3/CE-4 产物（数据结构、IPC 契约、错误码、阈值）并记录 `NO_DRIFT`
- [x] 1.4 Red：完成 CE5-R1-S1/R1-S2/R2-S1/R2-S2/R3-S1/R3-S2 失败测试证据
- [x] 1.5 Green：实现 inspect 门禁、input cap、backpressure、scope violation、日志脱敏最小闭环
- [x] 1.6 Refactor：抽离边界守卫与审计字段拼装，不改变外部错误契约

## 2. Testing

- [x] 2.1 运行 CE5 新增 unit/integration 测试（Red→Green）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [ ] 2.7 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-381.md`（准入、Dependency Sync、Red/Green、门禁、合并证据）
- [x] 3.2 完成并归档 `openspec/changes/context-engine-p4-hardening-boundary`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [ ] 3.3 PR auto-merge 后归档 `rulebook/tasks/issue-381-context-engine-p4-hardening-boundary`
