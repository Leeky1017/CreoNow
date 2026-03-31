# CC 验证源码深度分析 — 基于 claude-code-best 逆向还原项目

> **数据来源**：`claude-code-best/` — 经验证可运行的 CC 逆向还原代码（`bun run dev` → 版本 2.1.888）
> **源码规模**：2,766 个 TS/TSX 文件，515,498 行代码
> **更新日期**：2026-04-01

---

## 一、经验证的真实架构全景

以下所有数据均来自实际可运行的源码，非推测。

### 1.1 核心引擎（脊柱）

| 文件 | 行数 | 职责 |
|:---|:---:|:---|
| `src/QueryEngine.ts` | 1,320 | 会话级编排器 — 拥有整个对话生命周期 |
| `src/query.ts` | 1,732 | 核心查询循环 — 调模型 → 流式响应 → 工具调用 → 循环 |
| `src/Tool.ts` | 792 | 工具接口定义 + 权限上下文类型 |
| `src/tools.ts` | 389 | 工具注册中心 — 条件加载 + deny 规则过滤 |
| `src/context.ts` | 189 | 上下文组装 — 系统上下文 + 用户上下文 |
| `src/main.tsx` | 4,683 | CLI 主逻辑 — Commander.js 定义 + 服务初始化 |
| `src/entrypoints/cli.tsx` | 319 | 真正入口 — 运行时 polyfill 注入 |
| `src/constants/prompts.ts` | 914 | 7 层系统提示词拼装引擎 |
| `src/cost-tracker.ts` | 323 | 会话费用追踪 — 按模型累计 |

**关键发现**：CC 的"心脏"只有 3 个文件合计 3,052 行（QueryEngine + query + Tool）。其余 51 万行是围绕这个心脏构建的肌肉、骨骼和神经系统。

### 1.2 工具系统（42+ 个工具）

| 统计项 | 数值 |
|:---|:---:|
| 工具目录数 | 56 |
| 工具源文件数 | 281 |
| 工具总代码行数 | 51,069 |

**完整工具清单（经验证状态）：**

**始终可用（17 个）：**
`AgentTool` `BashTool` `FileReadTool` `FileEditTool` `FileWriteTool` `NotebookEditTool` `GlobTool` `GrepTool` `WebFetchTool` `WebSearchTool` `AskUserQuestionTool` `SendMessageTool` `SkillTool` `EnterPlanModeTool` `ExitPlanModeTool` `TodoWriteTool` `BriefTool`

**条件启用（14 个）：**
`TaskCreateTool` `TaskGetTool` `TaskUpdateTool` `TaskListTool` `TaskOutputTool` `TaskStopTool` `EnterWorktreeTool` `ExitWorktreeTool` `TeamCreateTool` `TeamDeleteTool` `ToolSearchTool` `PowerShellTool` `LSPTool` `SyntheticOutputTool`

**Feature Flag 关闭（15 个）：**
`SleepTool` `CronCreateTool` `CronDeleteTool` `CronListTool` `RemoteTriggerTool` `MonitorTool` `SendUserFileTool` `OverflowTestTool` `TerminalCaptureTool` `WebBrowserTool` `SnipTool` `WorkflowTool` `PushNotificationTool` `SubscribePRTool` `CtxInspectTool`

**每个工具的工厂模式（`buildTool` — fail-closed 设计）：**

```typescript
const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: (_input?) => false,   // 默认：不安全
  isReadOnly: (_input?) => false,           // 默认：会写入
  isDestructive: (_input?) => false,
}
```

忘了声明安全属性？系统假设最危险的情况。这是安全工程的标准做法。

### 1.3 权限系统（9,411 行，30 个文件）

这是 CC 代码量**占比最大的子系统之一**。

| 文件 | 行数 | 职责 |
|:---|:---:|:---|
| `permissions.ts` | 1,486 | 核心权限逻辑 |
| `yoloClassifier.ts` | 1,495 | ML 分类器 — 判断命令危险等级 |
| `filesystem.ts` | 1,778 | 文件系统权限 — 沙箱 + scratchpad |
| `permissionSetup.ts` | 1,532 | 权限初始化与配置 |
| `pathValidation.ts` | 486 | 路径安全验证 |
| `shellRuleMatching.ts` | 228 | Shell 命令规则匹配 |
| `dangerousPatterns.ts` | 80 | 危险命令模式定义 |
| `bashClassifier.ts` | 61 | Bash 命令安全分类 |

**权限四态决策**：`allow` → `deny` → `ask` → `passthrough`

### 1.4 上下文压缩（三层）

| 层级 | 文件 | 行数 | 触发条件 |
|:---|:---|:---:|:---|
| 微压缩 | `compact.ts` | 1,708 | 工具结果 > 阈值时清除旧结果 |
| 自动压缩 | `autoCompact.ts` | 351 | Token 消耗达到窗口 87% |
| 完全压缩 | `compact.ts` | 同上 | AI 生成对话摘要替换历史 |

**关键阈值**（从源码中提取）：

```typescript
// 自动压缩触发：窗口大小 - 13,000 buffer
// 压缩后 token 预算：
//   文件恢复：50,000 tokens
//   每个文件上限：5,000 tokens
//   技能内容：25,000 tokens
// 熔断器：连续 3 次压缩失败后停止
```

### 1.5 提示词拼装引擎（914 行）

**7 层拼装 + 缓存分界线**（经源码验证）：

```typescript
export async function getSystemPrompt(...): Promise<string[]> {
  return [
    // --- 静态内容（可缓存，scope: 'global'）---
    getSimpleIntroSection(outputStyleConfig),   // 角色定义 + 安全指令
    getSimpleSystemSection(),                    // 系统规则
    getSimpleDoingTasksSection(),                // 任务执行规范
    getActionsSection(),                         // 可用操作
    getUsingYourToolsSection(enabledTools),       // 工具使用手册
    getSimpleToneAndStyleSection(),              // 语气和风格
    getOutputEfficiencySection(),                // 输出效率

    // === 缓存边界 ===
    ...(shouldUseGlobalCacheScope() ? [SYSTEM_PROMPT_DYNAMIC_BOUNDARY] : []),

    // --- 动态内容（每次不同）---
    ...resolvedDynamicSections,  // Git 状态、CLAUDE.md、记忆、MCP 等
  ].filter(s => s !== null)
}
```

**缓存分界线的工程意义**：
- `SYSTEM_PROMPT_DYNAMIC_BOUNDARY = '__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__'`
- 分界线上方的内容被 Claude API 以 `scope: 'global'` 缓存
- 缓存命中 = 跳过这些 token 的处理 = 省钱 + 快
- 工具排序固定 = 缓存前缀稳定 = 命中率最大化

### 1.6 服务层（40 个服务模块）

