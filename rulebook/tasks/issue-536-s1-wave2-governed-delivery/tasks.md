## 1. Implementation

- [x] 1.1 完成 `s1-ipc-acl`：ACL 规则 + runtime-validation 前置拦截 + 场景测试
- [x] 1.2 完成 `s1-runtime-config`：治理配置中心 + `ipc/ai/kg/rag` 消费替换 + 一致性测试
- [x] 1.3 完成 `s1-context-ipc-split`：Context IPC 子注册器拆分 + 聚合委托 + 依赖实例化约束测试

## 2. Testing

- [x] 2.1 执行 Wave2 映射测试（ACL / runtime-governance / context split）
- [x] 2.2 执行受影响回归（ipc-runtime-validation、preload-security、context contracts、skill-session-queue-limit、kg-query-timeout）
- [x] 2.3 执行主门禁验证（`pnpm typecheck`、`pnpm lint`、`pnpm cross-module:check`、`pnpm test:unit`）

## 3. Governance

- [x] 3.1 更新并勾选三个 Wave2 change 的 `tasks.md`（含 Dependency Sync Check）
- [x] 3.2 归档已完成 Wave2 change 并同步 `openspec/changes/EXECUTION_ORDER.md`
- [ ] 3.3 更新 `openspec/_ops/task_runs/ISSUE-536.md`（Run 证据 + Main Session Audit）
- [ ] 3.4 完成 preflight / PR / auto-merge / control-plane main sync / worktree cleanup
