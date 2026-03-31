# 09 — 实施指南：从 CC 源码到 CN 落地的完整执行手册

> 本章提供每个迁移项目的文件规划、核心类型、关键代码和集成点。
> 按 P0 → P1 → P2 顺序排列，每个项目可独立实施。

---

## 一、P0-1：原稿保护 Permission Gate

### 文件规划

```
apps/desktop/main/src/services/skills/
  └── permissionGate.ts              ← 新增

apps/desktop/main/src/ipc/
  └── skills.ts                      ← 修改：加 permission 回调

creonow-app/src/components/agent/
  └── PermissionDialog.tsx           ← 新增
```

### 核心类型

```typescript
// permissionGate.ts

export type PermissionLevel = 'auto' | 'confirm' | 'always_confirm'

export type PermissionRequest = {
  requestId: string
  skillName: string
  level: PermissionLevel
  description: string
  estimatedTokens?: number
  estimatedCostUSD?: number
  diff?: { before: string; after: string }  // 文档修改预览
}

export type PermissionResponse = {
  requestId: string
  decision: 'allow' | 'deny' | 'allow_always'  // allow_always → 持久化规则
}

export type PermissionRule = {
  skillPattern: string    // glob: "builtin:critique" / "builtin:*"
  decision: 'allow' | 'deny' | 'ask'
  scope: 'global' | 'project'
}
```

### 执行流程

```
Skill 要修改文档
  → permissionGate.check(skill, modification)
  → 匹配持久化规则？
    → 有 allow 规则 → 继续（创建操作快照）
    → 有 deny  规则 → 拒绝，通知用户
    → 无匹配规则 → 判断 level
      → auto → 继续
      → confirm / always_confirm → 发 IPC permission_request
        → Renderer 展示 PermissionDialog（含 diff、成本预估）
        → 用户选择 → IPC 回传 PermissionResponse
        → allow → 创建操作快照 → 继续
        → allow_always → 持久化规则 → 创建操作快照 → 继续
        → deny → 终止 skill，通知用户
```

### Renderer 组件要点

```
PermissionDialog：
  ┌─────────────────────────────────────────────┐
  │  🔒 AI 想要修改你的文档                      │
  │                                             │
  │  技能: 续写·暗黑风格                         │
  │  预计消耗: ~2000 tokens (¥0.03)              │
  │                                             │
  │  ┌─────────────────────────────────────┐     │
  │  │  --- 原文 ---                       │     │
  │  │  + AI 续写的内容...                 │     │
  │  │  (diff view)                        │     │
  │  └─────────────────────────────────────┘     │
  │                                             │
  │  [ 拒绝 ]  [ 允许 ]  [ 总是允许此技能 ]      │
  └─────────────────────────────────────────────┘
```

### 与 CC 的关键差异

CC 的 Permission 是防止 AI 执行危险 shell 命令（`rm -rf`）。CN 的 Permission 是保护用户原稿。核心概念相同（分级 + 持久化规则 + 拒绝追踪），但触发对象完全不同。

---

## 二、P0-2：Token Budget 中文修正

### 修改文件

```
packages/shared/src/tokenBudget.ts   ← 修改
```

### 修改内容

```typescript
// 原代码
export const UTF8_BYTES_PER_TOKEN = 4;

export function estimateTokenCount(text: string): number {
  return Math.ceil(new TextEncoder().encode(text).length / UTF8_BYTES_PER_TOKEN);
}

// 替换为
export function estimateTokenCount(text: string): number {
  const bytes = new TextEncoder().encode(text).length;
  // CJK Unified Ideographs + Ext A/B + 日文假名 + 韩文音节 + CJK 标点 + 全角字符
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/gu) || []).length;
  const nonCjkBytes = bytes - cjkChars * 3;  // CJK 每字 3 bytes UTF-8
  // CJK 字符: ~1.5 tokens/char (Claude tokenizer 实测范围 1-2)
  // 非 CJK: ~0.25 tokens/byte (即 ~4 bytes/token，与原值一致)
  return Math.ceil(cjkChars * 1.5 + nonCjkBytes / 4);
}
```

### 验证

```typescript
// 测试用例
estimateTokenCount("Hello world")     // 英文：11 bytes / 4 ≈ 3 tokens ✓
estimateTokenCount("你好世界")         // 中文：4×3=12 bytes，4×1.5=6 tokens ✓
estimateTokenCount("Hello 你好")      // 混合：6 bytes(en) + 6 bytes(zh)
                                      // → 6/4 + 2×1.5 = 1.5 + 3 = 5 tokens ✓
```

---

## 三、P0-3：叙事感知 AutoCompact

