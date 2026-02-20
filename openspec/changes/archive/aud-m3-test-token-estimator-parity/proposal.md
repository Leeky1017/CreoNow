# 提案：aud-m3-test-token-estimator-parity

## Why（问题与目标）

测试环境的 LLM mock 若采用与生产不同的 token 估算口径，会出现“测试绿灯掩盖生产漂移”的风险：complete/stream 的 tokens 统计不一致，导致上层（如 UI usage stats / budget）在真实运行时出现偏差。

本 change 的目标是让测试侧 mock 的 token 统计与生产共享估算器 `@shared/tokenBudget` 对齐，并用最小回归测试覆盖 ASCII、UTF-8 多字节与空输出三类边界。

## What（交付内容）

- `createMockLlmClient` 的 token 统计必须使用生产同源估算器 `estimateUtf8TokenCount`。
- complete 与 stream 两条路径的 token 统计必须一致：
  - `completed.tokens === estimateUtf8TokenCount(output)`
  - `streamed.totalTokens === estimateUtf8TokenCount(output)`
- 新增回归测试：`apps/desktop/tests/unit/llm-mock-token-estimator-parity.spec.ts`
  - 覆盖 Scenario `AIS-AUD-M3-S1..S3`（对应注释 `AUD-M3-S1..S3`）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-m3-test-token-estimator-parity/specs/ai-service/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/llm-mock-token-estimator-parity.spec.ts`

## Out of Scope（不做什么）

- 不在本 change 内更换 token 估算算法（仅对齐口径与调用点）。
- 不在本 change 内引入新的 mock 行为（仅锁定 tokens 统计一致性）。

## Evidence（可追溯证据）

- Wave1 RUN_LOG：`openspec/_ops/task_runs/ISSUE-591.md`
- Wave1 PR：https://github.com/Leeky1017/CreoNow/pull/592

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
