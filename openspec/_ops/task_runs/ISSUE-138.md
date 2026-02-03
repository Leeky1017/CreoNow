# ISSUE-138
- Issue: #138
- Branch: task/138-version-history-enhance
- PR: https://github.com/Leeky1017/CreoNow/pull/139

## Plan
- 修复 VersionHistoryPanel 颜色：选中状态使用 `--color-accent`（白色），AI 徽章保留 `--color-info`
- 丰富版本信息：添加 `reason`、`affectedParagraphs`、`diffSummary` 字段和 UI 展示
- 迁移 DiffView 到 `features/diff/`：移动文件、创建 `index.ts`、更新所有引用
- 实现 Compare 集成流程：`editorStore` 状态扩展、`onCompare` 回调、`MainContent` 条件渲染
- 新增 `useVersionCompare` hook（前端降级方案，等待 `version:diff` IPC）
- 更新测试和 Storybook stories

## Runs

### 2026-02-03 20:30 颜色修复
- Command: `StrReplace` on `VersionHistoryPanel.tsx`
- Key output: 
  - 选中边框：`border-[var(--color-info)]` → `border-[var(--color-accent)]`
  - Current 徽章：改用自定义 span with accent colors
  - 底部链接：`text-[var(--color-info)]` → `text-[var(--color-accent-muted)]`
- Evidence: `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.tsx` lines 406-409, 468-470, 672-673

### 2026-02-03 20:32 丰富版本信息
- Command: `StrReplace` on `VersionHistoryPanel.tsx`
- Key output:
  - 新增 `VersionMeta` 组件显示 reason + affectedParagraphs
  - 新增 `DiffSummaryPreview` 组件显示 diff 摘要
  - 更新 `VersionCard` 集成新组件
- Evidence: `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.tsx` lines 291-349

### 2026-02-03 20:34 DiffView 迁移
- Command: `mv ai/DiffView*.tsx ai/SplitDiffView.tsx ... diff/`
- Key output:
  ```
  /home/leeky/work/CreoNow/apps/desktop/renderer/src/features/diff/
    - DiffFooter.tsx, DiffHeader.tsx, DiffView.stories.tsx, DiffView.test.tsx
    - DiffView.tsx, DiffViewPanel.tsx, MultiVersionCompare.tsx, VersionPane.tsx
    - SplitDiffView.tsx, index.ts
  ```
- Evidence: `apps/desktop/renderer/src/features/diff/index.ts`

### 2026-02-03 20:35 Compare 集成
- Command: `StrReplace` on `editorStore.tsx`, `AppShell.tsx`
- Key output:
  - editorStore: 新增 `compareMode`, `compareVersionId`, `setCompareMode`
  - AppShell: 条件渲染 `DiffViewPanel` when `compareMode` is true
- Evidence: `apps/desktop/renderer/src/stores/editorStore.tsx`, `apps/desktop/renderer/src/components/layout/AppShell.tsx`

### 2026-02-03 20:36 测试验证
- Command: `pnpm vitest run renderer/src/features/version-history/VersionHistoryPanel.test.tsx`
- Key output: `Test Files  1 passed (1), Tests  20 passed (20)`
- Evidence: Terminal output

### 2026-02-03 20:37 类型检查 + Lint
- Command: `pnpm typecheck && pnpm lint`
- Key output: Exit code 0 (all passed)
- Evidence: Terminal output

### 2026-02-03 20:40 Storybook 浏览器测试
- Command: Browser navigation to `http://172.18.248.30:6006/?path=/story/features-versionhistorypanel--rich-version-info`
- Key output:
  - ✅ 选中版本白色边框（accent color）
  - ✅ AI 徽章保持蓝色
  - ✅ 版本元数据显示：原因 + 受影响段落数
  - ✅ 变更预览区域显示 diff 摘要
- Evidence: Screenshots captured via MCP browser tools
