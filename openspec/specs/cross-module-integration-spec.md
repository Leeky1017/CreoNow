# Cross Module Integration Specification

## Purpose

定义 CreoNow 核心模块之间的跨边界数据流契约，确保 Editor、Memory、Knowledge Graph、Context Engine、AI Service、Skill System 与 IPC 在接口、错误码、降级行为上可执行、可测试、可验收。

### Scope

| 发送方模块      | 接收方模块     | 关键路径                               |
| --------------- | -------------- | -------------------------------------- |
| Editor          | Memory System  | 选区引用、AI 应用反馈、撤销行为学习    |
| Knowledge Graph | Context Engine | 实体检索、约束注入、相关子图摘要       |
| AI Service      | Skill System   | 技能发现、调度、流式结果汇聚           |
| IPC             | 其他 10+ 模块  | 通道命名、消息类型、通信模式、错误字典 |

## Requirements

### Requirement: Editor ↔ Memory System 数据流

触发链路：

- **触发方**：Editor
- **接收方**：Memory System
- **触发时机**：
  - 用户应用 AI 建议（接受全部/部分）
  - 用户撤销 AI 应用（Undo）
  - 用户手动关闭引用卡片并提交新 prompt

IPC 通道：

| 通道名                  | 模式             | 方向            | 说明                     |
| ----------------------- | ---------------- | --------------- | ------------------------ |
| `memory:episode:record` | Fire-and-Forget  | Renderer → Main | 记录一次 AI 交互 Episode |
| `memory:trace:get`      | Request-Response | Renderer → Main | 获取溯源链路             |
| `memory:trace:feedback` | Fire-and-Forget  | Renderer → Main | 用户对溯源反馈           |

数据格式：

```typescript
interface EditorMemoryEpisodeEvent {
  projectId: string;
  documentId: string;
  skillId: string;
  selectionRef?: {
    from: number;
    to: number;
    selectionTextHash: string;
  };
  action: "apply-all" | "apply-partial" | "reject" | "undo-after-apply";
  editDistance: number; // 0 ~ 1
  latencyMs: number;
  createdAt: string; // ISO8601
}
```

#### Scenario: 选区改写被接受后写入情景记忆

- **假设** 用户在 Editor 中应用了 AI 改写结果
- **当** Inline Diff 点击「Accept All」
- **则** Editor 发送 `EditorMemoryEpisodeEvent(action=apply-all)` 到 `memory:episode:record`
- **并且** Memory System 在 150ms p95 内落盘

#### Scenario: 应用后撤销触发延迟负反馈

- **假设** 用户应用 AI 内容后 30 秒内执行 Undo
- **当** Editor 上报 `action=undo-after-apply`
- **则** Memory System 将该 episode 标记为延迟负反馈
- **并且** 后续蒸馏降低同策略推荐权重

---

### Requirement: Knowledge Graph ↔ Context Engine 数据流

触发链路：

- **触发方**：Context Engine
- **接收方**：Knowledge Graph
- **触发时机**：上下文组装（`context:assemble`）阶段

IPC 通道：

| 通道名                     | 模式             | 方向            | 说明                   |
| -------------------------- | ---------------- | --------------- | ---------------------- |
| `knowledge:query:relevant` | Request-Response | Main → Main IPC | 按当前文本查询相关实体 |
| `knowledge:query:byIds`    | Request-Response | Main → Main IPC | 批量拉取实体详情       |
| `knowledge:query:subgraph` | Request-Response | Main → Main IPC | 查询 k-hop 子图摘要    |

数据格式：

```typescript
interface KgContextPayload {
  projectId: string;
  queryText: string;
  topK: number;
  entities: Array<{
    entityId: string;
    name: string;
    type: "character" | "location" | "event" | "item" | "faction";
    attributes: Record<string, string>;
    relevanceScore: number;
  }>;
  constraints: string[];
}
```

#### Scenario: Context Engine 注入相关实体到 Rules 层

- **假设** 用户正在续写涉及角色「林远」的段落
- **当** Context Engine 调用 `knowledge:query:relevant`
- **则** KG 返回 TopK 相关实体与关系摘要
- **并且** Context Engine 将结果写入 Rules 层

#### Scenario: KG 不可用时 Context Engine 降级

- **假设** KG 服务超时
- **当** `knowledge:query:relevant` 超过 2s
- **则** Context Engine 跳过 KG 注入并在 `warnings` 追加 `KG_UNAVAILABLE`
- **并且** 上下文组装继续执行

---

### Requirement: AI Service ↔ Skill System 数据流

触发链路：

- **触发方**：AI Service
- **接收方**：Skill System
- **触发时机**：
  - 用户在 AI 面板点击技能
  - 用户自由输入后系统选择技能

IPC 通道：

| 通道名               | 模式              | 方向            | 说明                           |
| -------------------- | ----------------- | --------------- | ------------------------------ |
| `skill:execute`      | Request-Response  | Renderer → Main | 触发技能执行并返回 executionId |
| `skill:stream:chunk` | Push Notification | Main → Renderer | 流式返回内容片段               |
| `skill:stream:done`  | Push Notification | Main → Renderer | 执行完成（成功/失败）          |
| `skill:cancel`       | Fire-and-Forget   | Renderer → Main | 取消执行                       |
| `ai:chat:send`       | Request-Response  | Renderer → Main | 自由输入消息                   |

