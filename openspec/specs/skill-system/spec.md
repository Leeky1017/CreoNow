# Skill System Specification

## P1 变更摘要

P1 阶段目标：**最小可闭环系统**——哪怕只有"润色"一个能力，系统也能从请求走到结果应用，全程安全可控。

验收标准：打开应用 → 在编辑器中写字 → 选中文本 → 触发润色 → 看到 diff 预览 → 确认写回 → 查看历史 → 一键回退。全程可跑通。

本次新增以下 P1 Requirement：

| Section | 概要 |
| ------- | ---- |
| P1 — WritingOrchestrator 编排层 | 统一入口，串联全链路：请求 → 上下文 → 模型 → 回传 → 确认 → 写回 → 存版本 |
| P1 — Tool 注册表 | toolRegistry + toolTypes，V1 仅 3 个基础 Tool |
| P1 — Skill 三件套（续写/润色/改写） | continue / polish / rewrite 的 P1 管线定义 |
| P1 — Permission Gate（分级权限） | auto-allow / preview-confirm / must-confirm-snapshot / budget-confirm |
| P1 — Post-Writing Hooks | auto-save-version 启用，其余注册但不执行 |
| P1 — 任务状态机 | pending → running → completed/failed/killed，含 paused 中间态 |

## Purpose

将 AI 能力抽象为可组合的「技能」（续写、改写、扩写、缩写、风格迁移等），每个技能有独立的 `context_rules` 和执行逻辑，支持 builtin → global → project 三级作用域。

### Scope

| Layer    | Path                                |
| -------- | ----------------------------------- |
| Backend  | `main/src/services/skills/`         |
| Skills   | `main/skills/packages/`             |
| IPC      | `main/src/ipc/skills.ts`            |
| Frontend | `renderer/src/features/ai/`         |
| Store    | `renderer/src/stores/skillStore.ts` |

## Requirements

### Requirement: P1 — WritingOrchestrator 编排层

#### 目标

提供 Skill System 的统一执行入口。WritingOrchestrator 是一个有状态类，接收 `WritingRequest`，经过内部管线（识别意图 → 组装上下文 → 选模型 → 调 AI → 流式回传 → 协调确认 → 写回 → 存版本 → 处理失败），以 `AsyncGenerator<WritingEvent>` 的形式向调用方推送全链路事件流。

P1 目标：让"选中文本 → 触发润色 → diff 预览 → 确认写回 → 存版本 → 可回退"这条端到端路径完整可跑。

#### 接口契约

```typescript
/** 编排器配置 */
interface OrchestratorConfig {
  /** AI 服务适配器（接口定义见 ai-service/spec.md § AIServiceAdapter） */
  aiService: AIServiceAdapter
  /** Tool 注册表 */
  toolRegistry: ToolRegistry
  /** 权限门禁 */
  permissionGate: PermissionGate
  /** Post-Writing Hook 注册表 */
  postWritingHooks: PostWritingHook[]
  /** 默认超时（毫秒），默认 30_000 */
  defaultTimeoutMs?: number
}

/** 写作请求 */
interface WritingRequest {
  /** 请求唯一 ID（幂等键） */
  requestId: string
  /** 技能 ID，如 'polish' | 'rewrite' | 'continue' */
  skillId: string
  /** 输入内容（选中文本或文档上下文） */
  input: SkillInput
  /** 用户附加指令（如改写指令） */
  userInstruction?: string
  /** 所属文档 ID */
  documentId: string
  /** 选区引用（续写时可为空），定义见 editor/spec.md SelectionRef */
  selection?: SelectionRef
}

/** 技能输入 */
interface SkillInput {
  /** 选中文本 */
  selectedText?: string
  /** 光标前文本（续写场景） */
  precedingText?: string
  /** 光标后文本（续写场景） */
  followingText?: string
}

/** 写作事件——管线中每个阶段的状态推送 */
type WritingEvent =
  | { type: 'intent-resolved'; timestamp: number; skillId: string }
  | { type: 'context-assembled'; timestamp: number; tokenCount: number }
  | { type: 'model-selected'; timestamp: number; modelId: string }
  | { type: 'ai-chunk'; timestamp: number; delta: string }
  | { type: 'ai-done'; timestamp: number; fullText: string; usage: TokenUsage }
  | { type: 'permission-requested'; timestamp: number; level: PermissionLevel; description: string }
  | { type: 'permission-granted'; timestamp: number }
  | { type: 'permission-denied'; timestamp: number }
  | { type: 'write-back-done'; timestamp: number; versionId: string }
  | { type: 'hooks-done'; timestamp: number; executed: string[] }
  | { type: 'error'; timestamp: number; error: WritingError }
  | { type: 'aborted'; timestamp: number; reason: string }

/** Token 用量 */
interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/** 写作错误 */
interface WritingError {
  code: string
  message: string
  retryable: boolean
}

/** 编排器——有状态类，参考 CC QueryEngine.ts */
class WritingOrchestrator {
  constructor(config: OrchestratorConfig) {}

  /**
   * 执行写作请求，返回事件流。
   * 调用方通过 for-await-of 消费事件，可随时 return() 中止。
   */
  execute(request: WritingRequest): AsyncGenerator<WritingEvent>

  /** 中止当前正在执行的请求 */
  abort(requestId: string): void

  /** 销毁编排器，释放资源 */
  dispose(): void
}
```

#### 数据流

```
用户操作
  → WritingRequest
    → [1] 识别意图（解析 skillId → 加载 SkillDefinition）
    → [2] 组装上下文（Context Engine 注入 Immediate/Rules/Settings/Retrieved 层）
    → [3] 选模型（根据 SkillDefinition.modelPreference 和可用模型列表）
    → [4] 调 AI（流式请求 AIServiceAdapter，逐 chunk yield WritingEvent）
    → [5] 流式回传（前端 Inline Diff 实时渲染）
    → [6] 协调确认（触发 PermissionGate，等待用户确认/拒绝）
    → [7] 写回（通过 documentWrite Tool 将确认文本写入文档）
    → [8] 存版本（通过 versionSnapshot Tool 创建可回退版本快照）
    → [9] Post-Writing Hooks（依次执行已注册且条件满足的 Hook）
    → [E] 处理失败（任意阶段失败 → yield error 事件 → 状态机进入 failed）
```

#### 状态管理

编排器内部维护每个 `requestId` 对应的 `TaskState`（见"P1 — 任务状态机"一节）。管线各阶段的状态转换由编排器统一驱动。

#### 错误处理

| 错误类型 | code | retryable | 恢复策略 |
| -------- | ---- | --------- | -------- |
| 输入校验失败 | `SKILL_INPUT_INVALID` | false | 向用户展示具体校验错误 |
| 上下文组装超限 | `CONTEXT_TOKEN_OVERFLOW` | false | 提示用户缩短选区或调整上下文策略 |
| AI 调用失败 | `AI_SERVICE_ERROR` | true | 最多重试 2 次，间隔指数退避 |
| AI 调用超时 | `AI_SERVICE_TIMEOUT` | true | 最多重试 1 次 |
| 权限被拒 | `PERMISSION_DENIED` | false | 中止管线，不写回 |
| 写回失败 | `WRITE_BACK_FAILED` | true | 重试 1 次，仍失败则保留 AI 输出在剪贴板 |
| 版本快照失败 | `VERSION_SNAPSHOT_FAILED` | true | 重试 1 次，仍失败则写回成功但警告用户"未创建版本快照" |

#### CC 架构提炼

- **有状态类设计**：参考 CC `QueryEngine.ts`，WritingOrchestrator 持有配置和运行时状态，不是无状态函数。生命周期由 `constructor → execute()*N → dispose()` 管理。
- **AsyncGenerator 模式**：管线各阶段通过 `yield` 推送事件，调用方用 `for-await-of` 消费，天然支持背压和中止（`generator.return()`）。
- **配置注入**：所有依赖（AI 服务、工具注册表、权限门禁、Hook 列表）通过构造函数注入，便于测试时 mock。
- **幂等键**：`requestId` 保证同一请求不会被重复执行。

#### 不做清单

- ❌ 不做 Agentic Loop（多轮工具调用循环），V1 只走单次管线
- ❌ 不做多模型 fallback 链
- ❌ 不做并行技能编排（一次只处理一个请求）
- ❌ 不做跨文档批量操作
- ❌ 不做 streaming 中途切换模型

#### Scenario: 用户触发润色并确认写回

- **假设** 用户在编辑器中选中了一段文本"他走到门前"
- **当** 用户触发 `polish` 技能
- **则** WritingOrchestrator 依次 yield 事件：`intent-resolved` → `context-assembled` → `model-selected` → 多个 `ai-chunk` → `ai-done` → `permission-requested`（level: `preview-confirm`）
- **并且** 前端展示 Inline Diff，用户可预览润色结果
- **当** 用户点击「接受」
- **则** 继续 yield：`permission-granted` → `write-back-done`（含 versionId）→ `hooks-done`
- **并且** 文档内容已更新，版本历史中可见本次润色记录

#### Scenario: 用户触发润色但拒绝写回

- **假设** 用户在编辑器中选中文本并触发 `polish` 技能
- **当** AI 返回润色结果后，`permission-requested` 事件推送到前端
- **并且** 用户在 Inline Diff 预览中点击「拒绝」
- **则** WritingOrchestrator yield `permission-denied` 事件
- **并且** 管线中止，文档内容不变，不创建版本快照

#### Scenario: AI 调用超时后自动重试

- **假设** 用户触发 `polish` 技能，编排器配置 `defaultTimeoutMs: 30000`
- **当** AI 服务在 30 秒内未响应
- **则** WritingOrchestrator 自动重试 1 次
- **如果** 重试仍超时
- **则** yield `error` 事件（code: `AI_SERVICE_TIMEOUT`, retryable: true）
- **并且** 任务状态转为 `failed`，前端展示超时提示

---

### Requirement: P1 — Tool 注册表

#### 目标

提供统一的 Tool 注册、查找和执行机制。V1 阶段仅注册 3 个基础 Tool：`documentRead`、`documentWrite`、`versionSnapshot`。Tool 注册表是 WritingOrchestrator 的核心依赖，管线中"写回"和"存版本"阶段通过 Tool 执行。

#### 接口契约

