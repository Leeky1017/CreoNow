# 02 — CC 核心引擎深度分析

## 2.1 QueryEngine + query.ts — 心脏

> **勘误**：原报告称 `QueryEngine.ts` 为 ~46K 行，实际为 **1,295 行**（类定义与状态管理）。真正的查询执行逻辑分布在 `query.ts`（**1,729 行**，包含 `query()` 函数和 API 调用流程）。两者共同构成 CC 的核心循环，总计 ~3,024 行。

`QueryEngine.ts` 是 CC 的核心类定义（1,295 行），负责状态初始化、消息管理和循环控制。`query.ts`（1,729 行）包含实际的 API 调用逻辑、流式响应处理和 Tool 结果收集。两者协作承载整个 LLM 交互循环。

### 2.1.1 核心循环 `runQueryLoop()`

```
while (true) {
  1. 预取：startRelevantMemoryPrefetch() // 记忆并行加载
  2. 构建系统 prompt → fetchSystemPromptParts()
  3. 消息规范化 → normalizeMessagesForAPI()
  4. Token 预算检查 → checkTokenBudget()
  5. 调用 API → query() // 流式
  6. 处理响应：
     - 有 tool_use → runTools() → 收集结果 → 继续循环
     - 无 tool_use → handleStopHooks() → 退出循环
  7. 后处理：
     - autoCompact 检查（Token 超阈值自动压缩）
     - 会话持久化
     - 记忆提取
}
```

### 2.1.2 关键性能优化

**Prompt Cache 利用**：

```typescript
// 通过 cache_control 标记实现 prompt cache 命中
// CC 精心设计 system prompt 结构使缓存分界线稳定
const cacheSafeParams = createCacheSafeParams(...)
```

**AutoCompact 智能压缩**：

```typescript
// autoCompact.ts 中的阈值计算
const AUTOCOMPACT_BUFFER_TOKENS = 13_000
const WARNING_THRESHOLD_BUFFER_TOKENS = 20_000

function getAutoCompactThreshold(model: string): number {
  const effectiveContextWindow = getEffectiveContextWindowSize(model)
  return effectiveContextWindow - AUTOCOMPACT_BUFFER_TOKENS
}
```

当 Token 用量接近 context window 上限时，自动触发压缩：
- 保留关键消息
- 用 LLM 总结历史对话
- 设置 compact boundary 标记
- 最多重试 3 次 (`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3`)

**Token Budget 追踪**：

```typescript
// cost-tracker.ts —— 细粒度的成本追踪
type StoredCostState = {
  totalCostUSD: number
  totalAPIDuration: number
  totalAPIDurationWithoutRetries: number
  totalToolDuration: number
  totalLinesAdded: number
  totalLinesRemoved: number
  modelUsage: { [modelName: string]: ModelUsage }
}
```

## 2.2 Tool 系统

### 2.2.1 Tool 类型定义 (`Tool.ts`)

```typescript
type Tool = {
  name: string
  description: string
  inputSchema: z.ZodType    // Zod schema 用于输入验证
  isReadOnly: () => boolean // 决定并发安全性
  isConcurrencySafe?: (input: unknown) => boolean
  checkPermissions: (input: unknown) => PermissionResult  // 注：不是 needsPermissions
  call: (input: unknown, context: ToolUseContext) => Promise<ToolResult<Output>>  // 注：不是 execute，返回 Promise 而非 AsyncGenerator
  // ...更多
}
```

### 2.2.2 ToolUseContext — 工具执行上下文

```typescript
type ToolUseContext = {
  options: {
    tools: Tools
    commands: Command[]
    mcpConnections: MCPServerConnection[]
  }
  abortController: AbortController
  getAppState: () => AppState
  setAppState: SetAppState
  canUseTool: CanUseToolFn
  setToolJSX: SetToolJSXFn
  fileStateCache: FileStateCache
  fileHistory: FileHistoryState
  attributionState: AttributionState
  // ...更多
}
```

### 2.2.3 Tool 编排 — `isConcurrencySafe` 分区批次

