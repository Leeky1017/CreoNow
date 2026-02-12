# AI Service Specification Delta

## Change: p1-aistore-messages

### Requirement: 对话消息管理器 [ADDED]

AI 服务**必须**在主进程维护对话消息数组，通过 `ChatMessageManager` 管理。

类型定义：
```typescript
type ChatMessage = {
  id: string;                // 唯一标识
  role: "user" | "assistant"; // 消息角色
  content: string;           // 文本内容
  timestamp: number;         // 时间戳（Date.now()）
  skillId?: string;          // 关联技能 ID
  metadata?: {               // 可选元数据
    tokenCount: number;
    model: string;
  };
};
```

支持操作：
- `add(msg: ChatMessage)`: 追加消息（浅拷贝存入）
- `clear()`: 清空全部消息
- `getMessages()`: 返回消息数组的防御性浅拷贝

REQ-ID: `REQ-AIS-MESSAGES`

#### Scenario: S1 添加消息 [ADDED]

- **假设** 创建一个新的 `ChatMessageManager`，内部消息为空
- **当** 调用 `manager.add({ id: "m1", role: "user", content: "你好", timestamp: 1000 })`
- **则** `manager.getMessages().length === 1`
- **并且** `manager.getMessages()[0].role === "user"`
- **并且** `manager.getMessages()[0].content === "你好"`
- **并且** `manager.getMessages()[0].id === "m1"`
- **并且** `manager.getMessages()[0].timestamp === 1000`

#### Scenario: S2 连续添加保持顺序 [ADDED]

- **假设** 创建一个新的 `ChatMessageManager`，内部消息为空
- **当** 依次调用 `manager.add({ id: "m1", role: "user", content: "A", timestamp: 1000 })` 和 `manager.add({ id: "m2", role: "assistant", content: "B", timestamp: 1001 })`
- **则** `manager.getMessages().length === 2`
- **并且** `manager.getMessages()[0].content === "A"`
- **并且** `manager.getMessages()[1].content === "B"`

#### Scenario: S3 清空消息 [ADDED]

- **假设** manager 内部有 3 条消息
- **当** 调用 `manager.clear()`
- **则** `manager.getMessages().length === 0`

#### Scenario: S4 getMessages 返回防御性拷贝 [ADDED]

- **假设** manager 内部有 1 条消息 `{ id: "m1", role: "user", content: "hello", timestamp: 1000 }`
- **当** 获取 `const msgs = manager.getMessages()`，然后修改 `msgs[0].content = "mutated"`
- **则** `manager.getMessages()[0].content === "hello"`（内部状态未被外部修改）
