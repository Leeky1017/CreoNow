# 提案：p1-aistore-messages

## 背景

当前 `aiStore.ts` 管理单次 `input` → `output` 对，没有 `messages: ChatMessage[]` 结构。每次 AI 调用完全无状态。AI 面板的 history dropdown 仅用于查看过去运行记录，不参与 prompt 组装。用户说"继续刚才的方向"，AI 没有"刚才"的上下文。

主进程已有 `chatMessageManager.ts` 提供内存中消息管理，但渲染进程的 `aiStore` 尚未对接。

审计来源：`docs/audit/02-conversation-and-context.md` §3.1

不改的风险：AI 面板无多轮对话能力，每次交互都是无状态单轮。

## 变更内容

- 在主进程 `chatMessageManager.ts` 中维护 `ChatMessage[]` 消息数组（已实现）
- `ChatMessage` 类型定义：`{ id: string; role: "user" | "assistant"; content: string; timestamp: number; skillId?: string; metadata?: { tokenCount: number; model: string } }`
- 支持操作：`add(msg)` / `clear()` / `getMessages()`
- `getMessages()` 返回防御性浅拷贝，防止外部直接修改内部状态

## 受影响模块

- ai-service delta：`openspec/changes/p1-aistore-messages/specs/ai-service-delta.md`
- 实现文件：`apps/desktop/main/src/services/ai/chatMessageManager.ts`

## 不做什么

- 不修改渲染进程 `aiStore.ts` 的状态结构（渲染进程对话 UI 属后续 Phase）
- 不实现消息持久化到 SQLite（后续 Phase 4）
- 不实现 token 预算裁剪（由 C5 负责）

## 依赖关系

- 上游依赖：`p1-assemble-prompt`（C2，同泳道前序）
- 下游依赖：`p1-multiturn-assembly`（C5，使用消息数组作为历史输入）

## Dependency Sync Check

- 核对输入：`p1-assemble-prompt` 的 `assembleSystemPrompt` 函数签名
- 核对项：
  - 数据结构：`assembleSystemPrompt` 返回 `string`，本 change 的消息管理独立于 prompt 组装 ✓
  - IPC 契约：不涉及新 IPC 通道 ✓
  - 错误码：不涉及 ✓
  - 阈值：不涉及 ✓
- 结论：`NO_DRIFT`

## Codex 实现指引

- 目标文件路径：`apps/desktop/main/src/services/ai/chatMessageManager.ts`
- 测试文件路径：`apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts`
- 验证命令：`pnpm vitest run apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts`
- Mock 要求：无外部依赖，纯内存状态测试

## 审阅状态

- Owner 审阅：`PENDING`
