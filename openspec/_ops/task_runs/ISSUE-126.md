# ISSUE-126

- Issue: #126
- Branch: task/126-export-dialog-layout
- PR: <fill-after-created>

## Plan

- 修复格式卡片文字垂直居中问题
- 修复 Export 按钮可见性问题

## Runs

### 2026-02-03 14:25 Layout fixes

- Changes:
  1. 格式卡片添加 `flex flex-col justify-center`，设置 `auto-rows-[100px]` 固定行高
  2. 移除 Export 按钮的自定义白色样式，使用 Button 组件默认 primary 样式
- Evidence: Storybook 视觉验证 + 24 个单元测试通过
