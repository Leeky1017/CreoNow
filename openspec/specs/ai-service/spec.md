## P1 变更摘要

本次为 P1（系统脊柱）阶段新增以下 section：

| Section | 描述 |
|---------|------|
| P1 — Streaming 主链路 | V1 简化版流式处理，单次 LLM 调用 + 错误恢复 |
| P1 — LLM 路由（V1 简化版） | 单 provider 路由，接口预留切换能力 |
| P1 — 并发分区 | 读并行/写串行的并发控制策略 |

# AI Service Specification

## Purpose

LLM 代理调用与流式响应，AI 面板交互，输出质量判定（Judge）。覆盖从用户点击「AI 生成」到结果呈现的完整链路。

### Scope

| Layer    | Path                                                                     |
| -------- | ------------------------------------------------------------------------ |
| Backend  | `main/src/services/ai/`                                                  |
| IPC      | `main/src/ipc/ai.ts`, `main/src/ipc/aiProxy.ts`, `main/src/ipc/judge.ts` |
| Frontend | `renderer/src/features/ai/`                                              |
| Store    | `renderer/src/stores/aiStore.ts`                                         |

## Requirements

### Requirement: P1 — Streaming 主链路

#### 目标

P1 阶段实现**最小可闭环**的流式 LLM 调用链路：用户选中文本 → 触发润色技能 → LLM 流式返回 → diff 预览 → 确认写回。V1 采用单次 LLM 调用（不含 Agentic Loop / tool-use 循环），但接口层预留 tool-use 扩展点，为后续 P2 多步推理铺路。

#### 接口契约

```typescript
/** SSE chunk 的标准化表示 */
interface StreamChunk {
  /** 增量文本片段 */
  delta: string;
  /** 本次 chunk 的 finish reason；流中间为 null */
  finishReason: 'stop' | 'tool_use' | null;
  /** 累计已接收 token 数（用于前端进度指示） */
  accumulatedTokens: number;
}

/** 流式调用的完整选项 */
interface StreamOptions {
  /** 外部传入的 AbortSignal，用于取消链路 */
  signal?: AbortSignal;
  /** 流正常结束时的回调，携带完整结果 */
  onComplete: (result: StreamResult) => void;
  /** 流异常时的回调 */
  onError: (error: StreamError) => void;
}

/** 流式调用的最终结果 */
interface StreamResult {
  /** 完整的生成文本 */
  content: string;
  /** 总 token 用量 */
  usage: { promptTokens: number; completionTokens: number };
  /** 是否为重试后的结果 */
  wasRetried: boolean;
  /** V1 预留：如果 finishReason 为 tool_use，此处携带 tool call 信息 */
  toolCalls?: ToolCallInfo[];
}

/** V1 预留的 tool call 信息结构 */
interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** 流式错误分类 */
interface StreamError {
  /** 错误类型，决定是否可重试 */
  kind: 'retryable' | 'non-retryable' | 'partial-result';
  /** 原始错误信息 */
  message: string;
  /** 如果是 partial-result，已收到的部分文本 */
  partialContent?: string;
  /** 已执行的重试次数 */
  retryCount: number;
}

/**
 * AI 服务适配器——skill-system 通过此接口与 AI 层交互。
 * WritingOrchestrator 的 OrchestratorConfig.aiService 类型即为此接口。
 */
interface AIServiceAdapter {
  /** 流式聊天调用，返回 AsyncGenerator 以支持背压 */
  streamChat(messages: Message[], options: StreamOptions): AsyncGenerator<StreamChunk>;
  /** 快速估算文本的 token 数（CJK 感知） */
  estimateTokens(text: string): number;
  /** 中止当前流式调用 */
  abort(): void;
}
```

**背压处理说明**：

`LLMProxy.streamChat` 和 `AIServiceAdapter.streamChat` 均返回 `AsyncGenerator<StreamChunk>`。调用方（WritingOrchestrator）通过 `for await (const chunk of stream)` 消费 chunk。当消费方处理速度慢于生产速度时，generator 的 `yield` 会自动暂停（因为下一次 `next()` 尚未被调用），从而实现自然背压。

- **生产端**（LLMProxy）：从 SSE 连接读取数据，通过 `yield` 逐 chunk 推送。若消费端未及时调用 `next()`，`yield` 挂起，SSE 缓冲区自然积压，TCP 层 flow control 生效
- **消费端**（WritingOrchestrator）：每消费一个 chunk 后将其推送到 IPC（`skill:stream:chunk`），然后才请求下一个 chunk
- **取消**：调用方可通过 `stream.return()` 或 `AbortController.abort()` 中止流

#### 数据流

```
用户操作
  → WritingOrchestrator.execute(request: WritingRequest)
    → LLMRouter.selectProvider(request)          // V1: 返回唯一 provider
      → LLMProxy.streamChat(messages, options)   // 发起 SSE 连接，返回 AsyncGenerator<StreamChunk>
        → LLM API (SSE)                         // 远端流式响应
          ← SSE chunk                            // 逐 chunk 返回
        ← StreamChunk                            // LLMProxy 标准化（yield）
      ← for await (chunk of stream)             // WritingOrchestrator 逐 chunk 消费（背压自然生效）
    ← IPC push: 'skill:stream:chunk'             // 推送到渲染进程
  ← aiStore.appendChunk(chunk)                   // 前端状态更新 + diff 预览
```

**关键节点说明**：

1. **WritingOrchestrator** 是 P1 主链路的编排入口，负责：将技能参数映射为 LLM messages、启动流式调用、将 chunk 通过 IPC push 推送到前端
2. **LLMProxy.streamChat()** 负责：建立 SSE 连接、解析 `data:` 行为 StreamChunk、检测 `[DONE]` 信号、将 AbortController 与外部 signal 关联。**返回值为 `AsyncGenerator<StreamChunk>`**，调用方通过 `for await` 消费，背压由 generator 暂停机制自然实现
3. **IPC push 通道**（`skill:stream:chunk`）采用 Electron 的 `webContents.send()`，前端通过 `ipcRenderer.on()` 监听

#### 错误处理

