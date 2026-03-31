# 01 — Claude Code 整体架构全景

## 1.1 项目概览

| 维度 | 数值 |
|------|------|
| 语言 | TypeScript (strict) |
| 运行时 | Bun |
| 代码规模 | ~1,900 文件，512,000+ 行 |
| UI 框架 | React + Ink（终端 UI） |
| CLI 解析 | Commander.js |
| Schema | Zod v4 |
| 协议 | MCP SDK, LSP |
| API | Anthropic SDK |
| 遥测 | OpenTelemetry + gRPC |
| 特性开关 | GrowthBook |
| 认证 | OAuth 2.0, JWT |

## 1.2 架构分层

```
┌─────────────────────────────────────────────────────────┐
│  CLI Entrypoint (main.tsx)                              │
│  Commander.js 解析 → React/Ink 渲染初始化               │
├─────────────────────────────────────────────────────────┤
│  REPL Layer (replLauncher.tsx)                          │
│  交互循环 → 用户输入处理 → 命令/查询分发                 │
├──────────────┬──────────────┬───────────────────────────┤
│  Command     │  Query       │  Bridge                   │
│  System      │  Engine      │  System                   │
│  (commands/) │  (query.ts   │  (bridge/)                │
│  ~50 命令    │   QueryEng)  │  IDE ↔ CLI 双向通信      │
├──────────────┴──────────────┴───────────────────────────┤
│  Tool Orchestration Layer                               │
│  StreamingToolExecutor → toolOrchestration → toolExec   │
│  并发/串行批次执行（isConcurrencySafe 分区）              │
├─────────────────────────────────────────────────────────┤
│  Tool Registry (tools.ts → 40+ 工具)                    │
│  BashTool | FileRead/Write/Edit | Glob/Grep |           │
│  WebFetch/Search | AgentTool | SkillTool | MCPTool |    │
│  TaskCreate/Update | TeamCreate/Delete | SendMessage    │
├─────────────────────────────────────────────────────────┤
│  Service Layer                                          │
│  API Client | MCP Client | OAuth | LSP | Analytics |    │
│  Compact | Memory Extract | Policy Limits | Plugins     │
├──────────────┬──────────────┬───────────────────────────┤
│  State       │  Hooks       │  Utils                    │
│  (AppState)  │  (147 files  │  (~300 utilities)         │
│  Zustand-like│   covering   │  git/fs/model/cost/...    │
│  store       │   UI/perm/   │                           │
│              │   notif/diff │                           │
│              │   /history)  │                           │
└──────────────┴──────────────┴───────────────────────────┘
```

## 1.3 核心模块关系图

```
main.tsx ─→ replLauncher.tsx ─→ QueryEngine.ts ─→ query.ts
                                     │
                                     ├─→ Tool.ts (类型定义)
                                     ├─→ tools.ts (注册表)
                                     ├─→ context.ts (上下文收集)
                                     ├─→ cost-tracker.ts (成本追踪)
                                     └─→ services/
                                          ├─→ api/ (Anthropic API)
                                          ├─→ compact/ (上下文压缩)
                                          ├─→ mcp/ (MCP 协议)
                                          ├─→ tools/ (工具执行)
                                          └─→ extractMemories/ (自动记忆)
```

## 1.4 设计哲学

### 1.4.1 「一切皆 Tool」

CC 的核心创新在于把 AI Agent 的所有能力都建模为 **Tool** —— 统一的输入 Schema、权限模型、执行逻辑。这不仅包括 BashTool、FileReadTool 等基础能力，还包括：

- **AgentTool** — 子 Agent 也是一个 Tool（Agent 可以 spawn Agent）
- **SkillTool** — 技能执行也是一个 Tool（可组合的工作流）
- **MCPTool** — 外部 MCP 服务也是一个 Tool（协议级扩展）
- **TaskCreateTool** — 后台任务也是一个 Tool（异步控制流）
- **TeamCreateTool** — 团队协作也是一个 Tool（多 Agent 协同）

### 1.4.2 编译时死代码消除

CC 大量使用 Bun 的 `feature()` 函数进行编译时特性开关：

```typescript
const voiceCommand = feature('VOICE_MODE')
  ? require('./commands/voice/index.js').default
  : null
```

未启用的特性在 bundle 时完全消除，实现：
- 零运行时开销
- 按编译目标裁剪能力集
- 内部/外部构建差异隔离

### 1.4.3 并行预取启动优化

```typescript
// main.tsx 最早执行的副作用 —— 并行启动
profileCheckpoint('main_tsx_entry')
startMdmRawRead()      // MDM 设置读取（plutil/reg 子进程）
startKeychainPrefetch() // macOS Keychain OAuth + API Key 双通道预取
```

在模块加载的 ~135ms 内，I/O 操作已经并行完成。

### 1.4.4 懒加载 + 循环依赖打断

```typescript
// 懒加载打破循环依赖
const getTeamCreateTool = () =>
  require('./tools/TeamCreateTool/TeamCreateTool.js').TeamCreateTool

// 重模块延迟到首次使用
const coordinatorModeModule = feature('COORDINATOR_MODE')
  ? require('./coordinator/coordinatorMode.js')
  : null
```

## 1.5 数据流全景

```
用户输入
  │
  ▼
processUserInput() ─→ 斜杠命令？─→ 执行 Command
  │                                     │
  │ 否                                  │ 有些会转 prompt
  ▼                                     ▼
QueryEngine.runQueryLoop()
  │
  ├─ 1. 收集系统上下文 (context.ts)
  │     ├─ Git 状态（并行 5 条 git 命令）
  │     ├─ CLAUDE.md + MEMORY.md (通过 getMemoryFiles 统一加载为 claudeMd)
  │     └─ 项目/全局配置
  │
  ├─ 2. 组装消息 → Anthropic API
  │     ├─ System prompt (缓存化)
  │     ├─ 历史消息 (含压缩边界)
  │     └─ 用户消息
  │
  ├─ 3. 流式响应处理
  │     ├─ StreamingToolExecutor (流式工具执行)
  │     ├─ 并发安全工具批次并行
  │     └─ 非只读工具串行
  │
  ├─ 4. Tool 结果返回 → 继续循环
  │
  └─ 5. 终止条件：无 tool_use → 执行后处理
        ├─ extractMemories (自动记忆提取)
        ├─ confidenceRating (置信度评估)
        ├─ commitAttribution (提交归因)
        └─ flushSessionStorage (会话持久化)
```

## 1.6 关键设计决策总结

| 决策 | 选择 | 理由 |
|------|------|------|
| UI 框架 | React + Ink | 终端 UI 的声明式渲染，复用 React 生态 |
| 状态管理 | 自研 Store (`createStore`) | 轻量级 Zustand 风格，`useSyncExternalStore` |
| Tool 执行 | Tool.call() → Promise<ToolResult> | 单个 Tool 返回 Promise；编排层通过 AsyncGenerator 实现流式批次执行 |
| 并发控制 | `isConcurrencySafe` 分区批次 | 连续的 `isConcurrencySafe=true` 工具合成并发批次，`false` 开新串行批次（默认 `false`，fail-closed） |
| 上下文管理 | 自动压缩 + 手动 compact | 守住 context window 上限 |
| 扩展性 | MCP + Plugin + Skill 三层 | 协议级、包级、文件级三个扩展粒度 |
| 启动速度 | 并行预取 + 懒加载 | <500ms 进入交互 |
| 编译优化 | Bun feature flag DCE | 编译时消除不需要的特性代码 |
