# Proposal: issue-406-skill-system-p2-custom-skill-crud

## Why

`skill-system-p2-custom-skill-crud` 仍未交付，当前产品缺少自定义技能的完整生命周期能力：用户无法在统一界面中完成手动创建、AI 辅助创建、编辑与删除，也缺少对应的持久化与校验闭环。这会直接阻塞 Skill System 后续阶段（p3/p4）在真实用户场景中的可用性与可验证性。

## What Changes

- 在主进程补齐自定义技能 CRUD 能力（`create/list/update/delete`）与字段级校验，使用统一错误信封返回 `VALIDATION_ERROR`。
- 新增 SQLite 迁移 `custom_skills` 表，支持 `scope`、`inputType`、`contextRules`、启停状态与时间戳持久化。
- 扩展 IPC 契约与 handlers：`skill:custom:create`、`skill:custom:list`、`skill:custom:update`、`skill:custom:delete`。
- 更新技能执行链路，支持自定义技能 `inputType`（`selection`/`document`）驱动输入校验与上下文注入。
- 在渲染层新增 `SkillManagerDialog`，覆盖手动创建、AI 辅助生成草稿、编辑、删除确认流程、字段内联报错。
- 扩展测试：后端 IPC/service 行为测试 + 前端组件交互测试 + 契约生成产物更新。

## Impact

- Affected specs:
  - `openspec/changes/skill-system-p2-custom-skill-crud/proposal.md`
  - `openspec/changes/skill-system-p2-custom-skill-crud/tasks.md`
  - `openspec/changes/skill-system-p2-custom-skill-crud/specs/skill-system-delta.md`
- Affected code:
  - `apps/desktop/main/src/db/migrations/0016_skill_custom_crud.sql`
  - `apps/desktop/main/src/db/init.ts`
  - `apps/desktop/main/src/services/skills/skillService.ts`
  - `apps/desktop/main/src/services/skills/skillExecutor.ts`
  - `apps/desktop/main/src/ipc/skills.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apps/desktop/renderer/src/features/ai/SkillManagerDialog.tsx`
  - `apps/desktop/renderer/src/features/ai/SkillManagerDialog.test.tsx`
  - `apps/desktop/tests/unit/skill-scope-management.test.ts`
  - `packages/shared/types/ipc-generated.ts`
- Breaking change: NO
- User benefit: 用户可直接在 AI 面板链路内创建并管理自定义技能，且创建失败时能获得可定位字段的内联错误反馈，技能可立即出现在选择面板并执行。