| 错误场景 | kind | 处理策略 |
|---------|------|---------|
| 网络超时 / 连接断开 | `retryable` | 指数退避重试，最多 3 次（间隔 1s → 2s → 4s） |
| HTTP 429 (Rate Limit) | `retryable` | 读取 `Retry-After` header，等待后重试 |
| HTTP 401/403 (认证失败) | `non-retryable` | 立即终止，通知用户检查 API Key |
| HTTP 500+ (服务端错误) | `retryable` | 同网络超时策略 |
| 流中途断开（已有部分结果） | `partial-result` | 保留已接收内容，通知用户"部分结果可用" |
| 用户主动取消 | — | AbortController.abort()，清理资源，不计为错误 |
| 响应格式异常 / JSON 解析失败 | `non-retryable` | 记录原始响应到日志，通知用户 |

**重试策略细节**（参考 CC query.ts 模式）：

- 重试时**不重置**已收到的部分内容——如果第 2 次重试成功，完整结果会替换部分结果
- 每次重试复用相同的 AbortSignal，用户随时可取消
- 重试计数器包含在 StreamError 中，前端可据此展示"正在重试 (2/3)"

#### CC 架构提炼

参考 CC `query.ts` 的 streaming 处理模式，P1 提炼以下设计要素：

1. **SSE 逐行解析**：`data:` 前缀剥离 → JSON.parse → StreamChunk 映射。遇到 `data: [DONE]` 触发 onComplete
2. **AbortController 取消链**：外部 signal → fetch abort → 清理回调。确保取消操作在整条链路上同步传播
3. **tool_use 检测预留**：当 `finishReason === 'tool_use'` 时，V1 仅记录 toolCalls 信息到 StreamResult，**不执行** tool-use 循环。后续 P2 将在此处接入 Agentic Loop
4. **错误分类三元组**：`retryable` / `non-retryable` / `partial-result`——前端据此决定展示"重试中"还是"已失败"还是"部分结果可查看"

#### 不做清单

- ❌ 不实现 tool-use 循环（Agentic Loop）——V1 只走单次 LLM 调用
- ❌ 不实现多候选方案（N-best）——V1 只返回一个结果
- ❌ 不实现流式 diff 实时预览（chunk 级别）——V1 在流完成后一次性生成 diff
- ❌ 不实现客户端 token 计数——V1 依赖 LLM API 返回的 usage 信息
- ❌ 不实现请求排队——V1 技能执行是串行的，不会有并发请求

#### Scenario: 用户触发润色并看到流式结果

```
Given 用户已选中一段文本
  And AI 服务已配置有效的 API Key
When 用户触发「润色」技能
Then WritingOrchestrator 将选中文本组装为 LLM messages
  And LLMProxy 建立 SSE 连接并开始接收 chunk
  And 每个 StreamChunk 通过 IPC push 推送到前端
  And aiStore 累积 chunk 并更新 UI 进度
  And 流结束后前端展示完整的 diff 预览
```

#### Scenario: 流式调用中途网络断开

```
Given LLMProxy 正在接收 SSE 流
  And 已接收 3 个 chunk（部分文本 "优化后的..."）
When 网络连接断开
Then LLMProxy 将错误分类为 retryable
  And 保留已接收的部分内容
  And 以指数退避策略重试（1s → 2s → 4s）
  And 重试成功后，完整结果替换部分内容
  And 如果 3 次重试均失败，错误升级为 partial-result
  And 前端展示"部分结果可用"并允许用户查看已接收内容
```

#### Scenario: 用户在流式调用过程中取消

```
Given LLMProxy 正在接收 SSE 流
When 用户点击「取消」按钮
Then 前端调用 AbortController.abort()
  And abort 信号沿链路传播：IPC → WritingOrchestrator → LLMProxy → fetch
  And SSE 连接立即关闭
  And 不触发 onError 回调（取消不视为错误）
  And aiStore 清除当前流状态
```

---

### Requirement: P1 — LLM 路由（V1 简化版）

#### 目标

V1 阶段只对接一个 LLM provider，但通过 `LLMRouter` 接口抽象路由逻辑，使后续 P2 的多 provider 降级切换、负载均衡可以在不修改上层调用代码的前提下接入。

#### 接口契约

```typescript
/** LLM 请求描述 */
interface LLMRequest {
  /** 技能 ID，用于后续按技能分流 */
  skillId: string;
  /** 预估 token 数（可选），用于后续选模型 */
  estimatedTokens?: number;
  /** 用户偏好的模型（可选），用于后续用户级覆盖 */
  preferredModel?: string;
}

/** Provider 配置 */
interface ProviderConfig {
  /** provider 标识：'openai-compatible' | 'anthropic' */
  providerId: string;
  /** API 端点 */
  baseUrl: string;
  /** 模型名称，如 'gpt-4o'、'claude-sonnet-4-20250514' */
  model: string;
  /** 最大 token 限制 */
  maxTokens: number;
  /** temperature（默认 0.7） */
  temperature: number;
}

/** 路由器接口 */
interface LLMRouter {
  /**
   * 根据请求选择 provider。
   * V1 忽略 request 参数，始终返回配置的单一 provider。
   * @param request LLM 请求描述
   * @returns 选中的 provider 配置
   */
  selectProvider(request: LLMRequest): ProviderConfig;
}

/** V1 实现：单 provider 路由 */
class SingleProviderRouter implements LLMRouter {
  constructor(private config: ProviderConfig) {}

  selectProvider(_request: LLMRequest): ProviderConfig {
    return this.config;
  }
}
```

#### 数据流

```
WritingOrchestrator
  → LLMRouter.selectProvider(request)
    → [V1] SingleProviderRouter: 直接返回 this.config
  → LLMProxy.streamChat(messages, { provider: selectedProvider, ...options })
```

V1 阶段路由器不引入任何 I/O 操作，`selectProvider()` 是纯同步调用。

#### 错误处理

| 错误场景 | 处理策略 |
|---------|---------|
| 配置缺失（无 provider 配置） | 启动时校验，缺失则提示用户在设置页面配置 |
| 配置无效（baseUrl 格式错误） | 启动时校验 + 首次调用时校验，给出明确错误提示 |

V1 不做运行时降级切换——如果唯一的 provider 不可用，错误直接透传给上层（由 Streaming 主链路的错误处理机制接管）。

