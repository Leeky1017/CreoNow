## 1. Implementation

- [x] 1.1 完成依赖与契约同步核对（AI Service + IPC + issue-392 相关改动），确认 `ipc_response_validation_failed(ai:skill:run)` 根因并落盘
- [x] 1.2 Red：先新增失败回归测试，复现 `ai:skill:run` 在 runtime validation 下因额外字段被拒绝
- [x] 1.3 Green：最小修复 `ai:skill:run` 成功响应，移除非契约字段透传，保证返回 envelope 满足 schema
- [x] 1.4 Refactor：保持 `contextPrompt` 仅内部使用，不改变对外契约语义

## 2. Testing

- [x] 2.1 运行新增回归测试（Red → Green 证据）
- [x] 2.2 运行目标回归 E2E：`ai-apply.spec.ts`、`knowledge-graph.spec.ts`、`search-rag.spec.ts`
- [x] 2.3 运行 `pnpm typecheck`
- [x] 2.4 运行 `pnpm lint`
- [x] 2.5 运行 `pnpm contract:check`
- [x] 2.6 运行 `pnpm cross-module:check`
- [x] 2.7 运行 `pnpm test:unit`
- [x] 2.8 运行 `pnpm test:integration`
- [x] 2.9 运行 `scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-398.md`（准入、根因、Red/Green、门禁与合并证据）
- [x] 3.2 创建 PR（`Closes #398`）并回填 RUN_LOG 的真实 PR 链接
- [ ] 3.3 开启 auto-merge，等待 required checks 全绿后合并到控制面 `main`
- [ ] 3.4 同 PR 归档 `rulebook/tasks/issue-398-windows-e2e-ai-output-regression`
