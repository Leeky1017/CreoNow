# ISSUE-130

- Issue: #130
- Branch: task/130-character-manager-ui-fix
- PR: <fill-after-created>

## Plan

1. 修复 CharacterDetailDialog Footer 按钮样式
2. 修复 Storybook decorator 虚化问题
3. 新增 RoleSelector/GroupSelector/AddRelationshipPopover/DeleteConfirmDialog 组件
4. 补充 6 个 Storybook 交互场景

## Runs

### 2026-02-03 15:30 实现代码变更

#### Footer 按钮修复
- Command: `Edit CharacterDetailDialog.tsx`
- Changes:
  - Save Changes: 移除 `<SaveIcon />`, 改用 `variant="secondary"`
  - Delete: 用 `<span className="inline-flex items-center gap-1.5">` 包裹图标和文字

#### Storybook 渲染修复
- Command: `Edit CharacterPanel.stories.tsx`
- Changes:
  - 移除 decorator 中的 `opacity-30`
  - 添加 `min-h-[700px]`
  - 背景颜色改为 `/20` 和 `/50` 透明度

#### 新增组件
- `RoleSelector.tsx` - 角色类型选择 Popover
- `GroupSelector.tsx` - 分组选择 Popover
- `AddRelationshipPopover.tsx` - 添加关系两步选择流程
- `DeleteConfirmDialog.tsx` - 删除确认弹窗

#### types.ts 更新
- 添加 `GROUP_OPTIONS` 常量

#### index.ts 更新
- 导出所有新组件

#### Storybook 新场景
- `RoleSelectorOpen` - 角色类型选择器交互
- `GroupSelectorOpen` - 分组选择器交互
- `AddingRelationshipFlow` - 添加关系完整流程
- `DeleteConfirmation` - 删除确认弹窗
- `AvatarHoverState` - 头像 hover 状态

### 2026-02-03 15:34 验证

- Command: `npx tsc --noEmit`
- Key output: `Exit code: 0` (编译通过)

- Command: `npx eslint renderer/src/features/character/*.tsx --max-warnings=0`
- Key output: `Exit code: 0` (无 lint 错误)

- Command: `npx vitest run renderer/src/features/character/*.test.tsx`
- Key output: `16 passed (16)` (所有测试通过)

### 2026-02-03 15:37 浏览器验证

- URL: `http://172.18.248.30:6015/`
- Evidence: Screenshots captured
- Verified stories:
  - RoleSelectorOpen: ✅ 显示 PROTAGONIST 标签
  - DeleteConfirmation: ✅ 显示确认弹窗
  - DefaultWithData: ✅ 角色列表正确分组，背景不再虚化
  - AddingRelationshipFlow: ✅ 显示 "+ Add Relation" 和关系列表
