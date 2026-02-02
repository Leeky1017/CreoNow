# ISSUE-95

- Issue: #95
- Branch: task/95-fix-storybook-theme-decorator
- PR: https://github.com/Leeky1017/CreoNow/pull/96

## Plan

修复 Storybook decorator 中 data-theme 属性设置位置错误的问题：

- CSS tokens 使用 `:root[data-theme="dark"]` 选择器
- 但 decorator 把 data-theme 设置在 `<div>` 上而不是 `<html>` 上
- 导致暗色模式下组件文字不可见

## Runs

### 2026-02-01 发现问题

- 用户反馈浏览器验证时暗色背景下按钮文字不可见
- 调查发现 CSS 变量没有正确激活

### 2026-02-01 根因分析

- `preview.tsx` 使用 `<div data-theme="dark">` 包裹 Story
- CSS tokens 选择器是 `:root[data-theme="dark"]`
- `:root` 只匹配 `<html>` 元素，不匹配普通 div
- 因此 CSS 变量没有被激活

### 2026-02-01 修复

- 创建 `ThemeDecorator` 组件
- 使用 `useEffect` 在 `document.documentElement` 上设置 `data-theme="dark"`
- 确保 CSS 变量正确激活

### 2026-02-01 验证

- Command: `pnpm typecheck && pnpm lint`
- Key output: 无错误
- 浏览器验证：所有组件文字在暗色背景上清晰可见
