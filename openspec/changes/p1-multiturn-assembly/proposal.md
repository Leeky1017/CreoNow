# 提案：p1-multiturn-assembly

## 背景

当前 LLM 调用只传单条 system + 单条 user 消息，无多轮历史。用户说"继续刚才的方向"，AI 没有"刚才"的上下文。需要实现多轮消息组装函数，将 system prompt + 历史消息 + 当前输入组装为 LLM API 的 messages 数组，并在总 token 超预算时从最早的非 system 消息开始裁剪。

审计来源：`docs/audit/02-conversation-and-context.md` §3.2

不改的风险：AI 面板每次交互都是无状态单轮，无法支持多轮对话和上下文延续。

## 变更内容

- 创建 `apps/desktop/main/src/services/ai/buildLLMMessages.ts`，导出 `buildLLMMessages()` 和 `estimateMessageTokens()` 函数
- `buildLLMMessages` 组装顺序：`[system, ...history, currentUser]`
- Token 预算裁剪策略：
  1. system 消息永远保留
  2. 当前用户消息永远保留
  3. 历史消息从旧到新裁剪，直到总 token 在预算内
- Token 估算使用 UTF-8 字节长度 / 4 的确定性近似

## 受影响模块

- ai-service delta：`openspec/changes/p1-multiturn-assembly/specs/ai-service-delta.md`
- 实现文件：`apps/desktop/main/src/services/ai/buildLLMMessages.ts`

## 不做什么

- 不修改 `aiService.ts` 的调用链路（集成由后续任务负责）
- 不实现对话摘要压缩（Phase 4）
- 不涉及前端 UI

## 依赖关系

- 上游依赖：`p1-assemble-prompt`（C2，提供 systemPrompt 输入）、`p1-aistore-messages`（C4，提供 ChatMessage 历史）
- 下游依赖：无（Phase 1 终端节点）

## Dependency Sync Check

- 核对输入：
  - `p1-assemble-prompt`：`assembleSystemPrompt` 返回 `string` → 作为 `buildLLMMessages` 的 `systemPrompt` 参数 ✓
  - `p1-aistore-messages`：`ChatMessage` 类型含 `role: "user" | "assistant"` 和 `content: string` → 映射为 `HistoryMessage` ✓
- 核对项：
  - 数据结构：`systemPrompt` 为 string，`history` 为 `{role, content}[]`，`currentUserMessage` 为 string ✓
  - IPC 契约：不涉及新 IPC ✓
  - 错误码：不涉及 ✓
  - 阈值：`maxTokenBudget` 由调用方指定，无硬编码上限 ✓
- 结论：`NO_DRIFT`

## Codex 实现指引

- 目标文件路径：`apps/desktop/main/src/services/ai/buildLLMMessages.ts`
- 测试文件路径：`apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts`
- 验证命令：`pnpm vitest run apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts`
- Mock 要求：无外部依赖；token 估算为纯函数（`Math.ceil(Buffer.byteLength(text, "utf8") / 4)`），测试需要根据此公式计算预期值

## 审阅状态

- Owner 审阅：`PENDING`
