# Proposal: issue-113-p4-command-palette

## Why
当前 CommandPalette 是极简占位版本（仅一个 Card + 一个 ListItem），与设计稿 `17-command-palette.html` 差距较大：
- 无搜索输入框
- 无分组显示
- 无键盘导航
- 无 Active 状态指示器
- 无底部键盘提示

需要完整复刻设计稿规格，提供专业级的命令面板体验。

## What Changes
- **组件重写**：`CommandPalette.tsx` 按设计稿三段式布局重写（Header/Body/Footer）
- **新增功能**：
  - 搜索输入框（带图标，实时过滤）
  - 分组显示（Recent Files / Suggestions）
  - 键盘导航（↑↓ 移动，Enter 确认，Esc 关闭）
  - Active 状态指示器（左侧蓝色竖条）
  - 搜索高亮
  - 底部键盘提示
- **Story 补充**：覆盖默认状态、搜索状态、空结果状态
- **测试补充**：键盘导航、搜索过滤、命令执行

## Impact
- Affected specs:
  - `rulebook/tasks/issue-113-p4-command-palette/specs/creonow-v1-workbench/spec.md`
- Affected code:
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.stories.tsx`
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.test.tsx`
- Breaking change: NO（API 保持兼容：`open`, `onOpenChange`）
- User benefit:
  - 专业级命令面板体验
  - 键盘优先的快速操作
  - 可发现的命令入口
