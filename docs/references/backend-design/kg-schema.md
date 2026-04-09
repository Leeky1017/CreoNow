> 本文件是 backend-design 的一部分，完整索引见 [docs/references/backend-design/README.md](README.md)

# 四、智能系统设计 — KG 数据层（Schema · 存储 · 提取规则）

本文件涵盖 KG 数据模型（§4.1–4.9）：核心三元组、两层 Schema、别名系统、多值属性、SQLite 表设计、写入时机与增量提取、AI 提取规则。

> **已实现位置（概览）**：KG 核心服务位于 `apps/desktop/main/src/services/kg/`，包含 `kgCoreService.ts`（CRUD + 关系类型）、`kgWriteService.ts`（写入）、`kgQueryService.ts`（查询）、`kgRecognitionRuntime.ts`（识别队列）、`entityMatcher.ts`（实体匹配）、`stateExtractor.ts`（状态提取）、`types.ts`（类型定义）。

---

## 4.1 核心数据模型

KG 的底层是三元组：实体 -> 关系 -> 实体/属性值。三元组可以表达任意维度的知识：

```
(林黛玉) --[性别]--> 女
(林黛玉) --[居住地]--> (潇湘馆)
(陈明) --[表面身份]--> 外交官
(陈明) --[真实身份]--> 国安局特工
(陈明) --[秘密身份]--> CIA 线人
```

## 4.2 两层 Schema：预设 + 用户自定义

**第一层：预设核心类型（CN 出厂自带）**

当前实现的预设实体类型（`services/kg/types.ts`）：角色(character) / 地点(location) / 事件(event) / 物品(item) / 阵营(faction)

当前实现的预设关系类型（`services/kg/kgCoreService.ts`）：盟友(ally) / 敌人(enemy) / 父母(parent) / 兄弟姐妹(sibling) / 属于(belongs_to) / 拥有(owns) / 位于(located_at) / 参与(participates_in)

目标扩展类型（计划实现）：组织(Organization) / 时间节点(TimePoint) / 章节(Chapter) / 效忠(loyal_to) / 认识(knows) / 敌对(hostile_to) / 亲属(family_of) / 喜好(likes) / 厌恶(dislikes) / 触发(triggers)

**第二层：用户自定义扩展**（部分实现：自定义关系类型已支持——`kgCoreService.ts` 接受任意非空 `relationType` 字符串并持久化到 `kg_relation_types` 表；自定义实体类型/重命名/Schema 复用为计划实现）

用户可以新增自己的关系类型（已实现，`kgCoreService.ts` 接受非内置 relationType 并写入 `kg_relation_types`）。自定义实体类型、属性类型、重命名预设类型、复用其他项目的 Schema 为目标设计，尚未实现。

## 4.3 别名系统（Alias）（部分实现）

解决"同义不同名"问题。当前实现：`kg_entities` 表已有 `aliases TEXT` 列（JSON 数组，migration `0019_kg_aliases.sql`），`kgCoreService.ts` 包含完整的别名解析（`parseAliases`）、规范化（`normalizeAliases`）、校验（`validateAndNormalizeAliases`）逻辑，用于 Codex 检测实体匹配。

> **已实现位置**：`apps/desktop/main/src/services/kg/kgCoreService.ts`（`parseAliases` / `normalizeAliases` / `validateAndNormalizeAliases`）；数据库 migration `0019_kg_aliases.sql`。测试见 `services/kg/__tests__/kgService.aliases.test.ts`。

目标设计（计划实现）：独立别名表，每个类型有一个稳定的内部 ID + 一个显示名 + 多个别名，支持多对一映射：

```ts
{
  id: "prop_identity",
  displayName: "身份",
  aliases: ["职位", "角色定位", "role", "identity", "occupation"],
  valueType: "text",
  allowMultiple: true,
  isBuiltin: true
}
```

AI 提取时：提取词 -> 别名匹配 -> 映射到内部 ID -> 写入 KG。

## 4.4 多值属性与分层身份（目标设计，尚未实现）

关系带元数据（Relation Metadata）——当前基线由 `relations` 表承载（`001_initial_schema.ts`），同时保留 legacy `kg_relations`（简化字段）用于兼容历史读写路径：

```sql
CREATE TABLE relations (
  id TEXT PRIMARY KEY,
  source_entity_id TEXT NOT NULL,
  relation_type_id TEXT NOT NULL,
  target_entity_id TEXT,
  target_value TEXT,
  layer TEXT,              -- "surface" / "real" / "secret" / 自定义
  known_by TEXT,           -- JSON: ["角色ID1", "reader"]
  valid_from TEXT,
  valid_until TEXT,
  confidence REAL DEFAULT 1.0,
  source_chapter TEXT,
  created_by TEXT,         -- "user" / "ai"
  project_id TEXT NOT NULL
);
```

谍中谍示例：

```
(陈明) --[identity, layer="surface",  known_by=["*"]]--> 外交官
(陈明) --[identity, layer="real",     known_by=["李处长"]]--> 国安局特工
(陈明) --[identity, layer="secret",   known_by=["Agent Smith"]]--> CIA 线人
(陈明) --[identity, layer="ultimate", known_by=["reader"]]--> 三面间谍
```

## 4.5 时间线与状态变迁（目标设计，当前 KG schema 不含 valid_from/valid_until 字段）

目标能力：KG 支持"某个时间点的状态"查询（计划实现）：

```
(张三) --[status, valid_from="ch1", valid_until="ch5"]--> 健康
(张三) --[status, valid_from="ch5", valid_until="ch8"]--> 重伤
(张三) --[located_at, valid_from="ch3"]--> (柏林)
// 查询：第 6 章时张三在哪，什么状态？
// 结果：柏林，重伤
```

