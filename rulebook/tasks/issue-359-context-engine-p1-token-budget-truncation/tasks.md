## 1. Implementation
- [x] 1.1 准入：创建 OPEN issue #359，并建立 `task/359-context-engine-p1-token-budget-truncation` worktree
- [x] 1.2 Rulebook task 创建并 `validate` 通过
- [x] 1.3 完成 Dependency Sync Check（数据结构/IPC 契约/错误码/阈值），结论落盘 `NO_DRIFT`
- [x] 1.4 Red：新增 CE2-R1-S1~S3 失败测试并记录证据
- [x] 1.5 Green：实现 Token 预算裁剪链路与 `context:budget:get/update` IPC
- [x] 1.6 Refactor：抽离预算校验与 tokenizer 一致性校验，统一错误码映射

## 2. Testing
- [x] 2.1 运行 CE2 新增单测（Red→Green）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [ ] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [ ] 2.7 运行 `scripts/agent_pr_preflight.sh`

## 3. Documentation
- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-359.md`（准入、Dependency Sync、Red/Green、门禁）
- [x] 3.2 勾选并归档 `openspec/changes/context-engine-p1-token-budget-truncation`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [ ] 3.3 PR + auto-merge + 控制面 `main` 收口后归档本 Rulebook task
