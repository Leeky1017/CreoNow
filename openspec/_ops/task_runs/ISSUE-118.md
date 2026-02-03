# ISSUE-118

- Issue: #118
- Branch: task/118-create-project-dialog
- PR: <fill-after-created>

## Plan

- 扩展 Radio 组件，新增 RadioCardGroup 卡片式选择变体
- 新建 ImageUpload 组件，支持拖拽上传/预览/移除
- 实现模板系统（预设 + 自定义模板 CRUD）
- 重构 CreateProjectDialog，集成表单 + 模板选择 + 创建模板入口
- 完善 Storybook Story + 测试用例
- 通过浏览器 Storybook 完整验收所有组件

## Runs

### 2026-02-03 Setup

- Command: `gh issue create`, `scripts/agent_worktree_setup.sh 118 create-project-dialog`
- Key output: Issue #118 created, worktree at `.worktrees/issue-118-create-project-dialog`
- Evidence: Branch `task/118-create-project-dialog`

### 2026-02-03 Implementation

**RadioCardGroup 组件**
- Command: `pnpm vitest run renderer/src/components/primitives/Radio.test.tsx`
- Key output: 33 tests passed
- Evidence: `apps/desktop/renderer/src/components/primitives/Radio.tsx`

**ImageUpload 组件**
- Command: `pnpm vitest run renderer/src/components/primitives/ImageUpload.test.tsx`
- Key output: 19 tests passed
- Evidence: `apps/desktop/renderer/src/components/primitives/ImageUpload.tsx`

**Template System**
- Command: `pnpm vitest run renderer/src/features/projects/CreateTemplateDialog.test.tsx`
- Key output: 14 tests passed
- Evidence: `apps/desktop/renderer/src/stores/templateStore.ts`, `apps/desktop/renderer/src/features/projects/CreateTemplateDialog.tsx`

**CreateProjectDialog 重构**
- Command: `pnpm vitest run renderer/src/features/projects/CreateProjectDialog.test.tsx`
- Key output: 19 tests passed
- Evidence: `apps/desktop/renderer/src/features/projects/CreateProjectDialog.tsx`

**Lint 验证**
- Command: `pnpm lint`
- Key output: No errors

**Storybook 构建验证**
- Command: `pnpm storybook:build`
- Key output: All stories built successfully (7.74s)
- Evidence: `storybook-static/` directory created

**总测试**
- Command: `pnpm vitest run` (相关测试文件)
- Key output: 85 tests passed (4 files)