```typescript
/** Tool 上下文——每次 Tool 执行时注入 */
interface ToolContext {
  /** 当前文档 ID */
  documentId: string
  /** 当前请求 ID */
  requestId: string
  /** 选区引用（定义见 editor/spec.md SelectionRef） */
  selection?: SelectionRef
}

/** P2 扩展：Agentic Loop 中 AI 自主调用 tool 时的上下文，携带 AI 传入的参数 */
interface AgenticToolContext extends ToolContext {
  /** AI 传入的 tool 参数（来自 ParsedToolCall.arguments） */
  args: Record<string, unknown>
}

/** Tool 执行结果 */
interface ToolResult {
  success: boolean
  data?: unknown
  error?: { code: string; message: string }
}

/** Tool 配置——用于 buildTool 工厂 */
interface ToolConfig {
  name: string
  description: string
  /** 是否并发安全，默认 false（fail-closed） */
  isConcurrencySafe?: boolean
  execute: (ctx: ToolContext) => Promise<ToolResult>
}

/**
 * Tool 接口——参考 CC Tool.ts
 * isConcurrencySafe 默认 false，遵循 fail-closed 原则
 */
interface WritingTool {
  readonly name: string
  readonly description: string
  readonly isConcurrencySafe: boolean
  execute(ctx: ToolContext): Promise<ToolResult>
}

/** Tool 工厂——参考 CC buildTool() */
function buildTool(config: ToolConfig): WritingTool

/** Tool 注册表 */
class ToolRegistry {
  /** 注册一个 Tool，name 重复时抛出 DuplicateToolError */
  register(tool: WritingTool): void

  /** 按 name 查找 Tool，不存在时返回 undefined */
  get(name: string): WritingTool | undefined

  /** 获取所有已注册 Tool 列表 */
  list(): ReadonlyArray<WritingTool>

  /** 注销一个 Tool */
  unregister(name: string): boolean
}
```

#### V1 内置 Tool 定义

| Tool 名称 | 描述 | isConcurrencySafe | 用途 |
| ---------- | ---- | ----------------- | ---- |
| `documentRead` | 读取文档指定范围的文本 | true | 上下文组装阶段读取文档内容 |
| `documentWrite` | 将文本写入文档指定范围 | false | 写回阶段替换选区内容 |
| `versionSnapshot` | 创建当前文档的版本快照 | false | 写回后创建可回退的版本记录 |

#### 数据流

```
WritingOrchestrator 管线阶段 [2] 组装上下文
  → toolRegistry.get('documentRead')
    → tool.execute({ documentId, requestId, selectionRange })
      → 返回 { success: true, data: { text: '...' } }

WritingOrchestrator 管线阶段 [7] 写回
  → toolRegistry.get('documentWrite')
    → tool.execute({ documentId, requestId, selectionRange })
      → 返回 { success: true, data: { bytesWritten: 42 } }

WritingOrchestrator 管线阶段 [8] 存版本
  → toolRegistry.get('versionSnapshot')
    → tool.execute({ documentId, requestId })
      → 返回 { success: true, data: { versionId: 'v-xxx' } }
```

#### 状态管理

ToolRegistry 本身无状态，仅作为 Tool 实例的容器。Tool 的执行状态由 WritingOrchestrator 的任务状态机管理。

#### 错误处理

| 错误类型 | code | 恢复策略 |
| -------- | ---- | -------- |
| Tool 未找到 | `TOOL_NOT_FOUND` | 管线中止，yield error 事件 |
| Tool 名称重复注册 | `DUPLICATE_TOOL` | 注册阶段抛出异常，阻止启动 |
| Tool 执行失败 | `TOOL_EXECUTION_FAILED` | 由调用方（编排器）根据错误类型决定重试或中止 |

#### CC 架构提炼

- **fail-closed 安全默认值**：参考 CC `Tool.ts`，`isConcurrencySafe` 默认为 `false`。未声明安全的 Tool 不允许并发执行，防止竞态写入。
- **工厂模式**：`buildTool()` 工厂确保 `isConcurrencySafe` 缺省值被正确填充，避免开发者遗忘。
- **注册表模式**：集中管理 Tool 实例，编排器通过 name 查找，不直接依赖具体 Tool 实现。

#### 不做清单

- ❌ 不做动态 Tool 加载（V1 所有 Tool 启动时静态注册）
- ❌ 不做 Tool 权限隔离（V1 所有 Tool 共享编排器上下文）
- ❌ 不做 Tool 版本管理
- ❌ 不做用户自定义 Tool

#### Scenario: 编排器通过注册表查找并执行 documentWrite Tool

- **假设** ToolRegistry 中已注册 `documentRead`、`documentWrite`、`versionSnapshot` 三个 Tool
- **当** WritingOrchestrator 在写回阶段调用 `toolRegistry.get('documentWrite')`
- **则** 返回 `documentWrite` Tool 实例
- **并且** 调用 `tool.execute(ctx)` 成功后返回 `{ success: true }`

#### Scenario: 查找未注册的 Tool

- **假设** ToolRegistry 中仅注册了 V1 的 3 个基础 Tool
- **当** 编排器调用 `toolRegistry.get('nonExistentTool')`
- **则** 返回 `undefined`
- **并且** 编排器 yield `error` 事件（code: `TOOL_NOT_FOUND`）

#### Scenario: 重复注册同名 Tool

- **假设** ToolRegistry 中已注册 `documentWrite` Tool
- **当** 再次调用 `registry.register(anotherDocumentWriteTool)`（name 也是 `documentWrite`）
- **则** 抛出 `DuplicateToolError`，注册表状态不变

---

### Requirement: P1 — Skill 三件套（续写/润色/改写）

#### 目标

定义 P1 阶段三个基础 Skill 的完整管线配置。每个 Skill 只走**简单管线**（无 Agentic Loop），由 WritingOrchestrator 按固定步骤执行。三个 Skill 覆盖创作者最核心的三种操作：续写新内容、润色已有文本、按指令改写。

#### 接口契约

```typescript
/** Skill 定义 */
interface SkillDefinition {
  /** 技能唯一标识 */
  skillId: string
  /** 显示名称 */
  displayName: string
  /** 技能描述 */
  description: string
  /** 所需输入类型 */
  requiredInput: SkillInputRequirement
  /** 管线步骤配置 */
  pipeline: PipelineConfig
  /** 权限门禁级别 */
  permissionLevel: PermissionLevel
  /** 模型偏好 */
  modelPreference: ModelPreference
}

/** 输入要求 */
interface SkillInputRequirement {
  /** 是否需要选中文本 */
  needsSelection: boolean
  /** 是否需要文档上下文（光标前后文） */
  needsDocumentContext: boolean
  /** 是否需要用户附加指令 */
  needsUserInstruction: boolean
  /** 最小输入长度（字符数） */
  minInputLength?: number
}

/** 管线配置 */
interface PipelineConfig {
  /** 管线步骤（V1 固定顺序执行，不支持跳步或分支） */
  steps: PipelineStep[]
  /** 是否启用 Agentic Loop（V1 始终为 false） */
  agenticLoop: false
}

type PipelineStep =
  | 'validate-input'
  | 'assemble-context'
  | 'select-model'
  | 'call-ai'
  | 'stream-response'
  | 'permission-gate'
  | 'write-back'
  | 'version-snapshot'
  | 'post-hooks'

/** 模型偏好 */
interface ModelPreference {
  /** 首选模型能力级别 */
  capability: 'fast' | 'balanced' | 'advanced'
  /** 最大输出 token 数 */
  maxOutputTokens: number
}
```

#### V1 Skill 定义

| Skill | skillId | needsSelection | needsDocumentContext | needsUserInstruction | permissionLevel | capability | maxOutputTokens |
| ----- | ------- | -------------- | -------------------- | -------------------- | --------------- | ---------- | --------------- |
| 润色 | `polish` | true | false | false | `preview-confirm` | `balanced` | 2048 |
| 改写 | `rewrite` | true | false | true | `preview-confirm` | `balanced` | 2048 |
| 续写 | `continue` | false | true | false | `preview-confirm` | `advanced` | 4096 |

三个 Skill 共享同一管线步骤序列：

```
validate-input → assemble-context → select-model → call-ai
  → stream-response → permission-gate → write-back
  → version-snapshot → post-hooks
```

#### 数据流

```
[润色] 选中文本 → 原文 + System Prompt("保持原意、优化表达") → AI → diff → 确认 → 替换选区
[改写] 选中文本 + 用户指令 → 原文 + 指令 + System Prompt → AI → diff → 确认 → 替换选区
[续写] 光标位置 → 前文上下文 + System Prompt("匹配风格、续写") → AI → 追加文本 → 确认 → 插入光标位置
```

#### 状态管理

Skill 本身无状态。每次执行由 WritingOrchestrator 分配独立的 `TaskState`，通过任务状态机管理生命周期。

#### 错误处理

| 错误类型 | code | 适用 Skill | 恢复策略 |
| -------- | ---- | ---------- | -------- |
| 润色/改写未选中文本 | `SKILL_INPUT_EMPTY` | polish, rewrite | 提示"请先选中需要处理的文本" |
| 改写未提供指令 | `SKILL_INSTRUCTION_MISSING` | rewrite | 提示"请输入改写指令" |
| 续写无前文上下文 | `SKILL_CONTEXT_EMPTY` | continue | 提示"文档内容为空，无法续写" |
| 输入文本过短 | `SKILL_INPUT_TOO_SHORT` | polish, rewrite | 提示"选中文本过短，请选择更多内容" |

#### CC 架构提炼

- **声明式 Skill 定义**：每个 Skill 是纯配置数据（`SkillDefinition`），不包含执行逻辑。执行逻辑统一由 WritingOrchestrator 管线驱动，Skill 只描述"我需要什么输入、走什么管线、要什么权限级别"。
- **管线步骤固定序列**：V1 不支持步骤跳跃或条件分支，降低复杂度。所有 Skill 共享同一管线模板，仅通过配置差异化行为。

#### 不做清单

- ❌ 不做 Agentic Loop（多轮工具调用），V1 所有 Skill 只走单次管线
- ❌ 不做 Skill 间链式调用（如"先续写再润色"）
- ❌ 不做 Skill 自定义管线步骤
- ❌ 不做 expand / condense / style-transfer / translate / summarize（这些 Skill 留到 P2+）
- ❌ 不做 Skill 参数 UI（改写指令通过 AI 面板输入框传递，不做独立参数表单）

#### Scenario: 用户触发润色技能端到端流程

