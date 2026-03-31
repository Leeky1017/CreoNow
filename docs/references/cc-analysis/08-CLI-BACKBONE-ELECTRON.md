# 08 — CLI 基座架构 × UI/UX 迁移 × Electron 实施方案

> **核心命题**：用户看到 Cursor/Notion 式的可视化界面，但 Agent 和所有工具都在 CLI 层干活。
> 本章详细说明 CC 的 CLI-as-backbone 如何映射到 CN 的 Electron 架构。

---

## 一、CC 的 "CLI 作为基座" 架构

### 1.1 CC 的三层分离

```
┌─────────────────────────────────────────────────────┐
│  GUI Layer (VS Code Extension / Desktop)            │
│  通过 Bridge 启动 CC CLI 子进程，SDK 协议通信       │
├─────────────────────────────────────────────────────┤
│  I/O Layer                                          │
│  StructuredIO (NDJSON stdin/stdout) — SDK 被嵌入时  │
│  RemoteIO (WebSocket/SSE) — 远程会话时              │
│  Ink React REPL — 终端直接使用时                    │
├─────────────────────────────────────────────────────┤
│  Execution Layer                                    │
│  QueryEngine → Tool Orchestration → Compact         │
│  → Fork/Agent → Permission → Cost Tracking          │
└─────────────────────────────────────────────────────┘
```

**关键洞察**：三种 I/O 模式共享同一个执行核心。区别只在输入来源和输出渲染。

| 模式 | 文件 | I/O | 场景 |
|------|------|-----|------|
| Interactive | `screens/REPL.tsx` | Ink React TUI | 终端直接用 |
| Structured | `cli/structuredIO.ts` | NDJSON stdin→stdout | 被程序嵌入 |
| Remote | `cli/remoteIO.ts` | WebSocket/SSE | 远程/Bridge |

### 1.2 Bridge 模式——GUI 控制 CLI

VS Code 扩展做的事：
1. 启动 CC CLI 作为子进程（`process.execPath + --sdk-url=...`）
2. 通过 NDJSON 协议收发消息
3. 权限请求从 CLI 发出 → VS Code 弹窗确认 → 回传
4. 一切工具执行在 CLI 子进程内完成

### 1.3 REPL 的 React 渲染树

```
App (AppStateProvider + StatsProvider)
  └── REPL (5,005 行)
      ├── Messages (虚拟滚动列表)
      │   ├── MessageRow → Message → MessageResponse
      │   ├── ToolUseLoader (工具执行进度)
      │   └── CompactSummary
      ├── PermissionRequest (权限确认)
      ├── PromptInput (输入)
      ├── StatusLine (状态栏)
      └── TaskListV2 (后台任务)
```

设计系统：`ThemedBox`/`ThemedText` + `color.ts`（四种色彩模式）+ `ThemeProvider`。

---

## 二、CN 的 Electron CLI 基座方案

### 2.1 CN 当前 vs CC vs CN 应该走的方向

| 维度 | CC | CN 现状 | CN 目标 |
|------|----|---------|----|
| 执行核心 | CLI 进程，可独立运行 | Electron main，绑定 UI | **提取核心为可独立运行的模块** |
| I/O 协议 | NDJSON StructuredIO | Electron IPC（紧耦合） | **CommandDispatcher 统一入口** |
| UI | Ink React (终端) | Next.js React (Web) | Web UI 不变，底层协议驱动 |
| 多模式 | Interactive/SDK/Remote | 仅 Interactive | 加入 SDK/CLI 模式 |

### 2.2 两阶段架构演进

**Phase 1（当前可做）——CommandDispatcher**：

```
┌─────────────────────────┐
│ Next.js Renderer         │ ← 可视化界面不变
└──────────┬──────────────┘
           │ Electron IPC (现有)
┌──────────▼──────────────┐
│ Electron Main           │
│ ┌──────────────────────┐│
│ │ CommandDispatcher     ││ ← 新增：统一命令分发
│ │ ┌──────────────────┐ ││
│ │ │ SkillOrchestrator│ ││ ← 新增：编排层
│ │ └───────┬──────────┘ ││
│ │ ┌───────▼──────────┐ ││
│ │ │ Services         │ ││
│ │ │ ai/context/memory│ ││
│ │ │ kg/rag/skills    │ ││
│ │ └──────────────────┘ ││
│ └──────────────────────┘│
└─────────────────────────┘
```

