## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #402 + `task/402-skill-system-p1-trigger-scope-management` worktree
- [x] 1.2 Rulebook task 创建并 `validate` 通过
- [x] 1.3 Dependency Sync Check：核对 `skill-system-p0` 的技能注册表结构、SkillExecutor 接口、执行 IPC schema
- [x] 1.4 Red：先写并运行失败测试（技能面板触发/空状态/禁用态 + 作用域解析/启停/升降）
- [x] 1.5 Green：最小实现 Skill 面板分类与选择即执行、`skill:registry:toggle`（对齐主规范 `skill:toggle` 语义）、`skill:custom:update`
- [x] 1.6 Refactor：抽离并复用 ScopeResolver（project > global > builtin）

## 2. Testing

- [x] 2.1 运行新增目标测试（Red→Green 证据）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`（失败原因为生成产物与索引未对齐，后续以 preflight fresh run 作为准入）
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [ ] 2.7 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-402.md`（含 Red/Green 与门禁证据）
- [x] 3.2 完成并归档 `openspec/changes/skill-system-p1-trigger-scope-management`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [x] 3.3 归档 `rulebook/tasks/issue-402-skill-system-p1-trigger-scope-management`（同 PR 自归档）
