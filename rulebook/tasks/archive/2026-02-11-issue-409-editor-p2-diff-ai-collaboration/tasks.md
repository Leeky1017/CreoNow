## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #409 + `task/409-editor-p2-diff-ai-collaboration` worktree
- [x] 1.2 创建 Rulebook task 并完成首次 `validate`
- [x] 1.3 Dependency Sync Check：核对 `editor-p0` / `editor-p1` / `ai-service-p3`（数据结构、IPC、错误码、阈值）
- [x] 1.4 Red：补齐 selection reference card / AI inline diff / multi-version compare 的失败测试
- [x] 1.5 Green：实现 reference card、compareMode diff 审阅、per-hunk 决策与冲突处理
- [x] 1.6 Refactor：抽离 hunk 计算与复用组件 API，保持行为不变

## 2. Testing

- [x] 2.1 运行目标 vitest 场景并完成 Red→Green
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [x] 2.7 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-409.md`（含 Dependency Sync、Red/Green、门禁证据）
- [x] 3.2 完成并归档 `openspec/changes/editor-p2-diff-ai-collaboration`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [x] 3.3 按“同 PR 自归档”规则归档 `rulebook/tasks/issue-409-editor-p2-diff-ai-collaboration`
