# P1-007: AI 请求重试（429、5xx 指数退避 + jitter）

Status: todo

## Goal

为 main `aiService` 增加可测试的重试机制：

- 429 / 5xx：指数退避重试（含 jitter）
- 401/403：不重试（直接返回 PERMISSION_DENIED）
- Abort：取消后必须立刻停止（不得继续重试）

## Dependencies

- Spec: `../spec.md#cnmvp-req-009`
- Design: `../design/05-test-strategy-and-ci.md`（unit tests）

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/main/src/services/ai/aiService.ts`（引入 fetchWithRetry） |
| Add | `apps/desktop/main/src/services/ai/retry.ts`（或等价文件） |
| Add | `apps/desktop/tests/unit/aiService.retry.test.ts`（覆盖 retry/backoff/abort） |

## Detailed Breakdown（写死重试策略）

1. 新增 `fetchWithRetry`（显式注入依赖，方便测试）
   - 参数：
     - `fetch` 实例（注入）
     - `maxAttempts`（写死默认 3）
     - `baseDelayMs`（写死默认 250ms）
     - `maxDelayMs`（写死默认 2_000ms）
     - `retryOn`：429 + 5xx + 网络错误（TypeError 等）
     - `shouldRetry` MUST 返回 deterministic（401/403 不重试）
   - jitter：`delay = min(maxDelay, baseDelay * 2^(attempt-1)) * random(0.8..1.2)`
2. 在 `aiService` 的所有 upstream fetch 调用点接入 `fetchWithRetry`
3. 测试（必须）：
   - 429 → 至少重试 1 次后成功
   - 500 → 重试到成功或次数耗尽
   - 401 → 不重试
   - AbortController → 立即停止且返回 `CANCELED`

## Acceptance Criteria

- [ ] 429/5xx 具备重试与退避
- [ ] 不重试的错误码保持稳定
- [ ] Abort 后不继续重试
- [ ] unit tests 覆盖关键路径

## Tests

- [ ] `pnpm test:unit`

## Observability

main.log：

- `ai_retry_scheduled`（attempt、delayMs、status）
- `ai_retry_exhausted`

不得记录任何 secret（apiKey、完整 prompt）。

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

