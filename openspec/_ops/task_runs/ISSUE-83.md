# ISSUE-83

- Issue: #83
- Branch: task/83-storybook-vitest-setup
- PR: https://github.com/Leeky1017/CreoNow/pull/84

## Plan

- 配置 Storybook 8.6.x + React + Vite 集成
- 配置 Vitest 4.x + Testing Library 测试框架
- 创建 Button 组件的 Story 和测试作为 smoke test

## Runs

### 2026-02-01 20:53 Storybook 依赖安装

- Command: `pnpm add -D storybook@^8.6.14 @storybook/react@^8.6.14 @storybook/react-vite@^8.6.14 @storybook/addon-essentials@^8.6.14 @storybook/addon-links@^8.6.14 @storybook/blocks@^8.6.14 @storybook/test@^8.6.14`
- Key output:
  ```
  + @storybook/addon-essentials 8.6.14
  + @storybook/addon-links 8.6.15
  + @storybook/blocks 8.6.14
  + @storybook/react 8.6.15
  + @storybook/react-vite 8.6.15
  + @storybook/test 8.6.15
  + storybook 8.6.15
  ```
- Evidence: apps/desktop/package.json

### 2026-02-01 20:53 Storybook 配置创建

- Command: 创建 `.storybook/main.ts` 和 `.storybook/preview.ts`
- Key output: 配置文件已创建，包含 Tailwind CSS 集成和主题切换支持
- Evidence: apps/desktop/.storybook/

### 2026-02-01 20:54 Storybook 启动验证

- Command: `pnpm storybook`
- Key output:
  ```
  Storybook 8.6.15 for react-vite started
  Local: http://localhost:6006/
  ```
- Evidence: curl localhost:6006 返回 HTTP 200

### 2026-02-01 20:55 Vitest + Testing Library 安装

- Command: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8`
- Key output:
  ```
  + @testing-library/jest-dom 6.9.1
  + @testing-library/react 16.3.2
  + @testing-library/user-event 14.6.1
  + @vitest/coverage-v8 4.0.18
  + jsdom 27.4.0
  + vitest 4.0.18
  ```
- Evidence: apps/desktop/package.json

### 2026-02-01 20:55 Vitest 配置创建

- Command: 创建 `vitest.config.ts` 和 `vitest.setup.ts`
- Key output: 配置 jsdom 环境，集成 @testing-library/jest-dom
- Evidence: apps/desktop/vitest.config.ts, apps/desktop/vitest.setup.ts

### 2026-02-01 20:55 Smoke test 验证

- Command: `pnpm test:run`
- Key output:
  ```
  ✓ renderer/src/components/primitives/Button.test.tsx (16 tests) 300ms
  Test Files  1 passed (1)
  Tests  16 passed (16)
  ```
- Evidence: apps/desktop/renderer/src/components/primitives/Button.test.tsx