### 文件规划

```
apps/desktop/main/src/services/ai/
  └── compact/
      ├── autoCompact.ts             ← 新增：阈值监控 + 触发入口
      ├── narrativeCompact.ts        ← 新增：叙事感知压缩器
      ├── compactPrompts.ts          ← 新增：压缩用 prompt 模板
      └── types.ts                   ← 新增
```

### 核心类型

```typescript
// compact/types.ts

export type CompactTrackingState = {
  compacted: boolean
  turnCounter: number
  consecutiveFailures: number  // circuit breaker
}

export type CompactionResult = {
  success: boolean
  summary: string
  kgAnchors: KGAnchor[]       // CN 独有
  plotDigest: string           // CN 独有
  styleMemo: string            // CN 独有
  tokensBeforeCompact: number
  tokensAfterCompact: number
}

export type KGAnchor = {
  entityId: string
  entityName: string
  currentState: string
  relationships: string[]
}

export type NarrativeCompactConfig = {
  bufferTokens: number             // default: 8000
  warningThreshold: number         // default: 15000
  maxConsecutiveFailures: number   // default: 3 (from CC)
  preserveDialogueRatio: number   // default: 0.7
  preservePlotPoints: boolean     // default: true
  kgExtractOnCompact: boolean     // default: true
}
```

### autoCompact.ts 核心逻辑（从 CC 迁移 + 适配）

```typescript
// autoCompact.ts

const DEFAULT_CONFIG: NarrativeCompactConfig = {
  bufferTokens: 8_000,
  warningThreshold: 15_000,
  maxConsecutiveFailures: 3,        // 从 CC 搬的 circuit breaker
  preserveDialogueRatio: 0.7,
  preservePlotPoints: true,
  kgExtractOnCompact: true,
}

export function shouldAutoCompact(
  currentTokens: number,
  contextWindow: number,
  tracking: CompactTrackingState,
  config = DEFAULT_CONFIG,
): boolean {
  // Circuit breaker — 从 CC 直接搬
  if (tracking.consecutiveFailures >= config.maxConsecutiveFailures) {
    return false
  }
  return currentTokens >= contextWindow - config.bufferTokens
}

export function getWarningLevel(
  currentTokens: number,
  contextWindow: number,
  config = DEFAULT_CONFIG,
): 'none' | 'warning' | 'critical' {
  const criticalAt = contextWindow - config.bufferTokens
  const warningAt = contextWindow - config.warningThreshold
  if (currentTokens >= criticalAt) return 'critical'
  if (currentTokens >= warningAt) return 'warning'
  return 'none'
}
```

### narrativeCompact.ts（CN 独创）

```typescript
// narrativeCompact.ts

export async function compactNarrative(
  messages: LLMMessage[],
  deps: {
    kgService: KnowledgeGraphService
    memoryService: MemoryService
    aiService: AiService
    projectId: string
  },
  config = DEFAULT_CONFIG,
): Promise<CompactionResult> {
  const tokensBeforeCompact = estimateTokenCount(messagesToText(messages))
  
  // 1. KG 锚点（CN 独有 — CC 没有 KG）
  let kgAnchors: KGAnchor[] = []
  if (config.kgExtractOnCompact) {
    const entities = await deps.kgService.entityList(deps.projectId)
    kgAnchors = entities.map(e => ({
      entityId: e.id,
      entityName: e.name,
      currentState: e.currentState,
      relationships: e.relationships,
    }))
  }

  // 2. LLM 生成叙事摘要（prompt 从 compactPrompts.ts）
  const plotDigest = await deps.aiService.complete({
    systemPrompt: buildNarrativeCompactPrompt(kgAnchors),
    messages: [{ role: 'user', content: messagesToText(messages) }],
    maxTokens: 4000,
  })

  // 3. 风格备忘（从 memory 取）
  const styleMemo = await deps.memoryService.getStylePreferences(deps.projectId)

  const tokensAfterCompact = estimateTokenCount(
    plotDigest + JSON.stringify(kgAnchors) + styleMemo
  )

  return {
    success: true,
    summary: plotDigest,
    kgAnchors,
    plotDigest,
    styleMemo,
    tokensBeforeCompact,
    tokensAfterCompact,
  }
}
```

### compactPrompts.ts（定制化 prompt）

```typescript
export function buildNarrativeCompactPrompt(kgAnchors: KGAnchor[]): string {
  return `你是一个创意写作压缩助手。将以下对话历史压缩为叙事摘要。

规则：
1. 保留所有角色对话原文（引号内的内容不得修改或省略）
2. 保留所有情节转折点和关键事件
3. 压缩过渡性描述为简短概述
4. 提取写作风格偏好决策（如"决定使用第一人称"）
5. 标记所有伏笔和未解决的悬念

