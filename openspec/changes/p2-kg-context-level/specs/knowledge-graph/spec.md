# Knowledge Graph Specification Delta

## Change: p2-kg-context-level

### Requirement: 实体管理 [MODIFIED]

`KnowledgeEntity` 类型新增 `aiContextLevel` 字段：

```typescript
type AiContextLevel = "always" | "when_detected" | "manual_only" | "never";
```

每个实体**必须**包含 `aiContextLevel` 字段，默认值为 `"when_detected"`。

SQLite migration：`ALTER TABLE kg_entities ADD COLUMN ai_context_level TEXT NOT NULL DEFAULT 'when_detected';`

`aiContextLevel` 各级别语义：

| 级别            | 行为                             | 适用场景                 |
| --------------- | -------------------------------- | ------------------------ |
| `always`        | 始终注入 AI 上下文               | 世界观核心规则、主角档案 |
| `when_detected` | 文本中检测到引用时自动注入       | 配角、次要地点           |
| `manual_only`   | 检测到也不自动注入（手动可拉入） | 不想让 AI 知道的伏笔     |
| `never`         | 永远不注入                       | 私密笔记、大纲草稿       |

`entityCreate` 参数新增可选字段 `aiContextLevel?: AiContextLevel`，不传时默认 `"when_detected"`。

`entityUpdate` 的 `patch` 参数新增可选字段 `aiContextLevel?: AiContextLevel`。

`entityList` 参数新增可选字段 `filter?: { aiContextLevel?: AiContextLevel }`，传入时生成 `WHERE ai_context_level = ?` SQL 条件。

所有 `aiContextLevel` 输入**必须**通过 Zod enum 校验，无效值返回 `{ ok: false, error: { code: "VALIDATION_ERROR" } }`。

`EntityRow` 类型新增 `aiContextLevel: string` 字段，`rowToEntity` 从 `row.ai_context_level` 映射到 `entity.aiContextLevel`。

#### Scenario: S1 新建实体默认 aiContextLevel 为 when_detected [ADDED]

- **假设** 调用 `entityCreate({ projectId: "p1", type: "character", name: "林默", description: "侦探" })`
- **当** 不指定 `aiContextLevel`
- **则** 返回的实体 `aiContextLevel === "when_detected"`
- **并且** 数据库中 `ai_context_level` 列值为 `"when_detected"`

#### Scenario: S2 更新实体的 aiContextLevel [ADDED]

- **假设** 实体「林默」存在，`aiContextLevel` 为 `"when_detected"`
- **当** 调用 `entityUpdate({ id: "林默的ID", expectedVersion: 1, patch: { aiContextLevel: "always" } })`
- **则** 返回的实体 `aiContextLevel === "always"`
- **并且** 数据库中 `ai_context_level` 列值为 `"always"`

#### Scenario: S3 查询 always 级别实体 [ADDED]

- **假设** 项目中有 3 个实体：A（`always`）、B（`when_detected`）、C（`never`）
- **当** 调用 `entityList({ projectId: "p1", filter: { aiContextLevel: "always" } })`
- **则** 返回 1 个实体（A）
- **并且** 不包含 B 和 C

#### Scenario: S4 无效 aiContextLevel 被拒绝 [ADDED]

- **假设** 调用 `entityCreate({ projectId: "p1", type: "character", name: "测试", aiContextLevel: "invalid_value" as any })`
- **当** Zod schema 校验执行
- **则** 返回 `{ ok: false, error: { code: "VALIDATION_ERROR" } }`
- **并且** 数据库中不创建任何记录