| 服务 | 文件数/行数 | 经验证状态 | 说明 |
|:---|:---:|:---:|:---|
| `api/` | ~3,400 行 | ✅ | 4 个 Provider（Anthropic/Bedrock/Vertex/Azure） |
| `mcp/` | 24 文件 12,000+ 行 | ✅ | MCP 协议完整实现 |
| `compact/` | ~2,000 行 | ✅ | 三层压缩 |
| `tools/` | | ✅ | StreamingToolExecutor + toolOrchestration |
| `SessionMemory/` | | ✅ | 会话记忆管理 |
| `extractMemories/` | | ✅ | 自动记忆提取 |
| `skillSearch/` | | ✅ | 技能搜索（本地+远程） |
| `plugins/` | | ✅ | 插件基础设施 |
| `oauth/` | | ✅ | OAuth 认证流程 |
| `policyLimits/` | | ✅ | 策略限制 |
| `autoDream/` | | ✅ | KAIROS 夜间记忆蒸馏 |

### 1.7 Feature Flags（85+，多数 `false`）

> 注意：早期分析说“30 个”，经 `grep -roh "feature('...')"` 全量扫描确认：`claude-code-best/src` 中有 **85 个**唯一 feature gate，`src/` 中有 **89 个**。这不是“少量横切配置”，而是编译期与运行期开关网络。

这是 CC 未来路线图的真正体现：

**自主 Agent 方向**：
- `KAIROS` — 长期运行自主 Agent + Brief + Push 通知
- `PROACTIVE` — 主动执行 + SleepTool 定时唤醒
- `COORDINATOR_MODE` — 多 Agent 编排
- `BUDDY` — 配对编程
- `FORK_SUBAGENT` — 会话分叉子代理

**远程/分布式方向**：
- `BRIDGE_MODE` — 远程控制桥接
- `DAEMON` — 后台常驻守护进程
- `BG_SESSIONS` — 后台会话管理
- `SSH_REMOTE` — SSH 远程连接
- `DIRECT_CONNECT` — cc:// URL 协议

**增强工具方向**：
- `WEB_BROWSER_TOOL` — 终端内嵌浏览器
- `VOICE_MODE` — 语音输入输出
- `WORKFLOW_SCRIPTS` — 用户自定义工作流

---

## 二、QueryEngine 深度解剖

这是 CC 最核心的类，CN 的 `WritingOrchestrator` 应以此为蓝本。

### 2.1 配置类型（直接从源码提取）

```typescript
export type QueryEngineConfig = {
  cwd: string
  tools: Tools
  commands: Command[]
  mcpClients: MCPServerConnection[]
  agents: AgentDefinition[]
  canUseTool: CanUseToolFn
  getAppState: () => AppState
  setAppState: (f: (prev: AppState) => AppState) => void
  initialMessages?: Message[]
  readFileCache: FileStateCache
  customSystemPrompt?: string
  appendSystemPrompt?: string
  userSpecifiedModel?: string
  fallbackModel?: string
  thinkingConfig?: ThinkingConfig
  maxTurns?: number
  maxBudgetUsd?: number
  taskBudget?: { total: number }
  jsonSchema?: Record<string, unknown>
  verbose?: boolean
  replayUserMessages?: boolean
  handleElicitation?: ToolUseContext['handleElicitation']
  includePartialMessages?: boolean
  setSDKStatus?: (status: SDKStatus) => void
  abortController?: AbortController
  orphanedPermission?: OrphanedPermission
  snipReplay?: (yieldedSystemMsg: Message, store: Message[]) => {...} | undefined
}
```

### 2.2 生命周期（submitMessage 异步生成器）

```typescript
class QueryEngine {
  private mutableMessages: Message[]           // 对话历史
  private abortController: AbortController     // 中止控制
  private permissionDenials: SDKPermissionDenial[]  // 权限拒绝记录
  private totalUsage: NonNullableUsage         // 累计 token 用量
  private readFileState: FileStateCache        // 文件读取缓存
  private discoveredSkillNames: Set<string>    // 已发现技能
  private loadedNestedMemoryPaths: Set<string> // 已加载记忆路径

  async *submitMessage(prompt, options): AsyncGenerator<SDKMessage> {
    // 1. 清空本轮技能发现集合
    // 2. 构建系统提示词
    // 3. 组装上下文（用户上下文 + 系统上下文）
    // 4. 包装权限检查函数（追踪拒绝）
    // 5. 调用 query() 核心循环
    // 6. 流式 yield 每个事件
    // 7. 更新累计用量
    // 8. 持久化会话
  }
}
```

**关键设计决策**（CN 应直接采用）：

1. **AsyncGenerator 模式**：`submitMessage` 返回 `AsyncGenerator<SDKMessage>`，调用者用 `for await` 消费。这比回调或 Promise 更优，因为它让消费者控制背压。

2. **每轮清空 + 跨轮持久**：`discoveredSkillNames` 每轮清空防止无限增长，但 `mutableMessages` 和 `totalUsage` 跨轮持久。

3. **权限包装**：把原始 `canUseTool` 包装一层，追踪拒绝记录但不改变行为。CN 应对文档修改操作做同样的包装（追踪用户拒绝了哪些改写建议）。

4. **文件快照集成**：每轮开始时创建文件快照（`fileHistoryMakeSnapshot`），工具执行修改文件后可回退。CN 应在每次 AI 写入前创建 ProseMirror 文档快照。

### 2.3 向 CN 的映射

| CC QueryEngine | CN WritingOrchestrator |
|:---|:---|
| `tools: Tools` | `skills: WritingSkill[]`（续写/润色/改写） |
| `canUseTool: CanUseToolFn` | `canModifyDocument: CanModifyFn`（预览-确认-写入） |
| `readFileCache: FileStateCache` | `documentSnapshot: DocSnapshot` |
| `customSystemPrompt` | `rolePrompt + styleGuide` |
| `maxBudgetUsd` | `sessionBudgetUsd` |
| `thinkingConfig` | `thinkingConfig`（同） |
| `mutableMessages` | `conversationHistory` |
| `AsyncGenerator<SDKMessage>` | `AsyncGenerator<WritingEvent>`（diff/preview/final） |

---

## 三、query.ts 核心循环深度解剖

### 3.1 循环状态类型

```typescript
type State = {
  messages: Message[]
  toolUseContext: ToolUseContext
  autoCompactTracking: AutoCompactTrackingState | undefined
  maxOutputTokensRecoveryCount: number       // max_output_tokens 恢复计数
  hasAttemptedReactiveCompact: boolean
  maxOutputTokensOverride: number | undefined
  pendingToolUseSummary: Promise<ToolUseSummaryMessage | null> | undefined
  stopHookActive: boolean | undefined
  turnCount: number
  transition: Continue | undefined           // 上一轮为何继续
}
```

### 3.2 循环流程（经源码验证）