```typescript
// toolOrchestration.ts —— 核心编排逻辑
function partitionToolCalls(
  toolUseMessages: ToolUseBlock[],
  toolUseContext: ToolUseContext,
): Batch[] {
  // 连续的 isConcurrencySafe=true → 一个并发批次
  // isConcurrencySafe=false → 单独的串行批次
  // 注意：isConcurrencySafe ≠ isReadOnly，它是独立的安全性标记
  // 默认值：isConcurrencySafe=false，isReadOnly=false（fail-closed）
  // 结果：CCCCWCCCW → [C×4并发, W串行, C×3并发, W串行]
}
```

**安全默认值**（`buildTool()` 定义于 `Tool.ts:757-760`）：
- `isConcurrencySafe` → `false`（假设不安全）
- `isReadOnly` → `false`（假设有写操作）
- `isDestructive` → `false`
- `checkPermissions` → `{ behavior: 'allow', updatedInput }`（延迟到通用权限系统）

**这个模式对 CN 极其重要**：创意写作中的“分析”操作（RAG 检索、角色状态查询、上下文获取）应标记为 `isConcurrencySafe=true`，可以并发；“写入”操作（文档修改、版本保存）保持默认 `false` 即可串行。

### 2.2.4 StreamingToolExecutor — 流式执行器

```typescript
class StreamingToolExecutor {
  // 跟踪每个 Tool 的状态
  private tools: TrackedTool[] = []
  
  // 关键：子 AbortController
  // 当某个 Bash tool 出错时，取消兄弟进程但不中断整个 turn
  private siblingAbortController: AbortController
  
  // 流式添加 tool → 有空位就立即执行
  addTool(block: ToolUseBlock, assistantMessage: AssistantMessage): void
  
  // 有序产出结果（即使并发执行，结果按输入顺序输出）
  async *getRemainingResults(): AsyncGenerator<MessageUpdate>
}
```

**设计亮点**：
- Tool 在流式响应过程中就开始执行（不等完整响应）
- 并发执行但结果保序
- 子 AbortController 实现局部取消
- Progress 消息即时透传

## 2.3 状态管理

### 2.3.1 AppState — 全局状态树

CC 使用自研的轻量 Store，类似 Zustand：

```typescript
// store.ts
function createStore<T>(initialState: T, onChange?: ...) {
  let state = initialState
  const listeners = new Set<() => void>()
  
  return {
    getState: () => state,
    setState: (fn: (prev: T) => T) => {
      state = fn(state)
      listeners.forEach(l => l())
      onChange?.({ newState: state, oldState: prev })
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}
```

AppState 包含：
- `messages: Message[]` — 对话历史
- `toolPermissionContext` — 权限上下文
- `settings: SettingsJson` — 配置
- `tasks: TaskState[]` — 后台任务
- `mcpConnections` — MCP 连接
- `speculation` — 推测执行状态
- `attribution` — 提交归因
- `fileHistory` — 文件历史快照

### 2.3.2 Bootstrap State — 启动时全局状态

`bootstrap/state.ts` 管理模块级全局变量：

```typescript
type State = {
  originalCwd: string
  totalCostUSD: number
  totalAPIDuration: number
  modelUsage: { [modelName: string]: ModelUsage }
  isInteractive: boolean
  sessionId: SessionId
  // ... 几十个字段
}
```

这是 CC 少有的争议性决策：大量使用模块级全局状态（通过 getter/setter 访问）。好处是避免 prop drilling，坏处是测试隔离困难。

## 2.4 消息系统

### 2.4.1 Message 类型

```typescript
type Message =
  | UserMessage          // 用户消息 (含 tool_result)
  | AssistantMessage     // AI 响应
  | SystemMessage        // 系统消息
  | AttachmentMessage    // 附件（记忆、上下文）
  | ProgressMessage      // 进度通知
  | SystemLocalCommandMessage  // 本地命令输出
  | ToolUseSummaryMessage      // Tool 使用摘要
  | TombstoneMessage          // 墓碑（compact 后的占位符）
```

