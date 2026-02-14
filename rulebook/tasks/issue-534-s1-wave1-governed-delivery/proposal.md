# Proposal: issue-534-s1-wave1-governed-delivery

## Why

需要把 `openspec/changes/EXECUTION_ORDER.md` 中 Wave 1 的四个 change 一次性落地并完成主会话审计，消除跨层导入脆弱性、关键循环依赖和 scheduler 错误上下文丢失，确保后续 Wave 2/3 可在稳定基线继续推进。

## What Changes

- 完成 `s1-path-alias`：建立 `@shared/*` 别名、补齐构建/测试解析、批量迁移 shared 深层相对导入。
- 完成 `s1-break-context-cycle`：提取 `services/context/types.ts` 与 `utils/formatEntity.ts`，修复 fetcher 反向依赖。
- 完成 `s1-break-panel-cycle`：提取 `OpenSettingsContext`，解除 `RightPanel` 与 `AiPanel` 的循环依赖并保留兼容导出。
- 完成 `s1-scheduler-error-ctx`：为 response/completion 异常保留结构化上下文并保证终态单次收敛。
- 补齐对应 Red/Green 测试、更新 change `tasks.md`、归档 4 个已完成 change，并同步 `EXECUTION_ORDER.md`。

## Impact

- Affected specs:
  - `openspec/changes/archive/s1-path-alias/**`
  - `openspec/changes/archive/s1-break-context-cycle/**`
  - `openspec/changes/archive/s1-break-panel-cycle/**`
  - `openspec/changes/archive/s1-scheduler-error-ctx/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/services/context/**`
  - `apps/desktop/main/src/services/skills/skillScheduler.ts`
  - `apps/desktop/renderer/src/components/layout/RightPanel.tsx`
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apps/desktop/renderer/src/contexts/OpenSettingsContext.ts`
  - `apps/desktop/**`（shared import 路径迁移与别名适配）
- Breaking change: NO
- User benefit: 更稳定的构建与测试链路、更清晰的模块依赖边界、失败可诊断性提升。