**Phase 2（未来）——CLI 独立进程**：

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Electron │  │ CLI      │  │ API      │
│ (GUI)    │  │ (stdin)  │  │ (SDK)    │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │
     └──────┬──────┘──────────────┘
     ┌──────▼──────┐
     │ CN Core     │ ← 独立进程/库
     │ Dispatcher  │
     │ + Services  │
     └─────────────┘
```

### 2.3 CommandDispatcher 核心设计

```typescript
// apps/desktop/main/src/core/commandDispatcher.ts (新建)

type CommandResult<T = unknown> = 
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

interface CommandDispatcher {
  execute<T>(command: Command<T>): AsyncGenerator<CommandEvent<T>>
}

type Command<T> = {
  name: string
  input: Record<string, unknown>
  source: 'gui' | 'cli' | 'api'  // 来源不影响执行逻辑
}

type CommandEvent<T> = 
  | { type: 'progress'; data: ProgressData }
  | { type: 'permission_request'; data: PermissionData }
  | { type: 'result'; data: CommandResult<T> }
```

**这就是 CN 的 CLI 基座**——不管输入从哪里来，执行路径相同。
- GUI IPC handler → `Command` → `CommandDispatcher`
- 未来 CLI stdin → `Command` → `CommandDispatcher`
- 未来 SDK API → `Command` → `CommandDispatcher`

CC 正是这个模式：`StructuredIO` 和 `REPL` 共享同一个 `query()` + `runTools()`。

### 2.4 不应该照搬的

| CC 组件 | 理由 |
|---------|------|
| Ink React | CN 有真正的 Web UI |
| Commander.js | CN 不需要传统 CLI 参数解析 |
| REPL stdin loop | CN 是事件驱动 GUI |
| NDJSON StructuredIO | CN 用 Electron IPC（更高效） |

---

## 三、UI/UX 设计——CC 可迁移的模式

### 3.1 CC 组件 → CN 等价物

| CC 组件 | CN 等价物 | 可以学什么 |
|---------|-----------|-----------|
| `VirtualMessageList` | AgentPanel 聊天区域 | **虚拟滚动**（长对话必须有） |
| `ToolUseLoader` | Skill 执行进度 | **实时进度反馈**模式 |
| `PermissionRequest` | 原稿修改确认 | **保护用户原稿**的 UI 模式 |
| `CompactSummary` | 压缩提示 | 告诉用户"我已压缩了旧对话" |
| `CostThresholdDialog` | Token 预算警告 | 成本透明化 |
| `PromptInput` 多模式 | 创作输入框 | Vim mode / Normal mode 切换 |
| `MessageSelector` | 选择旧对话 | 选择性重跑某些 Skill |
| ThemedBox/Text/color | Design Token | **主题系统层次设计** |
| FPS tracker | 性能监控 | **运行时性能反馈** |
| `StructuredDiff` | 版本差异展示 | AI 编辑的 diff 渲染 |

### 3.2 CC Hooks 生态——CN 值得参考的

CC 有 **147 个** custom hooks（覆盖 UI、权限、通知、历史、IDE diff 等），以下特别相关：

| Hook | 功能 | CN 需要 |
|------|------|--------|
| `useCanUseTool` | 工具权限检查 | ✅ Skill 权限检查 |
| `useCancelRequest` | 取消进行中操作 | ✅ 取消续写 |
| `useDiffData` + `useDiffInIDE` | 展示差异 | ✅ 展示版本差异 |
| `useMemoryUsage` | 内存使用显示 | ✅ Token 预算显示 |
| `useVirtualScroll` | 虚拟滚动 | ✅ 长文档 |
| `useQueueProcessor` | 命令队列 | ✅ Skill 队列 |
| `useMergedTools` | 合并多来源工具 | ✅ builtin + custom skill |
| `useSkillsChange` | 热重载 | ✅ 动态加载用户自定义 skill |
| `useTasksV2` | 后台任务管理 | ✅ 多 Agent 管道展示 |

### 3.3 Diff 展示系统

CC 有完整的文件差异渲染：`StructuredDiff/` + `FileEditToolDiff.tsx` + `diff/`。
CN 的版本系统已有 merging/branching，但 **UI 层还没有 diff 渲染**。CC 的 diff 展示逻辑可参考。

---

## 四、8 系统迁移的 Electron 具体实现

### 4.1 任务状态机（最简单，1-2 天）

直接从 CC 搬 `Task.ts` 的类型定义，追加 `paused` 状态：

```typescript
// apps/desktop/main/src/services/skills/taskState.ts

type SkillTaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
type SkillTaskType = 'continue' | 'edit' | 'judge' | 'plan' | 'lookup' | 'generate'

function isTerminalStatus(s: SkillTaskStatus): boolean {
  return s === 'completed' || s === 'failed' || s === 'cancelled'
}

function generateTaskId(type: SkillTaskType): string {
  return `${type}_${Math.random().toString(36).slice(2, 10)}`
}
```

### 4.2 Skill 阶段白名单（1 天）

```typescript
// apps/desktop/main/src/services/skills/stageCapabilities.ts

const STAGE_CAPABILITIES = {
  'context-load': ['kg:query', 'memory:recall', 'document:read'],
  'draft':        ['llm:generate', 'document:read'],
  'judge':        ['llm:evaluate', 'document:read'],
  'refine':       ['llm:generate', 'document:read', 'document:write'],
  'style-check':  ['llm:evaluate', 'memory:recall'],
  'commit':       ['document:write', 'version:commit'],
} as const

function validateStageCapability(stage: string, capability: string): boolean {
  return STAGE_CAPABILITIES[stage]?.includes(capability) ?? false
}
```

### 4.3 AutoCompact 框架 + NarrativeCompact（3-5 天）

```typescript
// apps/desktop/main/src/services/ai/compact/autoCompact.ts

const DEFAULT_CONFIG = {
  bufferTokens: 8_000,
  warningThreshold: 15_000,
  maxConsecutiveFailures: 3,    // 从 CC 搬的 circuit breaker
}

function shouldAutoCompact(
  currentTokens: number,
  contextWindow: number,
  tracking: { consecutiveFailures: number },
): boolean {
  if (tracking.consecutiveFailures >= DEFAULT_CONFIG.maxConsecutiveFailures) return false
  return currentTokens >= contextWindow - DEFAULT_CONFIG.bufferTokens
}

// apps/desktop/main/src/services/ai/compact/narrativeCompact.ts

async function compactNarrative(
  messages: LLMMessage[],
  kgService: KnowledgeGraphService,
  aiService: AiService,
  projectId: string,
): Promise<CompactResult> {
  // 1. 从 KG 获取角色状态锚点（CN 独有）
  const entities = await kgService.entityList(projectId)
  const kgAnchors = entities.map(e => ({
    name: e.name, state: e.currentState, relations: e.relationships
  }))
  
  // 2. 用 LLM 生成叙事摘要（prompt 必须定制，不能用 CC 的通用摘要）
  const plotDigest = await aiService.complete({
    systemPrompt: NARRATIVE_COMPACT_PROMPT,
    messages: [{ role: 'user', content: messagesToText(messages) }],
  })
  
  // 3. 获取写作风格备忘
  const styleMemo = await memoryService.getStylePreferences(projectId)
  
  // 4. 组合压缩结果
  return { kgAnchors, plotDigest, styleMemo, compactBoundary: messages.length }
}
```

### 4.4 并发编排器（3-5 天）

```typescript
// apps/desktop/main/src/services/skills/skillStepOrchestrator.ts

type StepBatch = { mode: 'read' | 'write'; steps: SkillStep[] }

function partitionSteps(steps: SkillStep[]): StepBatch[] {
  // 与 CC 的 partitionToolCalls 完全相同的逻辑
  const batches: StepBatch[] = []
  let currentBatch: StepBatch | null = null
  
  for (const step of steps) {
    const mode = step.concurrencySafe ? 'read' : 'write'
    if (mode === 'write') {
      if (currentBatch) batches.push(currentBatch)
      batches.push({ mode: 'write', steps: [step] })
      currentBatch = null
    } else {
      if (!currentBatch || currentBatch.mode !== 'read') {
        if (currentBatch) batches.push(currentBatch)
        currentBatch = { mode: 'read', steps: [] }
      }
      currentBatch.steps.push(step)
    }
  }
  if (currentBatch) batches.push(currentBatch)
  return batches
}

