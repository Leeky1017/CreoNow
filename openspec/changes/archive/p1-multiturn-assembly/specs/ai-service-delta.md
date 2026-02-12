# AI Service Specification Delta

## Change: p1-multiturn-assembly

### Requirement: LLM 多轮消息组装与 Token 裁剪 [ADDED]

LLM 调用**必须**通过 `buildLLMMessages` 函数组装多轮消息数组。

组装顺序：`[system, ...history, currentUser]`

Token 预算裁剪规则：

1. system 消息**永远**保留
2. 当前用户消息**永远**保留
3. 当总 token 超过 `maxTokenBudget` 时，从最早的历史消息开始裁剪
4. system + currentUser 的 token 之和超过预算时，仍强制保留两者，历史全部裁掉

函数签名：

```typescript
type LLMMessage = { role: "system" | "user" | "assistant"; content: string };
type HistoryMessage = { role: "user" | "assistant"; content: string };

function buildLLMMessages(args: {
  systemPrompt: string;
  history: HistoryMessage[];
  currentUserMessage: string;
  maxTokenBudget: number;
}): LLMMessage[];
```

Token 估算函数：

```typescript
function estimateMessageTokens(text: string): number;
// 空字符串 → 0
// 非空 → Math.max(1, Math.ceil(Buffer.byteLength(text, "utf8") / 4))
```

REQ-ID: `REQ-AIS-MULTITURN`

#### Scenario: S1 标准多轮组装 [ADDED]

- **假设** `systemPrompt = "<identity>AI</identity>"`，`history = [{ role: "user", content: "介绍林默" }, { role: "assistant", content: "林默是28岁侦探" }]`，`currentUserMessage = "他的性格？"`，`maxTokenBudget = 10000`
- **当** 调用 `buildLLMMessages({ systemPrompt, history, currentUserMessage, maxTokenBudget })`
- **则** `result.length === 4`
- **并且** `result[0].role === "system"` 且 `result[0].content === "<identity>AI</identity>"`
- **并且** `result[1].role === "user"` 且 `result[1].content === "介绍林默"`
- **并且** `result[2].role === "assistant"` 且 `result[2].content === "林默是28岁侦探"`
- **并且** `result[3].role === "user"` 且 `result[3].content === "他的性格？"`

#### Scenario: S2 Token 超预算裁剪最早历史 [ADDED]

- **假设** `systemPrompt = "S"`（estimateMessageTokens → 1），`history = [{ role: "user", content: "AAAA" }, { role: "assistant", content: "BBBB" }, { role: "user", content: "CCCC" }, { role: "assistant", content: "DDDD" }]`（每条约 1 token），`currentUserMessage = "E"`（1 token），`maxTokenBudget = 4`
- **当** 调用 `buildLLMMessages({ systemPrompt, history, currentUserMessage, maxTokenBudget })`
- **则** result 包含 system 和 currentUser（固定 2 tokens）
- **并且** 剩余 2 token 预算分配给最近的历史消息
- **并且** result 最后一条是 `{ role: "user", content: "E" }`
- **并且** 最早的历史消息被裁掉

#### Scenario: S3 空历史 [ADDED]

- **假设** `systemPrompt = "system text"`，`history = []`，`currentUserMessage = "你好"`，`maxTokenBudget = 10000`
- **当** 调用 `buildLLMMessages({ systemPrompt, history, currentUserMessage, maxTokenBudget })`
- **则** `result.length === 2`
- **并且** `result[0].role === "system"`
- **并且** `result[1].role === "user"` 且 `result[1].content === "你好"`

#### Scenario: S4 预算不足以容纳全部历史时强制保留 system + current [ADDED]

- **假设** `systemPrompt` 占 100 tokens，`currentUserMessage` 占 50 tokens，`history` 有 10 条消息，`maxTokenBudget = 160`（仅够 system + current + 极少历史）
- **当** 调用 `buildLLMMessages({ systemPrompt, history, currentUserMessage, maxTokenBudget })`
- **则** result 包含 system + currentUser（强制保留）
- **并且** 仅保留预算范围内的最近历史消息
- **并且** `result[result.length - 1].role === "user"`（当前输入在最后）