- **假设** 用户在编辑器中选中了文本"他慢慢地走到了那扇门的前面"
- **当** 用户触发 `polish` 技能
- **则** 编排器校验输入：`needsSelection: true` → 选区非空 ✓
- **并且** 组装上下文：原文 + System Prompt（"保持原意、优化表达、不改变叙事视角"）
- **并且** AI 返回润色结果"他缓步走向那扇门"
- **并且** 前端以 Inline Diff 展示：删除线标注原文，高亮标注新文本
- **当** 用户点击「接受」
- **则** 选区内容被替换为润色结果，创建版本快照

#### Scenario: 用户触发改写技能并提供指令

- **假设** 用户选中文本"她笑了笑"，并在 AI 面板输入框中输入改写指令"改为更忧伤的语气"
- **当** 用户触发 `rewrite` 技能
- **则** 编排器校验输入：`needsSelection: true` → 选区非空 ✓，`needsUserInstruction: true` → 指令非空 ✓
- **并且** 组装上下文：原文 + 用户指令 + System Prompt
- **并且** AI 返回改写结果"她勉强扯出一丝苦涩的微笑"
- **并且** 前端以 Inline Diff 展示差异，用户确认后写回

#### Scenario: 用户触发续写技能

- **假设** 用户正在编辑文档，光标位于段落末尾"夜幕降临，街灯次第亮起。"之后
- **当** 用户触发 `continue` 技能
- **则** 编排器校验输入：`needsDocumentContext: true` → 光标前文非空 ✓
- **并且** 组装上下文：光标前文（最多 N tokens）+ System Prompt（"匹配前文风格、遵守知识图谱约束"）
- **并且** AI 以流式返回续写内容，前端在光标位置实时追加渲染
- **并且** 流式完成后，用户可在 Inline Diff 中审阅并确认/拒绝

---

### Requirement: P1 — Permission Gate（分级权限）

#### 目标

为 Skill 执行管线提供分级权限门禁。根据操作的风险等级，决定是否需要用户确认以及确认的方式。V1 所有写操作都**至少**经过 `preview-confirm` 级别，确保用户对 AI 输出拥有完全控制权。

#### 接口契约

```typescript
/**
 * 权限级别——从低到高
 * auto-allow: 纯读操作，无需确认
 * preview-confirm: 展示 diff 预览，用户确认后执行
 * must-confirm-snapshot: 确认前强制创建版本快照
 * budget-confirm: 涉及 token 预算消耗时的二次确认
 */
type PermissionLevel =
  | 'auto-allow'
  | 'preview-confirm'
  | 'must-confirm-snapshot'
  | 'budget-confirm'

/** 权限请求 */
interface PermissionRequest {
  /** 请求 ID */
  requestId: string
  /** 权限级别 */
  level: PermissionLevel
  /** 操作描述（展示给用户） */
  description: string
  /** 预览数据（diff 内容） */
  preview?: DiffPreview
  /** 预估 token 消耗（budget-confirm 时使用） */
  estimatedTokenCost?: number
}

/** Diff 预览数据 */
interface DiffPreview {
  /** 原文 */
  original: string
  /** 修改后文本 */
  modified: string
  /** 变更类型 */
  changeType: 'replace' | 'insert' | 'delete'
}

/** 权限门禁 */
interface PermissionGate {
  /**
   * 请求权限。
   * 对于 auto-allow，立即返回 true。
   * 对于其他级别，向前端推送确认请求，等待用户响应。
   * 超时未响应返回 false。
   */
  requestPermission(request: PermissionRequest): Promise<boolean>

  /** 确认超时时间（毫秒），默认 120_000（2 分钟） */
  readonly confirmTimeoutMs: number
}
```

#### 权限级别详细定义

| 级别 | 适用操作 | UI 交互 | V1 使用场景 |
| ---- | -------- | ------- | ----------- |
| `auto-allow` | 纯读操作（如 documentRead） | 无交互，静默通过 | 上下文组装阶段读取文档 |
| `preview-confirm` | 文本修改（润色、改写、续写） | Inline Diff 预览 + 接受/拒绝按钮 | 所有写回操作 |
| `must-confirm-snapshot` | 批量修改或高风险操作 | 强制先创建版本快照，再展示 Diff 确认 | V1 暂不触发，预留 |
| `budget-confirm` | 高 token 消耗操作 | 展示预估 token 成本，用户确认后执行 | V1 暂不触发，预留 |

#### 数据流

```
WritingOrchestrator 管线阶段 [6] 协调确认
  → 构建 PermissionRequest（含 DiffPreview）
    → permissionGate.requestPermission(request)
      → [auto-allow] 立即返回 true
      → [preview-confirm] IPC 推送到前端 → 前端展示 Diff → 用户点击接受/拒绝 → 返回 boolean
      → [超时] 返回 false → 编排器 yield permission-denied
```

#### 状态管理

PermissionGate 不维护持久状态。每个权限请求是一次性的 Promise，由 `requestId` 关联到对应的任务。

#### 错误处理

| 错误类型 | code | 恢复策略 |
| -------- | ---- | -------- |
| 确认超时 | `PERMISSION_TIMEOUT` | 视为拒绝，管线中止 |
| IPC 通道断开 | `PERMISSION_IPC_ERROR` | 视为拒绝，管线中止，提示用户重试 |

#### CC 架构提炼

- **分级权限模型**：参考 CC Permission 系统的分级思路。不同风险的操作对应不同级别的确认要求，低风险静默通过、高风险强制确认。
- **超时即拒绝**：用户未在超时时间内响应时，默认拒绝（fail-closed），避免无人值守时 AI 自动写入文档。
- **preview-confirm 作为 V1 默认**：所有写操作都展示 diff 预览让用户确认，保障用户的控制感。

#### 不做清单

- ❌ 不做权限级别的动态调整（V1 每个 Skill 的权限级别固定）
- ❌ 不做"记住我的选择"跳过确认
- ❌ 不做基于用户角色的权限差异
- ❌ 不做 `must-confirm-snapshot` 和 `budget-confirm` 的完整 UI 流程（V1 仅定义接口，不触发）

#### Scenario: preview-confirm 权限流程

- **假设** 用户触发 `polish` 技能，AI 已返回润色结果
- **当** WritingOrchestrator 进入权限确认阶段
- **则** 构建 `PermissionRequest`（level: `preview-confirm`，preview: `{ original, modified, changeType: 'replace' }`）
- **并且** 通过 IPC 推送到前端，前端以 Inline Diff 展示
- **当** 用户点击「接受」
- **则** `requestPermission()` 返回 `true`，管线继续执行写回

#### Scenario: 用户未在超时时间内响应

- **假设** 用户触发 `rewrite` 技能，AI 已返回改写结果，权限确认已推送到前端
- **当** 用户在 120 秒内未做出响应（未点击接受或拒绝）
- **则** `requestPermission()` 返回 `false`
- **并且** WritingOrchestrator yield `permission-denied` 事件
- **并且** 管线中止，AI 输出被丢弃，文档不变

#### Scenario: auto-allow 级别静默通过

- **假设** WritingOrchestrator 在上下文组装阶段调用 `documentRead` Tool
- **当** 该操作的权限级别为 `auto-allow`
- **则** `requestPermission()` 立即返回 `true`，不触发任何 UI 交互

---

### Requirement: P1 — Post-Writing Hooks

#### 目标

在 Skill 执行的写回阶段完成后，自动触发一系列后处理操作。每个 Hook 有独立的触发条件，满足条件时才执行。V1 阶段仅启用 `auto-save-version`，其他 Hook 注册但不执行（`enabled: false`）。

#### 接口契约

```typescript
/** Hook 触发条件上下文 */
interface HookConditionContext {
  /** 是否有文档变更 */
  hasDocumentChanges: boolean
  /** 是否提及角色名 */
  mentionsCharacters: boolean
  /** 是否提及地点 */
  mentionsLocations: boolean
  /** 是否为会话结束 */
  isSessionEnd: boolean
  /** 本次输出字数 */
  wordCount: number
}

/** Post-Writing Hook 定义 */
interface PostWritingHook {
  /** Hook 名称 */
  name: string
  /** 是否启用 */
  enabled: boolean
  /** 触发条件（返回 true 时执行） */
  condition: (ctx: HookConditionContext) => boolean
  /** 执行函数 */
  execute: (ctx: HookExecutionContext) => Promise<HookResult>
  /** 执行优先级（数字越小越先执行） */
  priority: number
}

/** Hook 执行上下文 */
interface HookExecutionContext {
  /** 文档 ID */
  documentId: string
  /** 请求 ID */
  requestId: string
  /** 写回后的文档内容（或变更范围） */
  writtenContent: string
  /** 技能 ID */
  skillId: string
}

/** P2 扩展：为 cost-tracking Hook 提供 AI 用量信息 */
interface P2HookExecutionContext extends HookExecutionContext {
  /** AI 响应的 token 用量（来自 StreamResult.usage） */
  usage?: TokenUsage
  /** 使用的模型 ID */
  modelId?: string
  /** 缓存命中的 token 数（来自 prompt caching） */
  cachedTokens?: number
}

/** Hook 执行结果 */
interface HookResult {
  success: boolean
  /** 错误信息（失败时） */
  error?: string
}
```

#### V1 Hook 注册表

| Hook 名称 | enabled | 触发条件 | 优先级 | V1 行为 |
| ---------- | ------- | -------- | ------ | ------- |
| `auto-save-version` | **true** | `hasDocumentChanges === true` | 10 | 调用 `versionSnapshot` Tool 创建版本快照 |
| `update-kg` | false | `mentionsCharacters \|\| mentionsLocations` | 20 | 注册但不执行 |
| `extract-memories` | false | `isSessionEnd === true` | 30 | 注册但不执行 |
| `quality-check` | false | `wordCount > 500` | 40 | 注册但不执行 |

#### 数据流

```
WritingOrchestrator 管线阶段 [9] Post-Writing Hooks
  → 遍历已注册 Hook（按 priority 升序）
    → [enabled === false] 跳过
    → [condition(ctx) === false] 跳过
    → [enabled && condition(ctx)] 执行 hook.execute(ctx)
      → 记录执行结果
  → yield hooks-done 事件（列出已执行的 Hook 名称列表）
```

#### 状态管理

Hook 执行状态不持久化。每次管线执行时，Hook 列表从 `OrchestratorConfig.postWritingHooks` 中读取，按优先级排序后依次执行。

#### 错误处理

| 错误类型 | 恢复策略 |
| -------- | -------- |
| 单个 Hook 执行失败 | 记录错误日志，继续执行后续 Hook（非阻塞） |
| `auto-save-version` 失败 | 写回已完成，向用户发出警告"版本快照未创建"，不回滚写回 |

