# Spec Delta Reference: context-engine (ISSUE-359)

## Scope

Apply `openspec/changes/context-engine-p1-token-budget-truncation` with strict TDD evidence:

- 固化预算比例与最小保障：`Rules/Settings/Retrieved/Immediate = 15/10/25/50` 与 `500/200/0/2000`。
- 固化裁剪顺序：`Retrieved -> Settings -> Immediate`，`Rules` 不可进入通用裁剪链路。
- 落地预算 IPC：`context:budget:get` 与 `context:budget:update`。
- 固化失败码：`CONTEXT_BUDGET_INVALID_RATIO`、`CONTEXT_BUDGET_INVALID_MINIMUM`、`CONTEXT_BUDGET_CONFLICT`、`CONTEXT_TOKENIZER_MISMATCH`。

## Scenario Mapping

- CE2-R1-S1 → `apps/desktop/tests/unit/context/token-budget-within-limit.test.ts`
- CE2-R1-S2 → `apps/desktop/tests/unit/context/token-budget-truncation-order.test.ts`
- CE2-R1-S3 → `apps/desktop/tests/unit/context/token-budget-update-conflict.test.ts`
