# ISSUE-106
- Issue: #106
- Branch: task/106-skill-uppercase-storybook
- PR: https://github.com/Leeky1017/CreoNow/pull/107

## Plan
- SKILL 统一改为全大写
- 静态 Demo Story 重命名并添加注释说明

## Runs
### 2026-02-02 18:15 SKILL 大写 + Storybook 改进
- Command: `pnpm typecheck`
- Key output: 编译通过
- Changes:
  - `AiPanel.tsx`: "Skill" → "SKILL"
  - `SkillPicker.tsx`: aria-label "Skill" → "SKILL"
  - `AiPanel.stories.tsx`: 
    - "Skill" → "SKILL" (2 处)
    - `WithConversation` → `ConversationStatic`
    - `Streaming` → `StreamingStatic`
    - `WithHistoryDropdown` → `HistoryDropdownStatic`
    - 添加注释说明静态展示
