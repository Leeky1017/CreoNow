# Proposal: issue-402-skill-system-p1-trigger-scope-management

## Why

`openspec/changes/skill-system-p1-trigger-scope-management` 目前仍处于待实施状态：AI 面板中的 Skill 入口未按作用域分组展示，缺少“自定义技能空状态”与“项目级覆盖标识”，技能选择也未形成“选择即执行”的闭环；同时，规范要求的启停与升降契约（`skill:registry:toggle` 对齐主规范 `skill:toggle` 语义 + `skill:custom:update`）尚未落地。若不完成该阶段，`skill-system-p2~p4` 将缺乏稳定的触发与作用域基线。

## What Changes

- 实现 Skill 面板的分类展示（builtin/global/project）、空状态与禁用态样式。
- 实现“项目级覆盖全局级”的作用域解析与面板标识。
- 对齐 `skill:registry:toggle` IPC 通道（语义对齐主规范 `skill:toggle`），用于启停持久化。
- 新增 `skill:custom:update` IPC 通道，支持 `project -> global` 与 `global -> project` 作用域升降。
- 更新 AiPanel 交互：选择技能后自动判断输入来源并触发执行。
- 为上述场景补齐 Red→Green 测试与 Storybook 场景。

## Impact

- Affected specs:
  - `openspec/changes/skill-system-p1-trigger-scope-management/proposal.md`
  - `openspec/changes/skill-system-p1-trigger-scope-management/tasks.md`
  - `openspec/changes/skill-system-p1-trigger-scope-management/specs/skill-system-delta.md`
- Affected code:
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apps/desktop/renderer/src/features/ai/SkillPicker.tsx`
  - `apps/desktop/renderer/src/features/ai/SkillPicker.stories.tsx`
  - `apps/desktop/main/src/ipc/skills.ts`
  - `apps/desktop/main/src/services/skills/skillService.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/**`
- Breaking change: NO（保留 `skill:registry:toggle` 兼容通道）
- User benefit: 用户可以在 AI 面板内稳定地按作用域调用技能，明确看到覆盖关系，并直接管理启停与作用域升降。
