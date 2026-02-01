# ISSUE-61

- Issue: #61
- Branch: task/61-primitives
- PR: <fill-after-created>

## Plan

- 创建 7 个基础组件：Button、Input、Textarea、Card、ListItem、Text、Heading
- 严格遵循 `design/DESIGN_DECISIONS.md` 设计规范
- 使用 Tailwind CSS 4 类名引用 CSS Variables

## Runs

### 2026-02-01 11:30 创建基础组件库

- Command: 创建 `apps/desktop/renderer/src/components/primitives/` 目录及 8 个文件
- Key output:
  - Button.tsx: 4 变体 (primary/secondary/ghost/danger), 3 尺寸 (sm/md/lg), loading 状态
  - Input.tsx: 40px 高度, error 状态, focus-visible
  - Textarea.tsx: 多行输入, error 状态
  - Card.tsx: 3 变体 (default/raised/bordered), hoverable
  - ListItem.tsx: compact/standard 高度, selected/interactive 状态
  - Text.tsx: 6 尺寸变体, 8 颜色
  - Heading.tsx: h1-h4 四级标题
  - index.ts: 统一导出

### 2026-02-01 11:45 设计规范核查与修复

- Command: 对照 `design/DESIGN_DECISIONS.md` 逐项核查
- Key output: 发现并修复以下问题
  - Typography 值：从 Tailwind 默认值改为规范精确值（line-height, letter-spacing）
  - 动效 Token：从硬编码改为引用 CSS Variables (`--duration-fast`, `--ease-default`)
  - Focus Ring：使用正确的 outline 语法引用设计 Token

### 2026-02-01 11:50 验证

- Command: `pnpm typecheck && pnpm lint && pnpm build`
- Key output:
  ```
  typecheck: ✓ 通过
  lint: ✓ 通过
  build: ✓ 成功
    - dist/renderer/assets/index-ClP1FwSn.css: 23.81 kB
    - dist/renderer/assets/index-m06g_ej7.js: 1,270.13 kB
  ```
