## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #392 + `task/392-skill-system-p0-builtin-skills-executor` worktree
- [x] 1.2 Rulebook task 创建并 `validate` 通过
- [x] 1.3 Dependency Sync Check：核对 AI Service / Context Engine / IPC 上游契约并记录漂移修正动作
- [x] 1.4 Red：先写 6 个场景失败测试（润色/续写/输入校验/流式完成/取消/错误处理）
- [x] 1.5 Green：实现 8 builtin skills + SkillExecutor + IPC 执行链路最小闭环
- [x] 1.6 Refactor：统一流式完成事件格式与 SkillResult 映射，不改变外部错误契约

## 2. Testing

- [x] 2.1 运行新增 skill-system p0 场景测试（Red→Green）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [x] 2.7 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-392.md`（准入、Dependency Sync、Red/Green、门禁、合并证据）
- [x] 3.2 完成并归档 `openspec/changes/skill-system-p0-builtin-skills-executor`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [x] 3.3 PR auto-merge 后归档 `rulebook/tasks/issue-392-skill-system-p0-builtin-skills-executor`