#### CC 架构提炼

参考 CC 的 LLM 路由设计，V1 提炼的接口约束：

1. **`selectProvider()` 返回值是完整的 `ProviderConfig`**，调用方不需要再做拼接——这使得后续替换路由策略时上层无感
2. **`LLMRequest` 携带意图信息**（skillId、estimatedTokens），V1 不使用，但后续 P2 可据此做模型分级路由（如：短文本用快模型，长文本用强模型）
3. **路由器是无状态的**（V1），后续 P2 如需有状态路由（如基于调用统计的负载均衡），可替换为 `StatefulRouter` 实现

#### 不做清单

- ❌ 不做多 provider 降级切换——V1 只有一个 provider
- ❌ 不做多 provider 健康探测——V1 无需探活
- ❌ 不做按技能分流到不同模型——V1 所有技能用同一模型
- ❌ 不做用户级模型偏好覆盖——V1 的 `preferredModel` 字段预留但不生效
- ❌ 不做 token 预估路由——V1 的 `estimatedTokens` 字段预留但不生效

#### Scenario: WritingOrchestrator 通过路由器获取 provider

```
Given 系统已配置单一 provider（如 OpenAI 兼容 API）
When WritingOrchestrator 调用 LLMRouter.selectProvider(request)
Then SingleProviderRouter 返回配置的 ProviderConfig
  And ProviderConfig 包含完整的 baseUrl、model、maxTokens、temperature
  And WritingOrchestrator 将 ProviderConfig 传递给 LLMProxy.streamChat()
```

#### Scenario: 未配置 provider 时的启动校验

```
Given 用户首次启动应用
  And 尚未配置任何 LLM provider
When 系统初始化 LLMRouter
Then 系统检测到 ProviderConfig 缺失
  And 不抛出异常（允许应用正常启动）
  And 当用户首次触发 AI 技能时，提示"请先在设置中配置 AI 服务"
```

---

### Requirement: P1 — 并发分区

#### 目标

为 P1 主链路中的每个操作步骤标记并发安全性（`isConcurrencySafe`），确保读操作可并行、写操作必须串行。V1 阶段技能执行本身是串行的（用户一次只触发一个技能），但并发分区标记为后续 P2 的并行技能执行、批量操作奠定基础。

#### 接口契约

```typescript
/** 操作步骤的并发安全性声明 */
interface ConcurrencyMeta {
  /** 步骤名称 */
  stepName: string;
  /** 是否可安全并发执行 */
  isConcurrencySafe: boolean;
  /** 并发分区说明 */
  reason: string;
}

/** P1 主链路各步骤的并发分区声明 */
const P1_CONCURRENCY_MAP: ConcurrencyMeta[] = [
  {
    stepName: 'readDocument',
    isConcurrencySafe: true,
    reason: '只读操作，不修改文档状态',
    // 映射到 skill-system PipelineStep: validate-input + context-assemble（读取文档内容阶段）
  },
  {
    stepName: 'readKnowledgeGraph',
    isConcurrencySafe: true,
    reason: '只读操作，查询 KG 设定不改变状态',
    // P3 启用，P1 不生效
    // 映射到 skill-system PipelineStep: context-assemble（KG 注入子步骤）
  },
  {
    stepName: 'assemblePrompt',
    isConcurrencySafe: true,
    reason: '纯函数，根据输入组装 messages，无副作用',
    // 映射到 skill-system PipelineStep: context-assemble（prompt 组装子步骤）
  },
  {
    stepName: 'callLLM',
    isConcurrencySafe: false,
    reason: '写操作：占用 LLM 连接资源，流式结果写入状态',
    // 映射到 skill-system PipelineStep: ai-call（流式请求 AIServiceAdapter）
  },
  {
    stepName: 'applyDiff',
    isConcurrencySafe: false,
    reason: '写操作：修改文档内容，必须串行以防冲突',
    // 映射到 skill-system PipelineStep: write-back（通过 documentWrite Tool 写回）
  },
  {
    stepName: 'saveHistory',
    isConcurrencySafe: false,
    reason: '写操作：写入操作历史，需要保证顺序一致性',
    // 映射到 skill-system PipelineStep: snapshot（通过 versionSnapshot Tool 存版本）
  },
];

/** 执行器根据并发标记编排步骤 */
interface StepExecutor {
  /**
   * 执行一组步骤，自动根据 isConcurrencySafe 标记决定并行/串行。
   * 连续多个 safe=true 的步骤合并为并行 batch；
   * 遇到 safe=false 的步骤则串行等待前序完成。
   */
  executeSteps(steps: ConcurrencyMeta[]): Promise<void>;
}
```

#### 数据流

```
WritingOrchestrator.execute()
  → StepExecutor.executeSteps(P1_CONCURRENCY_MAP)
    → [并行 batch 1] readDocument + readKnowledgeGraph + assemblePrompt
      ← 全部完成
    → [串行] callLLM
      ← 完成
    → [串行] applyDiff
      ← 完成
    → [串行] saveHistory
      ← 完成
```

V1 阶段虽然技能执行整体是串行的（用户不会同时触发两个技能），但单次技能内部的**读操作合并为并行 batch** 可减少延迟。

#### 错误处理

| 错误场景 | 处理策略 |
|---------|---------|
| 并行 batch 中某个读操作失败 | 取消同 batch 的其他操作（fail-fast），整体报错 |
| 串行步骤失败 | 停止后续步骤，已完成的步骤不回滚（由上层决定是否回退） |
| 并发标记声明错误（safe=true 的步骤实际有副作用） | 开发阶段通过 code review 把关；运行时不做二次校验 |

#### CC 架构提炼

参考 CC 的 `isConcurrencySafe` 机制，P1 提炼以下设计要素：

1. **声明式并发标记**：每个 Tool/Step 在定义时声明 `isConcurrencySafe`，执行器自动编排——开发者不需要手动管理 `Promise.all` / 串行逻辑
2. **贪心合并策略**：连续多个 `safe=true` 的步骤合并为一个并行 batch。遇到 `safe=false` 立即切断并行，进入串行等待
3. **分区粒度选择**：V1 以"步骤"为最小分区粒度（而非更细的"字段级锁"），简单可靠

