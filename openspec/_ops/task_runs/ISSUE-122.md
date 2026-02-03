# ISSUE-122
- Issue: #122
- Branch: task/122-settings-dialog
- PR: https://github.com/Leeky1017/CreoNow/pull/123

## Plan
- 实现 SettingsDialog 系统级设置弹窗（4 个页面：General/Appearance/Export/Account）
- 新增 Toggle、Slider primitives 组件
- 创建 Storybook stories 和单元测试

## Runs
### 2026-02-03 13:19 实现 SettingsDialog
- Command: `npm run test -- --run src/features/settings-dialog/ src/components/primitives/Toggle.test.tsx src/components/primitives/Slider.test.tsx`
- Key output:
  ```
  Test Files  3 passed (3)
  Tests  35 passed (35)
  ```
- Evidence: Storybook 验证截图确认 4 个页面（General/Appearance/Export/Account）渲染正确

### 2026-02-03 13:30 修复 Danger Zone 样式
- Command: 移除 Danger Zone 卡片的红色边框，只保留 Delete Account 按钮红色
- Key output: 修改 SettingsAccount.tsx，移除 `border-[var(--color-error)]` 和 `text-[var(--color-error)]`
- Evidence: 测试仍然全部通过

### 2026-02-03 13:33 Worktree 测试验证
- Command: `npm run test -- --run src/features/settings-dialog/ src/components/primitives/Toggle.test.tsx src/components/primitives/Slider.test.tsx`
- Key output:
  ```
  Test Files  3 passed (3)
  Tests  35 passed (35)
  Duration  3.30s
  ```
