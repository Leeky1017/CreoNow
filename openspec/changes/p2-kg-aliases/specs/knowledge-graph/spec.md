# Knowledge Graph Specification Delta

## Change: p2-kg-aliases

### Requirement: 实体管理 [MODIFIED]

`KnowledgeEntity` 类型新增 `aliases` 字段：

```typescript
aliases: string[];  // 别名数组，用于 AI 上下文引用检测
```

默认值为空数组 `[]`。

SQLite migration：`ALTER TABLE kg_entities ADD COLUMN aliases TEXT NOT NULL DEFAULT '[]';`

数据库中以 JSON 字符串存储，读取时 `JSON.parse`，写入时 `JSON.stringify`。`JSON.parse` 失败时回退空数组，不抛异常。

别名用途：当 `aiContextLevel` 为 `"when_detected"` 时，系统通过实体的 `name` 和 `aliases` 匹配文本中的引用。

`entityCreate` 参数新增可选字段 `aliases?: string[]`，不传时默认 `[]`。传入时：

1. 校验为 `string[]`（非数组返回 `VALIDATION_ERROR`）
2. 过滤空白字符串（`trim()` 后长度为 0 的项）
3. `JSON.stringify` 后存储

`entityUpdate` 的 `patch` 参数新增可选字段 `aliases?: string[]`，规则同上。

#### Scenario: S1 新建实体默认 aliases 为空数组 [ADDED]

- **假设** 调用 `entityCreate({ projectId: "p1", type: "character", name: "林默", description: "侦探" })`
- **当** 不指定 `aliases`
- **则** 返回的实体 `aliases` 为 `[]`
- **并且** `typeof aliases === "object" && Array.isArray(aliases) && aliases.length === 0`

#### Scenario: S2 创建实体时指定 aliases [ADDED]

- **假设** 调用 `entityCreate({ projectId: "p1", type: "character", name: "林默", aliases: ["小默", "默哥"] })`
- **当** 实体创建成功
- **则** 返回的实体 `aliases` 深等于 `["小默", "默哥"]`
- **并且** 数据库中 `aliases` 列值为 JSON 字符串 `'["小默","默哥"]'`

#### Scenario: S3 更新实体的 aliases [ADDED]

- **假设** 实体「林默」存在，`aliases` 为 `["小默"]`
- **当** 调用 `entityUpdate({ id: "林默的ID", expectedVersion: 1, patch: { aliases: ["小默", "默哥", "林侦探"] } })`
- **则** 返回的实体 `aliases` 深等于 `["小默", "默哥", "林侦探"]`

#### Scenario: S4 aliases 非数组时被拒绝 [ADDED]

- **假设** 调用 `entityCreate({ projectId: "p1", type: "character", name: "测试", aliases: "not_an_array" as any })`
- **当** Zod schema 校验执行
- **则** 返回 `{ ok: false, error: { code: "VALIDATION_ERROR" } }`
- **并且** 数据库中不创建任何记录

#### Scenario: S5 aliases 中包含空字符串时被过滤 [ADDED]

- **假设** 调用 `entityCreate({ projectId: "p1", type: "character", name: "林默", aliases: ["小默", "", "  "] })`
- **当** 实体创建成功
- **则** 返回的实体 `aliases` 深等于 `["小默"]`（空白字符串被过滤）
