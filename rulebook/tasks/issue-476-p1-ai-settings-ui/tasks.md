## 1. Implementation

- [x] 1.1 准入：确认 OPEN issue #476、创建 `task/476-p1-ai-settings-ui` worktree 与 Rulebook task validate
- [x] 1.2 按 Scenario S0-S6 建立并执行 Red 测试证据（先失败）
- [x] 1.3 完成最小实现修复并使测试通过（Green）
- [x] 1.4 完成 change 文档收口：`tasks.md` 全章节证据 + change 归档 + EXECUTION_ORDER 同步

## 2. Testing

- [x] 2.1 目标测试：`pnpm -C apps/desktop test:run renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx`
- [ ] 2.2 交付门禁：`scripts/agent_pr_preflight.sh`
- [x] 2.3 必要回归：`pnpm -C apps/desktop test:run renderer/src/features/settings-dialog/SettingsDialog.test.tsx`

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-476.md`（Red/Green/门禁/PR 证据）
- [ ] 3.2 提交 PR（Closes #476）+ auto-merge + main 收口 + Rulebook 归档
