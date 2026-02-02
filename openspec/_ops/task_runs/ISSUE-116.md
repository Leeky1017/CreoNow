# ISSUE-116

- Issue: #116
- Branch: task/116-memorypanel-ui-dialog
- PR: https://github.com/Leeky1017/CreoNow/pull/117

## Plan

- MemoryPanel UI 重构：Settings/Create 移至对话框
- 移除 Injection Preview（V1 不需要）
- 记忆列表占据主要空间

## Runs

### 2026-02-03 00:30 MemoryPanel UI 重构

**变更内容**：

1. **新增组件**：
   - `MemorySettingsDialog.tsx` - 设置对话框（4 个设置项 + 帮助文本）
   - `MemoryCreateDialog.tsx` - 创建记忆对话框（类型选择 + 内容输入）
   - 对应测试文件和 Storybook stories

2. **MemoryPanel 布局重构**：
   - Header：添加齿轮图标按钮
   - 移除内联 Settings 区域
   - 移除 Injection Preview 区域
   - 记忆列表占据主要空间（flex-1）
   - 底部改为"+ 添加新记忆"按钮

3. **后端扩展**（从之前的工作）：
   - 新增 `0009_memory_document_scope.sql` 迁移
   - `memoryService.ts` 支持 document scope
   - IPC contract 更新

**测试验证**：

```bash
# 单元测试
pnpm test:run renderer/src/features/memory/MemoryPanel.test.tsx \
  renderer/src/features/memory/MemorySettingsDialog.test.tsx \
  renderer/src/features/memory/MemoryCreateDialog.test.tsx
# 结果: 39 passed

# 类型检查
pnpm tsc --noEmit
# 结果: 0 errors
```

**Storybook 视觉验证**：

- GlobalOnly story: 齿轮图标 ✓, 三层 tabs ✓, 记忆列表 ✓, 添加按钮 ✓
- 设置对话框: 4 个设置项 + 帮助文本 ✓
- 创建对话框: 类型选择 + 内容输入 + scope 提示 ✓