```
queryLoop():
  while (true) {
    1. 检查 token 预算（checkTokenBudget）
    2. 检查最大轮次（maxTurns）
    3. 调用模型获取流式响应（deps.callModel）
    4. for await 每个 StreamEvent:
       - assistant 消息 → yield 给调用者
       - tool_use 消息 → 检查权限 → 执行工具 → yield 结果
       - max_output_tokens → 恢复循环（最多 3 次）
       - prompt_too_long → 尝试自动压缩
    5. 所有工具执行完毕 → 检查是否需要继续
    6. 需要继续 → 回到 1
    7. 不需要 → 返回 Terminal
  }
```

### 3.3 关键常量

```typescript
const MAX_OUTPUT_TOKENS_RECOVERY_LIMIT = 3   // max_output_tokens 最多恢复 3 次
// 自动压缩触发：窗口 87%
// 熔断器：连续 3 次压缩失败 → 停止
```

---

## 四、工具系统架构详解

### 4.1 工具接口（Tool 类型）

```typescript
type Tool = {
  name: string
  description: string
  inputSchema: ToolInputJSONSchema
  call: (input: unknown, context: ToolUseContext) => Promise<ToolResult>
  isEnabled: () => boolean
  isReadOnly: (input?: unknown) => boolean
  isConcurrencySafe: (input?: unknown) => boolean
  isDestructive: (input?: unknown) => boolean
  userFacingName: () => string
  prompt?: string | (() => string)     // 写给 LLM 的使用手册
  progressComponent?: React.FC         // 进度展示组件
}
```

### 4.2 ToolUseContext — 工具执行上下文

```typescript
type ToolUseContext = {
  readFileState: FileStateCache        // 已读文件缓存
  abortController: AbortController
  toolPermissionContext: ToolPermissionContext
  toolUseID: string                    // 当前工具调用 ID
  setToolJSX: SetToolJSXFn
  mcpClients: MCPServerConnection[]
  agents: AgentDefinition[]
  options: {
    dangerouslySkipPermissions?: boolean
    model?: string
    verbose?: boolean
    maxThinkingTokens?: number
  }
  handleElicitation?: (params) => Promise<ElicitResult>
}
```

### 4.3 "先读后改"铁律（经源码验证）

```typescript
// FileEditTool 会检查 readFileState:
// 如果目标文件未出现在 readFileState 中 → 直接报错
// 这确保了 AI 必须先用 FileReadTool 读过文件才能编辑
```

### 4.4 StreamingToolExecutor

工具执行采用流式执行器：
- 只读工具（`isReadOnly`）→ 可并行
- 写入工具 → 串行执行
- 并发安全工具（`isConcurrencySafe`）→ 额外并行优化

---

## 五、提示词系统工程详解

### 5.1 静态层（7 层，可缓存）

| 层 | 函数 | 内容 |
|:---:|:---|:---|
| 1 | `getSimpleIntroSection` | 角色定义 + 网络安全风险指令 |
| 2 | `getSimpleSystemSection` | 系统规则（权限模式、标签说明、Hook） |
| 3 | `getSimpleDoingTasksSection` | 代码编写规范 + 任务执行流程 |
| 4 | `getActionsSection` | 可用操作定义 |
| 5 | `getUsingYourToolsSection` | 每个工具的使用手册（从 prompt.ts 收集） |
| 6 | `getSimpleToneAndStyleSection` | 语气和风格指引 |
| 7 | `getOutputEfficiencySection` | 输出效率优化指令 |

### 5.2 动态层（每次不同）

- 当前 Git 状态（分支、未提交变更）
- `CLAUDE.md` 项目配置（从项目目录层级收集）
- 用户记忆文件（AI 选择最相关的 5 个）
- MCP 服务器指令
- Coordinator 模式上下文
- Ant 内部版本附加指令
- 语言偏好
- 输出风格

### 5.3 Ant 内部版本差异（经代码验证）

```typescript
// process.env.USER_TYPE === 'ant' 时的差异：
// 1. FileEditTool: 添加 "Use the smallest old_string that's clearly unique"
// 2. 更激进的代码风格指引："不写注释除非 WHY 不明显"
// 3. "倒金字塔写作法"输出策略
// 4. Verification Agent、Explore & Plan Agent 等实验功能
// 5. 模型覆盖配置 (getAntModelOverrideConfig)
```

### 5.4 最新模型信息

```typescript
const FRONTIER_MODEL_NAME = 'Claude Opus 4.6'
const CLAUDE_4_5_OR_4_6_MODEL_IDS = {
  opus: 'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
}
```

---

## 六、子 Agent 蜂群架构

### 6.1 AgentTool 工作机制

```typescript
// 输入 schema
z.object({
  description: z.string(),           // 3-5 字任务描述
  prompt: z.string(),                // 详细任务指令
  subagent_type: z.string().optional(),  // 子代理类型
  model: z.enum(['sonnet', 'opus', 'haiku']).optional(),
  run_in_background: z.boolean().optional(),
})
```

### 6.2 子 Agent 自我意识注入

```typescript
export function buildChildMessage(directive: string): string {
  return `STOP. READ THIS FIRST.
You are a forked worker process. You are NOT the main agent.
RULES (non-negotiable):
1. Do NOT spawn sub-agents; execute directly.
2. Do NOT converse, ask questions, or suggest next steps
3. USE your tools directly
4. Keep your report under 500 words.
5. Your response MUST begin with "Scope:". No preamble.`
}
```

### 6.3 Coordinator 模式编排

```
Phase 1: Research       → N 个 worker 并行搜索（只读，可并行）
Phase 2: Synthesis      → 主 Agent 综合
Phase 3: Implementation → M 个 worker 按文件分组串行（写入，防冲突）
Phase 4: Verification   → 1 个 worker 跑测试
```

### 6.4 Prompt Cache 极致优化

所有 fork 子代理的工具结果使用统一占位符：
```
'Fork started — processing in background'
```
原因：Claude API prompt cache 基于**字节级前缀匹配**。统一占位符 = 10 个子 Agent 只有第一个冷启动。

---

## 七、记忆系统

### 7.1 AI 驱动的记忆检索

```typescript
const SELECT_MEMORIES_SYSTEM_PROMPT = 
  `You are selecting memories that will be useful to Claude Code.
   Return a list of filenames for the memories that will clearly 
   be useful (up to 5).
   - If you are unsure if a memory will be useful, do not include it.`
```

- 用 Claude Sonnet（小模型）扫描记忆文件标题
- 选出最多 5 个最相关的
- 精确度优先于召回率

### 7.2 KAIROS 夜间做梦

```
原始日志: logs/2026/03/2026-03-30.md
         ↓ /dream 蒸馏（低活跃期自动运行）
结构化:   memory/user_preferences.md
         memory/project_context.md
```

### 7.3 文件历史快照（1,115 行）

