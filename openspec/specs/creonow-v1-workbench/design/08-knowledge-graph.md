# 08 - Knowledge Graph（schema / CRUD / metadata limits / context integration）

> 上游 Requirement：`CNWB-REQ-090`  
> 目标：定义 CN V1 的知识图谱数据模型、IPC 语义、可视化边界与上下文注入格式。

---

## 1. 数据模型（SQLite schema 语义）

### 1.1 `kg_entities`

- `id: string`
- `project_id: string`
- `name: string`（必填）
- `entity_type: string`（可选：`person/place/item/event`，也可自由字符串，但必须约束长度）
- `description: string`（可选）
- `metadata_json: string`（JSON string）
- `created_at: number`
- `updated_at: number`

### 1.2 `kg_relations`

- `id: string`
- `project_id: string`
- `from_entity_id: string`
- `to_entity_id: string`
- `relation_type: string`（例如 `knows/located_in/causes`）
- `metadata_json: string`
- `evidence_json: string`（证据引用数组，JSON string）
- `created_at/updated_at`

### 1.3 `metadata_json` 大小限制（MUST）

- `metadata_json` MUST 限制大小（建议 <= 32KB）。
- 超限必须返回 `INVALID_ARGUMENT`，不得 silent truncate。

---

## 2. IPC 语义（V1 必须）

- `kg:graph:get({ projectId })` → `{ entities, relations }`
- `kg:entity:create/list/update/delete`
- `kg:relation:create/list/update/delete`

错误语义：

- 参数校验失败（缺字段/超长/非法类型）→ `INVALID_ARGUMENT`
- 外键不存在（from/to entity 不存在）→ `NOT_FOUND`
- DB 异常 → `DB_ERROR`

---

## 3. Context integration（必须可解释）

### 3.1 注入开关

- 由 skill 的 `context_rules.knowledge_graph` 控制（见 `design/06-skill-system.md`）。
- 用户也必须能在 UI 中临时关闭（P1 可做，但必须预留语义）。

### 3.2 注入格式（V1 建议）

KG 进入上下文时必须保持结构化且可追溯（project-relative 引用）：

```
## Knowledge Graph (project)
- Entities (top N):
  - [entity:<id>] <name> (<type>): <short description>
- Relations (top M):
  - [rel:<id>] <from> -(<type>)-> <to>
```

> N/M 可按 token budget 裁剪，且必须产出 TrimEvidence（见 `design/04-context-engineering.md`）。

---

## 4. UI 最小可用（匹配设计稿）

`19-knowledge-graph.html` 的最小落地：

- 入口：Sidebar tab（稳定选择器：`sidebar-kg`）
- 展示：
  - 实体列表（支持搜索/过滤可 P1）
  - 关系列表
  - 图形化视图可先做简化（P0 允许先列表为主）
- CRUD：
  - Create/update/delete 必须可用（P0）
  - 失败必须可诊断（toast/dialog + 错误码语义）

---

## 5. 测试要求（必须）

- Integration：实体/关系 CRUD 的 DB 行为与错误码。
- E2E（Windows）：
  - 打开 KG 面板 → 创建实体 → 列表可见 → 删除后消失
  - 启用 `knowledge_graph` 注入的 skill → context viewer 中出现 KG 内容（或至少出现引用）

---

## Reference (WriteNow)

参考路径：

- `WriteNow/src/types/ipc-generated.ts`（`kg:*` channels 形态）
- `WriteNow/electron/ipc/knowledgeGraph.cjs`（CRUD 与 graph:get 的 IPC 语义）
- `WriteNow/openspec/specs/writenow-frontend-gap-analysis/spec.md`（KG 作为差异化能力的可用性要求）

从 WN 借鉴并迁移到 CN 的关键约束（摘要）：

- KG 必须“可发现 + 可用 + 可诊断”，否则只是数据模型摆设。
- KG 注入必须结构化、可追溯，并受 token budget/裁剪证据约束。
