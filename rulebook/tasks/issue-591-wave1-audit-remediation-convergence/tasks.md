## 1. Implementation

- [x] 1.1 完成 `aud-c1b` + `aud-h4`：renderer/store 异步状态收敛与 Judge 失败重试安全。
- [x] 1.2 完成 `aud-c2b` + `aud-m3`：测试纳入覆盖与 token 估算口径一致化。
- [x] 1.3 完成 `aud-c3b` + `aud-h2b` + `aud-m4`：IPC project access 守卫、contextFs offload 阈值、preload 诊断增强。
- [x] 1.4 修复 lint 阻断（`aiStore.ts` `no-unsafe-finally`）并重验。

## 2. Testing

- [x] 2.1 `pnpm typecheck`
- [x] 2.2 `pnpm lint`
- [x] 2.3 `pnpm lint:ratchet`
- [x] 2.4 `pnpm contract:check`
- [x] 2.5 `pnpm cross-module:check`
- [x] 2.6 `pnpm test:unit`
- [x] 2.7 `pnpm test:integration`
- [x] 2.8 Wave1 关键路径定向测试（renderer 三测 + project-access/context-fs-offload/token-parity/discovery/preload-security）

## 3. Governance

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-591.md`（含 Red/Green 证据与依赖同步结论）
- [x] 3.2 同步 `openspec/changes/EXECUTION_ORDER.md`（Wave1 进度）
- [ ] 3.3 完成双层审计（Audit A/B）与 Lead 终审签字
- [ ] 3.4 preflight 通过 + auto-merge + required checks 全绿
- [ ] 3.5 合并回 `main` + worktree 清理 + Rulebook 归档
