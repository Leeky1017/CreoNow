# ISSUE-91

- Issue: #91
- Branch: task/91-p2-story-test
- PR: https://github.com/Leeky1017/CreoNow/pull/92

## Plan

- 为 Checkbox/Select/Textarea 创建 Storybook Story 文件
- 为 Checkbox/Select/Textarea 创建 Vitest 测试文件
- 修复 vitest.setup.ts 以兼容 Radix UI + jsdom

## Runs

### 2026-02-01 22:56 测试验证

- Command: `pnpm --filter @creonow/desktop test -- --run`
- Key output:

  ```
  ✓ renderer/src/components/primitives/Card.test.tsx (42 tests) 475ms
  ✓ renderer/src/components/primitives/Button.test.tsx (46 tests) 710ms
  ✓ renderer/src/components/primitives/Textarea.test.tsx (46 tests) 957ms
  ✓ renderer/src/components/primitives/Checkbox.test.tsx (38 tests) 1029ms
  ✓ renderer/src/components/primitives/Input.test.tsx (38 tests) 1212ms
  ✓ renderer/src/components/primitives/Select.test.tsx (35 tests) 2145ms

  Test Files  6 passed (6)
       Tests  245 passed (245)
  ```

- Evidence: 终端输出

### 2026-02-01 22:49 Storybook 可视化验证

- Command: `browser_navigate + browser_take_screenshot`
- Key output:
  - Checkbox Default/Checked/Indeterminate: 渲染正确
  - Select Default: 渲染正确（placeholder + dropdown arrow）
  - Textarea Default/Error: 渲染正确（边框 + resize handle）
- Evidence: Storybook 截图（浅色背景验证）
