## 1. Implementation

- [x] 1.1 完成 C1a：`safeInvoke` 基础契约与 renderer IPC 错误收敛。
- [x] 1.2 完成 C2a：发现式 unit/integration 测试执行器改造。
- [x] 1.3 完成 C3a：会话级 project 绑定与 `ai:chat:*` 校验。
- [x] 1.4 完成 H1/H2a/H3/H5：导出流式写、热路径异步 I/O、watcher 恢复、preload 大小检查优化。
- [x] 1.5 完成 M1/M2：AI runtime 配置集中化与共享 token budget helper。

## 2. Testing

- [x] 2.1 `pnpm typecheck`
- [x] 2.2 `pnpm lint`
- [x] 2.3 `pnpm lint:ratchet`
- [x] 2.4 `pnpm test:unit`
- [x] 2.5 `pnpm test:integration`
- [x] 2.6 Wave0 关键路径定向测试（ipc/preload/session-binding/watch/export/token helper/ipcClient）

## 3. Governance

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-589.md`（PR 链接与执行证据）
- [x] 3.2 维护 `openspec/changes/EXECUTION_ORDER.md` 波次依赖
- [ ] 3.3 Main Session Audit 签字提交（仅 RUN_LOG 变更）
- [ ] 3.4 preflight 通过 + auto-merge + required checks 全绿
- [ ] 3.5 合并回 `main` + worktree 清理 + Rulebook 归档
