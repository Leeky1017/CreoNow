# Proposal: issue-388-ai-service-p5-failover-quota-hardening

## Why

`openspec/changes/ai-service-p5-failover-quota-hardening` 已定义 AI Service P5 的稳定性与边界硬化要求，但当前代码尚未提供可验证的主备故障切换闭环、会话预算阻断、全 provider 降级错误语义，以及同会话并发/容量边界保护。若不完成本 change，下游门禁将无法证明 AI 链路在异常与高压场景下可判定且可恢复。

## What Changes

- 新增并落地 6 个 Scenario 的 TDD 映射测试（4 个主进程单元/集成 + 2 个集成边界）。
- 在 `aiService` 增加 provider 故障状态机（healthy/degraded/half-open）与 failover 探测路径，保证 trace 审计连续。
- 在 `ai:skill:run` 链路增加会话 token 预算（200000）与请求速率（60 req/min）双阈值守卫，超限返回固定错误码。
- 在主备 provider 同时不可用时返回 `AI_PROVIDER_UNAVAILABLE`，并保证编辑器可继续工作。
- 对 `ai:chat:send` 增加同会话单执行上限（其余入队）与消息容量上限（2000 条）阻断且不丢历史。
- 完成 change/Rulebook/RUN_LOG 证据、门禁与 `main` 收口归档。

## Impact

- Affected specs:
  - `openspec/changes/ai-service-p5-failover-quota-hardening/specs/ai-service-delta.md`
  - `openspec/changes/ai-service-p5-failover-quota-hardening/tasks.md`
- Affected code:
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/main/src/services/ai/__tests__/provider-failover-half-open.test.ts`
  - `apps/desktop/main/src/services/ai/__tests__/quota-rate-limit-guard.test.ts`
  - `apps/desktop/main/src/services/ai/__tests__/trace-audit-continuity.test.ts`
  - `apps/desktop/tests/integration/ai-provider-unavailable-degrade.test.ts`
  - `apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `apps/desktop/tests/integration/ai-chat-capacity-guard.test.ts`
- Breaking change: NO
- User benefit: AI 请求在故障和高压场景下具备可恢复、可阻断、可诊断的稳定行为，避免 silent failure 和链路漂移。
