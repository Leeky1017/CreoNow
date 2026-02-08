# Memory System — MS-4 Isolation & Degradation (Issue #324)

## Scope

- 作用域优先级：`project > global`，冲突时项目级覆盖。
- 规则提升：`memory:scope:promote`。
- 清除粒度：`memory:clear:project` / `memory:clear:all`，均需显式确认。
- 降级路径：向量召回故障、全部记忆不可用、蒸馏 IO 失败。

## Scenario Mapping

- MS4-R1-S1 → `apps/desktop/tests/integration/memory/scope-priority-project-over-global.test.ts`
- MS4-R1-S2 → `apps/desktop/tests/integration/memory/promote-project-rule.test.ts`
- MS4-R1-S3 → `apps/desktop/tests/integration/memory/clear-confirmation-flow.test.ts`
- MS4-R2-S1 → `apps/desktop/tests/integration/memory/degrade-vector-offline.test.ts`
- MS4-R2-S2 → `apps/desktop/tests/integration/memory/degrade-all-memory-unavailable.test.ts`
- MS4-X-S1 → `apps/desktop/tests/integration/memory/clear-all-confirm-required.test.ts`
- MS4-X-S2 → `apps/desktop/tests/integration/memory/degrade-on-distill-io-failure.test.ts`

## Acceptance

- 新增 IPC 通道：`memory:scope:promote`、`memory:clear:project`、`memory:clear:all`。
- 新增错误码：`MEMORY_CLEAR_CONFIRM_REQUIRED`。
- `memory:episode:query` 在降级场景可返回可判定 `memoryDegraded/fallbackRules`，不阻断主流程。
- `typecheck`、`lint`、`test:unit`、`test:integration` 通过。
