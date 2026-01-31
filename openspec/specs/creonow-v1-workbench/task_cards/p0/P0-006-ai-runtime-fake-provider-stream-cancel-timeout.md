# P0-006: AI runtime（Fake AI server + stream/cancel/timeout/upstream-error）

Status: done

## Goal

交付可测试的 AI 运行时：`ai:skill:run/cancel/feedback` + stream events；并提供 Fake AI server，使 Windows CI 上无需真实网络/真实 key 即可覆盖 success/delay/timeout/upstream-error 四条路径。

## Dependencies

- Spec: `../spec.md#cnwb-req-050`
- Spec: `../spec.md#cnwb-req-120`
- Design: `../design/09-ai-runtime-and-network.md`
- Design: `../design/03-ipc-contract-and-errors.md`（stream event shape）
- P0-002: `./P0-002-ipc-contract-ssot-and-codegen.md`
- P0-005: `./P0-005-editor-ssot-autosave-versioning.md`（用于运行技能输入与后续 apply）

## Expected File Changes

| 操作   | 文件路径                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| Add    | `apps/desktop/main/src/ipc/ai.ts`（`ai:skill:*` handlers + stream emitter）                                     |
| Add    | `apps/desktop/main/src/services/ai/aiService.ts`（provider 选择 + timeout/cancel + 错误映射）                   |
| Add    | `apps/desktop/main/src/services/ai/fakeAiServer.ts`（E2E 用 fake server：success/delay/timeout/upstream-error） |
| Add    | `apps/desktop/renderer/src/features/ai/AiPanel.tsx`（最小 UI：输入区 + 输出区；`data-testid="ai-panel"`）       |
| Add    | `apps/desktop/renderer/src/stores/aiStore.ts`（run 状态机：idle/running/streaming/canceled/timeout/error）      |
| Add    | `apps/desktop/renderer/src/features/ai/useAiStream.ts`（订阅 `ai:skill:stream`）                                |
| Add    | `apps/desktop/tests/e2e/ai-runtime.spec.ts`                                                                     |
| Update | `apps/desktop/main/src/logging/logger.ts`（ai 关键日志）                                                        |
| Update | `pnpm-lock.yaml`                                                                                                |

## Acceptance Criteria

- [x] `ai:skill:run`：
  - [x] 返回 `runId`
  - [x] `stream=false` 返回完整结果（或 best-effort）
  - [x] `stream=true` 通过 `ai:skill:stream` 推送 delta
- [x] `ai:skill:cancel`：
  - [x] 幂等（重复 cancel 返回 ok）
  - [x] cancel 后不再有 delta 推送
  - [x] 返回/事件体现 `CANCELED`
- [x] timeout：
  - [x] 超时返回 `TIMEOUT`
  - [x] 超时后不再推送 delta
- [x] upstream error：
  - [x] provider/proxy 5xx 映射为 `UPSTREAM_ERROR`
- [x] Fake-first：
  - [x] Windows CI 默认走 Fake AI（无需真实 key）
  - [x] Fake server 支持四模式：success/delay/timeout/upstream-error（触发方式写死并可断言）
  - [x] success 输出包含固定片段（例如 `E2E_RESULT`）用于断言

## Tests

- [x] E2E（Windows）`ai-runtime.spec.ts`
  - [x] success：运行 builtin skill → 断言输出包含 `E2E_RESULT`
  - [x] delay：断言 UI 进入 loading 状态，最终完成
  - [x] timeout：断言 UI 显示 timeout 错误且错误码为 `TIMEOUT`
  - [x] upstream-error：断言错误码为 `UPSTREAM_ERROR`
  - [x] cancel：启动 stream → 立刻 cancel → 断言最终状态为 canceled 且不再增长输出
- [ ] 建议新增 unit：错误映射（可选，若实现复杂）

## Edge cases & Failure modes

- 多次并发 run：runId 必须唯一；store 必须能区分当前 run 与历史
- cancel 在 completed 后调用：必须 ok 且无副作用
- Fake server 端口占用：必须自动选择空闲端口并在日志记录 baseUrl

## Observability

- `main.log` 必须记录：
  - `ai_run_started`（runId/provider/model/stream）
  - `ai_run_completed`（runId/latencyMs）
  - `ai_run_failed`（runId/error.code）
  - `ai_run_canceled`（runId）
  - `ai_run_timeout`（runId）
- E2E 必须断言至少一条日志证据（例如 `ai_run_started`）

## Completion

- Issue: #33
- PR: #36
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-33.md`