async function* executeStepBatches(
  batches: StepBatch[],
  signal: AbortSignal,
): AsyncGenerator<StepResult> {
  for (const batch of batches) {
    if (batch.mode === 'read') {
      // 并发执行
      const results = await Promise.allSettled(
        batch.steps.map(s => s.execute({ signal }))
      )
      for (const r of results) {
        yield r.status === 'fulfilled' ? r.value : { error: r.reason }
      }
    } else {
      // 串行执行
      for (const step of batch.steps) {
        yield await step.execute({ signal })
      }
    }
  }
}
```

### 4.5 Fork Cache 共享（5-7 天）

```typescript
// apps/desktop/main/src/services/ai/cacheFork.ts

type CacheSafePrefix = {
  systemPrompt: string       // 必须与父请求相同 → cache hit
  contextMessages: LLMMessage[]  // 父对话历史
}

type ForkDirective = {
  prompt: string
  purpose: 'continue' | 'judge' | 'rewrite' | 'outline'
  model?: string             // Judge 可用更便宜模型
}

async function executeForks(
  prefix: CacheSafePrefix,
  directives: ForkDirective[],
  aiService: AiService,
  signal: AbortSignal,
): Promise<ForkResult[]> {
  // 所有 fork 共享 prefix → API prompt cache 命中
  return Promise.all(directives.map(d => 
    aiService.complete({
      systemPrompt: prefix.systemPrompt,
      messages: [
        ...prefix.contextMessages,
        { role: 'user', content: d.prompt },
      ],
      model: d.model,
      signal,
    })
  ))
}

// 使用：3 个续写方案 + 1 个 Judge = 4 次调用，成本 ≈ 1.3 次
```

### 4.6 原稿保护 Permission（3 天）

```typescript
// apps/desktop/main/src/services/skills/permissionGate.ts

type PermissionLevel = 'auto' | 'confirm' | 'always_confirm'

function getPermissionLevel(skillType: string, hasDocModification: boolean): PermissionLevel {
  if (!hasDocModification) return 'auto'           // 只读操作
  if (skillType === 'rewrite') return 'always_confirm'  // 替换操作
  return 'confirm'                                  // 追加操作
}

// IPC 流程：
// 1. Skill 要修改文档 → permissionGate 检查
// 2. 需要确认 → 通过 IPC 发送 permission_request 到 renderer
// 3. Renderer 展示 diff 预览 + 确认按钮
// 4. 用户确认/拒绝 → 通过 IPC 回传
// 5. 确认前创建自动快照（version snapshot）
```

---

## 五、实施优先级路线图

```
P0 (立即做)：
  ├── 原稿保护 Permission Gate ───── 3 天
  ├── Token Budget 中文修正 ──────── 1 天
  └── AutoCompact 框架 + 叙事版 ─── 5 天

P1 (短期)：
  ├── LLM 替代关键词路由 ─────────── 3 天
  ├── Skill 延迟加载 ─────────────── 2 天
  ├── 任务状态机 ─────────────────── 2 天
  ├── 并发编排器 ─────────────────── 5 天
  ├── 成本追踪 ───────────────────── 2 天
  └── Post-Writing Hooks ─────────── 2 天

P2 (中期)：
  ├── Fork Cache 共享 ────────────── 7 天
  ├── CommandDispatcher (CLI 基座) ── 7 天
  ├── Skill 阶段白名单 ──────────── 1 天
  ├── Writing Orchestrator ────────── 10 天
  ├── AbortController 层级 ────────── 2 天
  ├── 会话恢复 ───────────────────── 3 天
  └── 启动并行优化 ──────────────── 2 天

P3 (长期)：
  ├── CLI 独立进程 + SDK 模式 ────── 视需求
  ├── BashTool 安全模型 ──────────── 视需求
  └── Multi-Agent 写作 ──────────── 视需求
```
