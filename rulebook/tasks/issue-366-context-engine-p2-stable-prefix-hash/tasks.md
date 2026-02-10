## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #366，并建立 `task/366-context-engine-p2-stable-prefix-hash` worktree
- [x] 1.2 Rulebook task 创建并 `validate` 通过
- [x] 1.3 完成 Dependency Sync Check（数据结构/IPC 契约/错误码/阈值），结论落盘 `NO_DRIFT`
- [x] 1.4 Red：新增 CE3-R1-S1 / CE3-R1-S2 失败测试并记录证据
- [x] 1.5 Green：实现 canonicalize + SHA-256 + 维度化 `stablePrefixUnchanged` 判定
- [x] 1.6 Refactor：抽离 stable-prefix 归一化逻辑，统一 cache key 语义

## 2. Testing

- [x] 2.1 运行 CE3 新增单测（Red→Green）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [ ] 2.7 运行 `scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 新增并维护 `openspec/_ops/task_runs/ISSUE-366.md`（准入、Dependency Sync、Red/Green、门禁）
- [x] 3.2 勾选并归档 `openspec/changes/context-engine-p2-stable-prefix-hash`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [ ] 3.3 PR + auto-merge + 控制面 `main` 收口后归档本 Rulebook task