当前已知角色状态：
${kgAnchors.map(a => `- ${a.entityName}: ${a.currentState}`).join('\n')}

输出格式：
## 情节进展
[按时间线压缩的情节摘要]

## 活跃伏笔
[未解决的悬念和伏笔列表]

## 写作决策
[本次对话中确定的写作方向和风格选择]`
}
```

### 集成点

在 `aiService` 的消息发送流程中，在每次 API 调用前检查：

```typescript
// aiService.ts 中现有的 streamCompletion 逻辑前加入

if (shouldAutoCompact(currentTokens, contextWindow, tracking)) {
  const result = await compactNarrative(messages, deps, config)
  if (result.success) {
    messages = buildPostCompactMessages(result, recentMessages)
    tracking.compacted = true
    tracking.consecutiveFailures = 0
  } else {
    tracking.consecutiveFailures++
  }
}
```

---

## 四、P1-1：LLM 驱动的 Skill 路由

### 修改文件

```
apps/desktop/main/src/services/skills/skillRouter.ts  ← 修改
```

### 方案：混合路由

```typescript
// skillRouter.ts 改造

export async function routeSkill(
  input: string,
  context: SkillRoutingContext,
  aiService?: AiService,
): Promise<RoutingResult> {
  // 快速路径：确定性关键词匹配（无延迟）
  const keywordMatch = matchKeyword(input)
  if (keywordMatch.confidence > 0.9) {
    return keywordMatch
  }
  
  // 慢速路径：LLM 分类（需要 API 调用）
  if (aiService) {
    const skills = listAvailableSkills()
    const llmResult = await aiService.complete({
      systemPrompt: SKILL_ROUTING_PROMPT,
      messages: [{
        role: 'user',
        content: `用户输入: "${input}"
可用技能: ${skills.map(s => `${s.id}: ${s.description}`).join('\n')}
选择最合适的技能，返回技能 ID。如果没有合适的，返回 "chat"。`,
      }],
      maxTokens: 50,
    })
    return { skillId: extractSkillId(llmResult), confidence: 0.8 }
  }
  
  // 最终兜底
  return { skillId: 'chat', confidence: 0.5 }
}
```

---

## 五、P1-2：Skill 延迟加载

### 方案

不需要完整复刻 CC 的 ToolSearch（那是让 LLM 搜索工具）。CN 只需要：

```typescript
// 修改 assembleSystemPrompt 中 skill 注入部分

// 之前：注入所有 skill 的完整 prompt template（~5000 tokens）
// 之后：只注入 skill 列表（~500 tokens）

function buildSkillSection(skills: LoadedSkill[]): string {
  return `可用技能（使用时会加载完整指令）：
${skills.map(s => `- ${s.id}: ${s.description}`).join('\n')}

当用户请求涉及以上技能时，系统会自动加载完整执行指令。`
}

// 在 skillExecutor 中，执行时才加载完整 prompt template
async function resolveSkillPrompt(skillId: string): Promise<string> {
  const skill = await skillLoader.load(skillId)
  return skill.promptTemplate
}
```

**节约**：从 ~5000 tokens 降到 ~500 tokens，净省 4500 tokens 给创作上下文。

---

## 六、P1-3：并发编排器

### 文件规划

```
apps/desktop/main/src/services/skills/
  └── skillStepOrchestrator.ts       ← 新增
```

### 核心实现

```typescript
// skillStepOrchestrator.ts

export interface SkillStep {
  name: string
  concurrencySafe: boolean
  execute(ctx: { signal: AbortSignal }): Promise<StepResult>
}

export type StepBatch = { mode: 'read' | 'write'; steps: SkillStep[] }

export function partitionSteps(steps: SkillStep[]): StepBatch[] {
  const batches: StepBatch[] = []
  let currentReadBatch: StepBatch | null = null
  
  for (const step of steps) {
    if (step.concurrencySafe) {
      if (!currentReadBatch) {
        currentReadBatch = { mode: 'read', steps: [] }
      }
      currentReadBatch.steps.push(step)
    } else {
      if (currentReadBatch) {
        batches.push(currentReadBatch)
        currentReadBatch = null
      }
      batches.push({ mode: 'write', steps: [step] })
    }
  }
  if (currentReadBatch) batches.push(currentReadBatch)
  return batches
}

export async function* executeBatches(
  batches: StepBatch[],
  signal: AbortSignal,
): AsyncGenerator<StepResult> {
  for (const batch of batches) {
    if (signal.aborted) break
    
    if (batch.mode === 'read') {
      const results = await Promise.allSettled(
        batch.steps.map(s => s.execute({ signal }))
      )
      for (const r of results) {
        yield r.status === 'fulfilled'
          ? r.value
          : { error: (r as PromiseRejectedResult).reason, step: batch.steps[0].name }
      }
    } else {
      for (const step of batch.steps) {
        if (signal.aborted) break
        yield await step.execute({ signal })
      }
    }
  }
}
```

