# ISSUE-828
- Issue: #828
- Branch: task/827-ipc-open-folder-contract
- PR: https://github.com/Leeky1017/CreoNow/pull/830

## Plan
- Dashboard 空状态新增「打开已有文件夹」按钮
- CommandPalette 新增 Open Folder 命令
- Onboarding 新增「打开已有文件夹」按钮
- 菜单栏 File → Open Folder 暂缓（无原生菜单系统）
- TDD：6 个场景（3 入口 × render + click 各 1）

## Runs

### 2026-03-01 21:30 Red Phase
- Command: `pnpm -C apps/desktop test:run features/dashboard/Dashboard.open-folder`
- Key output: FAIL — TestingLibraryElementError: Unable to find [data-testid="dashboard-open-folder"]
- Command: `pnpm -C apps/desktop test:run features/commandPalette/CommandPalette.open-folder`
- Key output: FAIL — Open Folder command not found in palette
- Command: `pnpm -C apps/desktop test:run features/onboarding/Onboarding.open-folder`
- Key output: FAIL — TestingLibraryElementError: Unable to find [data-testid="onboarding-open-folder"]

### 2026-03-01 21:35 Green Phase
- File: `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx` — 空状态新增 Open Folder 按钮
- File: `apps/desktop/renderer/src/components/layout/AppShell.tsx` — commandEntries 新增 open-folder 命令
- File: `apps/desktop/renderer/src/features/onboarding/OnboardingPage.tsx` — 导航底部新增 Open Folder 按钮
- 全部使用 `invoke("dialog:folder:open", {})` 调用

### 2026-03-01 21:40 Verification
- Command: `pnpm -C apps/desktop test:run -- --reporter=verbose "open-folder"`
- Key output: Test Files 202 passed (202), Tests 1588 passed (1588)
- Command: `pnpm -C apps/desktop typecheck`
- Key output: clean, no errors

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: pending_sha
- Spec-Compliance: PASS
- Code-Quality: PASS
- Fresh-Verification: PASS
- Blocking-Issues: 0
- Decision: PASS