Hook 的失败**不阻塞**管线完成。写回成功即视为核心操作完成，Hook 失败仅记录日志和警告。

#### CC 架构提炼

- **条件触发模式**：每个 Hook 声明自己的触发条件函数，由编排器在管线末尾统一评估和执行。条件不满足的 Hook 直接跳过，零开销。
- **enabled 开关**：V1 通过 `enabled: false` 注册但禁用未实现的 Hook，为 P2+ 预留扩展点，无需修改注册逻辑。
- **非阻塞执行**：Hook 失败不影响核心管线（写回）的结果，遵循"核心路径优先"原则。

#### 不做清单

- ❌ 不做 `update-kg` Hook 的实际执行逻辑（V1 仅注册）
- ❌ 不做 `extract-memories` Hook 的实际执行逻辑（V1 仅注册）
- ❌ 不做 `quality-check` Hook 的实际执行逻辑（V1 仅注册）
- ❌ 不做 Hook 的用户自定义注册
- ❌ 不做 Hook 的异步并行执行（V1 串行执行）

#### Scenario: 写回成功后自动保存版本

- **假设** 用户通过 `polish` 技能完成润色并确认写回
- **当** 写回阶段成功完成
- **则** 编排器遍历 Hook 列表，`auto-save-version` 的 `enabled: true` 且 `hasDocumentChanges: true`
- **并且** 执行 `auto-save-version` → 调用 `versionSnapshot` Tool → 创建版本快照
- **并且** yield `hooks-done` 事件，`executed` 列表包含 `['auto-save-version']`

#### Scenario: 禁用的 Hook 不执行

- **假设** 用户通过 `continue` 技能完成续写并确认写回
- **当** 编排器遍历 Hook 列表
- **则** `update-kg` 的 `enabled: false` → 跳过
- **并且** `extract-memories` 的 `enabled: false` → 跳过
- **并且** `quality-check` 的 `enabled: false` → 跳过
- **并且** 仅 `auto-save-version` 被执行

#### Scenario: auto-save-version Hook 执行失败

- **假设** 用户确认写回后，`auto-save-version` Hook 触发
- **当** `versionSnapshot` Tool 执行失败（如磁盘空间不足）
- **则** Hook 返回 `{ success: false, error: '磁盘空间不足' }`
- **并且** 编排器记录警告日志，向前端发出"版本快照未创建"提示
- **并且** 管线仍然 yield `hooks-done` 事件（写回本身不回滚）

---

### Requirement: P1 — 任务状态机

#### 目标

定义 Skill 执行全生命周期的状态模型。每个 `WritingRequest` 对应一个独立的 `TaskState` 实例，由 WritingOrchestrator 统一管理状态转换。状态机保证任务生命周期的确定性：任何时刻任务都处于明确的状态，且状态转换遵循预定义规则。

#### 接口契约

```typescript
/** 任务状态 */
type TaskStatus =
  | 'pending'     // 已创建，等待执行
  | 'running'     // 管线执行中
  | 'paused'      // 等待用户确认（权限门禁阶段）
  | 'completed'   // 成功完成（写回 + Hook 均完成）
  | 'failed'      // 执行失败（不可恢复错误或重试耗尽）
  | 'killed'      // 被用户或系统主动中止

/** 任务状态实例 */
interface TaskState {
  /** 请求 ID */
  requestId: string
  /** 当前状态 */
  status: TaskStatus
  /** 当前管线阶段（running 时有效） */
  currentStep?: PipelineStep
  /** 创建时间 */
  createdAt: number
  /** 最后状态变更时间 */
  updatedAt: number
  /** 错误信息（failed 时有效） */
  error?: WritingError
  /** 中止原因（killed 时有效） */
  abortReason?: string
}

/** 状态转换事件 */
interface TaskStateTransition {
  from: TaskStatus
  to: TaskStatus
  reason: string
  timestamp: number
}

/** 终态判断 */
function isTerminal(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'killed'
}
```

#### 状态转换规则

```
pending ──[execute()调用]──→ running
running ──[权限门禁等待]──→ paused
running ──[管线全部完成]──→ completed
running ──[不可恢复错误]──→ failed
running ──[用户中止]────→ killed
paused  ──[用户确认]────→ running
paused  ──[用户拒绝]────→ killed
paused  ──[确认超时]────→ killed
```

合法转换矩阵：

| 当前状态 → | pending | running | paused | completed | failed | killed |
| ---------- | ------- | ------- | ------ | --------- | ------ | ------ |
| **pending** | — | ✓ | — | — | — | ✓ |
| **running** | — | — | ✓ | ✓ | ✓ | ✓ |
| **paused** | — | ✓ | — | — | — | ✓ |
| **completed** | — | — | — | — | — | — |
| **failed** | — | — | — | — | — | — |
| **killed** | — | — | — | — | — | — |

终态（`completed` / `failed` / `killed`）不可再转换。非法转换**必须**抛出 `InvalidStateTransitionError`。

#### 数据流

```
WritingOrchestrator.execute(request)
  → 创建 TaskState { requestId, status: 'pending' }
  → 转为 running → 管线依次执行各阶段
  → 到达 permission-gate → 转为 paused → 等待用户响应
    → 用户确认 → 转为 running → 继续管线
    → 用户拒绝/超时 → 转为 killed → 管线中止
  → 管线全部完成 → 转为 completed
  → 任意阶段异常 → 转为 failed
```

#### 状态管理

WritingOrchestrator 维护一个 `Map<string, TaskState>`（key 为 `requestId`），用于追踪所有活跃任务。终态任务在保留一段时间（供 UI 查询）后可被清理。

#### 错误处理

| 错误类型 | code | 恢复策略 |
| -------- | ---- | -------- |
| 非法状态转换 | `INVALID_STATE_TRANSITION` | 抛出异常，不改变当前状态 |
| 重复 requestId | `DUPLICATE_REQUEST_ID` | 拒绝创建，返回已有任务状态 |

#### CC 架构提炼

- **显式状态机**：所有状态和合法转换以矩阵形式定义，杜绝隐式状态和无效转换。非法转换直接抛异常而非静默忽略。
- **终态不可逆**：`completed` / `failed` / `killed` 是终态，一旦进入不可再转换，保证生命周期的确定性。
- **paused 中间态**：专门为权限门禁设计。管线在等待用户确认时进入 `paused`，区别于 `running`（还在执行）和 `killed`（已中止）。

#### 不做清单

- ❌ 不做任务持久化（V1 任务状态仅存在于内存，应用重启后丢失）
- ❌ 不做任务队列（V1 一次只执行一个任务，新请求在前一个完成前被拒绝）
- ❌ 不做任务恢复（failed/killed 后不支持"从断点继续"）
- ❌ 不做任务优先级

#### Scenario: 完整的任务状态转换（成功路径）

- **假设** 用户触发 `polish` 技能
- **则** 创建 TaskState，status = `pending`
- **当** WritingOrchestrator 开始执行管线
- **则** status 转为 `running`，currentStep 依次更新为各阶段名称
- **当** 管线到达 `permission-gate` 阶段
- **则** status 转为 `paused`
- **当** 用户点击「接受」
- **则** status 转回 `running`，继续执行 `write-back` → `version-snapshot` → `post-hooks`
- **当** 所有阶段完成
- **则** status 转为 `completed`（终态）

#### Scenario: 用户中止任务

- **假设** 用户触发 `continue` 技能，管线正在 `call-ai` 阶段（status = `running`）
- **当** 用户点击「取消」按钮
- **则** WritingOrchestrator 调用 `abort(requestId)`
- **并且** status 转为 `killed`，abortReason = '用户主动取消'
- **并且** AI 请求被中止，管线不再继续

#### Scenario: 非法状态转换被拒绝

- **假设** 一个任务已处于 `completed` 终态
- **当** 尝试将其转为 `running`
- **则** 抛出 `InvalidStateTransitionError`（message: '不允许从 completed 转为 running'）
- **并且** 任务状态保持 `completed` 不变

---

### Requirement: 内置技能清单与 I/O 定义

系统**必须**预装以下文字创作类内置技能，每个技能有明确的输入、输出和上下文规则定义。内置技能的 `scope` 为 `builtin`，用户不可删除但可以停用。

| 技能 ID          | 名称     | 输入                    | 输出           | 上下文规则                         |
| ---------------- | -------- | ----------------------- | -------------- | ---------------------------------- |
| `polish`         | 润色     | 选中文本                | 润色后文本     | 保持原意、优化表达、不改变叙事视角 |
| `rewrite`        | 改写     | 选中文本 + 改写指令     | 改写后文本     | 遵循改写指令、保持上下文连贯       |
| `continue`       | 续写     | 当前文档上下文          | 续写段落       | 匹配前文风格、遵守知识图谱约束     |
| `expand`         | 扩写     | 选中文本                | 扩展后文本     | 丰富细节、保持原有结构和节奏       |
| `condense`       | 缩写     | 选中文本                | 精简后文本     | 保留核心信息、去除冗余描述         |
| `style-transfer` | 风格迁移 | 选中文本 + 目标风格描述 | 风格迁移后文本 | 保持原有叙事内容、仅改变语言风格   |
| `translate`      | 翻译     | 选中文本 + 目标语言     | 翻译后文本     | 保持文学表达、非逐字直译           |
| `summarize`      | 摘要     | 选中文本或整章内容      | 摘要文本       | 提取核心事件和关键信息             |

每个技能的执行**必须**通过 `SkillExecutor` 统一调度，执行前**必须**校验输入是否满足技能要求（如续写需要文档上下文非空）。

技能执行结果**必须**以 `SkillResult` 结构返回，包含 `output`（输出文本）、`metadata`（token 用量、模型标识）和 `traceId`（用于记忆系统溯源）。

#### Scenario: 用户触发润色技能

- **假设** 用户在编辑器中选中了一段文本，AI 面板已打开
- **当** 用户在 AI 面板中点击「润色」技能按钮
- **则** 系统通过 IPC 通道 `skill:execute`（Request-Response 模式）将选中文本和技能 ID 发送到主进程
- **并且** `SkillExecutor` 校验输入非空后，组装上下文（Immediate 层 + Rules 层）并调用 LLM
- **并且** 润色结果以流式响应返回渲染进程，在 AI 面板中实时展示
- **并且** 用户可通过 Editor 的 Inline Diff 功能预览并接受/拒绝修改

