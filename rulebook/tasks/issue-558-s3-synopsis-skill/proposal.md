# Proposal: issue-558-s3-synopsis-skill

## Why

Sprint 3 的 `s3-synopsis-skill` 需要新增内置 `synopsis` 技能，为后续摘要注入链路提供稳定输入。当前 builtin skills 尚无该技能，且未对摘要输出质量建立可测试约束。

## What Changes

- 新增 builtin 资产：`builtin:synopsis`（`SKILL.md`）。
- 扩展 skill loader / schema，支持并校验 `output` 约束配置。
- 扩展 skill executor，对 `synopsis` 结果实施 200-300 字、单段、无模板噪音约束。
- 按 S3-SYN-SKILL-S1/S2/S3 完成 Red → Green 测试闭环与证据落盘。

## Impact

- Affected specs:
  - `openspec/changes/s3-synopsis-skill/**`
- Affected code:
  - `apps/desktop/main/skills/packages/pkg.creonow.builtin/1.0.0/skills/synopsis/SKILL.md`
  - `apps/desktop/main/src/services/skills/*`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/tests/unit/skill-builtin-catalog.test.ts`
  - `apps/desktop/tests/unit/skill-executor.test.ts`
- Breaking change: NO
- User benefit:
  - 可稳定调用 `synopsis`，且摘要输出质量具备运行时约束与测试保障。
