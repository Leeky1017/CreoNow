# Proposal: issue-509-ai-runtime-identity-tests

## Why

P1+P2 集成复核确认 `assembleSystemPrompt` / `GLOBAL_IDENTITY_PROMPT` 仍未进入 `aiService.runSkill` 的真实请求组装链路，导致运行时 system prompt 缺失身份层。同时，部分已人工验证的关键降级行为尚未沉淀为自动化回归测试，存在后续回归风险。

## What Changes

- 在 AI 运行时请求组装中接入 `assembleSystemPrompt`，确保 identity/rules/skill/mode/memory/context 分层拼接进入 provider 请求。
- 新增回归测试覆盖：
  - streaming timeout 必须收敛为 `done(error: SKILL_TIMEOUT)`
  - Context Engine 全层 fetcher 降级时仍返回可用 prompt 与 warnings

## Impact

- Affected specs: `openspec/specs/ai-service/spec.md`, `openspec/specs/context-engine/spec.md`（通过 delta）
- Affected code:
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/main/src/services/ai/__tests__/*`
  - `apps/desktop/tests/integration/*`
  - `apps/desktop/tests/unit/context/*`
- Breaking change: NO
- User benefit: AI 生成链路稳定包含身份约束，关键降级/超时行为具备可持续回归保障