#### Scenario: 续写技能使用文档上下文

- **假设** 用户正在编辑第十章，光标位于段落末尾
- **当** 用户触发「续写」技能
- **则** 系统自动捕获当前文档上下文（光标前的内容）作为输入
- **并且** Context Engine 按优先级注入 Immediate 层（当前章节）、Rules 层（创作规则）、Settings 层（风格偏好）、Retrieved 层（前文关键设定）
- **并且** 续写结果追加到光标位置，用户可在 Inline Diff 中审阅

#### Scenario: 技能执行输入校验失败

- **假设** 用户未选中任何文本
- **当** 用户点击「润色」技能按钮
- **则** 系统返回结构化错误 `{ code: "SKILL_INPUT_EMPTY", message: "请先选中需要润色的文本" }`
- **并且** AI 面板展示错误提示，不发起 LLM 调用

---

### Requirement: 技能触发方式

用户**必须**通过 AI 面板中的技能按钮触发技能执行。技能按钮区域位于 AI 面板的对话输入区上方，以图标 + 名称的形式水平排列。

技能触发流程：

1. 用户点击技能按钮区域，展开技能选择面板
2. 技能选择面板按分类展示当前可用技能（内置 / 全局自定义 / 项目级自定义）
3. 用户选择目标技能后，系统根据技能类型自动判断输入来源（选中文本或文档上下文）
4. 技能执行结果通过 AI 面板展示，涉及文本修改的结果同时在 Editor 中以 Inline Diff 呈现

技能**必须**由用户主动调用，系统不可自动执行技能。技能默认作用于当前编辑器打开的文档。

技能选择面板**必须**有 Storybook Story，覆盖默认态、空状态（无自定义技能）、禁用态（技能被停用时灰显）。

#### Scenario: 用户通过技能面板选择并执行技能

- **假设** AI 面板已打开，用户在编辑器中选中了一段文本
- **当** 用户点击技能按钮区域
- **则** 技能选择面板展开，显示分类后的可用技能列表
- **并且** 已停用的技能以灰显（`opacity: 0.5`，`cursor: not-allowed`）状态展示，不可点击
- **当** 用户点击「改写」技能
- **则** 技能选择面板收起，系统开始执行改写流程
- **并且** AI 面板显示执行进度

#### Scenario: 技能面板无自定义技能时的空状态

- **假设** 用户未创建任何自定义技能
- **当** 技能选择面板展开
- **则** 内置技能正常显示
- **并且** 自定义技能区域显示空状态提示「暂无自定义技能，点击创建或用自然语言描述需求」
- **并且** 空状态区域提供「创建技能」按钮入口

---

### Requirement: 自定义技能管理

用户**必须**能够新增、编辑、删除自定义技能。自定义技能与内置技能享有相同的调用方式和执行流程。

自定义技能的创建方式：

1. **手动创建**：用户填写技能名称、描述、Prompt 模板、输入类型（选中文本 / 文档上下文）和上下文规则
2. **AI 辅助创建**：用户用自然语言描述需求（如「帮我创建一个技能，把文言文转成白话文」），系统自动生成技能配置，用户确认后保存

自定义技能**必须**通过 IPC 通道持久化到主进程的 SQLite 数据库：

| IPC 通道              | 通信模式         | 方向            | 用途           |
| --------------------- | ---------------- | --------------- | -------------- |
| `skill:custom:create` | Request-Response | Renderer → Main | 创建自定义技能 |
| `skill:custom:update` | Request-Response | Renderer → Main | 更新自定义技能 |
| `skill:custom:delete` | Request-Response | Renderer → Main | 删除自定义技能 |
| `skill:custom:list`   | Request-Response | Renderer → Main | 列出自定义技能 |

自定义技能的数据结构**必须**包含 `id`、`name`、`description`、`promptTemplate`、`inputType`、`contextRules`、`scope`、`enabled`、`createdAt`、`updatedAt` 字段。

所有 IPC 数据**必须**通过 Zod schema 进行运行时校验，校验失败返回统一错误格式。

#### Scenario: 用户手动创建自定义技能

- **假设** 用户打开技能管理界面
- **当** 用户点击「创建技能」，填写名称「文言文转白话」、描述、Prompt 模板，选择输入类型为「选中文本」，作用域为「项目级」
- **则** 系统通过 `skill:custom:create` 将技能配置发送到主进程
- **并且** 主进程 Zod 校验通过后写入 SQLite，返回创建成功
- **并且** 新技能立即出现在技能选择面板中

#### Scenario: 用户通过自然语言描述创建技能

- **假设** 用户在技能管理界面点击「AI 辅助创建」
- **当** 用户输入「创建一个技能，可以把我选中的内容改写成鲁迅风格」
- **则** 系统调用 LLM 生成技能配置（名称、Prompt 模板、上下文规则）
- **并且** 生成结果以可编辑表单形式展示，用户可修改后确认保存
- **并且** 确认后通过 `skill:custom:create` 持久化

#### Scenario: 删除自定义技能的确认流程

- **假设** 用户在技能管理界面查看自定义技能列表
- **当** 用户点击某个自定义技能的删除按钮
- **则** 系统弹出确认对话框（`Dialog` 组件），提示「确定删除技能"文言文转白话"？此操作不可撤销」
- **当** 用户确认删除
- **则** 系统通过 `skill:custom:delete` 通知主进程删除
- **并且** 技能从列表和技能选择面板中移除

#### Scenario: 创建技能时 Zod 校验失败

- **假设** 用户创建技能时 Prompt 模板字段为空
- **当** 数据发送到主进程
- **则** Zod 校验失败，主进程返回 `{ success: false, error: { code: "VALIDATION_ERROR", message: "promptTemplate 不能为空" } }`
- **并且** 渲染进程在表单对应字段下方显示内联错误提示（`--color-error`）

---

### Requirement: 技能作用域管理

技能有三级作用域：`builtin`（内置）、`global`（全局）、`project`（项目级）。系统**必须**按作用域规则管理技能的可见性和生命周期。

作用域规则：

| 作用域    | 可见范围 | 创建者 | 可删除 | 可停用 | 可修改作用域   |
| --------- | -------- | ------ | ------ | ------ | -------------- |
| `builtin` | 所有项目 | 系统   | 否     | 是     | 否             |
| `global`  | 所有项目 | 用户   | 是     | 是     | 可降为 project |
| `project` | 当前项目 | 用户   | 是     | 是     | 可升为 global  |

技能可见性解析顺序：`project` → `global` → `builtin`。若同名技能存在于多个作用域，**项目级优先**，其次全局，最后内置。

用户**必须**能对每个技能进行独立启停控制。停用的技能在技能选择面板中灰显，不可触发执行。

技能启停状态变更通过 IPC 通道 `skill:toggle`（Request-Response 模式）持久化。

#### Scenario: 用户停用内置技能

- **假设** 用户在技能管理界面查看内置技能列表
- **当** 用户关闭「翻译」技能的开关
- **则** 系统通过 `skill:toggle` 发送 `{ skillId: "translate", enabled: false }` 到主进程
- **并且** 主进程持久化状态后返回成功
- **并且** 「翻译」技能在技能选择面板中灰显

#### Scenario: 项目级技能覆盖全局技能

- **假设** 用户有一个全局技能「正式风格改写」和一个同名项目级技能「正式风格改写」（prompt 不同）
- **当** 用户在当前项目中触发「正式风格改写」
- **则** 系统执行项目级版本的技能，忽略全局版本
- **并且** 技能选择面板中该技能标注为「项目级覆盖」

#### Scenario: 用户将项目级技能提升为全局

- **假设** 用户在技能管理界面查看一个项目级自定义技能
- **当** 用户点击「提升为全局」
- **则** 系统通过 `skill:custom:update` 将该技能的 `scope` 从 `project` 改为 `global`
- **并且** 该技能在所有项目中可见

---

### Requirement: 技能执行与流式响应

技能执行**必须**支持流式响应，让用户在 LLM 生成过程中实时看到输出内容。

技能执行的 IPC 通信采用混合模式：

1. **触发**：`skill:execute`（Request-Response），渲染进程发送执行请求，主进程返回 `executionId`
2. **流式推送**：`skill:stream:chunk`（Push Notification），主进程通过 `webContents.send` 逐步推送生成内容
3. **完成通知**：`skill:stream:done`（Push Notification），主进程推送执行完成信号，包含完整的 `SkillResult`

执行过程中用户**必须**能取消正在进行的技能执行，通过 `skill:cancel`（Fire-and-Forget）发送取消信号。

当 LLM 调用失败或超时时，系统**必须**返回结构化错误并在 AI 面板中展示错误信息，不可静默失败。

执行结果在进入渲染进程前**必须**经过输出校验：

- `validateSkillRunOutput()` **必须**在 LLM 输出落地前运行，负责阻断明显无效的生成结果
- `synopsis` 保持专属校验路径
- 所有内置技能**必须**拒绝空输出、代码块污染、HTML 标签污染
- `polish` / `rewrite` / `condense` / `shrink` / `summarize` / `translate` / `style-transfer` 的膨胀阈值为输入长度的 10 倍（strict）
- `continue` / `expand` / `brainstorm` / `critique` / `describe` / `dialogue` / `roleplay` / `write` 的膨胀阈值为输入长度的 20 倍（loose）
- `chat` 执行空输出、代码块、HTML 污染检测，但不做膨胀检测
- 校验失败时**必须**返回 `SKILL_OUTPUT_INVALID`，并通过既有失败事件链路反馈到 AI 面板

#### Scenario: 技能流式执行正常完成

- **假设** 用户触发了「续写」技能
- **当** 主进程开始调用 LLM
- **则** 渲染进程收到 `executionId` 确认执行已开始
- **并且** 随后通过 `skill:stream:chunk` 逐步接收生成内容，AI 面板实时显示
- **并且** 最终收到 `skill:stream:done`，包含完整结果和 metadata
- **并且** 用户可将结果应用到编辑器（触发 Inline Diff）

#### Scenario: 用户取消正在执行的技能

- **假设** 技能正在流式执行中，AI 面板显示生成进度
- **当** 用户点击 AI 面板中的「停止生成」按钮
- **则** 渲染进程通过 `skill:cancel` 发送取消信号
- **并且** 主进程中断 LLM 调用，释放资源
- **并且** AI 面板显示「生成已取消」，已接收的部分内容保留可见

#### Scenario: 技能执行失败的错误处理