#### 不做清单

- ❌ 不实现跨技能并发——V1 阶段用户一次只触发一个技能
- ❌ 不实现细粒度锁（文档段落级别）——V1 以步骤为粒度即可
- ❌ 不实现并发冲突检测——V1 通过串行保证写操作互斥
- ❌ 不实现动态并发度控制——V1 并行 batch 内的操作全部并行，不限并发数
- ❌ 不实现运行时并发安全性校验——V1 信任编译期声明

#### Scenario: 读操作并行、写操作串行

```
Given WritingOrchestrator 开始执行一个技能
  And 技能包含 readDocument、readKnowledgeGraph、assemblePrompt（均 safe=true）
  And 后续包含 callLLM、applyDiff、saveHistory（均 safe=false）
When StepExecutor 编排执行
Then readDocument、readKnowledgeGraph、assemblePrompt 作为并行 batch 同时执行
  And 并行 batch 全部完成后，callLLM 开始串行执行
  And callLLM 完成后，applyDiff 开始串行执行
  And applyDiff 完成后，saveHistory 开始串行执行
```

#### Scenario: 并行 batch 中某步骤失败

```
Given StepExecutor 正在执行并行 batch（readDocument + readKnowledgeGraph）
When readKnowledgeGraph 抛出异常（如 KG 数据库不可用）
Then StepExecutor 取消同 batch 中仍在执行的 readDocument
  And 不继续执行后续的串行步骤
  And 将错误上报给 WritingOrchestrator
  And WritingOrchestrator 通过 Streaming 主链路的错误处理机制通知前端
```

---

### Requirement: LLM 代理调用

系统**必须**通过统一的 `LLMProxy` 抽象层调用 LLM，隔离具体 API 实现细节。

`LLMProxy` 职责：

- 封装 LLM API 的认证、请求构造、响应解析
- 支持多 provider 切换（V1 阶段支持 OpenAI 兼容 API 和 Anthropic API）
- 管理 API Key 的安全存储（通过 Electron `safeStorage` 加密存储在本地，**禁止**明文存储）
- 实现请求重试策略（指数退避，最多 3 次）
- 实现速率限制（Rate Limiting）保护

`LLMProxy` 配置：

| 配置项        | 说明                     | 存储位置                 |
| ------------- | ------------------------ | ------------------------ |
| `provider`    | LLM 服务商               | `creonow.ai.provider`    |
| `model`       | 模型名称                 | `creonow.ai.model`       |
| `apiKey`      | API 密钥（加密）         | Electron safeStorage     |
| `baseUrl`     | API 基础 URL（可选覆盖） | `creonow.ai.baseUrl`     |
| `maxTokens`   | 最大输出 token 数        | `creonow.ai.maxTokens`   |
| `temperature` | 温度参数                 | `creonow.ai.temperature` |

LLM 配置通过以下 IPC 通道管理：

| IPC 通道           | 通信模式         | 方向            | 用途           |
| ------------------ | ---------------- | --------------- | -------------- |
| `ai:config:get`    | Request-Response | Renderer → Main | 获取 AI 配置   |
| `ai:config:update` | Request-Response | Renderer → Main | 更新 AI 配置   |
| `ai:config:test`   | Request-Response | Renderer → Main | 测试连接有效性 |

#### Scenario: 用户配置 LLM API

- **假设** 用户首次使用应用，打开设置 → AI 配置
- **当** 用户选择 provider「OpenAI」，输入 API Key，选择模型「gpt-4o」
- **则** 系统通过 `ai:config:update` 保存配置
- **并且** API Key 通过 Electron `safeStorage` 加密后存储
- **并且** 用户可通过 `ai:config:test` 测试连接

#### Scenario: API Key 未配置时的降级

- **假设** 用户未配置 API Key
- **当** 用户尝试触发任何 AI 技能
- **则** 系统返回 `{ code: "AI_NOT_CONFIGURED", message: "请先在设置中配置 AI 服务" }`
- **并且** AI 面板显示配置引导提示，点击跳转到设置页

#### Scenario: LLM API 调用失败——重试机制

- **假设** 用户触发续写技能
- **当** 第一次 API 调用因网络超时失败
- **则** 系统自动重试（指数退避：1s → 2s → 4s）
- **并且** 最多重试 3 次
- **当** 第二次重试成功
- **则** 返回正常结果，用户无感知

---

### Requirement: 流式响应处理

系统**必须**支持 LLM 的流式响应（Server-Sent Events / Streaming），让 AI 输出在生成过程中实时展示。

流式响应架构：

```
LLM API (SSE) → LLMProxy → SkillExecutor → IPC (Push) → Renderer → AI Panel
```

流式处理规范：

- `LLMProxy` 以 chunk 为单位接收 LLM 输出
- 每个 chunk 通过 `skill:stream:chunk`（Push Notification）推送到渲染进程
- 渲染进程将 chunk 追加到 AI 面板的输出区域，实时渲染
- 流式结束后发送 `skill:stream:done`，包含完整结果和 metadata

流式响应期间 UI 状态：

- AI 面板输出区域显示打字动画效果（光标闪烁）
- 「停止生成」按钮可见，用户可随时中断
- 技能按钮区域禁用，防止重复触发

#### Scenario: 流式响应正常展示

- **假设** 用户触发续写技能
- **当** LLM 开始流式返回内容
- **则** AI 面板实时显示生成的文字，逐字/逐句追加
- **并且** 输出区域自动滚动到最新内容
- **并且** 生成完成后「停止生成」按钮消失，技能按钮恢复可用

#### Scenario: 流式响应中断——网络断开

- **假设** 流式生成进行到一半
- **当** 用户网络断开
- **则** `LLMProxy` 检测到连接中断
- **并且** AI 面板显示已接收的部分内容 + 错误提示「网络连接中断」
- **并且** 用户可点击「重试」，系统以完整 prompt 重新请求（非断点续传）

---

### Requirement: AI 面板交互

AI 面板位于右侧面板（Workbench spec 定义），是用户与 AI 交互的主要界面。

AI 面板结构（从上到下）：

