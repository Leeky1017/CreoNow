# ISSUE-57

- Issue: #57
- Branch: task/57-tailwind-radix-infra
- PR: https://github.com/Leeky1017/CreoNow/pull/58

## Plan

- 安装 Tailwind CSS 4 (tailwindcss + @tailwindcss/vite) 和 Radix UI 组件
- 配置 electron.vite.config.ts 添加 tailwindcss 插件
- 创建 main.css 主样式文件，补充 tokens.css 缺失变量

## Runs

### 2026-02-01 安装依赖

- Command: `pnpm add -D tailwindcss@^4.0.0 @tailwindcss/vite@^4.0.0`
- Key output:

  ```
  devDependencies:
  + @tailwindcss/vite 4.1.18
  + tailwindcss 4.1.18
  ```

- Command: `pnpm add @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-tabs`
- Key output:
  ```
  dependencies:
  + @radix-ui/react-checkbox 1.3.3
  + @radix-ui/react-dialog 1.1.15
  + @radix-ui/react-popover 1.1.15
  + @radix-ui/react-select 2.2.6
  + @radix-ui/react-tabs 1.1.13
  ```

### 2026-02-01 配置文件修改

- Files modified:
  - `apps/desktop/electron.vite.config.ts`: 添加 tailwindcss 插件
  - `apps/desktop/renderer/src/styles/main.css`: 新建，@import tailwindcss + @theme 配置
  - `apps/desktop/renderer/src/styles/tokens.css`: 补充 z-index、功能色、阴影变量
  - `apps/desktop/renderer/src/main.tsx`: 导入 main.css
  - `apps/desktop/renderer/src/styles/globals.css`: 删除（合并到 main.css）
  - `apps/desktop/package.json`: 添加依赖

### 2026-02-01 验证

- Command: `pnpm typecheck && pnpm lint && pnpm build`
- Key output:

  ```
  > tsc -p tsconfig.json --noEmit
  (pass)

  > eslint . --ext .ts,.tsx
  (pass)

  > electron-vite build
  dist/main/index.js  246.80 kB
  dist/preload/index.cjs  3.51 kB
  dist/renderer/assets/index-BMm3OXSn.css  11.62 kB
  dist/renderer/assets/index-CdeZBKte.js  1,270.13 kB
  ✓ built in 1.87s
  ```

- Evidence: All checks passed
