# IPC Specification Delta

## Change: issue-499-fix-kg-aliases-ipc-contract

### Requirement: Schema-First 契约定义 [MODIFIED]

Knowledge Graph 实体契约在 IPC 层必须与 KG service 的实体结构一致，`KG_ENTITY_SCHEMA` 增加字段：

```typescript
aliases: string[];
```

以下通道必须同步声明 `aliases`：

- `knowledge:entity:create.request.aliases?: string[]`
- `knowledge:entity:update.request.patch.aliases?: string[]`
- `knowledge:entity:read.response` / `knowledge:entity:list.response.items[]` / `knowledge:entity:update.response`（均基于 `KG_ENTITY_SCHEMA`）

当响应包含合法 `aliases` 时，IPC 运行时校验必须通过，不得错误返回 `INTERNAL_ERROR`。

#### Scenario: S1 list 响应包含 aliases 时通过契约校验 [ADDED]

- **假设** KG 中存在实体 `{ name: "林默", aliases: ["小默", "默哥"] }`
- **当** 渲染进程调用 `knowledge:entity:list`
- **则** 返回 `{ ok: true, data: { items: [...] } }`
- **并且** `items[0].aliases` 深等于 `["小默", "默哥"]`
- **并且** 不返回 `INTERNAL_ERROR`

#### Scenario: S2 create 请求支持 aliases [ADDED]

- **假设** 渲染进程调用 `knowledge:entity:create`，请求体包含 `aliases: ["小默"]`
- **当** 请求通过 IPC runtime schema 校验
- **则** 主进程 handler 被执行并返回创建结果
- **并且** 响应中包含 `aliases`

#### Scenario: S3 update patch 请求支持 aliases [ADDED]

- **假设** 实体已存在
- **当** 渲染进程调用 `knowledge:entity:update`，`patch.aliases` 为 `["小默", "林侦探"]`
- **则** 请求通过 schema 校验并返回更新后的实体
- **并且** 返回实体包含更新后的 `aliases`

#### Scenario: S4 create 请求 aliases 非数组时校验失败 [ADDED]

- **假设** 渲染进程调用 `knowledge:entity:create`，`aliases` 为字符串
- **当** IPC runtime request 校验执行
- **则** 返回 `{ ok: false, error: { code: "VALIDATION_ERROR" } }`
- **并且** handler 业务逻辑不执行
