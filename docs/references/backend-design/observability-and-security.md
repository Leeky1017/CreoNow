> 本文件是 backend-design 的一部分，完整索引见 [docs/references/backend-design/README.md](README.md)

# 三、可观测性与安全

Agent 开发的代码必须自带可观测性。出了问题你能看到"哪里坏了"，而不是"坏了但不知道为什么"。

## 3.1 日志分层（目标设计，当前仅实现 info/error 两级）

当前实现（`logging/logger.ts`）：`LogLevel = "info" | "error"`，仅有 `Logger.info/error` 两个方法。

> **已实现位置**：`apps/desktop/main/src/logging/logger.ts`——仅含 `info` 和 `error` 两级。

目标四层日志 API（计划实现）：

| 层级 | 用途 | 含 PII | 示例 |
| --- | --- | --- | --- |
| Diagnostic | 生产诊断，可安全上报 | 禁止 | `logDiagnostic('skill_start', { skillName, sessionId })`（计划实现） |
| Debug | 开发调试，仅本地 | 允许 | `logDebug('prompt content', { messages })`（计划实现） |
| Analytics | 用户行为分析 | 匿名化 | `logEvent('skill_completed', { duration, tokenCount })`（计划实现） |
| Error | 错误报告，可触发报警 | 禁止 | `logError('compact_failed', { error, consecutiveFailures })`（计划实现） |

CC 来源：`logForDiagnosticsNoPII` / `logForDebugging` / `logEvent` / `logError` 四层分离（Report 05）。

## 3.2 启动性能 Profiling（计划实现）

```ts
// 设计目标：每个关键启动阶段打 checkpoint（伪代码，尚未实现）
profileCheckpoint('main_entry')
profileCheckpoint('db_ready')
profileCheckpoint('services_initialized')
profileCheckpoint('first_render')
profileReport() // 输出各阶段耗时
```

## 3.3 关键埋点

Agent 新增代码时必须在以下位置埋点：

- Skill 执行：开始/结束/失败（含耗时、token 数、成本）
- LLM 调用：模型、input/output tokens、cache 命中、耗时、状态码
- 压缩触发：触发原因、压缩前后 token 数、是否成功
- 降级事件：哪个模块降级、原因、持续时间
- 断路器状态变化：CLOSED -> OPEN -> HALF_OPEN -> CLOSED

> **已部分实现**：成本追踪（token 数、费用）已实现于 `apps/desktop/main/src/services/ai/costTracker.ts`；Skill 执行 trace 已实现于 `services/ai/traceStore.ts`。其余埋点为计划实现。

## 3.4 安全实践

**Unicode 清理（计划实现）**

```ts
// 设计目标：所有外部输入（用户文本、LLM 返回、MCP 工具结果）需过滤（伪代码，尚未实现）
recursivelySanitizeUnicode(input)
// 防止 prompt injection via Unicode
```

**内容大小验证**（计划实现）

- LLM 返回内容超过阈值时截断 + 完整版存入 session storage
- Skill 输入超过 Schema 定义的 maxLength 时拒绝

**安全 ID 生成**（计划实现，当前使用 `randomUUID()`）

```ts
// 目标设计（CC 来源）：
const TASK_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
// 36^8 ~= 2.8 万亿组合，防止 symlink 攻击
```

**Prompt Injection 防护**（部分实现）

- 用户输入与系统指令严格分离（不在同一个 message block）——当前已遵守
- 外部工具返回内容做大小验证 + Unicode 清理后再注入 context（计划实现，当前工具结果直接注入）

> **已实现位置**：`apps/desktop/main/src/services/ai/assembleSystemPrompt.ts`（系统指令组装，用户输入分离）；`services/ai/buildLLMMessages.ts`（消息构建）。