## 4.6 伏笔与因果链（目标设计，当前 KG schema 不含 foreshadowing/planted_at/resolved_at/triggers 关系类型）

```
(伏笔_神秘信件) --[type]--> foreshadowing
(伏笔_神秘信件) --[planted_at]--> ch3
(伏笔_神秘信件) --[resolved_at]--> ch12  // NULL = 未解决

(事件_刺杀) --[triggers]--> (事件_报复)
(事件_报复) --[triggers]--> (事件_战争爆发)
```

## 4.7 SQLite 存储实现

> **当前状态（已实现）**：`apps/desktop/main/src/db/migrations/001_initial_schema.ts` 已创建 `entity_types`、`relation_types`、`property_types`、`entities`、`entity_properties`、`relations`、`entities_fts(content='entities')`，并同时保留 `kg_entities` / `kg_relation_types` / `kg_relations` 作为 legacy 兼容层。

```sql
CREATE TABLE entity_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT,              -- JSON
  is_builtin INTEGER DEFAULT 0,
  icon TEXT,
  default_properties TEXT,   -- JSON
  project_id TEXT
);

CREATE TABLE relation_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT,
  is_builtin INTEGER DEFAULT 0,
  is_directional INTEGER DEFAULT 1,
  allowed_source_types TEXT,
  allowed_target_types TEXT,
  allow_free_text_target INTEGER DEFAULT 1,
  project_id TEXT
);

CREATE TABLE property_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT,
  is_builtin INTEGER DEFAULT 0,
  value_type TEXT NOT NULL,
  options TEXT,
  allow_multiple INTEGER DEFAULT 0,
  applicable_entity_types TEXT,
  project_id TEXT
);

CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  entity_type_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  project_id TEXT NOT NULL,
  created_by TEXT DEFAULT 'user',
  created_at TEXT NOT NULL,
  FOREIGN KEY (entity_type_id) REFERENCES entity_types(id)
);

CREATE TABLE entity_properties (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  property_type_id TEXT NOT NULL,
  value TEXT,
  layer TEXT,
  known_by TEXT,
  valid_from TEXT,
  valid_until TEXT,
  confidence REAL DEFAULT 1.0,
  source_chapter TEXT,
  created_by TEXT DEFAULT 'user',
  FOREIGN KEY (entity_id) REFERENCES entities(id),
  FOREIGN KEY (property_type_id) REFERENCES property_types(id)
);

CREATE TABLE relations (
  id TEXT PRIMARY KEY,
  source_entity_id TEXT NOT NULL,
  relation_type_id TEXT NOT NULL,
  target_entity_id TEXT,
  target_value TEXT,
  layer TEXT,
  known_by TEXT,
  valid_from TEXT,
  valid_until TEXT,
  relation_detail TEXT,
  confidence REAL DEFAULT 1.0,
  source_chapter TEXT,
  created_by TEXT DEFAULT 'user',
  project_id TEXT NOT NULL,
  FOREIGN KEY (source_entity_id) REFERENCES entities(id),
  FOREIGN KEY (relation_type_id) REFERENCES relation_types(id),
  FOREIGN KEY (target_entity_id) REFERENCES entities(id)
);

CREATE VIRTUAL TABLE entities_fts USING fts5(
  name, description,
  content='entities', content_rowid='rowid'
);
```

## 4.8 KG 写入时机与增量提取

绝对禁止每次保存触发提取。

当前实现：`ipc/file.ts` 在文档状态更新时将提取任务排队，`stateExtractor.ts` 仅在 `status === "final"` 时实际执行提取。

> **已实现位置**：`apps/desktop/main/src/services/kg/stateExtractor.ts`（状态提取器，`status === "final"` 触发）；`apps/desktop/main/src/services/kg/kgRecognitionRuntime.ts`（识别队列调度）。测试见 `services/kg/__tests__/stateExtractor.test.ts` 和 `stateExtractor.integration.test.ts`。

目标触发条件（计划实现，当前仅支持 status=final 触发）：

- 自上次提取以来，增量内容 >= 3000 字（默认值，用户可配置，范围 1000-10000）
- 用户主动关闭项目/结束会话
- 用户手动触发（UI 上提供"立即同步 KG"按钮）

增量提取原则：

- 系统维护 `last_extracted_offset`（上次提取到的位置）（计划实现，当前未持久化该字段）
- 每次只对新增/修改的文本运行提取，不对全文重跑
- 提取是后台异步的，不阻塞用户写作

## 4.9 AI 提取规则（目标设计，当前 stateExtractor 仅匹配已有实体并更新 lastSeenState）

以下为目标提取规则，当前 `stateExtractor.ts` 仅接受 `stateChanges` 并匹配已有实体更新状态：

- 用户永远为准：`created_by='user'` 的记录，AI 绝对不能覆盖
- 只提取显式出现的信息：不推测、不脑补
- AI 提取的关系默认 confidence=0.8；用户手动创建的 = 1.0；低于 0.5 的不写入 KG
- 新实体自动匹配已有实体（alias 匹配 + 模糊匹配）
- 每次提取必须记录来源章节：`source_chapter` 必填

> **已实现位置**：实体匹配已实现于 `apps/desktop/main/src/services/kg/entityMatcher.ts`（含 Aho-Corasick 契约测试 `entity-matcher.aho-corasick.contract.test.ts`）。`stateExtractor.ts` 实现了基于已有实体的状态更新提取。完整的新实体自动发现 + confidence 评分为计划实现。
