# 04 — CC 插件、技能与多 Agent 系统

## 4.1 三层扩展体系

CC 的扩展能力分为三个层次：

```
┌─────────────────────────────────────────┐
│  Plugin System (packages/marketplace)   │  ← 最重量级
│  提供 Skills + Hooks + MCP Servers     │
│  用户可安装/卸载/启用/禁用             │
├─────────────────────────────────────────┤
│  Skill System (文件级)                  │  ← 中量级
│  独立 prompt + 限定 tool 集            │
│  可 bundled 或用户自定义               │
├─────────────────────────────────────────┤
│  MCP Protocol (协议级)                  │  ← 最轻量级
│  标准化 Tool/Resource/Prompt 协议      │
│  SSE / Stdio / WebSocket 多种传输      │
└─────────────────────────────────────────┘
```

## 4.2 Skill 系统深度分析

### 4.2.1 Bundled Skill 定义

```typescript
// bundledSkills.ts
type BundledSkillDefinition = {
  name: string
  description: string
  aliases?: string[]
  whenToUse?: string           // AI 何时应该使用这个 skill
  argumentHint?: string
  allowedTools?: string[]      // 限定可用的 tool 集
  model?: string               // 可指定不同的模型
  disableModelInvocation?: boolean
  hooks?: HooksSettings        // 自带的 hooks
  context?: 'inline' | 'fork'  // 执行上下文模式
  agent?: string               // 代理给特定 agent
  files?: Record<string, string>  // 附随文件
  getPromptForCommand: (args: string, context: ToolUseContext) => Promise<ContentBlockParam[]>
}
```

### 4.2.2 关键设计

- **allowedTools 沙盒**：每个 Skill 只能使用指定的 Tools，实现最小权限原则
- **context 模式**：`inline` 在当前对话中执行，`fork` 创建独立上下文
- **附随文件自动释放**：`files` 字段的内容在首次调用时提取到磁盘

### 4.2.3 **对 CN 的启示**

CN 的 Skill 系统 (`skillService.ts`, `skillLoader.ts`, `skillValidator.ts` 等) 已经相当完善。可借鉴的：

- **`whenToUse` 字段**：帮助 AI 自主决定是否调用 skill，CN 可用于写作辅助场景（"当用户写到战斗场景时使用动作描写增强 skill"）
- **`context: 'fork'` 模式**：CN 的 skill 执行应支持 fork 模式，在独立上下文中运行而不污染主写作流
- **附随文件**：CC 的 skill 可以携带参考资料，CN 可用于携带写作模板、风格参考

## 4.3 Plugin 系统

### 4.3.1 架构

```typescript
// builtinPlugins.ts
type BuiltinPluginDefinition = {
  name: string
  description: string
  defaultEnabled: boolean
  isAvailable?: () => boolean  // 运行时可用性检查
  skills?: BundledSkillDefinition[]
  hooks?: HooksSettings
  mcpServers?: McpServerConfig[]
}

// 存储在用户设置中
settings.enabledPlugins['plugin-name@builtin'] = true/false
```

### 4.3.2 Plugin ↔ Skill 关系

- **Plugin** 是容器，可包含多个 Skills + Hooks + MCP Servers
- **Skill** 是单个可执行的能力单元
- Plugin 提供安装/卸载/启停管理
- Skill 提供运行时执行能力

### 4.3.3 **对 CN 的启示**

CN 的 `packages/` 目录下有 `pkg.creonow.builtin/` 技能包。可以借鉴 CC 的 Plugin 架构：

- **三合一容器**：一个 Plugin 可以同时提供 Skills + Context Hooks + 外部工具
- **运行时可用性检查**：`isAvailable()` 函数根据环境动态决定是否显示
- **默认启用/禁用**：给用户控制权的同时有合理默认值

## 4.4 MCP (Model Context Protocol) 集成

### 4.4.1 多传输协议支持

