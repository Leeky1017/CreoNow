# ISSUE-67

- Issue: #67
- Branch: task/67-layout-tailwind-migration
- PR: https://github.com/Leeky1017/CreoNow/pull/68

## Plan

- 将 6 个布局组件（AppShell、IconBar、Sidebar、StatusBar、Resizer、RightPanel）从内联样式迁移到 Tailwind CSS 类
- 保留动态值（如宽度、高度）的内联样式
- 验证 TypeScript、ESLint、单元测试、集成测试全部通过

## Runs

### 2026-02-01 迁移布局组件

- Command: `pnpm run typecheck && pnpm run lint && pnpm run test:unit && pnpm run test:integration`
- Key output:
  ```
  typecheck: ✓ passed
  lint: ✓ passed
  test:unit: ✓ passed
  test:integration: ✓ passed
  ```
- Evidence: 6 个布局组件文件已修改

### 变更摘要

| 组件           | 变更                                                  |
| -------------- | ----------------------------------------------------- |
| AppShell.tsx   | 根容器和 flex 布局使用 Tailwind 类                    |
| IconBar.tsx    | 容器和按钮样式使用 Tailwind 类，添加 hover/focus 状态 |
| Sidebar.tsx    | 提取 Tab 按钮样式为复用常量，容器使用 Tailwind 类     |
| StatusBar.tsx  | 容器使用 Tailwind 类，状态指示器使用条件 className    |
| RightPanel.tsx | 容器使用 Tailwind 类，分割线使用 `h-px`               |
| Resizer.tsx    | 已使用 CSS 类，仅添加 JSDoc 注释                      |
