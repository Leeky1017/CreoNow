# 03 — CC AI 交互模式深度分析

## 3.1 上下文工程 (Context Engineering)

CC 的上下文构建是一个精心设计的多层管线。

### 3.1.1 系统上下文 (`context.ts`)

```typescript
// 源码实际职责（context.ts:116-195）：
getSystemContext() = {
  Git 状态 (并行获取 5 条 git 命令):
    - 当前分支、主分支、git status、git log、git user.name
    - 在 CCR（远程模式）或禁用 git 指令时跳过
  Cache Breaker:
    - 仅在 feature('BREAK_CACHE_COMMAND') 启用时注入
    - 用于 Anthropic 内部 prompt cache 失效
}

getUserContext() = {
  CLAUDE.md + MEMORY.md 统一加载:
    - 通过 getMemoryFiles() 获取所有记忆文件
    - 经 filterInjectedMemoryFiles() 过滤
    - 再由 getClaudeMds() 统一处理为 claudeMd 字段
    - MEMORY.md 并非独立字段，而是作为 claudeMd 的一部分加载
    - --bare 模式跳过自动发现，但仍允许 --add-dir 指定的目录
    - setCachedClaudeMdContent() 缓存供 yoloClassifier 使用（避免循环依赖）
    - CLAUDE.md 层级遍历:
      - ~/.claude/CLAUDE.md (全局)
      - ./.claude/CLAUDE.md (项目)
      - 额外目录
    - MEMORY.md 限制:
      - 最多 200 行
      - 最多 25KB
  
  当前日期:
    - currentDate: `Today's date is ${getLocalISODate()}.`
      - 超限时截断并附警告
}
```

### 3.1.2 Prompt 缓存策略

CC 精心设计 system prompt 的结构以最大化 prompt cache 命中率：

1. **稳定前缀**：系统指令、工具定义（几乎不变）
2. **半稳定区**：CLAUDE.md、MEMORY.md（同会话内不变）
3. **动态尾部**：Git 状态、时间戳（每次更新）

通过在稳定区域放置 `cache_control` 标记，CC 能在多轮对话中复用大量 prompt cache，显著降低成本。

### 3.1.3 附件系统 (Attachments)

```typescript
// attachments.ts
// 记忆文件以 AttachmentMessage 注入，支持去重
startRelevantMemoryPrefetch() // 在查询前并行预加载
filterDuplicateMemoryAttachments() // 防止重复注入
```

## 3.2 上下文自动压缩 (AutoCompact)

这是 CC 最重要的 AI 交互模式之一。

### 3.2.1 压缩机制

```
对话 Token 数 ≥ (Context Window - 13000) 时触发

1. buildPostCompactMessages()
   → 用 LLM 总结对话历史
   → 生成精简的 summary
   
2. 设置 compact boundary
   → 压缩前的消息标记为 tombstone
   → 只保留 summary + 最近消息

3. runPostCompactCleanup()
   → 清理临时状态
   → 刷新文件缓存

4. trySessionMemoryCompaction()
   → 会话记忆也做压缩
```

### 3.2.2 压缩阈值计算

```typescript
// 三级阈值
const AUTOCOMPACT_BUFFER_TOKENS = 13_000   // 自动压缩缓冲
const WARNING_THRESHOLD = 20_000            // 警告阈值
const ERROR_THRESHOLD = 20_000              // 错误阈值
const MANUAL_COMPACT_BUFFER = 3_000         // 手动压缩缓冲

// 失败断路器
const MAX_CONSECUTIVE_FAILURES = 3  // 连续失败 3 次后停止尝试
// 背景: BQ 数据显示曾有 session 连续失败 3,272 次
//        浪费 ~250K API 调用/天
```

### 3.2.3 **对 CN 的启示**

CN 的创意写作场景比代码编辑更需要上下文管理：
- 长篇小说的上下文远超代码项目
- 写作者经常需要「回忆」几万字前的细节
- 压缩必须保留叙事连贯性，而非代码变更摘要

**建议**：CN 应实现一个 **叙事感知的压缩器** (Narrative-Aware Compactor)，在压缩时保留：
- 角色状态（谁在哪里，做了什么）
- 情节线索（伏笔、悬念）
- 世界观设定（规则、约束）
- 写作风格偏好

## 3.3 自动记忆提取 (Extract Memories)

### 3.3.1 Forked Agent 模式

```typescript
// extractMemories.ts
// 核心创新：使用 forked agent 共享 prompt cache

/**
 * 使用 forked agent 模式 — 完全 fork 主对话
 * 共享父级的 prompt cache（因为 system prompt 相同）
 * 
 * 在每次查询循环结束时运行一次
 * (handleStopHooks → extractMemories)
 */