`src/utils/fileHistory.ts` — 每次工具修改文件前自动快照：

```typescript
type FileHistoryState = {
  snapshots: Map<string, FileSnapshot>
  // 最大快照数量限制
  // diff 计算
  // 回退机制
}
```

---

## 八、构建与运行

### 8.1 经验证的命令

```bash
# 安装（需要 bun >= 1.3.11）
bun install

# 开发模式
bun run dev          # 看到 2.1.888 说明正确

# 管道模式
echo "say hello" | bun run src/entrypoints/cli.tsx -p

# 构建
bun run build        # → dist/cli.js (~25.74 MB, 5326 模块)
```

### 8.2 构建配置

```json
{
  "scripts": {
    "build": "bun build src/entrypoints/cli.tsx --outdir dist --target bun",
    "dev": "bun run src/entrypoints/cli.tsx"
  }
}
```

### 8.3 Monorepo 包

| 包 | 状态 | 说明 |
|:---|:---:|:---|
| `color-diff-napi` | ✅ 1006行 TS port | 终端语法高亮 diff（非原生绑定，纯 TypeScript 实现） |
| `audio-capture-napi` | ✅ 151行真实现 | 使用 SoX(macOS)/arecord(Linux) 做音频采集 |
| `image-processor-napi` | ✅ 125行真实现 | 基于 sharp + 系统剪贴板（osascript/xclip）读取图像 |
| `modifiers-napi` | ✅ 68行真实现 | macOS FFI (`bun:ffi`) 检测修饰键状态 |
| `url-handler-napi` | stub | `waitForUrlEvent()` → null |
| `@ant/computer-use-*` | stub | Computer Use 全部 stub |

### 8.4 运行时 Polyfill

```typescript
// src/entrypoints/cli.tsx 顶部
const feature = (_name: string) => false  // 所有 feature flag 关闭
globalThis.MACRO = {
  VERSION: "2.1.87",
  BUILD_TIME: Date.now(),
  // ... 其他宏
}
```

### 8.5 TSC 类型错误

- 原始：~1,341 个 tsc 错误
- 修复后：~294 个（减少 78%）
- 全部来自反编译产生的 `unknown`/`never`/`{}` 类型
- **不影响 Bun 运行时**

---

## 九、CC → CN 架构映射总表

| CC 概念 | CC 实现 | CN 等价物 | CN 应学什么 |
|:---|:---|:---|:---|
| **编排器** | `QueryEngine` (1,320行) | `WritingOrchestrator` | AsyncGenerator 模式、配置注入、每轮快照 |
| **核心循环** | `query()` (1,732行) | `writingLoop()` | 流式响应消费、工具调用循环、自动压缩 |
| **工具接口** | `Tool` type (792行) | `WritingSkill` type | fail-closed 默认值、先读后改、独立 prompt |
| **工具注册** | `tools.ts` (389行) | `skillRegistry.ts` | 条件加载、deny 规则、SIMPLE 模式 |
| **提示词拼装** | `prompts.ts` (914行) | `promptAssembler.ts` | 7 层拼装、缓存分界线、工具手册注入 |
| **权限系统** | 30 文件 9,411行 | `confirmationSystem` | 四态决策、ML 分类器、先读后改铁律 |
| **上下文压缩** | `compact/` ~2,000行 | `contextManager` | 三层压缩、87% 阈值、熔断器 |
| **子 Agent** | `AgentTool/` | `WritingWorker` | 自我意识注入、只读并行/写入串行 |
| **记忆系统** | `SessionMemory/` + `memdir/` | `memoryService` | AI 检索、精确度优先、KAIROS 蒸馏 |
| **费用追踪** | `cost-tracker.ts` (323行) | `costTracker` | 按模型累计、会话持久化、状态栏展示 |
| **文件快照** | `fileHistory.ts` (1,115行) | `docSnapshot` | 修改前快照、diff 计算、一键回退 |
| **REPL UI** | `REPL.tsx` (5,009行) | `EditorScreen` | 组件拆分、状态管理、键盘快捷键 |

---

## 十、对 CN 的核心启示

### 10.1 CC 教会我们的 6 件事

1. **编排器是脊柱**：CC 的 `QueryEngine` 拥有完整请求生命周期。CN 的 `WritingOrchestrator` 也必须如此——不是散装函数调用，而是一个有状态的类管理整个写作会话。

2. **提示词是编译器产出**：7 层拼装 + 缓存分界线 + 每个技能独立手册。CN 的提示词不能是一个静态字符串，而是动态组装的分层结构。

3. **安全不是功能，是地基**：9,411 行权限代码 + fail-closed 默认值 + 先读后改铁律。CN 的原稿保护必须从第一天就内建到编排器中。

4. **压缩是必需品**：长篇写作 = 巨量上下文。三层压缩 + 熔断器 + 87% 阈值。CN 处理 20 万字长篇时必须有等价的压缩策略。

5. **费用感知是信任**：用户看不到花了多少钱 = 月底账单恐慌 = 信任崩塌。CC 有完整的 cost-tracker，CN 必须有。

6. **子 Agent 是生产力倍增器**：并行处理只读任务（查角色设定、查前文伏笔），串行处理写入任务（修改文档）。CC 的 Coordinator 模式就是蓝本。

### 10.2 CN 不需要学 CC 的 3 件事

1. **CLI/Terminal UI**：CC 的 Ink/React 终端渲染对 CN 无用。CN 用 Electron + ProseMirror。
2. **编程工具链**：BashTool、GrepTool、GlobTool 等面向代码的工具。CN 需要面向文字的工具。
3. **Git 集成**：CC 深度集成 Git。CN 用自己的版本快照系统，更简单但足够。

---

## 十一、验证源码后的重大发现补充（2026-04-01 第二轮审计）

> 以下内容为对照 `claude-code-best/` 验证源码后发现的**原文档遗漏或严重低估的系统**。
> 共识别出 **22 个系统或子系统** 需要补充或修正。

---

### 11.1 Coordinator/Swarm 多 Agent 编排系统（原文档仅一笔带过）

**重要成熟度说明**：Coordinator 的编排提示词工程量很大（400+ 行），但入口受 `feature('COORDINATOR_MODE')` + `isEnvTruthy(process.env.CLAUDE_CODE_COORDINATOR_MODE)` **双重 gate** 控制（`coordinatorMode.ts:39-42`）。这意味着它在 CC 的公开发布版中默认不启用。CN 应学习其编排思路，但不应将其视为已经面向全量用户验证的稳定特性。

#### 11.1.1 四阶段工作流

```
Phase 1: Research       → N 个 worker 并行（只读，可并行）
Phase 2: Synthesis      → Coordinator 自己综合发现（最关键：不委派理解）
Phase 3: Implementation → M 个 worker 按文件分组（写入，防冲突）
Phase 4: Verification   → 独立 worker 验证（"证明代码能工作，不是确认它存在"）
```