1. **对话历史区**：展示用户与 AI 的对话记录，支持滚动
2. **AI 输出展示区**：展示当前 AI 生成的内容（流式更新）
3. **操作按钮**：「应用到编辑器」「复制」「重新生成」
4. **技能按钮区**：快速触发技能（详见 Skill System spec）
5. **输入区**：用户输入自由文本指令（如「帮我把这段改得更紧凑」）

对话记录数据结构：

- `role`：`user` | `assistant`
- `content`：文本内容
- `skillId`：关联的技能 ID（如有）
- `timestamp`
- `traceId`：记忆溯源 ID

对话记录持久化到主进程（按项目隔离），通过以下 IPC 通道管理：

| IPC 通道        | 通信模式         | 方向            | 用途         |
| --------------- | ---------------- | --------------- | ------------ |
| `ai:chat:list`  | Request-Response | Renderer → Main | 获取对话历史 |
| `ai:chat:send`  | Request-Response | Renderer → Main | 发送用户消息 |
| `ai:chat:clear` | Request-Response | Renderer → Main | 清空对话历史 |

AI 面板使用 `--color-bg-surface` 背景。用户消息气泡使用 `--color-bg-raised`，AI 消息使用 `--color-bg-base`。

AI 面板组件**必须**有 Storybook Story，覆盖：有对话历史的默认态、空态（新会话）、流式生成中态、错误态。

#### Scenario: 用户通过 AI 面板输入自由指令

- **假设** AI 面板已打开，用户在编辑器中选中了一段文本
- **当** 用户在 AI 面板输入框中输入「帮我把这段改得更有悬疑感」
- **则** 系统通过 `ai:chat:send` 发送消息
- **并且** 消息出现在对话历史中
- **并且** AI 基于选中文本和用户指令生成结果
- **并且** 结果以流式方式在 AI 输出区展示

#### Scenario: 用户将 AI 输出应用到编辑器

- **假设** AI 面板显示了改写后的文本
- **当** 用户点击「应用到编辑器」
- **则** 编辑器中选中的文本被替换为 AI 输出（通过 Inline Diff 展示）
- **并且** 用户可在 Inline Diff 中逐段接受或拒绝

#### Scenario: AI 面板空状态——新会话

- **假设** 用户刚打开 AI 面板，无对话历史
- **当** 面板渲染
- **则** 显示欢迎文案「选中文本或输入指令，开始与 AI 协作」
- **并且** 技能按钮区正常显示可用技能

---

### Requirement: 输出质量判定（Judge）

系统**必须**实现 Judge 模块，对 AI 生成的内容进行质量校验，检测是否违反创作约束。

Judge 校验维度：

| 维度       | 校验内容                                    | 严重度 |
| ---------- | ------------------------------------------- | ------ |
| 约束一致性 | AI 输出是否违反 Rules 层的创作约束          | 高     |
| 角色一致性 | AI 输出中的角色行为是否与知识图谱设定矛盾   | 高     |
| 风格一致性 | AI 输出的风格是否符合 Settings 层的偏好设定 | 中     |
| 叙事连贯性 | AI 输出是否与前文存在逻辑矛盾               | 中     |
| 重复检测   | AI 输出是否有大段重复或与前文高度重叠       | 低     |

Judge 执行时机：

- 每次 AI 生成完成后自动执行（后台异步，不阻塞展示）
- Judge 结果以非侵入方式反馈——在 AI 输出底部显示质量评估标签

Judge 的 IPC 通道：

| IPC 通道         | 通信模式          | 方向            | 用途             |
| ---------------- | ----------------- | --------------- | ---------------- |
| `judge:evaluate` | Request-Response  | Renderer → Main | 评估 AI 输出质量 |
| `judge:result`   | Push Notification | Main → Renderer | 推送评估结果     |

Judge**可以**调用 LLM 实现高级判定（如角色一致性分析），但**必须**使用独立的低延迟模型或规则引擎实现基础校验（如重复检测）。

#### Scenario: Judge 检测到约束违反

- **假设** 创作约束要求「严格第一人称叙述」
- **当** AI 续写中出现「他看着窗外」（第三人称）
- **则** Judge 检测到约束违反
- **并且** AI 面板在输出底部显示警告标签「检测到叙述视角不一致」（`--color-warning`）
- **并且** 用户可选择「重新生成」或忽略警告

#### Scenario: Judge 检测通过

- **假设** AI 续写内容符合所有约束和设定
- **当** Judge 评估完成
- **则** AI 面板输出底部显示绿色标签「质量校验通过」（`--color-success`）

#### Scenario: Judge 服务不可用时的降级

- **假设** Judge 依赖的 LLM 调用失败
- **当** AI 生成完成后 Judge 评估
- **则** 高级判定（角色一致性等）跳过
- **并且** 基础校验（重复检测等）使用规则引擎继续执行
- **并且** AI 面板显示「部分质量校验已跳过」

---

### Requirement: AI 多候选方案

系统**应该**支持 AI 生成多个候选方案，让用户从中选择最佳结果。

候选方案行为：

- 用户在 AI 面板中可选择「生成多个方案」（默认生成 3 个）
- 候选方案以卡片形式展示，每张卡片显示方案内容摘要
- 用户点击卡片可展开查看完整内容
- 用户选择一个方案后可「应用到编辑器」
- 候选方案生成通过并行调用 LLM 或设置 `n` 参数实现

候选方案数量持久化到 `creonow.ai.candidateCount`（默认 1，可设为 1-5）。

#### Scenario: 用户选择候选方案

- **假设** 用户触发改写技能，设置了生成 3 个方案
- **当** AI 返回 3 个候选方案
- **则** AI 面板以卡片列表展示 3 个方案的摘要
- **当** 用户点击方案 B 的卡片
- **则** 展开显示完整内容
- **当** 用户点击「应用到编辑器」
- **则** 方案 B 的内容应用到编辑器（Inline Diff）

#### Scenario: 用户拒绝所有候选方案

- **假设** 3 个候选方案都不满意
- **当** 用户点击「全部不满意，重新生成」
- **则** 系统以相同参数重新调用 LLM 生成新的候选方案
- **并且** 之前的候选方案保留在对话历史中
- **并且** 拒绝行为作为「强负反馈」记录到记忆系统

---

