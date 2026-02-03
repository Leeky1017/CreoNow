# ISSUE-147

- Issue: #147
- Branch: task/147-ai-dialogs-polish
- PR: <fill-after-created>

## Plan

- 完善 AiInlineConfirm：状态机、原文显示、Accept/Reject 动画
- 完善 AiDiffModal：diff 高亮、change 状态、统计、loading
- 完善 AiErrorCard：Dismiss 按钮、Retry loading、淡出动画
- 完善 SystemDialog：键盘快捷键、loading 状态
- 更新 Storybook 场景和测试

## Runs

### 2026-02-03 23:50 Initial Implementation

- Command: `pnpm test -- --run src/components/features/AiDialogs/AiDialogs.test.tsx`
- Key output: `45 passed`
- Evidence: All tests passing

### 2026-02-03 23:57 Fix AI Indicator Icon

- Command: Removed AiIcon from AiInlineConfirm (caused weird positioning in Storybook)
- Key output: Clean UI without floating blue icon
- Evidence: Verified in Storybook browser testing

### Files Changed

- `AiInlineConfirm.tsx`: 状态机 (pending/applying/accepted/rejected)、原文显示、动画
- `AiDiffModal.tsx`: diff 高亮、change 状态、统计 (+N/-M)、Apply loading
- `AiErrorCard.tsx`: Dismiss 按钮、Retry loading、淡出动画、Ready to retry
- `SystemDialog.tsx`: 键盘快捷键 (Enter/Esc)、loading 状态、自定义按钮文本
- `types.ts`: 新增 InlineConfirmState、DiffChangeState 类型
- `index.ts`: 导出新类型
- `AiDialogs.stories.tsx`: 新增 12 个交互流程场景
- `AiDialogs.test.tsx`: 新增状态测试 (45 tests)
