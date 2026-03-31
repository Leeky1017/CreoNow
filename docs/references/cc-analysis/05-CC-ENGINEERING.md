# 05 — CC 工程实践分析

## 5.1 启动性能优化

CC 的启动优化是工程上最精致的部分之一。

### 5.1.1 并行预取模式

```typescript
// main.tsx —— 三行代码在模块加载前并行启动 I/O
profileCheckpoint('main_tsx_entry')  // 标记入口时间

startMdmRawRead()   // 并行 #1: MDM 设置 (plutil 子进程)
// 注释说明: 在其余 ~135ms 的 import 期间并行运行

startKeychainPrefetch()  // 并行 #2: Keychain (OAuth + API Key)
// 注释说明: 否则 applySafeConfigEnvironmentVariables() 
//           会通过 sync spawn 顺序读取 (~65ms on macOS)
```

### 5.1.2 启动性能追踪

```typescript
// startupProfiler.ts
profileCheckpoint('main_tsx_entry')
// ... imports ...
profileCheckpoint('imports_done')
// ... init ...
profileCheckpoint('init_complete')
// ... render ...
profileCheckpoint('first_render')

profileReport() // 输出各阶段耗时
```

### 5.1.3 懒加载策略

CC 的重量级模块采用延迟加载：

```typescript
// OpenTelemetry — 只在需要遥测时加载
// gRPC — 只在需要时加载
// 分析模块 — 只在非 headless 模式加载
// Voice — 只在 voice mode 启用时加载
// Coordinator — 只在 coordinator mode 启用时加载
```

### 5.1.4 **对 CN 的启示**

CN 作为 Electron 应用，启动性能同样关键：

- **并行 init 模式**：数据库连接、嵌入模型加载、文件系统扫描可以并行
- **启动 profiling**：CN 应有类似的 checkpoint 系统追踪主进程启动耗时
- **服务懒加载**：KG、RAG、Embedding 等重服务可以延迟到首次使用

## 5.2 权限系统

### 5.2.1 权限模式

```typescript
// 源码实际定义（types/permissions.ts:16-35）
type PermissionMode = 
  | 'default'           // 默认：每次询问
  | 'plan'              // 计划模式：只分析不执行
  | 'bypassPermissions' // 跳过权限检查（危险，仅内部使用）
  | 'acceptEdits'       // 自动接受编辑但仍提示其他操作
  | 'dontAsk'           // 不询问（批处理/CI 模式）
  // 运行时可能追加 'auto'（由 yoloClassifier 控制）
```

### 5.2.2 权限规则

```typescript
type ToolPermissionContext = {
  mode: PermissionMode
  alwaysAllowRules: ToolPermissionRulesBySource  // 白名单
  alwaysDenyRules: ToolPermissionRulesBySource   // 黑名单
  alwaysAskRules: ToolPermissionRulesBySource    // 总是询问
  additionalWorkingDirectories: Map<string, ...>
  shouldAvoidPermissionPrompts?: boolean  // 后台 agent 不弹窗
  awaitAutomatedChecksBeforeDialog?: boolean
}
```

### 5.2.3 Denial Tracking

```typescript
// denialTracking.ts
// 追踪用户拒绝了哪些操作，用于：
// 1. 避免重复询问已拒绝的操作
// 2. 为模型提供上下文（"用户之前拒绝了..."）
// 3. 分析权限模式改进
type DenialTrackingState = { ... }
```

### 5.2.4 修改前快照 — 文件保护的最后防线

```typescript
// fileHistory.ts:198 — 每次文件修改前自动快照
fileHistoryMakeSnapshot(filePath, content)
// 存储到 ~/.claude/fileHistory/
// 支持按时间回退到任意版本
```

CC 的每一个可能修改文件的工具，在执行写入前都会先调用 `fileHistoryMakeSnapshot()`。这是"原稿保护"的工程实现基础。CN 必须在 ProseMirror Transaction 级别建立等价机制。

### 5.2.5 **对 CN 的启示**

CN 的 IPC 层已有 `ipcAcl.ts`（访问控制列表）和 `projectAccessGuard.ts`。可借鉴：

- **渐进式权限**：默认保守，用户可以提升
- **拒绝追踪**：记住用户偏好，避免重复打扰
- **后台 Agent 无弹窗**：CN 的后台 Skill 执行不应弹出对话框

## 5.3 Feature Flag 系统

### 5.3.1 编译时消除

```typescript
// Bun 的 feature() 在 bundle 时求值
import { feature } from 'bun:bundle'

// 编译时为 false 的分支完全从产物中消除
const voiceModule = feature('VOICE_MODE')
  ? require('./voice/index.js')
  : null
```

CC 使用的 Feature Flags（经全量扫描确认 **85+ 个**唯一 gate，远超早期报告的 "30 个"）：

| Flag | 用途 | 状态 |
|------|------|------|
| `PROACTIVE` | 主动模式（AI 主动建议） | stub |
| `KAIROS` | 长期运行自主 Agent + Brief + Push 通知 | stub |
| `BRIDGE_MODE` | IDE 桥接 / 远程会话 | 有实现 |
| `DAEMON` | 守护进程 | stub |
| `VOICE_MODE` | 语音输入 | 有实现 |
| `AGENT_TRIGGERS` | Agent 触发器 | 部分 |
| `MONITOR_TOOL` | 监控工具 | 部分 |
| `COORDINATOR_MODE` | 协调者模式（多 Agent 编排） | 有实现，需 env 双重启用 |
| `REACTIVE_COMPACT` | 响应式压缩 | 有实现 |
| `HISTORY_SNIP` | 历史裁剪 | 有实现 |
| `TEAMMEM` | 团队记忆 | 部分 |
| `BG_SESSIONS` | 后台会话 | 部分 |
| `EXPERIMENTAL_SKILL_SEARCH` | 技能搜索 | 实验性 |
| `BREAK_CACHE_COMMAND` | Prompt cache 失效注入 | 内部 |
| `FORK_SUBAGENT` | 子代理分叉 | 有实现 |
| `SSH_REMOTE` | SSH 远程连接 | stub |
| `DIRECT_CONNECT` | cc:// URL 协议 | 部分 |
| `BUDDY` | 配对编程模式 | stub |
| ... | 其余 67+ 个分布在各工具/服务中 | 混合 |