- **假设** 用户触发了「改写」技能
- **当** LLM API 返回错误（如速率限制、网络超时）
- **则** 主进程通过 `skill:stream:done` 推送错误状态 `{ success: false, error: { code: "LLM_API_ERROR", message: "API 调用失败，请稍后重试" } }`
- **并且** AI 面板展示错误提示（Toast 通知，类型 `error`）
- **并且** 用户可点击「重试」按钮重新执行

---

### Requirement: 高频 Skill 输出校验

系统**必须**对高频创作技能的输出执行基础质量闸门，防止空内容、格式污染或异常膨胀的结果直接进入编辑链路。当前实现位于 `SkillExecutor` 的 `validateSkillRunOutput()` 与 `validateCreativeSkillOutput()`。

- 所有内置 skill **必须**在输出进入 renderer 前完成校验
- `V-EMPTY`：`outputText` 缺失或 trim 后为空时，**必须**返回 `SKILL_OUTPUT_INVALID`
- `V-CODEBLOCK`：输出包含三个连续反引号时，**必须**判为无效
- `V-HTML`：输出匹配 HTML 开标签模式时，**必须**判为无效
- `V-INFLATE-STRICT`：`polish` / `rewrite` / `condense` / `shrink` / `summarize` / `translate` / `style-transfer` 的输出长度大于输入长度 10 倍时，**必须**判为无效
- `V-INFLATE-LOOSE`：`continue` / `expand` / `brainstorm` / `critique` / `describe` / `dialogue` / `roleplay` / `write` 的输出长度大于输入长度 20 倍时，**必须**判为无效
- `continue` 的膨胀基准**必须**优先取文档上下文（`contextPrompt` / 文档上下文），其余创作技能取用户输入文本
- `synopsis` 继续沿用独立校验逻辑
- `chat` 检测空输出、代码块、HTML 标签，不做膨胀检测

#### Scenario: 高频创作 skill 的正常输出通过校验

- **假设** 用户触发 `polish`、`rewrite`、`continue` 或 `expand`，且模型返回自然语言文本
- **当** 输出不为空、不含代码块 / HTML 且未超过各自膨胀阈值
- **则** `validateSkillRunOutput()` 返回成功
- **并且** 输出继续沿既有链路发送到渲染进程

#### Scenario: 输出为空时返回 SKILL_OUTPUT_INVALID

- **假设** 任一技能返回空字符串或仅含空白字符
- **当** 执行输出校验
- **则** 返回 `{ code: "SKILL_OUTPUT_INVALID" }`
- **并且** 该结果不会继续注入 AI 面板或编辑器应用链路

#### Scenario: continue 使用宽松膨胀阈值，polish 使用严格阈值

- **假设** `continue` 的上下文输入较短，而模型返回了较长的续写内容
- **当** 输出长度未超过输入基准的 20 倍
- **则** 结果可以通过校验
- **并且** 同等体量下，若 `polish` / `rewrite` 超过 10 倍阈值则必须被拦截

---

### Requirement: 多技能并发调度、超时与依赖管理

技能系统必须提供可预测的调度器，处理并发执行、执行超时、技能依赖缺失。

调度策略：

- 同会话仅允许 1 个运行中技能（FIFO）
- 全局并发上限 8
- 每个技能定义 `timeoutMs`（默认 30,000，最大 120,000）
- 依赖声明：`dependsOn: string[]`，缺失依赖时阻断执行

错误码：

- `SKILL_TIMEOUT`
- `SKILL_DEPENDENCY_MISSING`
- `SKILL_QUEUE_OVERFLOW`

队列策略：

- 每会话队列上限 20
- 超限直接拒绝并提示用户稍后重试

#### Scenario: 多技能并发请求按队列执行

- **假设** 用户在同一会话连续触发 `rewrite`、`expand`、`polish`
- **当** 调度器接收请求
- **则** `rewrite` 立即执行，其余按 FIFO 排队
- **并且** 队列状态实时推送到 AI 面板

#### Scenario: 技能依赖缺失阻断执行

- **假设** 自定义技能 `chapter-outline-refine` 依赖 `summarize`
- **当** `summarize` 被停用或不存在
- **则** 执行返回 `{ code: "SKILL_DEPENDENCY_MISSING", details: ["summarize"] }`
- **并且** 不发起 LLM 调用

---

### Requirement: 会话级并发槽位必须在 timeout/abort/异常路径可回收

技能系统的会话级资源（并发槽位、队列占用等）**必须**在异常路径可回收，避免出现“槽位永久占用导致全局阻塞”。

- 当任务因 timeout/abort/异常未能正常 settle（completion 丢失）时，系统仍必须回收并发槽位。
- 该回收行为必须可被自动化测试验证。
- 若存在更强约束，应满足并覆盖本 Requirement，禁止实现两套相互冲突的回收逻辑。

#### Scenario: BE-SLA-S3 会话并发槽位在 timeout/abort 下可回收

- **假设** 某个会话级调度器为任务占用了并发槽位
- **当** 任务因 timeout/abort/异常导致 completion 丢失或未正常 settle
- **则** 系统仍能回收该并发槽位并允许后续任务继续排队执行
- **并且** 不会出现“槽位永久占用导致全局阻塞”

---

### Requirement: 模块级可验收标准（适用于本模块全部 Requirement）

- 量化阈值：
  - 技能触发到 executionId 返回 p95 < 120ms
  - 队列入队响应 p95 < 80ms
  - 取消指令生效 p95 < 300ms
- 边界与类型安全：
  - `TypeScript strict` + zod
  - 所有 `skill:*` 通道必须声明 request/response schema
- 失败处理策略：
  - 执行超时直接中断并返回 `SKILL_TIMEOUT`
  - 可恢复失败允许用户一键重试（复用原参数）
  - 失败事件必须广播到 AI 面板和日志
- Owner 决策边界：
  - 内置技能 ID 集合、作用域优先级、默认超时由 Owner 固定
  - Agent 不可私改内置技能语义

#### Scenario: 超时中断可验证

- **假设** 某技能运行超过 30,000ms
- **当** 到达 timeout
- **则** 调度器中断执行并返回 `SKILL_TIMEOUT`
- **并且** 资源（连接/流）被释放

#### Scenario: 队列溢出被拒绝

- **假设** 会话队列已满 20 条
- **当** 用户继续触发技能
- **则** 返回 `{ code: "SKILL_QUEUE_OVERFLOW" }`
- **并且** 不影响已有排队任务

---

### Requirement: 异常与边界覆盖矩阵

| 类别         | 最低覆盖要求                                |
| ------------ | ------------------------------------------- |
| 网络/IO 失败 | LLM 调用失败、流式通道断开                  |
| 数据异常     | 自定义技能 schema 非法、prompt 模板缺失变量 |
| 并发冲突     | 并发取消与完成竞态、同名技能覆盖竞态        |
| 容量溢出     | 队列溢出、单输出超长                        |
| 权限/安全    | 跨项目技能读取、未授权技能执行              |

#### Scenario: 同名技能覆盖竞态

- **假设** 全局与项目级同时更新同名技能
- **当** 用户触发执行
- **则** 系统按 `project > global > builtin` 一致性解析
- **并且** 返回所选技能来源 `resolvedScope=project`

#### Scenario: 跨项目技能越权访问阻断

- **假设** 项目 A 的技能 ID 被项目 B 请求执行
- **当** 主进程校验 `projectId`
- **则** 返回 `SKILL_SCOPE_VIOLATION`
- **并且** 写入安全审计日志

---

### Non-Functional Requirements

**Performance**

- `skill:execute` 响应：p50 < 60ms，p95 < 120ms，p99 < 250ms
- `skill:cancel` 生效：p50 < 150ms，p95 < 300ms，p99 < 800ms
- 技能列表加载：p95 < 200ms

**Capacity**

- 每会话队列上限：20
- 全局并发上限：8
- 自定义技能总数上限：全局 1,000 / 每项目 500

**Security & Privacy**

- 技能 prompt 模板中的密钥变量必须脱敏存储
- 日志只记录 `skillId/executionId`，不记录完整 prompt
- 技能作用域必须强制 project 隔离

**Concurrency**

- 同会话串行，跨会话并行
- 队列采用 FIFO，不允许插队（系统重试任务除外）
- 取消请求优先级高于普通执行请求

#### Scenario: 全局并发上限保护

- **假设** 同时有 20 个会话请求执行技能
- **当** 系统达到并发上限 8
- **则** 其余请求进入待执行队列
- **并且** 无请求被静默丢弃

#### Scenario: 自定义技能容量超限

- **假设** 当前项目已有 500 个自定义技能
- **当** 用户尝试再创建 1 个
- **则** 返回 `{ code: "SKILL_CAPACITY_EXCEEDED" }`
- **并且** 提示清理不再使用的技能

---

### Requirement: chat 默认对话技能

技能系统**必须**包含 `builtin:chat` 技能，作为默认对话技能。当意图路由无法匹配到具体技能时，统一路由到 `builtin:chat`。

REQ-ID: `REQ-SKL-CHAT`

---

### Requirement: 意图路由函数

技能系统**必须**提供 `inferSkillFromInput` 函数，根据用户输入文本和上下文推断目标技能 ID。

函数签名：

```typescript
function inferSkillFromInput(args: {
  input: string;
  hasSelection: boolean;
  explicitSkillId?: string;
}): string;
```

路由优先级：

1. 显式技能覆盖（`explicitSkillId` 非空时直接返回）
2. 选中文本上下文启发式（有选中 + 无输入 → `builtin:polish`；有选中 + 短改写指令 → `builtin:rewrite`）
3. 关键词匹配规则（命中前**必须**通过否定语境守卫）：

| 关键词                            | 目标技能 ID          |
| --------------------------------- | -------------------- |
| "续写"/"写下去"/"接着写"/"继续写" | `builtin:continue`   |
| "头脑风暴"/"帮我想想"             | `builtin:brainstorm` |
| "大纲"/"提纲"                     | `builtin:outline`    |
| "总结"/"摘要"                     | `builtin:summarize`  |
| "翻译"                            | `builtin:translate`  |
| "扩写"/"展开"                     | `builtin:expand`     |
| "缩写"/"精简"                     | `builtin:condense`   |

4. 默认 → `builtin:chat`

否定语境守卫：

