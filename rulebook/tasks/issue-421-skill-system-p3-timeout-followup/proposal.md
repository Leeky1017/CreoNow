# Proposal: issue-421-skill-system-p3-timeout-followup

## Why

`#419` 合并后，Windows E2E 中 `ai runtime: timeout` 用例与当前错误码/超时配置语义不一致，导致 `windows-e2e` 失败。需要补齐 timeout 兼容行为并同步 E2E 断言，确保门禁可通过且行为与 P3 调度器语义一致。

## What Changes

- 在 `aiService` 中调整技能超时解析：
  - 优先使用 `runSkill.timeoutMs`；
  - 若未提供且设置了 `CREONOW_AI_TIMEOUT_MS`，使用该环境值作为回退；
  - 否则使用默认 `30000ms`（并保持 `120000ms` 上限）。
- 在 AI 面板错误映射中将 `SKILL_TIMEOUT` 归类为 timeout 类型展示。
- 将 Windows E2E 超时断言更新为 `SKILL_TIMEOUT`，与新错误码保持一致。

## Impact

- Affected specs:
  - 无新增 spec；本修复对齐已归档 `skill-system-p3-scheduler-concurrency-timeout` 语义与 CI 用例
- Affected code:
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apps/desktop/tests/e2e/ai-runtime.spec.ts`
- Breaking change: NO
- User benefit: timeout 行为与 UI/测试一致，`windows-e2e` 门禁可通过，交付闭环可验证。
