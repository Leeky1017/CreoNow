# P1-005: LiteLLM Proxy（可选，默认关闭，单链路）

Status: done

## Goal

提供可选的 OpenAI-compatible proxy（例如 LiteLLM）接入：支持 proxy settings 的 get/update/test；遵循“单链路原则”；并提供 deterministic 的错误语义与 E2E 断言（proxy enabled 但 baseUrl 缺失 → `INVALID_ARGUMENT`）。

## Dependencies

- Design: `../design/09-ai-runtime-and-network.md`（proxy 原则与观测）
- P0-006: `../p0/P0-006-ai-runtime-fake-provider-stream-cancel-timeout.md`

## Expected File Changes

| 操作   | 文件路径                                                                      |
| ------ | ----------------------------------------------------------------------------- |
| Add    | `apps/desktop/main/src/ipc/aiProxy.ts`（`ai:proxy:settings:get/update/test`） |
| Update | `apps/desktop/main/src/services/ai/aiService.ts`（proxy route + 单链路）      |
| Add    | `apps/desktop/renderer/src/features/settings/ProxySection.tsx`                |
| Add    | `apps/desktop/tests/e2e/proxy-error-semantics.spec.ts`                        |

## Acceptance Criteria

- [x] proxy 默认关闭
- [x] proxy enabled：
  - [x] baseUrl 缺失 → `INVALID_ARGUMENT`（message 可断言包含 “baseUrl”）
  - [x] 不需要 provider api key（在 proxy 模式下）
- [x] 单链路：同一请求不得同时尝试直连与 proxy
- [x] `ai:proxy:test` 返回可诊断结果（ok/err + latencyMs）

## Tests

- [x] E2E（Windows）`proxy-error-semantics.spec.ts`
  - [x] proxy disabled + 无 api key → `INVALID_ARGUMENT`（提示 api key 缺失）
  - [x] proxy enabled + baseUrl 为空 → `INVALID_ARGUMENT`（提示 proxy baseUrl）

## Edge cases & Failure modes

- baseUrl 格式非法 → `INVALID_ARGUMENT`
- proxy 401/429/5xx → `PERMISSION_DENIED/RATE_LIMITED/UPSTREAM_ERROR`（映射写死）

## Observability

- `main.log`：`ai_proxy_enabled` / `ai_proxy_request`（不记录 prompt 明文）

## Completion

- Issue: #54
- PR: #55
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-54.md`
