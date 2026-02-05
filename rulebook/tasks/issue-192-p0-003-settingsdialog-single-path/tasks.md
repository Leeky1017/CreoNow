## 1. Implementation
- [ ] 1.1 入口统一：IconBar Settings 打开 SettingsDialog；Sidebar 移除 SettingsPanel 可达入口
- [ ] 1.2 能力吸收：SettingsDialog 内提供 Appearance / Proxy / Judge / Analytics（失败路径展示 `code: message`）
- [ ] 1.3 交互质量：ESC/遮罩关闭；打开聚焦、关闭回焦点；新增稳定 `data-testid` 供 E2E

## 2. Testing
- [ ] 2.1 更新 `apps/desktop/tests/e2e/theme.spec.ts`：从 SettingsDialog 切主题并重启持久化
- [ ] 2.2 新增 `apps/desktop/tests/e2e/settings-dialog.spec.ts`：Cmd/Ctrl+, 打开；持久化；Proxy/Judge 失败路径可观察
- [ ] 2.3 运行：`pnpm typecheck`、`pnpm -C apps/desktop test:run`、`pnpm -C apps/desktop test:e2e -- tests/e2e/theme.spec.ts tests/e2e/settings-dialog.spec.ts`

## 3. Documentation
- [ ] 3.1 `openspec/_ops/task_runs/ISSUE-192.md` 记录关键命令与关键输出（只追加）
- [ ] 3.2 合并后回填 P0-003 task card Completion（PR + RUN_LOG）
- [ ] 3.3 合并后归档 rulebook task
