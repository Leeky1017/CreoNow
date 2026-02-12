# Proposal: issue-468-p1-identity-template

## Why
`openspec/changes/p1-identity-template` 仍处于活跃目录且 `tasks.md` 的 Red/Green/Evidence 为空，无法满足 OpenSpec + Rulebook 交付门禁。
同时历史入口 issue #456 已关闭，按照治理规则必须切换到新的 OPEN Issue 重新收口并提供可验证证据。

## What Changes
- 创建并绑定 OPEN Issue #468，作为当前交付入口。
- 补齐 `p1-identity-template` 的 TDD 证据：先 Red（失败），再 Green（通过）。
- 收紧 `identityPrompt` 测试断言，按 XML 区块提取后验证 S1/S2/S3，并补充写作素养术语覆盖。
- 更新 `GLOBAL_IDENTITY_PROMPT` 的写作素养术语（`narrative structure`、`characterization`）以满足新增断言。
- 补齐 Rulebook task / RUN_LOG / change tasks 文档并执行校验。
- 完成本 change 后按规则归档到 `openspec/changes/archive/`。

## Impact
- Affected specs:
  - `openspec/changes/p1-identity-template/tasks.md`
  - `openspec/_ops/task_runs/ISSUE-468.md`
- Affected code:
  - `apps/desktop/main/src/services/ai/identityPrompt.ts`
  - `apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts`
- Breaking change: NO
- User benefit: `GLOBAL_IDENTITY_PROMPT` 语义更明确，且 change 文档完成闭环，可按治理门禁交付。