#### 11.1.2 Worker 指令工程

Coordinator 系统提示词中有明确规则：

```
- Worker 看不到你的对话历史。每个 prompt 必须自包含。
- 不要写 "based on your findings" — 这是偷懒将理解委派给 worker。
- 你必须「理解」发现 → 写出包含文件路径、行号的具体指令。
- Continue vs Spawn 的决策矩阵：
  - 上下文重叠高 → Continue（SendMessageTool）
  - 上下文重叠低 → Spawn fresh（AgentTool）
  - 验证他人工作 → 必须 Spawn fresh（防止假设偏见）
  - 完全失败的方向 → Spawn fresh（清洁石板避免锚定）
```

#### 11.1.3 Worker 结果通知格式

```xml
<task-notification>
  <task-id>{agentId}</task-id>
  <status>completed|failed|killed</status>
  <summary>{human-readable status summary}</summary>
  <result>{agent's final text response}</result>
  <usage>
    <total_tokens>N</total_tokens>
    <tool_uses>N</tool_uses>
    <duration_ms>N</duration_ms>
  </usage>
</task-notification>
```

#### 11.1.4 Scratchpad 跨 Worker 共享

```typescript
// isScratchpadGateEnabled() → tengu_scratch feature gate
// Scratchpad 目录下 Worker 可无权限读写 — 用于持久化跨 Worker 知识
```

**CN 映射**：创作场景的 Coordinator 模式 = "写作总监"分配任务给多个"写手 Worker"。例如：一个 Worker 负责查角色设定，一个 Worker 负责分析前文伏笔，一个 Worker 负责实际续写，另一个 Worker 负责审稿。

---

### 11.2 记忆系统深度补充（原文档严重低估）

实际记忆系统有 **4 层**，远比原文档的"AI 检索 + KAIROS 蒸馏"复杂。

#### 11.2.1 MEMORY.md 入口文件（带双重截断保护）

```typescript
export const ENTRYPOINT_NAME = 'MEMORY.md'
export const MAX_ENTRYPOINT_LINES = 200     // 最多 200 行
export const MAX_ENTRYPOINT_BYTES = 25_000  // 最多 25KB

// 双重截断：先按行数截断（自然边界），再按字节截断
// 截断后追加警告消息，告知用户只加载了部分内容
```

**工程意义**：CC 观察到用户的 MEMORY.md 会无限增长（p97 = 197KB 且仍在 200 行内 → 每行极长），因此加了字节级保护。CN 处理长篇小说的角色设定也会有同样问题。

#### 11.2.2 AI 驱动的精确记忆检索

```typescript
// findRelevantMemories.ts — 完整的 AI 记忆召回
async function findRelevantMemories(
  query: string,
  memoryDir: string,
  signal: AbortSignal,
  recentTools: readonly string[],         // 最近使用的工具（排除其文档）
  alreadySurfaced: ReadonlySet<string>,   // 已展示过的（避免重复选取）
): Promise<RelevantMemory[]>

// 1. scanMemoryFiles → 扫描所有记忆文件的标题和描述
// 2. 过滤掉 alreadySurfaced
// 3. 用 Sonnet 从候选集中选择 ≤5 个最相关记忆
// 4. 使用 JSON Schema 结构化输出（非自由文本解析）
// 5. 记录 memory shape telemetry（选择率、空选择率）
```

**关键发现**：`recentTools` 参数 → 如果模型刚调用了某个工具，不要再选那个工具的使用文档作为记忆。因为模型已经在用了，再选就是噪声。**这种细粒度的噪声过滤在之前的分析中完全没提到。**

#### 11.2.3 Session Memory — 会话级自动笔记

```typescript
// sessionMemory.ts — 后台自动从对话中提取要点
// 运行条件：
//   1. token 消耗达到初始化阈值
//   2. 两次提取之间满足最小 token + 工具调用增长
//   3. 使用 forked agent（共享 prompt cache）
//   4. 模板化结构化提取
```

**CN 映射**：Session Memory 对创作工具极其重要。AI 在帮用户写了 5 章之后，应该自动记住"这一章建立了什么冲突"、"哪些角色出场了"、"伏笔进展如何"。

#### 11.2.4 Extract Memories — 持久化记忆提取

```typescript
// extractMemories.ts — 在每个完整查询循环结束时运行
// 使用 forked agent 模式（共享 prompt cache）
// 沙箱权限：
//   - Read/Grep/Glob → 无限制允许
//   - Bash → 仅只读命令
//   - Edit/Write → 仅 auto-memory 目录内
//   - 其他 → 全部拒绝
// 智能去重：检测主 agent 是否已经写了记忆 → 跳过提取
```

#### 11.2.5 AutoDream — 24 小时跨会话蒸馏

```typescript
// autoDream.ts — 三重门控（按成本递增排列）
// Gate 1: 距上次蒸馏 >= minHours （默认 24h，一次 stat）
// Gate 2: 新会话数 >= minSessions （默认 5，需扫描磁盘）
// Gate 3: 无其他进程在蒸馏（consolidation lock）
// 扫描节流：距上次磁盘扫描 < 10 分钟 → 跳过
```

#### 11.2.6 记忆类型分类学

CC 把记忆限制在**封闭的四类分类学**中（user/feedback/project/reference），**明确排除**从当前项目状态可推导的内容（代码模式、架构、git 历史）。

---

### 11.3 Compact 压缩系统深度补充（原文档覆盖 3 个文件，实际 16 个文件）

| 文件 | 职责 |
|:---|:---|
| `compact.ts` (1,708行) | 全量压缩 — AI 生成摘要替换历史 |
| `autoCompact.ts` (351行) | 自动触发 — 87% 阈值 + 熔断器 |
| `microCompact.ts` | 微压缩 — 原地裁剪旧工具结果（无 AI） |
| `cachedMicrocompact.ts` | 缓存感知微压缩 — 使用 `cache_edits` block |
| `snipCompact.ts` | Snip 压缩 — 内容片段级压缩（当前 gated） |
| `snipProjection.ts` | Snip 投影 — 压缩后的内容投射 |
| `reactiveCompact.ts` | 反应式压缩 — 收到 prompt_too_long 后立即压缩 |
| `apiMicrocompact.ts` | API 级微压缩 |
| `timeBasedMCConfig.ts` | 时间窗口微压缩配置 |
| `sessionMemoryCompact.ts` | Session Memory 压缩 |
| `postCompactCleanup.ts` | 压缩后清理操作 |
| `compactWarningHook.ts` | 压缩警告 Hook |
| `compactWarningState.ts` | 压缩警告状态管理 |
| `grouping.ts` | 消息按 API 轮次分组 |
| `prompt.ts` | 压缩提示词生成 |

#### 11.3.1 微压缩新发现 — 缓存编辑块

