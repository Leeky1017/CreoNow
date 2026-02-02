# ISSUE-104

- Issue: #104
- Branch: task/104-ai-panel-refactor
- PR: https://github.com/Leeky1017/CreoNow/pull/105

## Plan

- 重构 AI Panel 采用单向流式布局，Header/History/NewChat/Mode/Model/Skill 选择器
- 输入框撑满边栏，选择器从按钮正上方弹出（对齐 Cursor 设计）
- Storybook 验证 UI 交互

## Runs

### 2026-02-02 17:53 AI Panel 布局优化

- Command: `pnpm typecheck`
- Key output: 编译通过，无类型错误
- Changes:
  - `AiPanel.tsx`: 输入区 padding 从 `p-3` 改为 `px-1.5 pb-1.5 pt-2`，工具栏按钮各自包裹 `relative` 容器
  - `ModePicker.tsx`: 弹出位置改为 `bottom-full left-0 mb-1`（按钮正上方）
  - `ModelPicker.tsx`: 弹出位置改为 `bottom-full left-0 mb-1`（按钮正上方）
  - `SkillPicker.tsx`: 弹出位置改为 `bottom-full left-0 mb-1`（按钮正上方）
  - `ChatHistory.tsx`: 新增历史记录下拉组件
- Evidence: Storybook 截图验证通过