// 限定自动记忆的工具集
const allowedTools = [
  FILE_READ_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
]
```

### 3.3.2 记忆类型

CC 定义了三类记忆：

1. **MEMORY.md** — 主入口文件
   - 最多 200 行，25KB
   - 索引型内容（指向详细文件）
   - 自动加载到每次对话

2. **Topic Files** — 主题记忆
   - 按主题组织（debugging.md, patterns.md）
   - 需要时通过工具访问
   - 无大小限制

3. **Auto Memory** — 自动提取
   - 每次对话结束后由 forked agent 自动提取
   - 存储在 `~/.claude/projects/<path>/memory/`

### 3.3.3 **对 CN 的启示**

CN 已有 `memoryService`、`episodicMemoryService`、`preferenceLearning`，但缺少 CC 的关键设计：

- **后台异步提取**：CC 用 forked agent 在用户无感知时提取，CN 可在写作会话结束时运行类似后处理
- **共享 cache 的 fork**：降低 90%+ 的记忆提取成本
- **分级记忆容量**：CC 对入口文件有严格限额防止膨胀

## 3.4 成本控制系统

### 3.4.1 多维度追踪

```typescript
// cost-tracker.ts 追踪的维度
{
  totalCostUSD         // 总美元成本
  totalAPIDuration     // API 总耗时
  totalToolDuration    // 工具执行总耗时
  totalLinesAdded      // 代码修改行数
  totalLinesRemoved
  modelUsage: {        // 按模型维度
    [modelName]: {
      inputTokens, 
      outputTokens,
      cacheReadTokens,   // prompt cache 命中
      cacheCreationTokens, // prompt cache 创建
      webSearchRequests  // web 搜索次数
    }
  }
}
```

### 3.4.2 成本计算

```typescript
// modelCost.ts
function calculateUSDCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number,
) {
  // 每个模型有不同的 per-token 价格
  // cache read 通常比 input 便宜 90%
  // cache creation 比 input 贵 25%
}
```

### 3.4.3 会话成本持久化

```typescript
// 成本保存到项目配置中，跨会话恢复
function saveCurrentSessionCosts(sessionId: string): void
function getStoredSessionCosts(sessionId: string): StoredCostState | undefined
```

### 3.4.4 **对 CN 的启示**

CN 的 `runtimeConfig.ts` 中有 `DEFAULT_REQUEST_MAX_TOKENS_ESTIMATE`，但缺少 CC 级别的细粒度追踪。建议：

- 实现 per-provider 的成本追踪（CN 支持 OpenAI/Anthropic 多 provider）
- 追踪 prompt cache 命中率作为优化指标
- 将成本数据暴露给用户（写作者关心 AI 消耗的费用）

## 3.5 Token 预算系统

### 3.5.1 上下文窗口管理

```typescript
// context.ts
function getContextWindowForModel(model: string, betas: string[]): number
function getModelMaxOutputTokens(model: string): number

// 预留 20K tokens 给 compact summary 输出
const MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20_000

function getEffectiveContextWindowSize(model: string): number {
  return contextWindow - reservedTokensForSummary
}
```

### 3.5.2 工具结果预算

```typescript
// toolResultStorage.ts
// 当工具返回巨大结果时，将其截断并存储到临时文件
applyToolResultBudget(result, context)
  → 超限时截断
  → 保存完整结果到 session storage
  → 返回截断版本 + 引用路径
```

### 3.5.3 **对 CN 的启示**

CN 的 `layerAssemblyService.ts` 已有 `ContextBudgetProfile` + `trimTextToTokenBudget`，这比 CC 更先进。但可以从 CC 学习：

- **动态阈值调整**：CC 根据模型实际 context window 计算阈值
- **工具结果截断+存储**：CN 的 RAG 检索结果也可以用这个模式
- **断路器模式**：连续失败后停止尝试（防止无限循环）

## 3.6 Side Query / Forked Agent

### 3.6.1 概念

CC 有两种「旁路查询」模式：

1. **sideQuery** — 快速旁路查询（不共享完整上下文）
2. **forkedAgent** — 完整 fork 主对话（共享 prompt cache）

```typescript
// forkedAgent.ts
function runForkedAgent(params: {
  messages: Message[]
  systemPrompt: SystemPrompt  // 与主对话相同 → 命中 cache
  tools: Tool[]               // 限定工具集
  model: string
  maxTokens: number
}) {
  // fork 后独立运行，不影响主对话状态
  // 但共享 prompt cache → 极低成本
}
```

### 3.6.2 **对 CN 的启示**

Forked Agent 非常适合 CN 的以下场景：

- **AI 审稿子任务**：fork 当前写作上下文，让 AI 做风格一致性检查
- **角色语气验证**：fork 出子 agent 检查角色对白是否 in character
- **情节连贯性检查**：fork 背景知识做自动校验
- **成本极低**：共享 prompt cache 意味着 fork 几乎只需要 output 费用

---

## 3.7 补充：原报告遗漏的压缩子系统

### 3.7.1 Microcompact（轻量级工具结果压缩）

原报告仅分析了 AutoCompact，遗漏了 CC 的轻量级压缩层 `microcompact`。这是在 AutoCompact 之前运行的快速压缩步骤：

```
query.ts 中的三级压缩管线（按执行顺序）：
1. Snip（历史裁剪）      — 基于 HISTORY_SNIP feature flag
2. Microcompact（轻量级）  — 纯 ID 匹配，不检查内容，缓存友好
3. AutoCompact（重量级）   — LLM 驱动的完整压缩
```

Microcompact 的关键特征：
- 通过 `tool_use_id` 定位目标，不检查工具结果内容本身
- 支持缓存编辑模式（cached microcompact），可以延迟 boundary message 直到 API 返回实际 token 用量
- 与 AutoCompact **非互斥**——两者可同时运行，先轻量裁剪再重量压缩

**对 CN 的启示**：CN 的 Skill 执行结果（如 RAG 检索返回的大段文本）也应该在注入 context 前做轻量裁剪，避免不必要地触发重量级压缩。

### 3.7.2 Session Memory Compaction

`sessionMemoryCompact.ts`（514 行）是 AutoCompact 的伴随操作：

- 在每次 autoCompact 完成后调用 `trySessionMemoryCompaction()`
- 也在手动 `/compact` 命令中独立调用
- 将当前会话积累的记忆数据进行压缩和整合
- 与 autoCompact 配合，确保记忆不会因为对话压缩而丢失

**对 CN 的启示**：CN 的 `memoryService` 的 distill pipeline 与此类似，但 CC 将记忆压缩与对话压缩**显式关联**（先压缩对话，再整理记忆），这种顺序保证值得 CN 参考。