```typescript
// Cached Microcompact — cache_edits blocks
// 作用：在不破坏 prompt cache 的前提下"就地修改"已发送的工具结果
// API 级别优化：告诉 Claude API "这个位置的内容变了，但前缀还是一样的"
// 设计意图：prompt cache 基于字节级前缀匹配，缓存编辑块让你
//          修改中间内容时不丢失前面已缓存的内容

export function consumePendingCacheEdits()   // 消费待定编辑
export function getPinnedCacheEdits()        // 获取已固定编辑
export function pinCacheEdits()              // 固定新编辑到指定位置
export function markToolsSentToAPIState()    // 标记已发送
export function resetMicrocompactState()     // 重置状态
```

#### 11.3.2 图片 token 估算

```typescript
const IMAGE_MAX_TOKEN_SIZE = 2000  // 每张图片/文档 = 2000 tokens
```

#### 11.3.3 压缩前去图片

```typescript
// compact.ts — stripImagesFromMessages()
// 压缩前把所有图片替换为 [image] 文本标记
// 原因：图片在摘要生成时无用，且可能导致压缩 API 本身超限
// 处理嵌套结构：tool_result 内的图片也被替换
```

**CN 映射**：CN 处理长篇时不会有图片问题，但有**创作素材附件**问题。参考图、灵感截图等应该在压缩时用文字描述替代。

---

### 11.4 工具编排系统（原文档严重低估）

#### 11.4.1 智能批处理执行

```typescript
// toolOrchestration.ts — partitionToolCalls
// 1. 把 N 个工具调用分组为 Batch[]
// 2. 每个 Batch 要么全是只读 → 并行执行
//    要么包含写入 → 串行执行
// 3. 并发上限可配置：CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY（默认 10）
// 4. 并行执行时的 context modifier 排队：
//    先收集所有并行 batch 的 modifier → batch 结束后按顺序应用
```

```typescript
function partitionToolCalls(toolUseMessages, toolUseContext): Batch[] {
  // 连续的只读工具合并为一个并行 batch
  // 写入工具单独一个串行 batch
  // isConcurrencySafe 抛异常 → 保守判定为不安全
}
```

**CN 映射**：当 AI 需要同时查角色设定 + 查前文 + 查伏笔清单时，这三个"只读查询"可以并行执行，然后结果合并后才开始"写入文档"。

---

### 11.5 Bridge 远程会话系统（原文档完全缺失，30+ 个文件）

| 文件 | 职责 |
|:---|:---|
| `bridgeMain.ts` | 远程会话主逻辑 — JWT 认证 + 会话管理 |
| `bridgeApi.ts` | CCR API 客户端 |
| `bridgeConfig.ts` | Bridge 配置 |
| `bridgeMessaging.ts` | 消息传输（WebSocket） |
| `bridgePermissionCallbacks.ts` | 远程权限回调 |
| `bridgeUI.ts` | Bridge 状态 UI |
| `capacityWake.ts` | 容量唤醒机制 |
| `createSession.ts` | 会话创建 |
| `jwtUtils.ts` | JWT token 刷新调度器 |
| `sessionRunner.ts` | 会话运行器（带 worktree） |
| `trustedDevice.ts` | 受信设备 token |
| `workSecret.ts` | Worker secret 管理 |
| `webhookSanitizer.ts` | Webhook 清洗 |
| `replBridge.ts` | REPL Bridge 传输层 |

**关键架构模式**：

```typescript
// 退避配置 — CC 的重连策略是分层的
const DEFAULT_BACKOFF: BackoffConfig = {
  connInitialMs: 2_000,       // 连接失败初始重试
  connCapMs: 120_000,         // 连接重试上限 2 分钟
  connGiveUpMs: 600_000,      // 10 分钟后放弃
  generalInitialMs: 500,      // 一般错误初始重试
  generalCapMs: 30_000,       // 一般错误上限 30 秒
  generalGiveUpMs: 600_000,   // 10 分钟后放弃
}
```

**AppState 中 Bridge 相关字段（11 个）**：
```
replBridgeEnabled, replBridgeExplicit, replBridgeOutboundOnly,
replBridgeConnected, replBridgeSessionActive, replBridgeReconnecting,
replBridgeConnectUrl, replBridgeSessionUrl, replBridgeEnvironmentId,
replBridgeSessionId, replBridgeError
```

**CN 映射**：CN 暂时不需要远程会话，但 Bridge 的退避策略模式（分层退避 + 放弃阈值）适用于 CN 的 AI API 调用重试。

---

### 11.6 AppState 状态管理（原文档完全缺失，80+ 字段）

#### 11.6.1 状态架构

```typescript
// store.ts — 极简外部 Store（非 Redux）
export function createStore<T>(
  initialState: T,
  onChange?: OnChange<T>,
): Store<T> {
  // - getState: 获取当前状态
  // - setState: 函数式更新（Object.is 比较，相同则跳过）
  // - subscribe: 订阅变更
}
```

```typescript
// AppState.tsx — React 集成
export function useAppState<R>(selector: (state: AppState) => R): R {
  // useSyncExternalStore + selector = 精确订阅
  // 只有选中的 slice 变化时才 re-render
}
```

#### 11.6.2 Speculation（推测执行）系统

```typescript
export type SpeculationState =
  | { status: 'idle' }
  | {
      status: 'active'
      id: string
      abort: () => void
      startTime: number
      messagesRef: { current: Message[] }      // 可变引用 — 避免每条消息都 spread 数组
      writtenPathsRef: { current: Set<string> } // Overlay 文件系统中的写入路径
      boundary: CompletionBoundary | null
      suggestionLength: number
      toolUseCount: number
      isPipelined: boolean
      contextRef: { current: REPLHookContext }
      pipelinedSuggestion?: {
        text: string
        promptId: 'user_intent' | 'stated_intent'
        generationRequestId: string | null
      } | null
    }
```

**CC 在用户还没按回车的时候，就已经开始推测执行了**。它预测用户意图，在 overlay 文件系统中运行工具，用户确认后把 overlay 合并。

**CN 映射**：当用户在编辑器中打出"继续写下一段"但还没按回车时，CN 可以预先开始生成。用户按回车后直接显示结果。

---

### 11.7 Context Collapse 上下文折叠（原文档完全缺失）

```typescript
export interface ContextCollapseStats {
  collapsedSpans: number        // 已折叠的 span 数
  collapsedMessages: number     // 已折叠的消息数
  stagedSpans: number           // 暂存的 span 数（待折叠）
  health: ContextCollapseHealth // 健康状态追踪
}

export interface ContextCollapseHealth {
  totalSpawns: number
  totalErrors: number
  lastError: string | null
  emptySpawnWarningEmitted: boolean
  totalEmptySpawns: number
}
```

