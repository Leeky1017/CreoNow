# ISSUE-128

- Issue: #128
- Branch: task/128-export-dialog-center
- PR: https://github.com/Leeky1017/CreoNow/pull/129

## Plan

- 修复格式卡片文字真正垂直居中
- 修复选中指示器为实心白色圆

## Runs

### 2026-02-03 14:38 Fixes

- Changes:
  1. 卡片添加 `items-center text-center relative`，使内容真正居中
  2. 选中指示器使用绝对定位在右上角
  3. 选中时为实心白色圆 (`bg-white`)，未选中时隐藏
- Evidence: Storybook 视觉验证 + 24 个单元测试通过
