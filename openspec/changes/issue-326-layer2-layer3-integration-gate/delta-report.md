# Layer2 + Layer3 Integration Delta Report

- Date: 2026-02-09
- Scope: Document Management（Layer2）, Knowledge Graph / Project Management / Memory System（Layer3）
- Baseline Spec: `openspec/specs/cross-module-integration-spec.md`
- Contract SSOT: `apps/desktop/main/src/ipc/contract/ipc-contract.ts` + `packages/shared/types/ipc-generated.ts`

## Summary

- Implemented: 4
- Partial: 4
- Missing: 2

## Delta Table

| 条目                    | Spec 期望                                                                                     | 当前实现证据                                                                                                                                                                            | 状态                       | 后续动作                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------- | ------- | ---------------------------------- |
| Editor ↔ Memory 通道    | `memory:episode:record` / `memory:trace:get` / `memory:trace:feedback`                        | `apps/desktop/main/src/ipc/contract/ipc-contract.ts`；`apps/desktop/tests/integration/memory/trace-get-display.test.ts`；`apps/desktop/tests/integration/memory/trace-feedback.test.ts` | Implemented                | 继续在后续里程碑维持回归                                        |
| KG ↔ Context 查询通道   | `knowledge:query:relevant` / `knowledge:query:subgraph` / `knowledge:query:byIds`             | 实际为 `knowledge:query:byids`：`apps/desktop/main/src/ipc/contract/ipc-contract.ts`；`apps/desktop/tests/integration/kg/query-cross-project-guard.test.ts`                             | Partial                    | 统一大小写命名口径（spec 或实现二选一）                         |
| KG 降级行为             | KG 超时时 Context 继续执行并记录 warning                                                      | `apps/desktop/tests/integration/kg/query-cycle-timeout.test.ts`                                                                                                                         | Implemented                | 保持                                                            |
| PM 切换路径             | `project:*` 路径应支持项目切换关键链路                                                        | `project:project:switch`：`apps/desktop/main/src/ipc/contract/ipc-contract.ts`；`apps/desktop/tests/integration/project-switch.autosave.test.ts`                                        | Implemented                | 保持                                                            |
| AI Service ↔ Skill 通道 | `skill:execute` / `skill:stream:*` / `skill:cancel`                                           | 实际为 `ai:skill:run` / `ai:skill:stream` / `ai:skill:cancel`：`packages/shared/types/ai.ts`；`apps/desktop/main/src/ipc/ai.ts`                                                         | Partial                    | 定义迁移策略：统一命名或补别名                                  |
| 自由输入通道            | `ai:chat:send`                                                                                | 在契约中未找到：`apps/desktop/main/src/ipc/contract/ipc-contract.ts`                                                                                                                    | Missing                    | 新建后续实现任务或调整 spec 基线                                |
| 导出通道基线            | `export:*`（示例含 project 级）                                                               | 当前仅 `export:document:*`：`apps/desktop/main/src/ipc/contract/ipc-contract.ts`                                                                                                        | Partial                    | 明确是否需要 `export:project` 能力                              |
| 统一响应结构            | `{ success: true, data }                                                                      | { success: false, error }`                                                                                                                                                              | 当前为 `{ ok: true, data } | { ok: false, error }`：`packages/shared/types/ipc-generated.ts` | Partial | 统一到单一 envelope（spec 或实现） |
| 错误码基线（示例）      | `PROJECT_SWITCH_TIMEOUT`、`DOCUMENT_SAVE_CONFLICT`、`MEMORY_BACKPRESSURE`、`SKILL_TIMEOUT` 等 | 当前错误字典未包含这些示例：`packages/shared/types/ipc-generated.ts`                                                                                                                    | Partial                    | 调整示例表为“规范代码”或补实现                                  |
| 契约冲突阻断            | 重复通道应触发 `IPC_CONTRACT_DUPLICATED_CHANNEL`                                              | `apps/desktop/tests/unit/contract-generate.validation.spec.ts`                                                                                                                          | Implemented                | 保持                                                            |

## Full Test Gate Result (Milestone Check)

- `pnpm lint` -> PASS（存在 warning，无 error）
- `pnpm typecheck` -> PASS
- `pnpm test:unit` -> PASS
- `pnpm -C apps/desktop test:run` -> PASS（`86 files`, `1242 tests`）
- `pnpm test:integration` -> PASS
- `pnpm test:ipc:acceptance` -> PASS
- `pnpm contract:check` -> PASS
- `pnpm -C apps/desktop storybook:build` -> PASS
- `pnpm desktop:test:e2e` -> PASS（`50 passed`, `2 skipped`）

## Next Milestone Actions

1. 确认命名收敛方向：AI/Skill 通道是否统一到 `ai:skill:*`（建议）或迁回 `skill:*`。
2. 确认 envelope 收敛方向：`ok` vs `success` 二选一，不做双栈。
3. 明确 `ai:chat:send`、`export:project` 是“补实现”还是“下修 spec”。
4. 将错误码示例表改为可执行的受控清单（与 `ipc-generated` 同源）。
