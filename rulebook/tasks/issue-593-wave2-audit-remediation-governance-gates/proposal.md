# Proposal: issue-593-wave2-audit-remediation-governance-gates

## Why

Wave1 已合并，但审计报告在 Wave2 仍有四项关键缺口（`aud-c1c`、`aud-c2c`、`aud-h6a`、`aud-m5`）未收口：renderer fire-and-forget 缺少 lint 级兜底、测试发现/执行一致性门禁未进入 CI、aiService 第一阶段拆分未落地、coverage gate 与 artifact 未纳入持续门禁。若不在同一治理链路完成，将继续形成“表面绿灯但隐性漂移”的交付风险。

## What Changes

- `aud-c1c`：新增 renderer `void (async () => ...)()` lint 禁令，落地 `runFireAndForget` 并替换现有关键入口。
- `aud-c2c`：新增 discovered vs executed 一致性 gate 脚本，接入 root script 与 CI job。
- `aud-h6a`：从 `aiService.ts` 抽离 payload 解析器模块，补齐等价行为测试。
- `aud-m5`：新增 `coverage-gate` CI job + coverage artifact 上传，并纳入 `ci` 聚合依赖。

## Impact

- Affected specs:
  - `openspec/changes/aud-c1c-renderer-fireforget-lint-guard/tasks.md`
  - `openspec/changes/aud-c2c-executed-vs-discovered-gate/tasks.md`
  - `openspec/changes/aud-h6a-main-service-decomposition/tasks.md`
  - `openspec/changes/aud-m5-coverage-gate-artifacts/tasks.md`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `.eslintrc.cjs`
  - `apps/desktop/renderer/src/lib/fireAndForget.ts`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apps/desktop/renderer/src/features/settings/JudgeSection.tsx`
  - `scripts/test-discovery-consistency-gate.ts`
  - `package.json`
  - `.github/workflows/ci.yml`
  - `apps/desktop/main/src/services/ai/aiPayloadParsers.ts`
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/vitest.config.ts`
- Breaking change: NO
- User benefit: Wave2 四项审计问题形成可验证闭环，门禁从“靠人为约定”升级为“脚本与 CI 强约束”。
