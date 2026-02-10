## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #372，并建立 `task/372-context-engine-p3-constraints-rules-injection` worktree
- [x] 1.2 Rulebook task 创建并 `validate` 通过
- [x] 1.3 Dependency Sync Check：核对 CE-2 + IPC 命名治理，结论落盘
- [x] 1.4 Red：新增 CE4-R1-S1~S3 失败测试并记录证据
- [x] 1.5 Green：实现 `constraints:policy:list/create/update/delete` 与 Rules 注入/裁剪闭环
- [x] 1.6 Refactor：抽离排序/裁剪函数并统一错误码与日志字段

## 2. Testing

- [x] 2.1 运行 CE4 新增单测（Red→Green）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [ ] 2.7 运行 `scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-372.md`（准入、Dependency Sync、Red/Green、门禁）
- [x] 3.2 完成并归档 `openspec/changes/context-engine-p3-constraints-rules-injection`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [ ] 3.3 PR + auto-merge + 控制面 `main` 收口后归档本 Rulebook task