**区别于 Compact 的关键**：Compact 是用 AI 重写摘要；Context Collapse 是把 span（一组连续消息）折叠成更短的表示，不需要 AI 调用。更快、更便宜，但压缩比更低。

**CN 映射**：创作过程中的"探索性对话"（用户和 AI 讨论角色设定但最终没修改文档的对话）可以被折叠，只保留结论。

---

### 11.8 Magic Docs 自更新文档系统（原文档完全缺失）

```typescript
// magicDocs.ts
const MAGIC_DOC_HEADER_PATTERN = /^#\s*MAGIC\s+DOC:\s*(.+)$/im

// 工作流程：
// 1. FileReadTool 读取文件时，检测是否有 "# MAGIC DOC: [title]" 头
// 2. 如果有 → 注册为 Magic Doc
// 3. 每轮 AI 回复后（postSamplingHook），后台 forked agent 自动更新该文档
// 4. 更新使用 FileEditTool，仅允许编辑该文档文件
// 5. 标题下一行可附加斜体指令：_Focus on API changes only_
```

**CN 映射**：这就是"活的角色卡片"。用户创建 `# MAGIC DOC: 角色 - 李明` 的文件，AI 在写作过程中自动更新这个文件的内容（新增对话、情感变化、新建立的关系）。**直接可用！**

---

### 11.9 Agent Summary 后台摘要系统（原文档完全缺失）

```typescript
// agentSummary.ts
const SUMMARY_INTERVAL_MS = 30_000  // 每 30 秒

// 设计：
// 1. 启动定时器，每 30 秒 fork 子 agent 对话生成 3-5 字摘要
// 2. 共享 prompt cache（不设 maxOutputTokens 以保持 cache key 一致）
// 3. 摘要格式："Reading runAgent.ts"（动名词 + 具体文件名）
// 4. 前一次摘要作为输入："说点新的"
// 5. 定时器在上次完成后重设（防止重叠）
```

**CN 映射**：当 AI 在执行长时间写作任务时（如"润色全文"），每 30 秒给用户一个进度更新："正在润色第三章对话部分"。

---

### 11.10 Away Summary 离开回来摘要（原文档完全缺失）

```typescript
// awaySummary.ts
const RECENT_MESSAGE_WINDOW = 30  // 最近 30 条消息
// Prompt："用户离开后回来了。写 1-3 句话。先说高层任务，再说下一步。"
// 使用 Session Memory + 最近消息
// 用小快模型（getSmallFastModel）
```

**CN 映射**：创作者经常中断后回来。"你正在写第 8 章的高潮段落。李明刚发现了真相。下一步是写他的反应。"

---

### 11.11 Buddy/Companion 虚拟伙伴系统（原文档完全缺失）

```typescript
// companion.ts — 确定性生成虚拟伙伴
// 基于 userId 种子的 Mulberry32 PRNG
// 维度：species（物种）、eye（眼睛）、hat（帽子）、rarity（稀有度）
// 稀有度权重：common → uncommon → rare → epic → legendary
// 属性：peak stat + dump stat + 散布
// 闪光变体：1% 概率

// 重要设计决策：
// bones（外观）NEVER 持久化 → 每次从 userId 重新生成
// soul（名字、交互历史）持久化到 config.companion
// 原因：species 重命名或 SPECIES 数组变更不会破坏已保存的伙伴
```

**CN 映射**：虽然 Buddy 系统本身对 CN 创作场景不直接适用，但其"确定性生成 + 分离不变量和变量的持久化策略"是一个值得学习的设计模式。

---

### 11.12 Scheduled Tasks / Cron 系统（原文档完全缺失）

```typescript
// useScheduledTasks.ts — REPL 级 cron 调度器
// - 挂载 cronScheduler 一次，卸载时清理
// - 触发的任务以 'later' 优先级进入 command queue
// - 支持 team lead 路由（按 agentId 找 teammate）
// - WORKLOAD_CRON 标记 → API 计费时标识为 cron（可降低 QoS）
```

**CN 映射**：创作者可以设定"每天晚上自动审稿"、"每周生成角色关系更新"。

---

### 11.13 Tool Use Summary（原文档完全缺失）

```typescript
// toolUseSummaryGenerator.ts — 30 字符工具执行摘要
// 用 Haiku（最快最便宜的模型）
// 格式："Searched in auth/" / "Fixed NPE in UserService"
// 用于 SDK/移动端展示
```

---

### 11.14 Tips 系统（原文档完全缺失）

```typescript
// tipScheduler.ts / tipRegistry.ts / tipHistory.ts
// 在 Spinner 转圈时展示上下文相关的使用提示
// 冷却期调度：每个 tip 有 cooldownSessions（N 个会话后才再次展示）
// 选择策略：选"距上次展示最久的 tip"
```

**CN 映射**：用户等 AI 生成时展示写作技巧："试试用 /续写 风格=金庸 来改变文风"。

---

### 11.15 Tasks V2 — 跨进程任务系统（原文档完全缺失）

```typescript
// useTasksV2.ts — TasksV2Store 单例
// - fs.watch 监控任务目录
// - Debounce（50ms）+ Fallback Poll（5s）
// - 5 秒后自动隐藏已完成任务
// - Team-aware（getTaskListId 可被 TeamCreateTool 改变中会话）
// - 单例模式避免多个 hook 实例各自开 fs.watch
```

---

### 11.16 Voice 语音系统（原文档完全缺失）

```typescript
// voice.ts — 三层录音策略
// 1. 优先：native audio capture (cpal) — macOS/Linux/Windows
// 2. 降级：SoX `rec` 命令
// 3. 降级：arecord (ALSA, Linux)
// 延迟加载 native 模块（首次语音按键时才 dlopen）
// STT：voiceStreamSTT.ts — 流式语音转文字
// 16kHz 单声道录音 + 2 秒静音检测自动停止
```

**CN 映射**：对创作工具，语音口述是非常自然的输入方式。"AI，帮我续写，主角现在很愤怒..."

---

### 11.17 Typeahead/Suggestions 输入建议系统（原文档完全缺失）

```typescript
// useTypeahead.tsx — 1,500+ 行的智能输入建议
// 支持：
//   - @ 提及文件路径（带 Unicode 路径支持）
//   - / 命令补全
//   - Shell 补全（shellCompletion.ts）
//   - 目录补全
//   - Shell 历史补全
//   - # Slack 频道补全
//   - Agent 名称补全
//   - Resume session 建议
// 后台缓存刷新（startBackgroundCacheRefresh）
// Progressive argument hints
```

---

### 11.18 Skills — 远程加载系统（原文档仅提到本地）

```
src/services/skillSearch/
├── featureCheck.ts         — 功能检查
├── localSearch.ts          — 本地技能搜索
├── prefetch.ts             — 预取
├── remoteSkillLoader.ts    — 远程技能加载器
├── remoteSkillState.ts     — 远程技能状态管理
├── signals.ts              — 信号
└── telemetry.ts            — 遥测
```

