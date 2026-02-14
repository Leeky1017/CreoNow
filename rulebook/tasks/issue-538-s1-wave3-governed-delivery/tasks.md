## 1. Implementation
- [x] 1.1 完成 `s1-doc-service-extract`：子服务提取、门面委托、旧实现清理
- [x] 1.2 完成 `s1-ai-service-extract`：runtime/error/resolver 提取与门面收敛
- [x] 1.3 完成 `s1-kg-service-extract`：query/write/types/facade 拆分

## 2. Testing
- [x] 2.1 执行 Wave 3 映射测试（文档/AI/KG 提取）
- [x] 2.2 执行受影响回归（文档管理、AI 服务、KG 与 Context 相关链路）
- [x] 2.3 执行主门禁验证（`pnpm typecheck`、`pnpm lint`、`pnpm cross-module:check`、`pnpm test:unit`）

## 3. Governance
- [x] 3.1 更新并勾选三个 Wave 3 change 的 `tasks.md`（含 Dependency Sync Check）
- [x] 3.2 归档已完成 Wave 3 change 并同步 `openspec/changes/EXECUTION_ORDER.md`
- [x] 3.3 更新 `openspec/_ops/task_runs/ISSUE-538.md`（Run 证据 + Main Session Audit）
- [ ] 3.4 完成 preflight / PR / auto-merge / control-plane main sync / worktree cleanup