### Requirement: AI 使用统计

系统**应该**在 AI 面板底部提供本次会话的 token 使用统计。

统计内容：

- 本次请求的 prompt tokens
- 本次请求的 completion tokens
- 累计 token 使用量（本会话）
- 估算费用（基于配置的模型价格，可选显示）

统计信息使用 `--color-fg-muted` 小字体（11px）展示在 AI 面板底部。

#### Scenario: 显示 token 使用统计

- **假设** 用户触发了一次续写技能
- **当** AI 生成完成
- **则** AI 面板底部显示「Prompt: 2,100 tokens | 输出: 450 tokens | 本会话累计: 5,230 tokens」

#### Scenario: 未配置模型价格——不显示费用

- **假设** 用户未在设置中配置模型单价
- **当** 统计信息渲染
- **则** 仅显示 token 数量，不显示费用估算

---

### Requirement: Provider 降级切换与额度保护

AI 服务必须支持 provider 健康探测、自动降级切换、Token 预算与 Rate Limit 保护，避免单 provider 故障导致功能完全不可用。

降级策略：

- 主 provider 连续失败 3 次后标记 `degraded`
- 自动切换到备用 provider（若已配置）
- 15 分钟后执行半开探测（half-open），探测成功再切回主 provider
- 切换全程保留同一 `traceId`，用于审计

额度策略：

- 单请求 `maxTokens` 上限 4,096
- 单会话累计 token 上限 200,000（超限返回 `AI_SESSION_TOKEN_BUDGET_EXCEEDED`）
- 速率限制默认 60 req/min，超限返回 `AI_RATE_LIMITED`

#### Scenario: 主 provider 不可用时自动切换

- **假设** 当前主 provider 为 OpenAI，备用 provider 为 Anthropic
- **当** 连续 3 次调用返回 5xx
- **则** 系统将 OpenAI 标记为 `degraded` 并自动切换到 Anthropic
- **并且** AI 面板提示「主服务异常，已切换备用服务」
- **并且** 后续请求继续可用

#### Scenario: 会话 token 超限被阻断

- **假设** 当前会话累计 token 已达 199,800
- **当** 用户再发起一次预估 800 token 的请求
- **则** 系统拒绝调用并返回 `{ code: "AI_SESSION_TOKEN_BUDGET_EXCEEDED" }`
- **并且** UI 提示用户开启新会话或降低 `maxTokens`

---

### Requirement: 模块级可验收标准（适用于本模块全部 Requirement）

- 量化阈值：
  - 首 token 延迟（TTFT）p95 < 2.5s
  - 流式 chunk 间隔 p95 < 250ms
  - 非流式请求完成 p95 < 8s，p99 < 15s
- 边界与类型安全：
  - `TypeScript strict` + zod 双重校验
  - `ai:*`/`judge:*` 通道强制结构化响应 `success | error`
- 失败处理策略：
  - 网络类失败最多重试 3 次（1s/2s/4s）
  - Provider 全不可用时降级为只读提示态，不阻塞编辑器
  - 所有失败必须返回错误码并写日志
- Owner 决策边界：
  - Provider 优先级、默认模型、token 限额由 Owner 固定
  - Agent 不得私自放宽额度与超时阈值

#### Scenario: 流式体验满足延迟指标

- **假设** 用户触发 100 次续写请求
- **当** 统计 TTFT 与 chunk 间隔
- **则** TTFT p95 < 2.5s
- **并且** chunk 间隔 p95 < 250ms

#### Scenario: 全 provider 异常时进入可用降级

- **假设** 主备 provider 均不可用
- **当** 用户触发技能
- **则** 返回 `AI_PROVIDER_UNAVAILABLE`
- **并且** AI 面板展示降级说明与重试按钮
- **并且** 编辑器持续可编辑

---

### Requirement: 异常与边界覆盖矩阵

| 类别         | 最低覆盖要求                                   |
| ------------ | ---------------------------------------------- |
| 网络/IO 失败 | SSE 中断、DNS 失败、TLS 握手失败               |
| 数据异常     | 模型返回非法 JSON、流式 chunk 序号乱序         |
| 并发冲突     | 多技能并发占用同一会话、用户取消与完成事件竞态 |
| 容量溢出     | token 预算超限、响应体超大                     |
| 权限/安全    | API Key 失效、无权限模型调用                   |

#### Scenario: API Key 失效触发安全失败

- **假设** 用户的 API Key 已被 provider 吊销
- **当** 发起 AI 请求
- **则** 返回 `{ code: "AI_AUTH_FAILED", message: "API Key 无效或已过期" }`
- **并且** 不重试相同 Key，提示用户重新配置

#### Scenario: 流式竞态以取消优先

- **假设** 用户点击「停止生成」与 `skill:stream:done` 同时到达
- **当** 事件处理并发
- **则** 以取消事件为准，不应用后续 chunk
- **并且** 最终状态为「已取消」

---

### Non-Functional Requirements

**Performance**

- `ai:chat:send`（非流式）：p50 < 2s，p95 < 8s，p99 < 15s
- 流式 TTFT：p50 < 1.2s，p95 < 2.5s，p99 < 4s
- Judge 基础规则评估：p95 < 300ms

**Capacity**

- 单会话消息上限：2,000 条
- 单条 AI 输出上限：32,000 字符
- 单会话 token 上限：200,000

**Security & Privacy**

- API Key 仅可存储于系统 keychain/safeStorage
- 日志严禁输出明文 API Key、用户原始敏感文本
- 跨项目对话历史必须隔离，禁止跨 projectId 读取

**Concurrency**

- 同会话并发执行上限：1（其余入队）
- 跨会话并发执行上限：8
- 同一 traceId 事件必须按序消费

#### Scenario: 会话并发入队

- **假设** 用户连续点击 3 次同一技能
- **当** 第一请求执行中
- **则** 后续请求进入队列并显示排队序号
- **并且** 不会创建并行的同会话执行

#### Scenario: 对话容量超限

- **假设** 会话消息数达到 2,000 条
- **当** 用户继续发送消息
- **则** 系统提示归档旧会话并阻止继续追加
- **并且** 不丢失已有消息

---

### Requirement: 全局 AI 身份提示词模板

