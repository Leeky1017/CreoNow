# Proposal: issue-266-db-native-binding-doctor

## Why
Issue #266 显示 AI 面板在 DB 初始化失败时仅报 `DB_ERROR`，缺少可操作修复指引。需把 native 绑定异常转为可判定诊断并直达 UI。

## What Changes
- 增加 DB native doctor（分类 + remediation）。
- 为 AI 相关 IPC 的 `DB_ERROR` 增加诊断 details。
- 在 AI 面板错误卡片展示修复命令与重启指引。
- 增加 `desktop:rebuild:native` 脚本作为统一入口。

## Impact
- Affected specs:
  - `openspec/changes/db-native-binding-doctor/specs/ai-service/spec.md`
  - `openspec/changes/db-native-binding-doctor/specs/ipc/spec.md`
- Affected code:
  - `apps/desktop/main/src/db/init.ts`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/main/src/ipc/aiProxy.ts`
  - `apps/desktop/main/src/ipc/skills.ts`
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `package.json`
- Breaking change: NO
- User benefit: DB native 问题可直接自助修复，减少“只见 DB_ERROR 不知怎么修”的阻塞。