### 5.3.2 运行时特性开关 (GrowthBook)

```typescript
// growthbook.ts
getFeatureValue_CACHED_MAY_BE_STALE('feature_name')
checkStatsigFeatureGate_CACHED_MAY_BE_STALE('gate_name')
```

### 5.3.3 **对 CN 的启示**

CN 的 `runtimeGovernance.ts` 提供运行时治理。可借鉴：

- **electron-vite 的 define**：类似 Bun 的 `feature()`，实现编译时消除
- **双层开关**：编译时（裁剪不需要的模块）+ 运行时（灰度发布）
- **安全默认值**：CC 的 `_CACHED_MAY_BE_STALE` 后缀提醒开发者这是可能过期的缓存值

## 5.4 错误处理模式

### 5.4.1 API 错误分类

```typescript
// errors.ts
categorizeRetryableAPIError(error)
  → 可重试 (rate limit, 网络抖动)
  → 不可重试 (认证失败, 请求过大)
  → prompt_too_long (需要压缩)
```

### 5.4.2 优雅降级

```typescript
// 工具执行中断时生成合成错误结果
function* yieldMissingToolResultBlocks(
  assistantMessages: AssistantMessage[],
  errorMessage: string,
) {
  // 为每个未完成的 tool_use 生成 is_error=true 的 tool_result
  // 这样 API 消息格式始终合法
}
```

### 5.4.3 AbortController 层级

```typescript
// 三级 AbortController 体系
Main AbortController          // 整个会话
  └─ Child AbortController    // 单次查询
      └─ Sibling AbortController // 工具执行
         // Bash 出错 → 取消兄弟工具
         // 但不影响整个查询（还需要返回错误）
```

### 5.4.4 **对 CN 的启示**

- **API 错误分类**：CN 的 `errorMapper.ts` 已做了类似工作，可增加自动重试逻辑
- **合成工具结果**：CN 的 Skill 执行如果中断，应该生成合成错误而非丢失上下文
- **AbortController 层级**：CN 的 AI 请求应有独立的 AbortController 层次

## 5.5 会话持久化

### 5.5.1 会话存储

```typescript
// sessionStorage.ts
recordTranscript(...)    // 记录对话
flushSessionStorage()    // 持久化到磁盘

// 支持会话恢复
// /resume 命令可以选择历史会话继续
```

### 5.5.2 文件历史快照

```typescript
// fileHistory.ts
type FileHistoryState = {
  enabled: boolean
  snapshots: Map<string, FileSnapshot>
}

fileHistoryMakeSnapshot()  // 在文件修改前拍快照
// 支持按工具调用维度的文件回滚
```

### 5.5.3 **对 CN 的启示**

CN 的版本控制系统 (`versionService`, `branchService`) 已经比 CC 更完善，但可借鉴：

- **会话恢复**：CN 可实现「继续上次对话」功能
- **按操作的文件快照**：CN 可在每次 AI 修改前自动拍摄快照

## 5.6 安全实践

### 5.6.1 安全 Task ID 生成

```typescript
const TASK_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
// 36^8 ≈ 2.8 万亿组合
// 防止暴力破解 symlink 攻击

function generateTaskId(type: TaskType): string {
  const prefix = getTaskIdPrefix(type)
  const bytes = randomBytes(8)
  // ...
}
```

### 5.6.2 Unicode 清理

```typescript
// sanitization.ts
recursivelySanitizeUnicode(input)
// 递归清理所有字符串中的不安全 Unicode 字符
// 防止 prompt injection via Unicode
```

### 5.6.3 内容大小验证

```typescript
// mcpValidation.ts
mcpContentNeedsTruncation(content)
truncateMcpContentIfNeeded(content)
// MCP 工具返回的内容做大小验证和截断
// 防止 context 爆炸
```

### 5.6.4 **对 CN 的启示**

CN 的安全实践：
- `browserWindowSecurity.ts` — 已有窗口安全设置
- `packages/shared/redaction/` — 已有脱敏处理

可借鉴 CC 的：
- **Unicode 清理**：防止 prompt injection
- **内容大小验证**：AI 生成内容的大小限制
- **安全 ID 生成**：对文件系统操作使用密码学安全 ID

## 5.7 遥测与诊断

### 5.7.1 多层诊断

```typescript
// 诊断日志（无 PII）
logForDiagnosticsNoPII('info', 'git_status_started')

// 调试日志（仅开发）
logForDebugging('message')

// 分析事件
logEvent('event_name', metadata)

// 错误报告
logError('error message')
logAntError('internal error')
```

### 5.7.2 **对 CN 的启示**

CN 的 `logging/` 和 `traceStore.ts` 提供基础能力。可借鉴：
- **PII 分离**：诊断日志和调试日志分开，前者不含敏感信息
- **性能分析事件**：CC 在关键路径上埋点追踪耗时