AI 服务**必须**提供全局身份提示词模板（`GLOBAL_IDENTITY_PROMPT` 常量），始终作为系统提示词的第一层注入。模板**必须**包含以下 5 个 XML 区块：

| 区块       | 标签                  | 内容                                                                                                                            |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 身份定义   | `<identity>`          | AI 创作伙伴核心身份，首要原则：尊重创作者风格和意图                                                                             |
| 写作素养   | `<writing_awareness>` | 叙事结构（narrative structure）、角色塑造（characterization）、场景 blocking、Show don't tell、POV 一致性、节奏控制、伏笔与回收 |
| 角色流动   | `<role_fluidity>`     | ghostwriter（续写）、muse（头脑风暴）、editor（评审）、actor（扮演角色）、painter（描写）五个角色及切换规则                     |
| 行为约束   | `<behavior>`          | 中文回应、保持创作者风格、不确定时追问、纯文本/Markdown 输出、不重复用户输入                                                    |
| 上下文感知 | `<context_awareness>` | 声明后续动态注入的上下文类型（项目、文档、光标、偏好、KG）                                                                      |

REQ-ID: `REQ-AIS-IDENTITY`

#### Scenario: S1 模板包含五个 XML 区块

- **假设** 导入 `GLOBAL_IDENTITY_PROMPT` 常量
- **当** 读取其值
- **则** `typeof GLOBAL_IDENTITY_PROMPT === "string"`
- **并且** 值包含 `"<identity>"` 和 `"</identity>"`
- **并且** 值包含 `"<writing_awareness>"` 和 `"</writing_awareness>"`
- **并且** 值包含 `"<role_fluidity>"` 和 `"</role_fluidity>"`
- **并且** 值包含 `"<behavior>"` 和 `"</behavior>"`
- **并且** 值包含 `"<context_awareness>"` 和 `"</context_awareness>"`

#### Scenario: S2 写作素养区块包含核心概念

- **假设** 导入 `GLOBAL_IDENTITY_PROMPT` 常量
- **当** 提取 `<writing_awareness>` 与 `</writing_awareness>` 之间的内容
- **则** 内容包含 `"Show don't tell"` 或 `"展示而非叙述"`
- **并且** 内容包含 `"blocking"` 或 `"场景"`
- **并且** 内容包含 `"POV"` 或 `"叙事"` 或 `"第一人称"`

#### Scenario: S3 角色流动区块定义五个角色

- **假设** 导入 `GLOBAL_IDENTITY_PROMPT` 常量
- **当** 提取 `<role_fluidity>` 与 `</role_fluidity>` 之间的内容
- **则** 内容包含 `"ghostwriter"`
- **并且** 内容包含 `"muse"`
- **并且** 内容包含 `"editor"`
- **并且** 内容包含 `"actor"`
- **并且** 内容包含 `"painter"`

---

### Requirement: 系统提示词分层组装

系统提示词**必须**通过 `assembleSystemPrompt` 函数按固定顺序分层组装，替代原有 `combineSystemText` 的无层级拼接。

组装顺序（约束力从高到低）：

| 序号 | 层名     | 参数名              | 必选 | 说明                                     |
| ---- | -------- | ------------------- | ---- | ---------------------------------------- |
| 1    | identity | `globalIdentity`    | 是   | 全局身份模板（`GLOBAL_IDENTITY_PROMPT`） |
| 2    | rules    | `userRules`         | 否   | 用户/项目级写作规则                      |
| 3    | skill    | `skillSystemPrompt` | 否   | 当前技能的 system prompt                 |
| 4    | mode     | `modeHint`          | 否   | 模式提示（agent/plan/ask）               |
| 5    | memory   | `memoryOverlay`     | 否   | 用户偏好与写作风格记忆                   |
| 6    | context  | `contextOverlay`    | 否   | 动态上下文（KG 规则、项目约束）          |

缺省的层直接跳过，不产生空行或占位符。各层以 `\n\n` 连接。
`globalIdentity` 参数为必选；当其传入空白字符串时，按"空层"处理并跳过，不产生前导分隔符。

函数签名：

```typescript
function assembleSystemPrompt(args: {
  globalIdentity: string;
  userRules?: string;
  skillSystemPrompt?: string;
  modeHint?: string;
  memoryOverlay?: string;
  contextOverlay?: string;
}): string;
```

REQ-ID: `REQ-AIS-PROMPT-ASSEMBLY`

#### Scenario: S1 全层组装顺序正确

- **假设** `args = { globalIdentity: "<identity>AI</identity>", userRules: "规则：不写暴力内容", skillSystemPrompt: "你是续写助手，从光标处继续写作", modeHint: "Mode: agent", memoryOverlay: "用户偏好：简洁风格", contextOverlay: "当前角色：林默正在调查案件" }`
- **当** 调用 `assembleSystemPrompt(args)`
- **则** 返回值中 `"<identity>"` 出现位置 < `"规则"` 出现位置
- **并且** `"规则"` 出现位置 < `"续写助手"` 出现位置
- **并且** `"续写助手"` 出现位置 < `"Mode: agent"` 出现位置
- **并且** `"Mode: agent"` 出现位置 < `"简洁风格"` 出现位置
- **并且** `"简洁风格"` 出现位置 < `"林默"` 出现位置

#### Scenario: S2 缺省层跳过

- **假设** `args = { globalIdentity: "<identity>AI</identity>", userRules: undefined, skillSystemPrompt: undefined, modeHint: undefined, memoryOverlay: undefined, contextOverlay: undefined }`
- **当** 调用 `assembleSystemPrompt(args)`
- **则** 返回值 === `"<identity>AI</identity>"`
- **并且** 返回值不包含连续两个 `\n\n\n\n`（无空层残留）

#### Scenario: S3 空白字符串层被跳过

- **假设** `args = { globalIdentity: "<identity>AI</identity>", userRules: "  ", skillSystemPrompt: "", memoryOverlay: "\n" }`
- **当** 调用 `assembleSystemPrompt(args)`
- **则** 返回值 === `"<identity>AI</identity>"`
- **并且** 空白/换行的层不出现在输出中

#### Scenario: S4 identity 为空白时不产生占位分隔符

