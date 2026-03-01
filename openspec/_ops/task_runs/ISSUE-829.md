# ISSUE-829
- Issue: #829
- Branch: task/827-ipc-open-folder-contract
- PR: https://github.com/Leeky1017/CreoNow/pull/830

## Plan
- 删除 WelcomeScreen 组件，统一到 DashboardPage 空状态
- 清理幽灵按钮（View All、Grid View、List View —— 均无 onClick handler）
- 新增 ghost-button guard 测试
- 更新相关集成测试与 E2E 测试

## Runs

### 2026-03-01 21:44 Red Phase
- Command: `pnpm -C apps/desktop test:run -- "Dashboard.empty-state|ghost-buttons"`
- Key output: 2 failed — WelcomeScreen 文件存在 (existsSync true)；View All 按钮无 handler

### 2026-03-01 21:48 Green Phase
- Deleted: `features/welcome/WelcomeScreen.tsx` + `WelcomeScreen.stories.tsx` + 整个目录
- File: `apps/desktop/renderer/src/components/layout/AppShell.tsx` — 删除 WelcomeScreen 分支
- File: `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx` — 移除 3 个幽灵按钮
- File: `apps/desktop/renderer/src/__integration__/dashboard-editor-flow.test.tsx` — 更新集成测试

### 2026-03-01 21:50 Verification
- Command: `pnpm -C apps/desktop test:run`
- Key output: Test Files 203 passed (203), Tests 1592 passed (1592)
- Command: `pnpm -C apps/desktop typecheck`
- Key output: clean, no errors

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: cd77c6bba307f5fcf0c527b6c66fc9709dbf62d0
- Spec-Compliance: PASS
- Code-Quality: PASS
- Fresh-Verification: PASS
- Blocking-Issues: 0
- Decision: PASS
