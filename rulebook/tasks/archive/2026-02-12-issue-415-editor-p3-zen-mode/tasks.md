## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #415 + `task/415-editor-p3-zen-mode` worktree
- [x] 1.2 创建 Rulebook task 并完成首次 `validate`
- [x] 1.3 Dependency Sync Check：核对 `editor-p0/p1/p2`（数据结构、IPC 契约、错误码、阈值）
- [x] 1.4 Red：补齐 zen mode 三个 Scenario 的失败测试证据
- [x] 1.5 Green：最小实现（空文档光标、Zen 下禁用 AI 入口、样式 token 化）转绿
- [x] 1.6 Refactor：收敛代码与样式，保持行为不变

## 2. Testing

- [x] 2.1 运行目标 Zen 场景 vitest（Red→Green 证据）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [ ] 2.7 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-415.md`（Dependency Sync + Red/Green + 门禁证据）
- [x] 3.2 完成并归档 `openspec/changes/editor-p3-zen-mode`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [x] 3.3 按同 PR 自归档规则归档 `rulebook/tasks/issue-415-editor-p3-zen-mode`
