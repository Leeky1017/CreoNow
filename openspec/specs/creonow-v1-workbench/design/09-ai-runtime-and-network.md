# 09 - AI Runtime & Network（providers / proxy / prompt caching / fake server / apply）

> 上游 Requirement：`CNWB-REQ-050`、`CNWB-REQ-120`  
> 目标：定义 AI 运行时在 CN V1 中的可测、可控、可观测边界（stream/cancel/timeout/error、联网与 proxy、prompt caching、Fake-first E2E）。

---

## 1. Provider 选择与配置来源（Windows-first）

### 1.1 支持的 provider（V1）

- `anthropic`
- `openai`
- `proxy`（OpenAI-compatible，例如 LiteLLM；默认关闭）

### 1.2 配置优先级（MUST）

1. `process.env.CREONOW_*`（E2E/CI 首选）
2. Settings store（持久化配置）

约束：

- API key 必须只在主进程读取与保存（renderer 不得接触 secret）。
- renderer 只拿到“可展示的状态”（是否配置、provider 名称、最后错误码等）。

---

## 2. 单链路 Proxy 原则（硬约束）

对应 `spec.md#cnwb-req-050`：

- 默认：直连 provider SDK/HTTP。
- 当 `proxy.enabled=true`：
  - 本次请求 MUST 仅通过 proxy 发出（不得同请求双栈尝试）。
  - baseUrl 缺失必须返回 `INVALID_ARGUMENT`（且错误消息可断言）。

---

## 3. Prompt Caching（稳定前缀是前提）

### 3.1 关键前提（MUST）

- stable prefix（`systemPromptStablePart`）必须字节稳定（见 `design/04-context-engineering.md`）。
- 主进程不得修改 prompt 字节（不得 trim/normalize）。

### 3.2 Anthropic（建议 P0 路径）

- 将 `system` 组织为 blocks，并对稳定 block 设置：
  - `cache_control: { type: 'ephemeral' }`
- 观测：仅记录 cache 命中指标（token 数）与 hash，不得记录 prompt 明文。

### 3.3 OpenAI（P1）

- 维持稳定前缀结构，使用 provider 自动 caching（如适用）。
- 观测：记录 `cached_tokens` 等 usage 统计（若返回）。

---

## 4. Streaming / Cancel / Timeout（必须可测）

### 4.1 `ai:skill:run` 输入/输出（语义）

`ai:skill:run` 至少包含：

- `skillId`
- `input`（由 skill 定义决定）
- `context`（`projectId`、可选当前文档信息）
- `stream: boolean`

返回（invoke 响应）至少包含：

- `runId` -（可选）`prompt` 诊断：`stablePrefixHash` / `promptHash` -（可选）`injected`：memory/refs（用于 UI 与测试断言）

### 4.2 事件通道

- `ai:skill:stream`（见 `design/03-ipc-contract-and-errors.md`）

### 4.3 取消与清理（MUST）

- cancel 必须是幂等，且能停止 stream 事件继续发出。
- 超时必须返回 `TIMEOUT`，并停止 stream。

---

## 5. Fake AI Server（CI/E2E 必须，禁止真实网络依赖）

### 5.1 启用方式（建议）

- `CREONOW_E2E=1`：启用测试钩子
- `CREONOW_AI_PROVIDER=anthropic`
- `CREONOW_AI_BASE_URL=<fakeServerBaseUrl>`
- `CREONOW_AI_API_KEY=`（可为空，fake 不校验或用固定值）

### 5.2 行为模式（必须覆盖 4 种）

Fake server 必须支持：

- `success`：快速返回确定性结果（streaming 与非 streaming 都要）
- `delay`：延迟返回（用于验证 UI loading 与超时边界）
- `timeout`：不返回数据直到客户端超时（用于验证 `TIMEOUT`）
- `upstream-error`：返回 5xx（用于验证 `UPSTREAM_ERROR`）

模式触发方式必须确定（二选一）：

- A) 根据 userContent 中的标记字符串（推荐：`E2E_TIMEOUT` / `E2E_DELAY` / `E2E_UPSTREAM_ERROR`）
- B) 通过 env `CREONOW_E2E_AI_MODE=...` 强制指定

### 5.3 输出确定性（MUST）

success 模式的输出必须包含固定片段（例如 `E2E_RESULT`），便于 E2E 断言。

---

## 6. Apply（对文档选区与文本文件的最小可用）

### 6.1 对文档选区（P0）

- AI 输出为 replacement text（替换选区）。
- UI 展示 diff（old selection vs new text）。
- Apply 时必须做冲突检测（见 `design/02-document-model-ssot.md`）：
  - 不匹配 → `CONFLICT`，不得 silent apply。
- Apply 成功必须落版本（actor=ai）。

### 6.2 对文本文件（P1，可选但建议预留）

当 AI 输出包含以下 fenced code block 时，视为可 Apply patch：

```diff
--- a/<path>
+++ b/<path>
@@ ...
```

Apply 规则：

- 只允许修改 project root 下的文本文件（必须做路径归一化与越权防护）。
- 必须校验 base hash（避免在旧版本上打补丁）。
- 补丁应用失败必须返回 `CONFLICT` 或 `INVALID_ARGUMENT`（语义写死并可测）。

---

## 7. 可观测性（必须）

日志必须记录（结构化）：

- `runId/provider/model/latencyMs`
- `stablePrefixHash/promptHash`（仅 hash，不得记录 prompt 明文）
- `cancelled/timeout/upstream-error` 的错误码与分支
- proxy 路径是否启用（单链路）

---

## Reference (WriteNow)

参考路径：

- `WriteNow/electron/ipc/ai.cjs`（provider config、prompt caching 开关、错误映射、cancel/timeout）
- `WriteNow/tests/e2e/_utils/fake-anthropic.ts`（fake streaming success/delay/timeout/upstream-error 的实现形态）
- `WriteNow/openspec/specs/sprint-open-source-opt/design/01-prompt-caching.md`（provider native prompt caching 的决策与观测约束）
- `WriteNow/openspec/specs/sprint-open-source-opt/design/05-litellm-proxy.md`（proxy 单链路原则）
- `WriteNow/tests/e2e/sprint-open-source-opt-litellm-proxy.spec.ts`（proxy enabled/disabled 的错误语义断言）

从 WN 借鉴并迁移到 CN 的关键约束（摘要）：

- E2E 必须 fake-first（不依赖外网与真实 key），同时覆盖成功/取消/超时/上游错误四条分支。
- prompt caching 的收益来自“前缀完全一致”，因此必须先锁定 stable prefix 与确定性序列化，再谈缓存开关。