**CN 映射**：用户可以从"技能市场"下载写作技能（如"金庸风格续写"、"论文润色"），而不是只用内置技能。

---

### 11.19 Team Memory Sync 团队记忆同步（原文档完全缺失）

```
src/services/teamMemorySync/
├── index.ts                — 同步引擎
├── secretScanner.ts        — 秘密扫描器
├── teamMemSecretGuard.ts   — 团队记忆安全守卫
├── types.ts                — 类型定义
└── watcher.ts              — 文件变更监控
```

**关键**：共享记忆前先扫描敏感信息。CN 的共享角色设定也需要类似保护。

---

### 11.20 OAuth 完整认证流（原文档仅一句）

```
src/services/oauth/
├── auth-code-listener.ts   — Auth code 监听器
├── client.ts               — OAuth 客户端
├── crypto.ts               — PKCE 加密
├── getOauthProfile.ts      — 获取 OAuth 配置
├── index.ts                — 入口
└── types.ts                — 类型定义
```

---

### 11.21 Native 包详情补充

```
packages/
├── audio-capture-napi/     — 音频采集（151行，SoX/arecord 真实现）
├── color-diff-napi/        — 终端语法高亮 diff（1006行，TypeScript port）
├── image-processor-napi/   — 图片处理（125行，sharp + 剪贴板，真实现）
├── modifiers-napi/         — 键盘修饰键检测（68行，macOS FFI 真实现）
├── url-handler-napi/       — URL 事件监听（stub）
└── @ant/
    ├── claude-for-chrome-mcp/    — Chrome 扩展 MCP
    ├── computer-use-input/       — Computer Use 输入
    ├── computer-use-mcp/         — Computer Use MCP（stub）
    └── computer-use-swift/       — Computer Use Swift
```

---

### 11.22 Hooks 体系补充（原文档 ~10 个，实际 **147 个文件**）

**按功能分组的 Hook 全表**：

| 分类 | Hooks | CN 关联度 |
|:---|:---|:---:|
| **Swarm** | `useSwarmInitialization`, `useSwarmPermissionPoller` | ★★★★★ |
| **任务管理** | `useTasksV2`, `useScheduledTasks`, `useTaskListWatcher` | ★★★★ |
| **编辑/Diff** | `useDiffData`, `useDiffInIDE`, `useTurnDiffs` | ★★★★★ |
| **输入** | `useTextInput`, `useInputBuffer`, `useTypeahead`, `usePasteHandler`, `useVimInput` | ★★★ |
| **命令队列** | `useCommandQueue`, `useQueueProcessor`, `useMergedCommands` | ★★★★ |
| **IDE 集成** | `useIDEIntegration`, `useIdeSelection`, `useIdeAtMentioned`, `useIdeConnectionStatus` | ★★★ |
| **AI 模型** | `useMainLoopModel`, `useMergedTools`, `useMergedClients` | ★★★★★ |
| **权限** | `useCanUseTool`, `toolPermission/*` | ★★★★★ |
| **设置** | `useSettings`, `useSettingsChange`, `useDynamicConfig` | ★★★ |
| **历史** | `useArrowKeyHistory`, `useAssistantHistory`, `useHistorySearch` | ★★★ |
| **Bridge/Remote** | `useReplBridge`, `useRemoteSession`, `useSSHSession`, `useDirectConnect`, `useMailboxBridge` | ★★ |
| **语音** | `useVoice`, `useVoiceEnabled`, `useVoiceIntegration` | ★★★ |
| **通知** | `useNotifyAfterTimeout`, `useUpdateNotification`, `useBlink` | ★★ |
| **状态** | `useSessionBackgrounding`, `useAwaySummary`, `useMemoryUsage`, `useElapsedTime` | ★★★ |
| **建议** | `usePromptSuggestion`, `usePromptsFromClaudeInChrome`, `useFileSuggestions`, `useUnifiedSuggestions` | ★★★ |
| **会话** | `useTeleportResume`, `useFileHistorySnapshotInit`, `useTeammateViewAutoExit` | ★★★ |
| **UI** | `useVirtualScroll`, `useCopyOnSelect`, `useTerminalSize`, `useMinDisplayTime` | ★★ |
| **日志/调试** | `useLogMessages`, `useIdeLogging`, `useDeferredHookMessages` | ★ |
| **Companion** | `useBuddyNotification` | ★ |
| **其他** | `useAfterFirstRender`, `useDoublePress`, `useTimeout`, `useExitOnCtrlCD`, `useSkillImprovementSurvey`, `useManagePlugins` | ★★ |

---

## 十二、修正与精度提升

### 12.1 原文档数据修正

| 项目 | 原文档值 | 修正后值 | 说明 |
|:---|:---|:---|:---|
| Compact 文件数 | 3 | **16** | 实际有微压缩、反应式压缩、session 压缩等 |
| Feature Flags | 85+ 个 | 89 个 | 早期报告说“30 个”为严重低估 |
| 工具数量 | 42+ | 46+ | 新增 `SubscribePRTool`, `CtxInspectTool` 等 |
| 记忆系统文件数 | ~3 | **17** | memdir(9) + extractMemories(2) + SessionMemory(3) + autoDream(4) |
| Hooks 数量 | ~10 | **147 个文件** | 覆盖 UI、权限、通知、历史、IDE diff 等跨层行为 |
| Bridge 系统 | 未提及 | **30+ 文件** | 整个远程会话系统 |
| State 管理 | 未提及 | **80+ 字段** | 完整的 React 外部状态管理 |

### 12.2 架构认知修正

1. **CC 不只是 CLI 工具 — 它是一个分布式 Agent 平台**
   - Bridge 系统让 CC 可以运行在云端
   - Coordinator 模式让一个 CC 编排多个 CC Worker
   - 推测执行让 CC 在用户输入之前就开始工作
   - 这意味着 CN 的对标物不是"一个写作 CLI"，而是"一个创作 Agent 平台"

2. **CC 的 forked agent 是最精妙的设计模式之一**
   - 所有后台任务（记忆提取、Session Memory、Agent Summary、Magic Docs、AutoDream）都用 forked agent
   - Forked agent 共享父进程的 prompt cache → 几乎免费的 AI 调用
   - 这让 CC 在用户无感知的情况下运行了 5-7 个后台 AI 任务
   - **CN 必须学会这个模式**

3. **CC 的"智能"不在模型调用中 — 在模型调用之间**
   - Micro compact 在每次调用间清理噪声
   - Memory recall 在每次调用前精选相关记忆
   - Agent Summary 在每次调用后更新进度
   - 推测执行在用户输入前就开始下一次调用
   - **这就是为什么 CC 的"下限"那么高 — 它在主循环之外做了大量工作**