### 使用示例

```typescript
// 续写管道
const steps: SkillStep[] = [
  { name: 'kgQuery',     concurrencySafe: true,  execute: queryKG },
  { name: 'memoryRecall', concurrencySafe: true,  execute: recallMemory },
  { name: 'ragSearch',   concurrencySafe: true,  execute: searchRAG },
  { name: 'draft',       concurrencySafe: false, execute: generateDraft },
  { name: 'judge',       concurrencySafe: false, execute: evaluateDraft },
]

// 分区结果：
// Batch 1 (并发): [kgQuery, memoryRecall, ragSearch]
// Batch 2 (串行): [draft]
// Batch 3 (串行): [judge]
```

---

## 七、P1-4：成本追踪

### 文件规划

```
apps/desktop/main/src/services/ai/
  └── costTracker.ts                 ← 新增
```

### 核心实现（从 CC 简化搬入）

```typescript
// costTracker.ts

export type CostState = {
  totalCostUSD: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheReadTokens: number
  totalCacheCreationTokens: number
  sessionStartTime: number
  modelUsage: Record<string, ModelUsage>
}

type ModelUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  requestCount: number
}

// 价格表（按 Anthropic 当前定价）
const MODEL_PRICING: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-sonnet-4-20250514': { input: 3.0 / 1e6, output: 15.0 / 1e6, cacheRead: 0.3 / 1e6 },
  'claude-haiku-3.5':         { input: 0.8 / 1e6, output: 4.0 / 1e6,  cacheRead: 0.08 / 1e6 },
}

export function calculateCost(model: string, usage: ModelUsage): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['claude-sonnet-4-20250514']
  return (
    usage.inputTokens * pricing.input +
    usage.outputTokens * pricing.output +
    usage.cacheReadTokens * pricing.cacheRead
  )
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `¥${(usd * 7.2 * 100).toFixed(1)}分`
  return `¥${(usd * 7.2).toFixed(2)}`
}
```

---

## 八、P1-5：Post-Writing Hooks

### 文件规划

```
apps/desktop/main/src/services/ai/
  └── postWritingHooks.ts            ← 新增
```

### 核心实现

```typescript
// postWritingHooks.ts

export type PostWritingHook = {
  name: string
  priority: number
  condition: (ctx: WriteContext) => boolean
  execute: (ctx: WriteContext) => Promise<void>
}

export type WriteContext = {
  projectId: string
  documentId: string
  newContent: string
  hasDocumentChanges: boolean
  mentionsCharacters: boolean
  wordCount: number
  isSessionEnd: boolean
}

export const builtinHooks: PostWritingHook[] = [
  {
    name: 'auto-save-version',
    priority: 100,
    condition: ctx => ctx.hasDocumentChanges,
    execute: async ctx => {
      // await versionService.createAutoSnapshot(ctx.documentId)
    },
  },
  {
    name: 'update-kg',
    priority: 200,
    condition: ctx => ctx.mentionsCharacters,
    execute: async ctx => {
      // await kgRecognitionRuntime.processNewContent(ctx.newContent)
    },
  },
  {
    name: 'extract-memories',
    priority: 300,
    condition: ctx => ctx.isSessionEnd,
    execute: async ctx => {
      // 使用 Forked Agent 模式，共享 cache
    },
  },
]

export async function runPostWritingHooks(
  ctx: WriteContext,
  hooks: PostWritingHook[] = builtinHooks,
): Promise<void> {
  const applicable = hooks
    .filter(h => h.condition(ctx))
    .sort((a, b) => a.priority - b.priority)
  
  for (const hook of applicable) {
    try {
      await hook.execute(ctx)
    } catch (err) {
      console.error(`Post-writing hook '${hook.name}' failed:`, err)
      // 不中断其他 hooks
    }
  }
}
```

---

## 九、P2：Forked Agent（Cache 共享）

### 文件规划

```
apps/desktop/main/src/services/ai/
  └── forkedAgent.ts                 ← 新增
```

### 核心实现

