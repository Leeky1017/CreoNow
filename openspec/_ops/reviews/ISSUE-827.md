# ISSUE-827 Independent Review

更新时间：2026-03-01 22:00

- Issue: #827
- PR: https://github.com/Leeky1017/CreoNow/pull/830
- Author-Agent: claude
- Reviewer-Agent: codex
- Reviewed-HEAD-SHA: cd77c6bba307f5fcf0c527b6c66fc9709dbf62d0
- Decision: FAIL → 整改中

## Scope

- 审计范围：PR #830 包含三个依赖链 change：
  - #827 `fe-ipc-open-folder-contract`：新增 `dialog:folder:open` IPC 通道
  - #828 `fe-ui-open-folder-entrypoints`：3 个 UI 入口（Dashboard / CommandPalette / Onboarding）
  - #829 `fe-dashboard-welcome-merge-and-ghost-actions`：WelcomeScreen 合并 + 幽灵按钮清理

## Findings

- 严重问题：
  1. RUN_LOG 格式不符合 `openspec-log-guard` 要求（使用表格而非列表，缺少 `## Plan` / `## Main Session Audit`）
  2. `doc-timestamp-gate` 失败：两个 rulebook tasks.md 缺少 `更新时间：` 头
  3. `surfaceRegistry.ts` 残留 `Features/WelcomeScreen` 导致 storybook-inventory 测试失败
  4. 5 个 E2E 测试仍依赖已删除的 `welcome-*` testId
  5. IPC delta spec 与实现不一致（通道名 `dialog:open-folder` vs `dialog:folder:open`，取消返回 `null` vs `{ selectedPath?: string }`）
- 中等级问题：
  1. Proposal 列出菜单栏入口但实际未实现（已推迟），未在文档中标注
- 低风险问题：无

## Verification

- 待整改完成后重新运行验证
