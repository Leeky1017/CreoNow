# Proposal: issue-513-p1p2-integration-closeout

## Why

`docs/plans/p1p2-integration-check.md` 仍标记多项 HIGH/MEDIUM 未完成（错误码语义、主链路接入、G1/G2/G3/G4/G5 自动化）。本任务用于在进入 P3 前完成闭环，消除“规范与主链路不一致”的遗留风险。

## What Changes

- 统一 `runSkill` 缺失 Provider 凭据错误码语义。
- 将 `buildLLMMessages` / `chatMessageManager` 接入 AI 运行时请求主链路。
- 补齐 G1/G2/G3/G4/G5 自动化集成测试并修复实现缺口。

## Impact

- Affected specs:
  - `openspec/specs/ai-service/spec.md`（delta）
  - `openspec/specs/cross-module-integration-spec.md`（delta）
- Affected code:
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/tests/integration/ai-skill-context-integration.test.ts`
  - `package.json`
- Breaking change: NO
- User benefit: P1/P2 集成链路可复跑、可追溯、可在 CI 中防回归
