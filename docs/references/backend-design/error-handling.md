> 本文件是 backend-design 的一部分，完整索引见 [docs/references/backend-design/README.md](README.md)

# 二、错误处理模式

## 2.1 API 错误分类

| 分类 | 示例 | 处理策略 |
| --- | --- | --- |
| 可重试 | rate limit、网络抖动、5xx | 指数退避重试（max 3 次，INV-10 断路器） |
| 不可重试 | 认证失败、参数错误、4xx | 立即失败，生成合成错误结果，通知用户 |
| 需要压缩 | prompt_too_long | 触发 AutoCompact，压缩后重试（最多 1 次） |
| 用户取消 | AbortController signal | 清理进行中的步骤，生成合成错误，保留上下文 |

> **已实现位置**：错误分类映射已部分实现于 `apps/desktop/main/src/services/ai/errorMapper.ts`（含单元测试 `errorMapper.test.ts`）。压缩引擎为 `services/context/compressionEngine.ts`。

## 2.2 AbortController 层次（目标架构，当前为单级）

当前实现：`orchestrator.ts` 每次请求创建一个 `AbortController`，`toolUseHandler.ts` 使用 `setTimeout`/`Promise` 实现工具级超时。以下为目标架构：

```
Session AbortController          // 整个会话
  +-- Request AbortController    // 单次 LLM 请求
      +-- Step AbortController   // 单个 Skill Step
         // Step 失败 -> 取消兄弟 Step
         // 但不影响 Request（还需要收集错误结果）
```

CC 来源：Main -> Child -> Sibling AbortController 三级体系（Report 05）。局部取消不爆炸全局。

> **已实现位置**：`apps/desktop/main/src/services/skills/orchestrator.ts`（单级 AbortController）、`services/skills/toolUseHandler.ts`（工具超时）。

## 2.3 错误事件生成（INV-10 落地）

当 Skill 执行中断时，SkillOrchestrator 通过 `makeFailureEvent()` 生成错误事件：

```ts
// 当前实现（orchestrator.ts）
{
  type: "error",
  timestamp: number,
  requestId: string,
  error: { code: string, message: string, retryable: boolean, details?: unknown }
}
```

这保证消息序列始终合法，上层能看到"上次失败了"而非完全不知道。

> 计划实现：为每个未完成步骤生成更细粒度的合成结果（含 `stepName`、`partialResult`），当前仅为整个请求生成单一错误事件。

## 2.4 断路器模式

当前实现：`services/ai/providerResolver.ts` 中 Provider 级断路器（`PROVIDER_FAILURE_THRESHOLD = 3`，连续失败 3 次标记 provider 为 degraded 状态）。`services/context/compressionEngine.ts` 中 compression 专用断路器（`layerAssemblyService.ts` 仅传入配置参数）。

```ts
// 计划实现：通用 Skill 级断路器（services/ai/circuitBreaker.ts）
const CIRCUIT_BREAKER = {
  maxConsecutiveFailures: 3,  // CC 验证: 曾有 session 连续失败 3272 次
  cooldownMs: 30_000,         // 30 秒冷却期
  halfOpenRetries: 1,         // 半开状态试探 1 次
}
// 状态机：CLOSED -> (3次失败) -> OPEN -> (30s) -> HALF_OPEN -> (成功) -> CLOSED
```

> **已实现位置**：Provider 级断路器位于 `apps/desktop/main/src/services/ai/providerResolver.ts`；Compression 断路器位于 `services/context/compressionEngine.ts`。通用 Skill 级断路器（`circuitBreaker.ts`）为计划实现。

## 2.5 反防御型编程原则

Agent 禁止写不必要的降级/安全代码。很多东西是二元的——要么能用要么不能用，没有「降级版」。

**禁止的模式：**

- 到处写 `try-catch` 然后静默返回默认值
- 对二元依赖写降级（例如「SQLite 连接失败时用内存存储」）
- 对每个参数加 `?? defaultValue` / `|| fallback`
- 对不可能的分支写 fallback（用 `throw new Error('unreachable')` 代替）
- 加无意义的 optional chaining（如果 user 必须存在，就不要用 `?`）

**允许降级的场景：**

| 场景 | 降级方式 | 原因 |
| --- | --- | --- |
| LLM API 不可用 | 友好错误 + 保留输入 + 提示重试 | 外部依赖，用户可感知延迟但不丢数据 |
| FTS5 搜索无结果 | 跳过搜索，用纯上下文回答 | FTS5 是辅助检索，不是核心记忆机制 |

**判断标准：** 如果你说不清楚"降级后用户体验具体是什么"，就不要写降级——直接失败、报错、让用户知道。
