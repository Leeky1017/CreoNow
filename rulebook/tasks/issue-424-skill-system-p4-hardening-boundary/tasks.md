## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #424 + `task/424-skill-system-p4-hardening-boundary` worktree
- [x] 1.2 Rulebook task 完整化并 `validate` 通过
- [x] 1.3 Dependency Sync Check：核对 Skill p0/p1/p2/p3 产物（数据结构、IPC 契约、错误码、阈值）并落盘
- [x] 1.4 Red：完成 S-P4-1~S-P4-6 失败测试证据
- [x] 1.5 Green：实现容量上限、跨项目越权阻断与审计、单输出超长处理、错误码链路最小闭环
- [x] 1.6 Refactor：统一技能边界错误构造与常量，不改变外部契约

## 2. Testing

- [x] 2.1 运行 P4 新增 unit/integration 测试（Red→Green）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [x] 2.7 运行 `pnpm test:integration`（若时间成本过高至少执行 skill 相关集成子集并记录）
- [ ] 2.8 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-424.md`（准入、Dependency Sync、Red/Green、门禁、合并证据）
- [x] 3.2 完成并归档 `openspec/changes/skill-system-p4-hardening-boundary`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [ ] 3.3 PR auto-merge 后归档 `rulebook/tasks/issue-424-skill-system-p4-hardening-boundary`
