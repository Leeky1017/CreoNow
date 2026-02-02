# ISSUE-101
- Issue: #101
- Branch: task/101-p4-panel-components
- PR: https://github.com/Leeky1017/CreoNow/pull/103

## Plan
- 为 9 个面板组件创建 Story（FileTreePanel, AiPanel, MemoryPanel, ContextViewer, SkillPicker, CommandPalette, CreateProjectDialog, SearchPanel, DiffView）
- 为所有面板组件创建测试覆盖边界情况
- 使用浏览器验证 Storybook 渲染正确

## Runs
### 2026-02-02 Phase 4 面板组件 Story + 测试
- Command: `gh issue create`
- Key output: Issue #101 created
- Evidence: https://github.com/Leeky1017/CreoNow/issues/101

### 2026-02-02 实现 Story + 测试
- 创建 9 个面板组件 Story 文件：FileTreePanel, AiPanel, MemoryPanel, ContextViewer, SkillPicker, CommandPalette, CreateProjectDialog, SearchPanel, DiffView
- 创建 9 个面板组件测试文件
- Command: `pnpm vitest run`
- Key output: `Test Files  36 passed (36), Tests  804 passed (804)`

### 2026-02-02 验证 Storybook 构建
- Command: `pnpm storybook:build`
- Key output: 所有 9 个面板组件 Story 正确注册
- Evidence: features-filetreepanel, features-aipanel, features-memorypanel, features-contextviewer, features-skillpicker, features-commandpalette, features-createprojectdialog, features-searchpanel, features-diffview

### 2026-02-02 FileTreePanel Rename 溢出 + 菜单交互修复
- Notes:
  - 修复 Rename 输入框溢出（`min-w-0` + `overflow-hidden`，按钮 `shrink-0`）
  - Rename/Delete 通过右键 ContextMenu + `⋯` Popover 提供（不再 inline）
  - `Button` / `ListItem` 改为 `forwardRef` 以兼容 Radix `asChild` 触发器
  - 移除 Story/Test 的 `@ts-nocheck` 并补齐类型
  - 从 git 中移除 `apps/desktop/storybook-static/`，并在 `.gitignore` 忽略
- Command: `git rm -r -f apps/desktop/storybook-static`
- Key output: removed storybook-static from git index/working tree

### 2026-02-02 Rulebook task + Spec delta
- Command: `rulebook task create issue-101-p4-panel-components && rulebook task validate issue-101-p4-panel-components`
- Key output: `Task issue-101-p4-panel-components is valid`
- Evidence: `rulebook/tasks/issue-101-p4-panel-components/`

### 2026-02-02 质量门禁（typecheck/lint/test/storybook）
- Command: `pnpm install`
- Key output: `Packages: +2`
- Command: `pnpm typecheck`
- Key output: success
- Command: `pnpm lint`
- Key output: success
- Command: `pnpm test:run`
- Key output: `Test Files  36 passed (36), Tests  804 passed (804)`
- Command: `pnpm storybook:build`
- Key output: success（output: `apps/desktop/storybook-static`, 已忽略且不入库）

### 2026-02-02 组件功能优化（设计稿对齐）

**DiffView 红绿高亮**
- 解析 unified diff 文本，按行分类（added/removed/context/header）
- 添加行使用绿色背景（`--color-success-subtle`）
- 删除行使用红色背景 + 删除线（`--color-error-subtle`）
- Evidence: `apps/desktop/renderer/src/features/ai/DiffView.tsx`

**AiPanel 清理调试元素**
- 移除 Stream checkbox
- 清理 placeholder 文案
- 添加状态 Badge（Ready/Generating/Processing）
- 添加空状态提示
- Evidence: `apps/desktop/renderer/src/features/ai/AiPanel.tsx`

**SearchPanel 按设计稿重新实现**
- 按 `design/Variant/designs/25-search-panel.html` 完全重写
- Glass panel 模态弹窗风格（#0f0f0f 背景，rgba(255,255,255,0.06) 边框）
- 分类标签（All/Documents/Memories/Knowledge/Assets）
- 过滤选项（Semantic Search/Include Archived/Scope）
- 分组结果（Documents/Memories/Knowledge Graph）
- 结果卡片（图标、标题、匹配度、摘要、路径）
- 键盘快捷键提示
- Mock 数据展示（MOCK_SEARCH_RESULTS）
- Evidence: `apps/desktop/renderer/src/features/search/SearchPanel.tsx`

**验证**
- Command: `npx tsc --noEmit --skipLibCheck`
- Key output: Exit code 0
- Storybook 浏览器验证：DiffView 红绿高亮、AiPanel Ready Badge、SearchPanel 模态弹窗全部正常