数据格式：

```typescript
interface SkillExecutionEnvelope {
  executionId: string;
  projectId: string;
  documentId: string;
  skillId: string;
  provider: "openai" | "anthropic" | "fallback";
  timeoutMs: number;
  context: {
    prompt: string;
    stablePrefixHash: string;
  };
}
```

#### Scenario: AI Service 选择技能并流式返回

- **假设** 用户点击「续写」技能
- **当** AI Service 发起 `skill:execute`
- **则** Skill System 返回 `executionId`
- **并且** 通过 `skill:stream:chunk` 连续推送输出
- **并且** 最终通过 `skill:stream:done` 给出完整结果

#### Scenario: 技能超时触发统一错误

- **假设** 技能执行超过 `timeoutMs`
- **当** 调度器触发超时
- **则** `skill:stream:done` 返回 `{ success: false, error: { code: "SKILL_TIMEOUT" } }`
- **并且** AI Service 在面板展示重试入口

---

### Requirement: IPC 通道契约总表（跨模块）

以下为 IPC 与核心模块之间的关键通道总表（节选，作为跨模块契约基线）：

| 模块               | 通道前缀                    | 主要模式                           | 必须错误码示例                   |
| ------------------ | --------------------------- | ---------------------------------- | -------------------------------- |
| Project Management | `project:*`                 | Request-Response                   | `PROJECT_SWITCH_TIMEOUT`         |
| Document Mgmt      | `file:*`, `export:*`        | Request-Response                   | `DOCUMENT_SAVE_CONFLICT`         |
| Editor             | `file:*`, `version:*`       | Request-Response                   | `CONFLICT`                       |
| Version Control    | `version:*`                 | Request-Response                   | `VERSION_MERGE_TIMEOUT`          |
| Search/Retrieval   | `search:*`,`rag:*`          | Request-Response                   | `SEARCH_TIMEOUT`                 |
| Knowledge Graph    | `knowledge:*`               | Request-Response + Push            | `KG_QUERY_TIMEOUT`               |
| Memory System      | `memory:*`                  | Request-Response + Fire-and-Forget | `MEMORY_BACKPRESSURE`            |
| Skill System       | `skill:*`                   | RR + Push + Fire-and-Forget        | `SKILL_TIMEOUT`                  |
| AI Service         | `ai:*`, `judge:*`           | RR + Push                          | `AI_PROVIDER_UNAVAILABLE`        |
| Context Engine     | `context:*`,`constraints:*` | Request-Response                   | `CONTEXT_SCOPE_VIOLATION`        |
| IPC Infra          | 全前缀                      | 三模式统一                         | `VALIDATION_ERROR`,`IPC_TIMEOUT` |

通道命名与消息约束：

- 命名必须 `domain:resource:action`
- 所有 request/response 必须由 zod 校验
- 统一响应结构：`{ success: true, data } | { success: false, error }`

#### Scenario: 契约校验通过并生成代码

- **假设** 全部通道定义遵循 schema-first
- **当** 执行 `contract:generate` 与 `contract:check`
- **则** 自动生成 preload/main/shared 代码
- **并且** 无重复通道、无缺失 schema

#### Scenario: 契约冲突触发阻断

- **假设** 两个模块声明同名通道且 request schema 不一致
- **当** 执行契约校验
- **则** 返回 `IPC_CONTRACT_DUPLICATED_CHANNEL`
- **并且** CI 失败，阻止合并

---

### Non-Functional Requirements

**Performance**

- 跨模块关键链路（Editor -> Skill -> AI -> Editor）端到端 p95 < 4s（非长文本）
- KG/Memory 注入到 Context 组装 p95 < 300ms
- IPC 契约校验在 CI 中应 < 60s

**Capacity**

- 跨模块 trace 链路保留至少 30 天
- 单次跨模块上下文载荷上限 64k token
- 单项目跨模块并发请求上限 128

**Security & Privacy**

- trace 日志默认脱敏，不包含 API Key/用户明文隐私
- 所有跨模块请求必须携带 `projectId` 与 `traceId`
- 跨模块访问必须进行 project scope 校验

**Concurrency**

- 关键链路采用幂等 `traceId`
- 同资源写操作串行、读操作并发
- 超限触发背压错误码并可重试

#### Scenario: 跨模块高并发仍保持链路一致

- **假设** 同一项目同时触发 100 条技能请求
- **当** 系统执行调度与 IPC 通讯
- **则** 每条请求保持唯一 `traceId`
- **并且** 不出现跨请求内容串线

#### Scenario: 跨模块越权访问被拒绝

- **假设** 请求携带的 `projectId` 与资源所属项目不一致
- **当** 任一模块执行 scope 校验
- **则** 返回 `*_SCOPE_VIOLATION`
- **并且** 该请求被全链路中止