- **假设** `args = { globalIdentity: "   ", modeHint: "Mode: agent" }`
- **当** 调用 `assembleSystemPrompt(args)`
- **则** 返回值 === `"Mode: agent"`
- **并且** 返回值不以 `\n\n` 开头

---

### Requirement: 对话消息管理器

AI 服务**必须**在主进程维护对话消息数组，通过 `ChatMessageManager` 管理。

类型定义：

```typescript
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  skillId?: string;
  metadata?: {
    tokenCount: number;
    model: string;
  };
};
```

支持操作：

- `add(msg: ChatMessage)`: 追加消息（浅拷贝存入）
- `clear()`: 清空全部消息
- `getMessages()`: 返回消息数组的防御性浅拷贝

REQ-ID: `REQ-AIS-MESSAGES`

#### Scenario: S1 添加消息

- **假设** 创建一个新的 `ChatMessageManager`，内部消息为空
- **当** 调用 `manager.add({ id: "m1", role: "user", content: "你好", timestamp: 1000 })`
- **则** `manager.getMessages().length === 1`
- **并且** `manager.getMessages()[0].role === "user"`
- **并且** `manager.getMessages()[0].content === "你好"`
- **并且** `manager.getMessages()[0].id === "m1"`
- **并且** `manager.getMessages()[0].timestamp === 1000`

#### Scenario: S2 连续添加保持顺序

- **假设** 创建一个新的 `ChatMessageManager`，内部消息为空
- **当** 依次调用 `manager.add({ id: "m1", role: "user", content: "A", timestamp: 1000 })` 和 `manager.add({ id: "m2", role: "assistant", content: "B", timestamp: 1001 })`
- **则** `manager.getMessages().length === 2`
- **并且** `manager.getMessages()[0].content === "A"`
- **并且** `manager.getMessages()[1].content === "B"`

#### Scenario: S3 清空消息

- **假设** manager 内部有 3 条消息
- **当** 调用 `manager.clear()`
- **则** `manager.getMessages().length === 0`

#### Scenario: S4 getMessages 返回防御性拷贝

- **假设** manager 内部有 1 条消息 `{ id: "m1", role: "user", content: "hello", timestamp: 1000 }`
- **当** 获取 `const msgs = manager.getMessages()`，然后修改 `msgs[0].content = "mutated"`
- **则** `manager.getMessages()[0].content === "hello"`（内部状态未被外部修改）

---

### Requirement: LLM 多轮消息组装与 Token 裁剪

LLM 调用**必须**通过 `buildLLMMessages` 函数组装多轮消息数组。

组装顺序：`[system, ...history, currentUser]`

Token 预算裁剪规则：

1. system 消息**永远**保留
2. 当前用户消息**永远**保留
3. 当总 token 超过 `maxTokenBudget` 时，从最早的历史消息开始裁剪
4. system + currentUser 的 token 之和超过预算时，仍强制保留两者，历史全部裁掉

函数签名：

```typescript
type LLMMessage = { role: "system" | "user" | "assistant"; content: string };
type HistoryMessage = { role: "user" | "assistant"; content: string };

function buildLLMMessages(args: {
  systemPrompt: string;
  history: HistoryMessage[];
  currentUserMessage: string;
  maxTokenBudget: number;
}): LLMMessage[];
```

Token 估算函数：

```typescript
function estimateMessageTokens(text: string): number;
// 空字符串 → 0
// 非空 → Math.max(1, Math.ceil(Buffer.byteLength(text, "utf8") / 4))
```

REQ-ID: `REQ-AIS-MULTITURN`

#### Scenario: S1 标准多轮组装

- **假设** `systemPrompt = "<identity>AI</identity>"`，`history = [{ role: "user", content: "介绍林默" }, { role: "assistant", content: "林默是28岁侦探" }]`，`currentUserMessage = "他的性格？"`，`maxTokenBudget = 10000`
- **当** 调用 `buildLLMMessages({ systemPrompt, history, currentUserMessage, maxTokenBudget })`
- **则** `result.length === 4`
- **并且** `result[0].role === "system"` 且 `result[0].content === "<identity>AI</identity>"`
- **并且** `result[1].role === "user"` 且 `result[1].content === "介绍林默"`
- **并且** `result[2].role === "assistant"` 且 `result[2].content === "林默是28岁侦探"`
- **并且** `result[3].role === "user"` 且 `result[3].content === "他的性格？"`

#### Scenario: S2 Token 超预算裁剪最早历史

- **假设** `systemPrompt = "S"`（estimateMessageTokens → 1），`history = [{ role: "user", content: "AAAA" }, { role: "assistant", content: "BBBB" }, { role: "user", content: "CCCC" }, { role: "assistant", content: "DDDD" }]`（每条约 1 token），`currentUserMessage = "E"`（1 token），`maxTokenBudget = 4`
- **当** 调用 `buildLLMMessages({ systemPrompt, history, currentUserMessage, maxTokenBudget })`
- **则** result 包含 system 和 currentUser（固定 2 tokens）
- **并且** 剩余 2 token 预算分配给最近的历史消息
- **并且** result 最后一条是 `{ role: "user", content: "E" }`
- **并且** 最早的历史消息被裁掉

#### Scenario: S3 空历史

- **假设** `systemPrompt = "system text"`，`history = []`，`currentUserMessage = "你好"`，`maxTokenBudget = 10000`
- **当** 调用 `buildLLMMessages({ systemPrompt, history, currentUserMessage, maxTokenBudget })`
- **则** `result.length === 2`
- **并且** `result[0].role === "system"`
- **并且** `result[1].role === "user"` 且 `result[1].content === "你好"`

#### Scenario: S4 预算不足以容纳全部历史时强制保留 system + current

- **假设** `systemPrompt` 占 100 tokens，`currentUserMessage` 占 50 tokens，`history` 有 10 条消息，`maxTokenBudget = 160`（仅够 system + current + 极少历史）
- **当** 调用 `buildLLMMessages({ systemPrompt, history, currentUserMessage, maxTokenBudget })`
- **则** result 包含 system + currentUser（强制保留）
- **并且** 仅保留预算范围内的最近历史消息
- **并且** `result[result.length - 1].role === "user"`（当前输入在最后）