- 路由器**必须**提供 `isNegated(input, keywordIndex, keyword)` 辅助函数，检测关键词前方窗口内是否存在否定语境
- 中文否定词至少覆盖：`不要`、`别`、`不想`、`不用`、`不需要`、`停止`、`取消`、`禁止`、`不必`、`无需`
- 英文否定词至少覆盖：`don't`、`do not`、`stop`、`no`、`never`、`cancel`、`not`、`without`
- 当关键词命中但处于否定语境时，关键词规则**不得**触发对应技能；所有关键词均被否定时回退到 `builtin:chat`
- 双重否定（如 `不是不想续写`、`not that I don't want to continue writing`）**必须**恢复为正向意图
- 否定守卫**不得**影响显式技能覆盖路径

REQ-ID: `REQ-SKL-ROUTE`

#### Scenario: S1 默认路由到 chat

- **假设** `args = { input: "你好，这个故事写得怎么样？", hasSelection: false }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:chat"`

#### Scenario: S2 识别"续写"关键词

- **假设** `args = { input: "帮我接着写下去", hasSelection: false }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:continue"`

#### Scenario: S3 识别"头脑风暴"关键词

- **假设** `args = { input: "帮我想想接下来的剧情", hasSelection: false }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:brainstorm"`

#### Scenario: S4 空输入返回 chat

- **假设** `args = { input: "", hasSelection: false }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:chat"`

#### Scenario: S5 显式技能覆盖优先

- **假设** `args = { input: "帮我续写", hasSelection: false, explicitSkillId: "builtin:polish" }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:polish"`（显式覆盖优先于关键词匹配）

#### Scenario: S6 有选中文本且无输入路由到 polish

- **假设** `args = { input: "", hasSelection: true }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:polish"`

#### Scenario: S7 有选中文本且短改写指令路由到 rewrite

- **假设** `args = { input: "改写", hasSelection: true }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:rewrite"`

#### Scenario: S8 否定语境阻止关键词路由

- **假设** `args = { input: "不要续写，我想自己写", hasSelection: false }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:chat"`
- **并且** `builtin:continue` 不会因否定语境中的关键词被触发

#### Scenario: S9 双重否定恢复为正向意图

- **假设** `args = { input: "不是不想续写，请帮我续写后面的内容", hasSelection: false }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:continue"`

#### Scenario: S10 显式技能覆盖不受否定守卫影响

- **假设** `args = { input: "不要续写", hasSelection: false, explicitSkillId: "builtin:continue" }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:continue"`

---

## P2: Agentic Loop（Tool-Use 循环）

> **阶段**: P2（端到端闭环）
> **依赖**: P1 — WritingOrchestrator 编排层、P1 — Tool 注册表、P1 — Streaming 主链路（ai-service/spec.md）
> **CC 参考**: `query.ts`（tool-use 主循环）+ `services/tools/toolOrchestration.ts`（并发分区 + tool call 解析）

### P2 变更摘要

| 变更 | 描述 |
|------|------|
| P2 — ToolUseHandler | 解析 AI 返回的 tool_use finish reason，执行 tool 调用，将结果注入消息流 |
| P2 — 并发分区执行 | `isConcurrencySafe` 工具并行执行，不安全工具串行执行 |
| P2 — Max Rounds 限制 | 单次请求最多 5 轮 tool-use 循环 |
| P2 — 管线扩展 | 在 `ai-chunk*` 和 `ai-done` 之间插入 tool-use 阶段 |
| P2 — 新增 WritingEvent | `tool-use-started` / `tool-use-completed` / `tool-use-failed` |

### P1 → P2 演进说明

P1 阶段 WritingOrchestrator 执行**单次 LLM 调用**（不含 tool-use 循环），管线步骤中 `agenticLoop: false`。P1 的 `StreamChunk.finishReason` 预留了 `'tool_use'` 枚举值但不处理。

P2 激活 Agentic Loop：当 AI 返回 `finishReason === 'tool_use'` 时，系统解析 tool calls → 执行 tools → 将结果注入消息流 → 继续 AI 生成。此循环最多重复 `maxToolRounds` 次。

**影响范围**:
- `SkillDefinition.pipeline.agenticLoop` 从 `false` 变为 `boolean`（P2 Skill 可选择启用）
- `WritingOrchestrator` 管线在 `call-ai` → `stream-response` 之后新增 `tool-use` 阶段
- P2 新增的 `kgTool`、`memTool`、`docTool` 可在 Agentic Loop 中被 AI 自主调用。P1 的 `documentRead` 同样以只读方式可用；`documentWrite` 和 `versionSnapshot` 不暴露给 AI 自主调用

---

### Requirement: P2 — ToolUseHandler 接口

The system SHALL provide a `ToolUseHandler` that parses AI tool calls, executes tools via `ToolRegistry`, and injects results back into the conversation for continued AI generation.

**核心数据类型**:

```typescript
/** AI 返回的 tool call 信息（从 StreamResult.toolCalls 解析） */
interface ParsedToolCall {
  /** tool call 唯一 ID（由模型生成） */
  callId: string;
  /** tool 名称（对应 ToolRegistry 中的 name） */
  toolName: string;
  /** tool 参数 */
  arguments: Record<string, unknown>;
}

/** 单个 tool call 的执行结果 */
interface ToolCallResult {
  callId: string;
  toolName: string;
  /** 执行是否成功 */
  success: boolean;
  /** 返回数据（注入到消息流中） */
  data?: unknown;
  /** 错误信息 */
  error?: { code: string; message: string };
  /** 执行耗时（毫秒） */
  durationMs: number;
}

/** Tool-use 循环配置 */
interface ToolUseConfig {
  /** 单次请求最大 tool-use 轮数，默认 5 */
  maxToolRounds: number;
  /** 单个 tool 执行超时（毫秒），默认 10_000 */
  toolTimeoutMs: number;
  /** 并行 batch 内最大并发数，默认 4 */
  maxConcurrentTools: number;
}

/** Tool-use 循环状态 */
interface ToolUseRoundState {
  /** 当前轮次（从 1 开始） */
  round: number;
  /** 本轮解析出的 tool calls */
  toolCalls: ParsedToolCall[];
  /** 本轮执行结果 */
  results: ToolCallResult[];
  /** 累计消耗的 tool-use 轮次 */
  totalRounds: number;
}
```

**ToolUseHandler 接口**:

```typescript
/** Agentic Loop 错误码 */
type ToolUseErrorCode =
  | 'TOOL_USE_MAX_ROUNDS_EXCEEDED'   // 超过最大轮次限制
  | 'TOOL_USE_PARSE_FAILED'          // tool call 解析失败
  | 'TOOL_USE_EXECUTION_FAILED'      // tool 执行失败（单个）
  | 'TOOL_USE_BATCH_FAILED'          // 整个 batch 执行失败
  | 'TOOL_USE_TIMEOUT'               // tool 执行超时
  | 'TOOL_USE_TOOL_NOT_FOUND'        // AI 请求的 tool 不在注册表中
  | 'TOOL_USE_ALL_FAILED';           // 单轮中所有 tool call 均失败

/** Tool-Use 处理器 */
interface ToolUseHandler {
  /**
   * 从 StreamResult 中解析 tool calls。
   * 当 finishReason === 'tool_use' 且 toolCalls 非空时调用。
   *
   * @param toolCalls 原始 ToolCallInfo 数组（来自 StreamResult）
   * @returns 解析后的 ParsedToolCall 数组
   * @throws ToolUseError(TOOL_USE_PARSE_FAILED) 参数格式非法时
   */
  parseToolCalls(toolCalls: ToolCallInfo[]): ParsedToolCall[];

  /**
   * 按并发分区策略批量执行 tools。
   * isConcurrencySafe === true 的 tools 并行执行，false 的串行执行。
   *
   * @param parsedCalls 解析后的 tool call 列表
   * @param context 当前执行上下文
   * @returns 执行结果数组（顺序与 parsedCalls 对应）
   */
  executeToolBatch(
    parsedCalls: ParsedToolCall[],
    context: ToolContext,
  ): Promise<ToolCallResult[]>;

  /**
   * 将 tool 执行结果注入消息流，构造下一轮 AI 调用的 messages。
   * 格式：每个 tool call 结果作为一条 role=tool 的消息。
   *
   * @param currentMessages 当前消息数组
   * @param results tool 执行结果
   * @returns 注入结果后的新消息数组
   */
  injectResults(
    currentMessages: LLMMessage[],
    results: ToolCallResult[],
  ): LLMMessage[];
}
```

#### Scenario: AI 返回 tool_use 后解析 tool calls

- **假设** 用户触发 `continue`（续写）技能，AI 在续写过程中决定查询角色设定
- **当** AI 返回 `finishReason === 'tool_use'`，`toolCalls` 包含 `{ name: 'kgTool', arguments: { query: '林远的性格特点' } }`
- **则** `toolUseHandler.parseToolCalls(toolCalls)` 返回 `ParsedToolCall` 数组
- **并且** `parsedCalls[0].toolName === 'kgTool'`
- **并且** `parsedCalls[0].arguments.query === '林远的性格特点'`

#### Scenario: 并发分区——安全 tool 并行，不安全 tool 串行

- **假设** AI 同时请求调用 `kgTool`（isConcurrencySafe: true）和 `memTool`（isConcurrencySafe: true）和 `docTool`（isConcurrencySafe: true）
- **当** `executeToolBatch()` 执行
- **则** `kgTool`、`memTool` 和 `docTool` 作为并行 batch 同时执行
- **并且** 所有结果按原始顺序返回

> **注意**：P2 Agentic Loop 中 AI 可调用的工具**仅限只读工具**（kgTool、memTool、docTool）。`documentWrite` 不暴露给 AI 自主调用——文档写入必须走建议 → 用户确认流程。如 AI 请求调用 `documentWrite`，系统应返回 `{ success: false, error: { code: 'TOOL_USE_TOOL_NOT_FOUND' } }`。

#### Scenario: Tool 执行结果注入消息流

- **假设** `kgTool` 返回 `{ success: true, data: { traits: ['冷静', '理性'] } }`
- **当** 调用 `injectResults(currentMessages, results)`
- **则** 返回的消息数组新增一条 `{ role: 'tool', content: '{"traits":["冷静","理性"]}' }`
- **并且** 新消息的位置在 assistant 消息之后、下一轮 user 消息之前

---

### Requirement: P2 — Agentic Loop 管线集成

The system SHALL extend `WritingOrchestrator` 的管线，在 `stream-response` 和 `ai-done` 之间插入 tool-use 循环阶段。

**更新后的管线步骤**:

