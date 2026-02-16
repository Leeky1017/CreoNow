## 1. Implementation

- [x] 1.1 完成 `aud-h6b`：memory/document 第二阶段拆分（helper/module 边界落地）
- [x] 1.2 完成 `aud-h6c`：AppShell/AiPanel 拆分（逻辑与展示辅助模块下沉）
- [x] 1.3 保持外部行为契约不变并补齐必要回归保护

## 2. Testing

- [x] 2.1 TDD Red 证据：新增 Wave3 拆分测试并确认失败
- [x] 2.2 TDD Green 证据：目标测试通过（h6b/h6c 定向）
- [x] 2.3 全量门禁：`pnpm typecheck`、`pnpm lint`、`pnpm lint:ratchet`、`pnpm contract:check`、`pnpm cross-module:check`
- [x] 2.4 测试门禁：`pnpm test:unit`、`pnpm test:integration`、`pnpm -C apps/desktop test:run`

## 3. Governance

- [x] 3.1 更新 `aud-h6b`、`aud-h6c` change `tasks.md`（TDD 勾选 + 依赖同步检查）
- [x] 3.2 更新 `openspec/changes/EXECUTION_ORDER.md`（Wave3 状态）
- [x] 3.3 落盘 `openspec/_ops/task_runs/ISSUE-595.md`（Red/Green/失败修复链路）
- [x] 3.4 双层审计（Audit L1/L2）+ Lead 终审签字
- [ ] 3.5 preflight 通过 + auto-merge + required checks 全绿
- [ ] 3.6 合并回 `main` + worktree 清理 + Rulebook 归档