```typescript
// forkedAgent.ts

export type ForkedAgentConfig = {
  parentSystemPrompt: string    // 复用 → prompt cache 命中
  parentMessages?: LLMMessage[] // 父对话历史（只读引用）
  taskPrompt: string            // 子 Agent 任务
  allowedSkills?: string[]      // 沙盒
  maxTokens?: number
  timeoutMs?: number
  model?: string                // Judge 可用便宜模型
}

export type ForkedAgentResult = {
  content: string
  usage: { inputTokens: number; outputTokens: number; cacheHitTokens: number }
}

export async function runForkedAgent(
  config: ForkedAgentConfig,
  aiService: AiService,
  signal?: AbortSignal,
): Promise<ForkedAgentResult> {
  const controller = new AbortController()
  const timeout = config.timeoutMs
    ? setTimeout(() => controller.abort(), config.timeoutMs)
    : undefined
    
  const combinedSignal = signal
    ? combineAbortSignals(signal, controller.signal)
    : controller.signal

  try {
    const result = await aiService.streamCompletion({
      systemPrompt: config.parentSystemPrompt,  // 与父相同 → cache hit
      messages: [
        ...(config.parentMessages ?? []),
        { role: 'user', content: config.taskPrompt },
      ],
      maxTokens: config.maxTokens ?? 4096,
      model: config.model,
      signal: combinedSignal,
    })
    return { content: extractText(result), usage: result.usage }
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) { controller.abort(signal.reason); break }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}
```

---

## 十、P2：CommandDispatcher（CLI 基座第一步）

### 文件规划

```
apps/desktop/main/src/core/
  ├── commandDispatcher.ts           ← 新增
  └── commands/                      ← 新增目录
      ├── continueCommand.ts
      ├── judgeCommand.ts
      └── ...
```

### 核心接口

```typescript
// commandDispatcher.ts

export type Command = {
  name: string
  input: Record<string, unknown>
  source: 'gui' | 'cli' | 'api'
}

export type CommandEvent = 
  | { type: 'progress'; message: string; percent?: number }
  | { type: 'permission_request'; request: PermissionRequest }
  | { type: 'stream_token'; token: string }
  | { type: 'result'; ok: boolean; data?: unknown; error?: string }

export class CommandDispatcher {
  private commands = new Map<string, CommandHandler>()
  
  register(name: string, handler: CommandHandler): void {
    this.commands.set(name, handler)
  }
  
  async *execute(command: Command): AsyncGenerator<CommandEvent> {
    const handler = this.commands.get(command.name)
    if (!handler) {
      yield { type: 'result', ok: false, error: `Unknown command: ${command.name}` }
      return
    }
    yield* handler.execute(command.input, command.source)
  }
}

type CommandHandler = {
  execute(input: Record<string, unknown>, source: string): AsyncGenerator<CommandEvent>
}
```

### IPC 集成

```typescript
// ipc/skills.ts 修改

// 现有 IPC handler 改为调用 CommandDispatcher
ipcMain.handle('skill:execute', async (event, { skillId, input }) => {
  const dispatcher = getCommandDispatcher()
  const events: CommandEvent[] = []
  
  for await (const evt of dispatcher.execute({ name: skillId, input, source: 'gui' })) {
    if (evt.type === 'permission_request') {
      // 发送到 renderer → 等待用户确认
      const response = await requestPermissionFromRenderer(event.sender, evt.request)
      // 继续执行...
    } else if (evt.type === 'stream_token') {
      event.sender.send('skill:stream', evt.token)
    }
    events.push(evt)
  }
  
  return events.find(e => e.type === 'result')
})
```

未来加 CLI 入口：

```typescript
// 未来: apps/desktop/main/src/cli/index.ts
const rl = readline.createInterface({ input: process.stdin })
for await (const line of rl) {
  const command = parseCommand(line)
  for await (const evt of dispatcher.execute({ ...command, source: 'cli' })) {
    process.stdout.write(JSON.stringify(evt) + '\n')  // NDJSON
  }
}
```

---

## 十一、集成顺序建议

```
Week 1:
  Day 1-2: Token Budget 中文修正（最基础，影响所有上层决策）
  Day 3-5: Permission Gate（保护用户原稿）

Week 2:
  Day 1-3: AutoCompact 框架（阈值 + circuit breaker）
  Day 4-5: NarrativeCompact 压缩器

Week 3:
  Day 1-2: 任务状态机 + Skill 阶段白名单
  Day 3-5: Post-Writing Hooks

Week 4:
  Day 1-3: LLM 路由（混合模式）
  Day 4-5: 成本追踪

Week 5-6:
  并发编排器 + Skill 延迟加载

Week 7-8:
  Fork Cache 共享 + CommandDispatcher
```

每一步都是独立的，可以单独测试和发布。没有硬依赖关系（除了 Token Budget 修正应该最先做）。
