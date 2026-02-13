# P1+P2 集成检查（精简重构版）

> 基线：`origin/main@9aa7252`（PR `#510` 已合并，时间：2026-02-13）
> 目标：在进入 P3 前，快速判断“还缺什么、已经完成什么、证据在哪里”。

## 1. 没做测试 / 没完成的部分（优先处理）

| 优先级 | 项目                                                                           | 当前状态                         | 结论     |
| ------ | ------------------------------------------------------------------------------ | -------------------------------- | -------- |
| HIGH   | API Key 缺失错误码语义统一（`AI_PROVIDER_UNAVAILABLE` vs `AI_NOT_CONFIGURED`） | 代码仍在返回 `AI_NOT_CONFIGURED` | 未完成   |
| HIGH   | `buildLLMMessages` / `chatMessageManager` 主链路取舍（接入或移除）             | 仅在测试中被引用                 | 未完成   |
| HIGH   | G1：完整 `skill:run → context assemble → LLM(mock) → stream` 一体化测试        | 尚未形成独立集成用例             | 未完成   |
| HIGH   | G5：全降级（KG + Memory 不可用）但 AI 仍可用 的跨模块测试                      | 仅有 CE 层全 fetcher 降级用例    | 部分完成 |
| MEDIUM | G2/G3/G4（KG 变更联动、Key 存取到调用、多轮对话 trim）                         | 仍缺集成回归                     | 未完成   |
| MEDIUM | cross-module spec 中 Editor→Memory 相关场景                                    | 标注为 P3/P4                     | 未实现   |
| MEDIUM | NFR：契约冲突阻断 / 高并发链路一致性                                           | 尚未有明确验证结论               | 未验证   |
| MEDIUM | 真实 LLM（DeepSeek）L1-L5 自动化沉淀                                           | 当前为手工验证记录               | 未完成   |

## 2. 已经完成的部分（代码 + 测试）

| 项目                                                       | 当前状态 | 证据                                                                                                                                |
| ---------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 运行时 identity prompt 接入主链路                          | 已完成   | `apps/desktop/main/src/services/ai/aiService.ts`（`combineSystemText` 调用 `assembleSystemPrompt` 并注入 `GLOBAL_IDENTITY_PROMPT`） |
| stream / non-stream 请求均带 identity 层                   | 已完成   | `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts`（AIS-RUNTIME-S1/S2）                                     |
| stream 超时收敛为 `done(error: SKILL_TIMEOUT)`             | 已完成   | `apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`（AIS-TIMEOUT-S1）                                                      |
| Context Engine 全层 fetcher 异常仍可返回 prompt + warnings | 已完成   | `apps/desktop/tests/unit/context/layer-degrade-warning.test.ts`（CE-DEGRADE-S1）                                                    |
| IPC 契约与 cross-module 门禁                               | 已通过   | `pnpm contract:check`、`pnpm cross-module:check`，记录见 `openspec/_ops/task_runs/ISSUE-509.md`                                     |
| 交付门禁（ci / openspec-log-guard / merge-serial）         | 已通过   | PR `#510`：`https://github.com/Leeky1017/CreoNow/pull/510`                                                                          |

## 3. 索引（快速检索）

- [4. 证据：代码路径](#4-证据代码路径)
- [5. 证据：测试与门禁](#5-证据测试与门禁)
- [6. 真实 LLM 手工验证](#6-真实-llm-手工验证)
- [7. 后续建议（最小闭环）](#7-后续建议最小闭环)

## 4. 证据：代码路径

- AI 运行时组装：`apps/desktop/main/src/services/ai/aiService.ts`
- Identity 模板：`apps/desktop/main/src/services/ai/identityPrompt.ts`
- Prompt 组装器：`apps/desktop/main/src/services/ai/assembleSystemPrompt.ts`
- Context 组装服务：`apps/desktop/main/src/services/context/layerAssemblyService.ts`
- IPC 合约定义：`apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- IPC 生成类型：`packages/shared/types/ipc-generated.ts`

## 5. 证据：测试与门禁

- 关键新增/关键回归测试
  - `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts`
  - `apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`
  - `apps/desktop/tests/unit/context/layer-degrade-warning.test.ts`
- 交付运行日志：`openspec/_ops/task_runs/ISSUE-509.md`
- PR 与 CI：`https://github.com/Leeky1017/CreoNow/pull/510`

## 6. 真实 LLM 手工验证

当前结论：L1-L5 手工验证记录为通过（见旧版检查记录与 ISSUE-509 上下文），但尚未自动化纳入 CI/集成测试。

| 场景                   | 状态     |
| ---------------------- | -------- |
| L1 API 连通性          | 手工通过 |
| L2 Streaming 链路      | 手工通过 |
| L3 Context 注入可见性  | 手工通过 |
| L4 超时处理            | 手工通过 |
| L5 Non-stream fallback | 手工通过 |

## 7. 后续建议（最小闭环）

1. 先统一 API Key 缺失错误码语义（Spec 与实现二选一对齐）。
2. 明确 `buildLLMMessages` / `chatMessageManager` 方向：接入主链路或删除死路径。
3. 补 G1 + G5 的自动化集成用例，再扩展 G2/G3/G4。
4. 将 L1-L5 从手工脚本沉淀为可复跑测试（保持 CI 用 mock，本地可选真 LLM）。
