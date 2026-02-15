## 1. Implementation

- [x] 1.1 以最小范围将 Workbench 可见文案改造为 key 渲染：`CommandPalette`、`StatusBar`、`SaveIndicator`、`InfoPanel`
- [x] 1.2 将 `AppShell` 命令分组从中文字面值收敛为稳定 id（`command/file/recent`）
- [x] 1.3 补齐 locale 命名空间并保证 `zh-CN/en` 同步更新（`workbench.commandPalette/statusBar/saveIndicator/infoPanel`）

## 2. Testing

- [x] 2.1 S3-I18N-EXTRACT-S1 Red→Green：`i18n-text-extract.test.tsx`
- [x] 2.2 S3-I18N-EXTRACT-S2 Red→Green：`locale-parity.test.ts`
- [x] 2.3 S3-I18N-EXTRACT-S3 Red→Green：`locale-duplication-guard.test.ts`
- [x] 2.4 Focused 回归通过：`i18n-setup`、`CommandPalette`、`StatusBar`、`InfoPanel`、`AppShell`、`app-shell-i18n-bootstrap`

## 3. Governance

- [x] 3.1 完成依赖同步检查（Dependency Sync Check）：上游 `s3-i18n-setup` 结论 `NO_DRIFT`
- [x] 3.2 更新 `openspec/changes/s3-i18n-extract/tasks.md`
- [x] 3.3 更新 RUN_LOG：`openspec/_ops/task_runs/ISSUE-568.md`
- [x] 3.4 `rulebook task validate issue-568-s3-i18n-extract` 通过
- [ ] 3.5 PR / auto-merge / main sync（按任务约束不执行）
