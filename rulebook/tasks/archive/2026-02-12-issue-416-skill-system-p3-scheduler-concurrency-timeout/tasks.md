## 1. Implementation

- [x] 1.1 准入：创建并绑定 OPEN issue #416、分支 `task/416-skill-system-p3-scheduler-concurrency-timeout`、worktree `.worktrees/issue-416-skill-system-p3-scheduler-concurrency-timeout`
- [x] 1.2 Dependency Sync Check：核对上游 `skill-system-p0`（SkillExecutor 接口、executionId 生命周期、cancel 机制）并记录结论
- [x] 1.3 新增 `SkillScheduler` 并接入 `aiService`（FIFO、全局并发上限 8、会话队列上限 20）
- [x] 1.4 落实 `SKILL_TIMEOUT`、`SKILL_DEPENDENCY_MISSING`、`SKILL_QUEUE_OVERFLOW` 行为与 IPC 契约
- [x] 1.5 打通队列状态事件到 preload/renderer/AI 面板

## 2. Testing

- [x] 2.1 Red：新增并验证失败测试（并发队列、依赖缺失、超时中断、队列溢出）
- [x] 2.2 Green：目标测试转绿（`skill-executor`、`skill-session-queue-limit`、`ai-store-run-request-options`）
- [x] 2.3 门禁：`pnpm typecheck`
- [x] 2.4 门禁：`pnpm lint`
- [ ] 2.5 门禁：`pnpm contract:check`（将于提交后 clean 树复核）
- [x] 2.6 门禁：`pnpm cross-module:check`
- [x] 2.7 门禁：`pnpm test:unit`
- [ ] 2.8 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/skill-system-p3-scheduler-concurrency-timeout/tasks.md`（TDD Mapping + Evidence）
- [x] 3.2 新增 `openspec/_ops/task_runs/ISSUE-416.md`（包含 Dependency Sync、Red/Green、门禁证据）
- [ ] 3.3 完成 change 归档、Rulebook 自归档、PR auto-merge 与 main 收口后回填最终证据
