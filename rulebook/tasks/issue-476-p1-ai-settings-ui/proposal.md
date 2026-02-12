# Proposal: issue-476-p1-ai-settings-ui

## Why

`openspec/changes/p1-ai-settings-ui` 仍处于活跃目录且 `tasks.md` 未完成，缺少可审计的 Red/Green 证据与交付收口。需要在不扩展范围的前提下，完成该 change 的场景覆盖、文档证据、门禁校验与主干合并。

## What Changes

- 对齐 `p1-ai-settings-ui` 场景 S0-S6，补齐并校验 `AiSettingsSection` 测试映射
- 按 TDD 记录 Red -> Green -> Refactor 证据并更新 change `tasks.md`
- 新增并维护 `openspec/_ops/task_runs/ISSUE-476.md` 记录关键命令与结果
- 完成交付门禁（preflight + required checks + auto-merge）并收口控制面 `main`
- 在 change 完成后归档 `p1-ai-settings-ui` 并同步 `openspec/changes/EXECUTION_ORDER.md`

## Impact

- Affected specs:
  - `openspec/changes/p1-ai-settings-ui/tasks.md`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/archive/...`（归档后路径）
- Affected code:
  - `apps/desktop/renderer/src/features/settings/AiSettingsSection.tsx`
  - `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx`
  - `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.tsx`
  - `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.test.tsx`
- Breaking change: NO
- User benefit: AI 设置面板 change 完成交付闭环并可审计。