### 2.4.2 消息规范化

```typescript
// 在发送给 API 前做复杂的消息变换
normalizeMessagesForAPI(messages)
  → 过滤非 API 消息
  → 处理 compact boundary
  → 修剪工具结果
  → 应用 token budget
  → 剥离签名块
```

## 2.5 Task 系统

CC 的 Task 系统支持 7 种任务类型：

```typescript
type TaskType =
  | 'local_bash'           // 本地 Shell 命令
  | 'local_agent'          // 本地子 Agent
  | 'remote_agent'         // 远程 Agent
  | 'in_process_teammate'  // 进程内团队成员
  | 'local_workflow'       // 本地工作流
  | 'monitor_mcp'          // MCP 监控
  | 'dream'                // 后台分析
```

任务 ID 生成使用安全的随机前缀：

```typescript
const TASK_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
// 36^8 ≈ 2.8 万亿组合 → 抗暴力破解的 symlink 攻击
```

---

## 2.6 补充：原报告遗漏的重要系统

### 2.6.1 query.ts — 查询执行核心

原报告未区分 `QueryEngine.ts` 和 `query.ts` 的职责分工：

| 文件 | 行数 | 职责 |
|------|------|------|
| `QueryEngine.ts` | 1,295 | 类定义、状态初始化、消息管理、runQueryLoop 外壳 |
| `query.ts` | 1,729 | query() 函数本体、API 调用流程、流式响应处理、Tool 结果收集 |

`query.ts` 中还包含关键的 **三级压缩管线**，按顺序在 API 调用前执行：

1. **Snip**（历史裁剪）— 基于 `HISTORY_SNIP` feature flag 裁剪旧消息
2. **Microcompact** — 轻量级缓存友好的工具结果压缩（通过 `tool_use_id` 定位，不检查内容）
3. **AutoCompact** — 重量级 LLM 驱动的完整对话压缩

三者可叠加执行（非互斥），确保消息在各种场景下都能控制在 context window 内。

### 2.6.2 memdir 系统 — POSIX 风格记忆目录

`src/memdir/` (1,736 行) 实现了一个 POSIX 风格的记忆文件系统，原报告完全未提及：

- **memdir.ts** (507 行)：核心目录操作，类似文件系统的 `ls/cat/mkdir` 语义
- **paths.ts** (278 行)：路径解析和标准化，处理 `~/.claude/projects/<path>/memory/` 层级
- **memoryTypes.ts** (271 行)：记忆类型定义和分类规则
- **findRelevantMemories.ts** (141 行)：相关记忆检索算法
- **teamMemPaths.ts / teamMemPrompts.ts**：团队协作的记忆共享路径和 prompt 模板

**对 CN 的启示**：CN 的 `memoryService` 使用 SQLite 存储记忆，而 CC 使用文件系统。CC 的 memdir 系统通过文件路径语义实现了天然的记忆隔离（项目级/全局级），CN 可参考其路径约定来组织 SQLite 中的记忆数据。

### 2.6.3 Voice 与 Buddy 系统

原报告未分析的实验性模块：

- **voice/** (54 行)：语音模式启用检测（通过 `VOICE_MODE` feature flag 控制）
- **buddy/** (1,298 行)：伴侣 AI 精灵系统
  - `CompanionSprite.tsx` (370 行)：终端 ASCII Art 精灵动画渲染
  - `sprites.ts` (514 行)：精灵状态定义（idle/thinking/happy/error 等多种表情）
  - `companion.ts` (133 行)：伴侣行为逻辑
  - `useBuddyNotification.tsx` (97 行)：通知 Hook

这些系统说明 CC 不仅关注功能，还通过"陪伴感"设计提升用户体验。CN 作为创作工具，可以考虑类似的情感化设计（如写作伴侣角色）。

### 2.6.4 moreright 目录

`src/moreright/useMoreRight.tsx` (25 行) — 右键菜单扩展 Hook。虽然代码量小，但体现了 CC 对 UI 扩展性的细粒度设计思路。