```typescript
// client.ts 中的传输层
import { StdioClientTransport } from '@mcp-sdk/client/stdio.js'
import { SSEClientTransport } from '@mcp-sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@mcp-sdk/client/streamableHttp.js'
import { WebSocketTransport } from '../../utils/mcpWebSocketTransport.js'
```

CC 支持 4 种 MCP 传输方式：
- **Stdio** — 本地子进程
- **SSE** — 服务端推送事件
- **Streamable HTTP** — HTTP 长连接
- **WebSocket** — 双向长连接

### 4.4.2 MCP Tool 集成

每个 MCP Server 的工具被包装为 `MCPTool`，与内置 Tool 统一处理：

```typescript
// MCPTool 将 MCP Call Tool 封装为标准 Tool 接口
class MCPTool implements Tool {
  // MCP server 提供的工具列表
  // 输入 schema → Zod schema 自动转换
  // 输出 → 标准化为 ContentBlockParam
}
```

### 4.4.3 **对 CN 的启示**

CN 目前不使用 MCP 协议，但应该考虑：

- **写作工具 MCP Server**：词典查询、语料检索、翻译等可以作为 MCP 工具
- **Markdown 预览 MCP**：实时渲染预览
- **发布 MCP Server**：将 CN 的 AI 写作能力暴露为 MCP 服务，供其他工具调用

## 4.5 Agent Swarm (多 Agent 协作)

### 4.5.1 核心概念

CC 支持多 Agent 并行工作：

```typescript
// AgentTool — 子 Agent 生成
// TeamCreateTool — 创建团队
// TeamDeleteTool — 删除团队
// SendMessageTool — Agent 间通信
// coordinatorMode.ts — 协调者模式
```

### 4.5.2 Coordinator Mode

```typescript
// 协调模式下的工具限制
const INTERNAL_WORKER_TOOLS = new Set([
  TEAM_CREATE_TOOL_NAME,
  TEAM_DELETE_TOOL_NAME,
  SEND_MESSAGE_TOOL_NAME,
  SYNTHETIC_OUTPUT_TOOL_NAME,
])

// 协调者可以：
// 1. 创建/删除团队成员
// 2. 向成员发送消息
// 3. 合成输出
// 不能直接执行 BashTool/FileWriteTool 等
```

### 4.5.3 **对 CN 的启示**

CN 的 AGENTS.md 已经定义了 Orchestrator-First 模式（主会话只编排、不直接写代码）。CC 的实现提供了技术参考：

- **AgentTool 模式**：CN 可实现「写作分身」— 一个 Agent 写正文，另一个同时做大纲验证
- **SendMessageTool**：Agent 间通信，适合 CN 的「作者-编辑」多角色协作
- **Coordinator Mode**：协调者只能创建团队和发消息，不能直接写文档 — 完美匹配 CN 的 P0 原则

## 4.6 Hooks 系统

### 4.6.1 Hook 类型

CC 有 **147 个** Hooks 文件（`claude-code-best/src/hooks/`），不仅是 UI hooks，还覆盖通知、历史、权限、IDE diff 等跨层行为：

**Tool Permission Hooks**：
```
toolPermission/
  ├── PermissionContext.ts     // 权限上下文
  ├── handlers/                // 各类权限处理器
  └── permissionLogging.ts     // 权限日志
```

**Post-Sampling Hooks** — 在 LLM 响应后执行：
- 记忆提取 (`extractMemories`)
- 置信度评分 (`confidenceRating`)
- 提交归因 (`commitAttribution`)

**Settings Change Hooks** — 设置变更时触发：
```typescript
useSettingsChange(onSettingsChange) // 配置文件变更检测
useSkillsChange()  // 技能文件变更检测
```

### 4.6.2 **对 CN 的启示**

- **Post-Sampling Hook 模式**：CN 在 AI 写作完成后可以挂载后处理：自动保存版本、更新角色状态、同步知识图谱
- **File Watch Hooks**：CC 的设置/技能变更检测模式可用于 CN 的项目文件监控
