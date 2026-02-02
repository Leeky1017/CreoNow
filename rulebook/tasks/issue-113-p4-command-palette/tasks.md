## 1. Implementation

- [ ] 1.1 重写 `CommandPalette.tsx`：
  - [ ] 1.1.1 Header：搜索图标 + 输入框（56px 高度，底部边框）
  - [ ] 1.1.2 Body：分组列表（可滚动，max-height 424px）
  - [ ] 1.1.3 Footer：键盘提示（↑↓ 导航 / ↵ 选择 / esc 关闭）
  - [ ] 1.1.4 列表项：图标 + 文本 + 路径 + 快捷键
  - [ ] 1.1.5 Active 状态：左侧 2px 蓝色竖条
  - [ ] 1.1.6 搜索过滤：实时过滤命令/文件
  - [ ] 1.1.7 搜索高亮：匹配文字高亮
  - [ ] 1.1.8 键盘导航：↑↓ 移动，Enter 确认，Esc 关闭
- [ ] 1.2 创建 `CommandPalette.stories.tsx`：
  - [ ] 1.2.1 Default Story：默认状态（Recent Files + Suggestions）
  - [ ] 1.2.2 Searching Story：搜索状态（带过滤结果）
  - [ ] 1.2.3 Empty Story：空结果状态
- [ ] 1.3 更新 `CommandPalette.test.tsx`：
  - [ ] 1.3.1 测试键盘导航（↑↓ 移动选中项）
  - [ ] 1.3.2 测试搜索过滤（输入关键词过滤列表）
  - [ ] 1.3.3 测试命令执行（Enter 确认执行）
  - [ ] 1.3.4 测试关闭（Esc 关闭面板）

## 2. Testing

- [ ] 2.1 `pnpm typecheck`
- [ ] 2.2 `pnpm lint`
- [ ] 2.3 `pnpm test:run`
- [ ] 2.4 `pnpm storybook:build`
- [ ] 2.5 Browser：验证 Storybook 中 CommandPalette Stories 符合设计稿

## 3. Documentation

- [ ] 3.1 更新 `openspec/_ops/task_runs/ISSUE-113.md` Runs（仅追加不回写）
