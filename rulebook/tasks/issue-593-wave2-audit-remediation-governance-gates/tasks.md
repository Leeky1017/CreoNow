## 1. Implementation

- [x] 1.1 完成 `aud-c1c`：renderer fire-and-forget lint guard + 关键入口替换。
- [x] 1.2 完成 `aud-c2c`：discovered/executed 一致性 gate 脚本与根脚本接线。
- [x] 1.3 完成 `aud-h6a`：ai payload parser 第一阶段拆分并保持行为等价。
- [x] 1.4 完成 `aud-m5`：coverage gate + artifact 上传 + CI 聚合依赖接线。

## 2. Testing

- [x] 2.1 Red/Green 定向测试：
  - `pnpm exec tsx apps/desktop/tests/unit/renderer-fireforget-helper.spec.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/renderer-fireforget-lint-guard.spec.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/test-discovery-consistency-gate.spec.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/ai-payload-parsers.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/coverage-gate-ci.spec.ts`
- [x] 2.2 全量门禁：`pnpm typecheck`、`pnpm lint`、`pnpm lint:ratchet`、`pnpm contract:check`、`pnpm cross-module:check`
- [x] 2.3 测试门禁：`pnpm test:unit`、`pnpm test:integration`、`pnpm -C apps/desktop test:run`
- [x] 2.4 新增门禁验证：`pnpm test:discovery:consistency`、`pnpm test:coverage:desktop`

## 3. Governance

- [x] 3.1 更新四个 Wave2 change `tasks.md`（TDD 勾选 + 依赖同步记录）
- [x] 3.2 更新 `openspec/changes/EXECUTION_ORDER.md`（Wave1/2 进度状态）
- [x] 3.3 落盘 `openspec/_ops/task_runs/ISSUE-593.md`（含 Red/Green 证据）
- [x] 3.4 双层审计（Audit L1/L2）+ Lead 终审签字
- [ ] 3.5 preflight 通过 + auto-merge + required checks 全绿
- [ ] 3.6 合并回 `main` + worktree 清理 + Rulebook 归档
