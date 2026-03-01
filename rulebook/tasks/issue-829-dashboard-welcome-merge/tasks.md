# Issue #829 — Dashboard WelcomeScreen Merge & Ghost Actions

更新时间：2026-03-01 22:00

## Proposal

删除 WelcomeScreen，将其入口逻辑合并到 DashboardPage 空状态；清理 3 个无 handler 的幽灵按钮。

## Tasks

1. [x] TDD Red — 创建 Dashboard.empty-state.test.tsx（S1/S2/S4）和 DashboardPage.ghost-buttons.guard.test.tsx（S3），确认红灯（WelcomeScreen 文件存在 + View All 幽灵按钮）
2. [x] TDD Green — 删除 WelcomeScreen 目录，更新 AppShell renderMainContent，移除 3 个幽灵按钮（View All, Grid View, List View），更新集成测试
3. [x] Typecheck — `pnpm -C apps/desktop typecheck` 通过
4. [x] Full Regression — 203 files / 1592 tests passed
5. [x] RUN_LOG 落盘 — `openspec/_ops/task_runs/ISSUE-829.md`

## Evidence

- Red: WelcomeScreen 存在 (existsSync true)；View All 按钮无 handler
- Green: 203 passed (203), 1592 tests passed
- Typecheck: clean
- Change tasks.md: 已更新 checkboxes
