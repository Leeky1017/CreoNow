# ISSUE-134

- Issue: #134
- Branch: task/134-character-detail-table-relations
- PR: https://github.com/Leeky1017/CreoNow/pull/135

## Plan

- 让 `CharacterDetailDialog` 的 “Add Relation” 在对话框内可用（选择角色 + 关系类型 + 写回列表）
- 增加“人物设定表格”字段：出生年月日、星座、特征、性格
- 补充 Storybook 场景/可视验证与单测

## Runs

### 2026-02-03 Profile 默认折叠 + 关系/表格可用性修复
- Command: `cd apps/desktop && npx tsc --noEmit`
- Key output: `exit 0`
- Evidence: `apps/desktop`

- Command: `cd apps/desktop && npx eslint renderer/src/features/character/CharacterDetailDialog.tsx renderer/src/features/character/CharacterDetailDialog.test.tsx --max-warnings=0`
- Key output: `exit 0`
- Evidence: `apps/desktop/renderer/src/features/character/CharacterDetailDialog.tsx`

- Command: `cd apps/desktop && npx vitest run renderer/src/features/character/*.test.tsx`
- Key output: `2 files passed, 18 tests passed`
- Evidence: `apps/desktop/renderer/src/features/character/CharacterDetailDialog.test.tsx`

- Notes:
  - `Profile` 默认折叠，折叠态展示摘要（Age/Birth/Zodiac/Archetype/Features/Traits），可展开查看/编辑完整表格
  - `Add Relation` 弹层在对话框内可见且可点击（选择人物 + 关系类型后写回列表）
  - 未再改动 `design/system/01-tokens.css`：改为在 `Select`/`Popover` 支持 `layer="modal"`，避免被 Dialog overlay 覆盖
