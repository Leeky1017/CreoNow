## 1. Implementation
- [x] 1.1 准入：创建 OPEN issue #400 + `task/400-editor-p1-bubble-menu-outline` worktree
- [x] 1.2 创建 Rulebook task 并完成首次 `validate`
- [x] 1.3 Dependency Sync Check：核对 `editor-p0` 产物（数据结构、IPC 契约、错误码、阈值）
- [x] 1.4 Red：完成 Bubble Menu + Outline 的失败测试证据
- [x] 1.5 Green：补齐 Bubble Menu 能力并修复 Outline 场景差异
- [x] 1.6 Refactor：抽象 `InlineFormatButton`，保持行为不变

## 2. Testing
- [x] 2.1 运行目标 vitest（editor/outline）并完成 Red→Green
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [ ] 2.7 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation
- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-400.md`（含 Dependency Sync、Red/Green、门禁证据）
- [x] 3.2 完成并归档 `openspec/changes/editor-p1-bubble-menu-outline`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [ ] 3.3 PR auto-merge 后归档 `rulebook/tasks/issue-400-editor-p1-bubble-menu-outline`