```
validate-input → assemble-context → select-model
  → call-ai → stream-response
  → [🆕 tool-use-loop]            ← P2 新增
    → 检测 finishReason
    → if 'tool_use' && round < maxToolRounds:
        → parseToolCalls → executeToolBatch → injectResults
        → 🆕 如果本轮所有 tool call 均 success === false，立即退出循环
          → yield error(TOOL_USE_ALL_FAILED)
          → 使用当前 partial content 继续到 ai-done
        → 🆕 检查消息数组总 token 是否超出上下文窗口预算
          → 若超出，触发 CompressionEngine 或退出循环并使用 partial content
        → 重新 call-ai → stream-response → recordUsage(本轮 usage) → checkBudget()
        → 再次检测 finishReason
        → 循环直到 finishReason === 'stop' 或达到 maxToolRounds
    → if 'stop':
        → 继续到 ai-done
    → if round >= maxToolRounds:
        → yield error(TOOL_USE_MAX_ROUNDS_EXCEEDED)
        → 使用最后一轮的 partial content 作为结果继续到 ai-done
  → ai-done
  → diff-preview（P2 editor 新增）
  → permission-gate → write-back → version-snapshot → post-hooks
```

**P2 PipelineConfig 更新（替换 P1 定义）**:

```typescript
/** P2 更新：管线配置支持 agenticLoop（替换 P1 PipelineConfig 定义） */
interface PipelineConfig {
  steps: PipelineStep[];
  /** P2 更新：是否启用 Agentic Loop */
  agenticLoop: boolean;
  /** Agentic Loop 配置（仅当 agenticLoop === true 时生效） */
  toolUseConfig?: ToolUseConfig;
}

/** P2 管线步骤（替换 P1 PipelineStep 定义） */
type PipelineStep =
  | 'validate-input'
  | 'assemble-context'
  | 'select-model'
  | 'call-ai'
  | 'stream-response'
  | 'tool-use-loop'       // 🆕 P2
  | 'diff-preview'        // 🆕 P2（来自 editor/spec.md）
  | 'permission-gate'
  | 'write-back'
  | 'version-snapshot'
  | 'post-hooks';
```

**P2 新增 WritingEvent 类型**:

```typescript
/** tool-use 循环开始 */
type ToolUseStartedEvent = {
  type: 'tool-use-started';
  timestamp: number;
  requestId: string;
  /** 当前轮次 */
  round: number;
  /** 本轮要执行的 tool 名称列表 */
  toolNames: string[];
};

/** tool-use 循环完成（单轮） */
type ToolUseCompletedEvent = {
  type: 'tool-use-completed';
  timestamp: number;
  requestId: string;
  round: number;
  /** 本轮执行结果摘要 */
  results: Array<{ toolName: string; success: boolean; durationMs: number }>;
  /** 是否还有下一轮 */
  hasNextRound: boolean;
};

/** tool-use 执行失败 */
type ToolUseFailedEvent = {
  type: 'tool-use-failed';
  timestamp: number;
  requestId: string;
  round: number;
  error: WritingError;
};
```

**P2 WritingEvent union 更新**:

P2 阶段 `WritingEvent` 类型扩展如下（在 P1 的 12 个变体基础上新增 P2 变体）：

```typescript
/** P2 完整 WritingEvent 联合类型（替换 P1 定义） */
type WritingEvent =
  // --- P1 原有事件 ---
  | { type: 'intent-resolved'; timestamp: number; skillId: string }
  | { type: 'context-assembled'; timestamp: number; tokenCount: number }
  | { type: 'model-selected'; timestamp: number; modelId: string }
  | { type: 'ai-chunk'; timestamp: number; delta: string }
  | { type: 'ai-done'; timestamp: number; fullText: string; usage: TokenUsage }
  | { type: 'permission-requested'; timestamp: number; level: PermissionLevel; description: string }
  | { type: 'permission-granted'; timestamp: number }
  | { type: 'permission-denied'; timestamp: number }
  | { type: 'write-back-done'; timestamp: number; versionId: string }
  | { type: 'hooks-done'; timestamp: number; executed: string[] }
  | { type: 'error'; timestamp: number; error: WritingError }
  | { type: 'aborted'; timestamp: number; reason: string }
  // --- P2 Agentic Loop 事件 ---
  | ToolUseStartedEvent
  | ToolUseCompletedEvent
  | ToolUseFailedEvent
  // --- P2 Diff Preview 事件（来自 editor/spec.md） ---
  | DiffReadyEvent
  | ChangeAcceptedEvent
  | ChangeRejectedEvent
  | NoChangesEvent
  // --- P2 Cost Tracker 事件（来自 ai-service/spec.md） ---
  | CostRecordedEvent
  | BudgetExceededEvent;
```

**P2 Skill 定义更新**:

| Skill | agenticLoop | toolUseConfig |
|-------|-------------|---------------|
| `polish` | false | — |
| `rewrite` | false | — |
| `continue` | **true** | `{ maxToolRounds: 5, toolTimeoutMs: 10_000, maxConcurrentTools: 4 }` |

> P2 阶段仅 `continue`（续写）启用 Agentic Loop，因为续写最需要自动查询角色设定和前文记忆。`polish` 和 `rewrite` 保持单次 LLM 调用。

#### Scenario: 续写技能触发 Agentic Loop

- **假设** 用户触发 `continue` 技能（agenticLoop: true），光标在第十章末尾
- **当** AI 在生成续写内容时决定查询知识图谱
- **则** AI 返回 `finishReason: 'tool_use'`，toolCalls 包含 `kgTool` 查询
- **并且** WritingOrchestrator yield `tool-use-started` 事件（round: 1）
- **并且** ToolUseHandler 执行 `kgTool`，获取角色设定
- **并且** yield `tool-use-completed` 事件，results 包含 kgTool 成功
- **并且** 将结果注入消息流，重新调用 AI
- **并且** AI 基于角色设定继续生成续写内容
- **并且** 第二轮 AI 返回 `finishReason: 'stop'`，进入 `ai-done`

#### Scenario: 达到最大轮次限制

- **假设** `continue` 技能执行中，AI 持续请求 tool calls
- **当** tool-use 循环达到第 5 轮（maxToolRounds = 5），AI 仍返回 `tool_use`
- **则** WritingOrchestrator yield `tool-use-failed` 事件，code 为 `TOOL_USE_MAX_ROUNDS_EXCEEDED`
- **并且** 使用第 5 轮 AI 已生成的 partial content 作为最终结果
- **并且** 继续进入 `ai-done` → `diff-preview` → `permission-gate` 流程
- **并且** 前端提示 "AI 工具调用已达上限，使用部分结果"

#### Scenario: AI 请求不存在的 tool

- **假设** AI 返回 `toolCalls` 中包含 `{ name: 'unknownTool', arguments: {} }`
- **当** `executeToolBatch()` 查找 ToolRegistry
- **则** 该 tool call 返回 `{ success: false, error: { code: 'TOOL_USE_TOOL_NOT_FOUND', message: 'unknownTool 未注册' } }`
- **并且** 错误结果仍然注入消息流（告知 AI 该 tool 不可用）
- **并且** AI 可根据错误信息调整策略（如跳过或使用替代 tool）

#### Scenario: 润色技能不触发 Agentic Loop

- **假设** 用户触发 `polish` 技能（agenticLoop: false）
- **当** AI 意外返回 `finishReason: 'tool_use'`
- **则** WritingOrchestrator 忽略 toolCalls（不执行 tool-use 循环）
- **并且** 使用 AI 已生成的文本作为最终结果
- **并且** yield warning 事件 "AI 返回 tool_use 但当前 Skill 未启用 Agentic Loop"

---

### Requirement: P2 — V2 内置 Tool（KG / Memory / Doc）

P2 阶段在 ToolRegistry 中新增 3 个 Tool，供 Agentic Loop 中 AI 自主调用：

| Tool 名称 | 描述 | isConcurrencySafe | 用途 |
|-----------|------|-------------------|------|
| `kgTool` | 查询知识图谱中的角色/地点/设定 | true | AI 续写时自动查询角色性格、关系等 |
| `memTool` | 查询用户写作偏好和语义记忆 | true | AI 生成时参考用户的风格偏好 |
| `docTool` | 读取指定文档/章节的内容片段 | true | AI 需要参考其他章节的情节时 |

```typescript
/** kgTool 参数 */
interface KgToolArgs {
  /** 查询文本（如"林远的性格"） */
  query: string;
  /** 实体类型过滤（可选） */
  entityType?: 'character' | 'location' | 'worldSetting';
}

/** memTool 参数 */
interface MemToolArgs {
  /** 查询文本（如"用户喜欢什么样的动作描写"） */
  query: string;
  /** 记忆类型过滤（可选） */
  memoryType?: 'preference' | 'style' | 'rule';
}

/** docTool 参数 */
interface DocToolArgs {
  /** 目标文档 ID（可选，默认当前文档） */
  documentId?: string;
  /** 查询关键词 */
  query: string;
  /** 返回的最大 token 数 */
  maxTokens?: number;
}
```

> 注意：P2 阶段 KG 和 Memory 模块的完整实现在 Phase 3。P2 的 `kgTool` 和 `memTool` 使用简化版本——如果底层数据不可用，返回空结果（不阻塞 AI 生成）。

#### Scenario: AI 通过 kgTool 查询角色设定

- **假设** `continue` 技能执行中，AI 决定查询角色
- **当** AI 调用 `kgTool({ query: '林远的性格特点', entityType: 'character' })`
- **则** kgTool 查询知识图谱，返回 `{ success: true, data: { name: '林远', traits: ['冷静', '理性', '偶尔冷幽默'] } }`
- **并且** 结果注入消息流后，AI 的后续生成会体现角色性格

#### Scenario: memTool 底层数据不可用时的降级

- **假设** Memory 模块在 P2 阶段尚未完整实现
- **当** AI 调用 `memTool({ query: '用户写作风格偏好' })`
- **则** memTool 返回 `{ success: true, data: { memories: [] } }`（空结果，非错误）
- **并且** AI 继续生成，不因数据缺失而中断

---

### P2 Agentic Loop 不做清单

- ❌ 不做 AI 自主写入文档的 tool（AI 只能通过建议 → 用户确认流程写入）
- ❌ 不做跨文档批量 tool 调用
- ❌ 不做 Coordinator/蜂群模式（多 AI 实例并行）
- ❌ 不做自定义 tool 开发接口（P2 仅内置 tool）
- ❌ 不做 tool call 的用户级权限确认（P2 所有 tool 为 auto-allow 级别）
