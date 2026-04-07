# CN Backend Specification

本文件是 CN 后端的完整技术规范，涵盖测试策略、错误处理、可观测性、安全、以及智能系统（KG / 记忆 / AI 交互）的全部设计。后端开发时必读。

---

## 一、测试策略

Agent 写的代码必须自带测试。没有测试的 PR 物理上无法合并（L2 门禁）。

### 1.1 测试分层

| 层级 | 范围 | 工具 | 运行时机 | 覆盖率要求 |
| --- | --- | --- | --- | --- |
| 单元测试 | 单个函数/类，纯逻辑 | Vitest | L1 pre-commit(--changed)（目标行为） + L2 CI(全量) | >= 80% 行覆盖 |
| 集成测试 | 跨模块交互、IPC 契约、DB 读写 | Vitest + better-sqlite3 内存 DB | L2 CI | 关键路径 100% |
| 契约测试 | IPC 类型安全、入参/出参 Schema | contract:check 自动生成 | L2 CI | 100%（自动） |
| E2E 测试 | 关键用户流程（创建项目 -> 写作 -> 保存） | Playwright / Electron testing | L3 发布前 | Top 5 流程 |

### 1.2 测试原则

- 新功能必须带测试：PR 新增代码必须有对应测试文件（CI `spec-test-mapping gate` 检查 Spec Scenario 覆盖）
- Bug 修复必须先写回归测试：先写失败测试再修复，确保不会复发
- Mock 原则：只 Mock 外部依赖（LLM API、文件系统），禁止 Mock 内部 Service（用真实实例 + 内存 SQLite）
- 测试命名：`describe('<模块名>') > it('should <行为> when <条件>')`
- 快照测试：对 LLM prompt 模板、IPC 契约使用快照，变更时必须人工确认

### 1.3 Skill 测试模板

每个新 Skill 必须覆盖：

```
[x] 正常路径（输入合法 -> 预期输出）
[x] 权限拦截（写操作未经 Permission Gate -> 拒绝）
[x] 并发安全（concurrencySafe 标记与实际行为一致）
[x] 中断恢复（AbortController 取消 -> 生成合成错误，INV-10）
[x] 成本记录（执行后 costTracker 有记录，INV-9）
[x] Hook 触发（写操作完成后 postWritingHooks 被调用，INV-8）
```

---

## 二、错误处理模式

### 2.1 API 错误分类

| 分类 | 示例 | 处理策略 |
| --- | --- | --- |
| 可重试 | rate limit、网络抖动、5xx | 指数退避重试（max 3 次，INV-10 断路器） |
| 不可重试 | 认证失败、参数错误、4xx | 立即失败，生成合成错误结果，通知用户 |
| 需要压缩 | prompt_too_long | 触发 AutoCompact，压缩后重试（最多 1 次） |
| 用户取消 | AbortController signal | 清理进行中的步骤，生成合成错误，保留上下文 |

### 2.2 AbortController 三级层次

```
Session AbortController          // 整个会话
  +-- Request AbortController    // 单次 LLM 请求
      +-- Step AbortController   // 单个 Skill Step
         // Step 失败 -> 取消兄弟 Step
         // 但不影响 Request（还需要收集错误结果）
```

CC 来源：Main -> Child -> Sibling AbortController 三级体系（Report 05）。局部取消不爆炸全局。

### 2.3 合成错误结果（INV-10 落地）

当 Skill 执行中断时，必须为每个未完成的步骤生成：

```ts
{
  stepName: string,
  is_error: true,
  error: { code: 'ABORTED' | 'TIMEOUT' | 'API_ERROR', message: string },
  partialResult?: unknown  // 已产生的部分结果（如有）
}
```

这保证消息序列始终合法，LLM 下一轮能看到"上次失败了"而非完全不知道。

### 2.4 断路器模式

```ts
const CIRCUIT_BREAKER = {
  maxConsecutiveFailures: 3,  // CC 验证: 曾有 session 连续失败 3272 次
  cooldownMs: 30_000,         // 30 秒冷却期
  halfOpenRetries: 1,         // 半开状态试探 1 次
}
// 状态机：CLOSED -> (3次失败) -> OPEN -> (30s) -> HALF_OPEN -> (成功) -> CLOSED
```

### 2.5 反防御型编程原则

Agent 禁止写不必要的降级/安全代码。很多东西是二元的——要么能用要么不能用，没有「降级版」。

**禁止的模式：**

- 到处写 `try-catch` 然后静默返回默认值
- 对二元依赖写降级（例如「SQLite 连接失败时用内存存储」）
- 对每个参数加 `?? defaultValue` / `|| fallback`
- 对不可能的分支写 fallback（用 `throw new Error('unreachable')` 代替）
- 加无意义的 optional chaining（如果 user 必须存在，就不要用 `?`）

**允许降级的场景：**

| 场景 | 降级方式 | 原因 |
| --- | --- | --- |
| LLM API 不可用 | 友好错误 + 保留输入 + 提示重试 | 外部依赖，用户可感知延迟但不丢数据 |
| FTS5 搜索无结果 | 跳过搜索，用纯上下文回答 | FTS5 是辅助检索，不是核心记忆机制 |

**判断标准：** 如果你说不清楚"降级后用户体验具体是什么"，就不要写降级——直接失败、报错、让用户知道。

---

## 三、可观测性与安全

Agent 开发的代码必须自带可观测性。出了问题你能看到"哪里坏了"，而不是"坏了但不知道为什么"。

### 3.1 日志分层

| 层级 | 用途 | 含 PII | 示例 |
| --- | --- | --- | --- |
| Diagnostic | 生产诊断，可安全上报 | 禁止 | `logDiagnostic('skill_start', { skillName, sessionId })` |
| Debug | 开发调试，仅本地 | 允许 | `logDebug('prompt content', { messages })` |
| Analytics | 用户行为分析 | 匿名化 | `logEvent('skill_completed', { duration, tokenCount })` |
| Error | 错误报告，可触发报警 | 禁止 | `logError('compact_failed', { error, consecutiveFailures })` |

CC 来源：`logForDiagnosticsNoPII` / `logForDebugging` / `logEvent` / `logError` 四层分离（Report 05）。

### 3.2 启动性能 Profiling（计划实现）

```ts
// 设计目标：每个关键启动阶段打 checkpoint（伪代码，尚未实现）
profileCheckpoint('main_entry')
profileCheckpoint('db_ready')
profileCheckpoint('services_initialized')
profileCheckpoint('first_render')
profileReport() // 输出各阶段耗时
```

### 3.3 关键埋点

Agent 新增代码时必须在以下位置埋点：

- Skill 执行：开始/结束/失败（含耗时、token 数、成本）
- LLM 调用：模型、input/output tokens、cache 命中、耗时、状态码
- 压缩触发：触发原因、压缩前后 token 数、是否成功
- 降级事件：哪个模块降级、原因、持续时间
- 断路器状态变化：CLOSED -> OPEN -> HALF_OPEN -> CLOSED

### 3.4 安全实践

**Unicode 清理（计划实现）**

```ts
// 设计目标：所有外部输入（用户文本、LLM 返回、MCP 工具结果）需过滤（伪代码，尚未实现）
recursivelySanitizeUnicode(input)
// 防止 prompt injection via Unicode
```

**内容大小验证**

- LLM 返回内容超过阈值时截断 + 完整版存入 session storage
- Skill 输入超过 Schema 定义的 maxLength 时拒绝

**安全 ID 生成**

```ts
const TASK_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
// 36^8 ~= 2.8 万亿组合，防止 symlink 攻击
```

**Prompt Injection 防护**

- 用户输入与系统指令严格分离（不在同一个 message block）
- 外部工具返回内容做大小验证 + Unicode 清理后再注入 context

---

## 四、智能系统设计（KG -- 记忆 -- AI 交互）

本节涵盖 CN 三大智能子系统：数据层（4.1-4.9）KG Schema 与存储，交互层（4.10-4.15）记忆边界 / Dreaming / Plan Mode / 情绪学习 / 提取与多模型，基础设施（4.16-4.17）FTS5 分词与用户体验。

### 4.1 核心数据模型

KG 的底层是三元组：实体 -> 关系 -> 实体/属性值。三元组可以表达任意维度的知识：

```
(林黛玉) --[性别]--> 女
(林黛玉) --[居住地]--> (潇湘馆)
(陈明) --[表面身份]--> 外交官
(陈明) --[真实身份]--> 国安局特工
(陈明) --[秘密身份]--> CIA 线人
```

### 4.2 两层 Schema：预设 + 用户自定义

**第一层：预设核心类型（CN 出厂自带）**

预设实体类型：角色(Character) / 地点(Location) / 事件(Event) / 物品(Item) / 组织(Organization) / 时间节点(TimePoint) / 章节(Chapter)

预设关系类型：位于(located_at) / 效忠(loyal_to) / 拥有(owns) / 认识(knows) / 敌对(hostile_to) / 亲属(family_of) / 喜好(likes) / 厌恶(dislikes) / 参与(participates_in) / 属于(belongs_to) / 触发(triggers)

**第二层：用户自定义扩展**

用户可以新增自己的实体类型、关系类型、属性类型，重命名预设类型，复用其他项目的 Schema。

### 4.3 别名系统（Alias）

解决"同义不同名"问题。每个类型有一个稳定的内部 ID + 一个显示名 + 多个别名。

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

### 4.4 多值属性与分层身份

关系带元数据（Relation Metadata）：

```sql
CREATE TABLE kg_relations (
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

### 4.5 时间线与状态变迁

KG 支持"某个时间点的状态"查询：

```
(张三) --[status, valid_from="ch1", valid_until="ch5"]--> 健康
(张三) --[status, valid_from="ch5", valid_until="ch8"]--> 重伤
(张三) --[located_at, valid_from="ch3"]--> (柏林)
// 查询：第 6 章时张三在哪，什么状态？
// 结果：柏林，重伤
```

### 4.6 伏笔与因果链

```
(伏笔_神秘信件) --[type]--> foreshadowing
(伏笔_神秘信件) --[planted_at]--> ch3
(伏笔_神秘信件) --[resolved_at]--> ch12  // NULL = 未解决

(事件_刺杀) --[triggers]--> (事件_报复)
(事件_报复) --[triggers]--> (事件_战争爆发)
```

### 4.7 SQLite 存储实现

> 目标 schema，当前 P0 实现见 `0013_knowledge_graph_p0.sql`，使用 `kg_entities` / `kg_relation_types` / `kg_relations`（列结构较简化）。

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

CREATE TABLE kg_relations (
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

### 4.8 KG 写入时机与增量提取

绝对禁止每次保存触发提取。

触发条件（满足任一即触发）：

- 自上次提取以来，增量内容 >= 3000 字（默认值，用户可配置，范围 1000-10000）
- 用户主动关闭项目/结束会话
- 用户手动触发（UI 上提供"立即同步 KG"按钮）

增量提取原则：

- 系统维护 `last_extracted_offset`（上次提取到的位置）
- 每次只对新增/修改的文本运行提取，不对全文重跑
- 提取是后台异步的，不阻塞用户写作

### 4.9 AI 提取规则

- 用户永远为准：`created_by='user'` 的记录，AI 绝对不能覆盖
- 只提取显式出现的信息：不推测、不脑补
- AI 提取的关系默认 confidence=0.8；用户手动创建的 = 1.0；低于 0.5 的不写入 KG
- 新实体自动匹配已有实体（alias 匹配 + 模糊匹配）
- 每次提取必须记录来源章节：`source_chapter` 必填

### 4.10 负面反馈学习（Sentiment-Aware Learning）

- 检测用户不满：当用户表达负面情绪（"不是这样""重来""算了"等），系统记录：AI 做了什么 -> 用户为什么不满
- 写入 `MEMORY.md`（计划创建）：提取"不要再这样做"的规则
- 下次同类场景：Agent 参考这条记忆，避免重蹈覆辙

### 4.11 Plan Mode（引导式交互）

触发条件：用户指令含模糊词汇（"写好""完善""这个""搞定""改改"）且缺乏具体约束时，Agent 不直接动手，而是先澄清意图。

行为：

- Agent 分析用户指令，识别模糊点
- 主动提问 1-3 个关键问题，帮助用户明确意图
- 只有在意图足够明确后才开始执行

设计哲学：CN 的目标用户可能抱着"有 AI 就能写好东西"的心态。现实是，好作品需要清晰的创作意图，AI 只是执行者。Plan Mode 的本质是强迫创作者自己知道自己要什么。

### 4.12 KG 与记忆系统的边界

|  | 记忆系统（Memory） | 知识图谱（KG） |
| --- | --- | --- |
| 服务对象 | 用户 + 项目 | 项目内容本身 |
| 存什么 | 用户偏好、写作风格、句式习惯 | 角色、地点、事件、关系、伏笔、时间线 |
| 跨项目 | 是，用户偏好跨项目生效 | 否，每个项目独立的 KG |
| 注入方式 | Layer 0 始终注入 system prompt | 不注入 context，Agent 按需调用 KG 查询 Skill |
| 数据规模 | 小（<=200行/25KB） | 大（可能几千实体、上万关系） |

重要：KG 内容不全量注入 Layer 0。KG 是 Agent 的工具，通过 Skill 查询（契合 INV-6）。

### 4.13 Dreaming 机制（记忆整合）（计划实现）

> 注：`MEMORY.md`、每日笔记（`memory/YYYY-MM-DD.md`）均为计划创建的文件，当前尚未存在。

短期记忆（每日笔记）经过评分、筛选后，有选择地固化为长期记忆（`MEMORY.md`）。

评分维度（5 个信号，加权求和）：

| 信号 | 权重 | 含义 |
| --- | --- | --- |
| 召回频率 | 30% | 近期对话中被引用/提及过几次？高 = 重要 |
| 信息密度 | 25% | 是具体事实还是模糊笔记？具体 = 高分 |
| 用户验证 | 20% | 用户是否在 KG 面板里确认/修正/引用过？用户碰过 = 高分 |
| 新鲜度 | 15% | 最近写入的分数高，随时间指数衰减（半衰期 7 天） |
| 唯一性 | 10% | `MEMORY.md` 或 KG 中是否已有相同/相似信息？重复 = 低分 |

提升门槛：score >= 0.7 才从每日笔记提升到 `MEMORY.md`（可配置）

运行时机：

- 每次用户打开 CN 时检查：如果距上次 Dreaming > 24 小时，自动运行
- 或者当每日笔记积累 > 10 条时触发
- 后台异步，不阻塞用户

`MEMORY.md` 溢出处理：

- 接近 200 行上限时，触发"压缩 Pass"
- LLM 合并相近条目
- 过去 30 天未被访问的条目 -> 降级到 `memory/archive/YYYY-MM.md`（计划创建）
- 归档条目仍可通过 FTS5 搜索，但不再注入 Layer 0

Dreaming Pipeline：

```
每日笔记 -> 逐条评分（5 维度加权）
  -> score >= 0.7 -> 检查唯一性
    -> 唯一 -> 写入 MEMORY.md
    -> 重复 -> 合并到已有条目
  -> score < 0.7 -> 留在每日笔记，继续衰减
  -> score < 0.3 且 > 30 天 -> 归档
MEMORY.md 超限 -> 压缩 Pass -> 合并 + 归档低频条目
```

### 4.14 AI 提取 Prompt 设计

核心原则：Schema 感知 + 已有实体去重 + 结构化 JSON 输出。

Prompt 结构：

```markdown
你是 CreoNow 的知识提取引擎。

## 输入
- 增量文本（自上次提取以来的新增内容）
- 当前项目的 KG Schema（实体类型、关系类型、属性类型及别名）
- 已有实体列表（用于去重匹配）

## 任务
从增量文本中提取：
1. 新实体（角色、地点、物品、组织、事件）
2. 实体属性变化（位置变化、状态变化、新身份）
3. 新关系（认识、敌对、效忠、亲属等）

## 规则
- 只提取文本中明确出现的信息，不推测
- 不确定的信息（"可能""似乎"）设 confidence=0.3
- 优先匹配已有实体
- 使用 Schema 中的别名匹配属性和关系类型

## 输出格式（JSON）
{
  "entities": [{ "name": "...", "type": "...",
    "matchExisting": "已有实体ID或null" }],
  "properties": [{ "entityName": "...",
    "property": "...", "value": "...",
    "confidence": 0.8 }],
  "relations": [{ "source": "...", "type": "...",
    "target": "...", "layer": "...",
    "confidence": 0.8 }],
  "chapterRef": "ch5"
}
```

关键设计：

- 把 Schema（含别名）作为 prompt 一部分传给 LLM
- 把已有实体列表传进去，避免重复创建
- 用 JSON Schema 约束输出格式
- 提取用辅助模型，不用主模型，控制成本

### 4.15 多模型策略

CN 不提供模型，用户自接 API。系统提供两个模型槽位，用户自配。

| 槽位 | 用途 | 推荐等级 |
| --- | --- | --- |
| 辅助模型 | KG 提取、Dreaming 整合、记忆提取、情绪检测、Plan Mode 意图分析 | 中等 |
| 主模型 | 写作、Plan Mode 对话、内容生成 | 用户自选 |

技术实现：

- 统一的 `ModelRouter` 接口：`getModel(task: 'extract' | 'dream' | 'write' | 'plan') -> ModelConfig`
- 支持 OpenAI-compatible API 格式
- 用户在设置中配置：API Key + Endpoint + Model Name
- 如果用户只配了一个模型，所有任务都用这一个
- 不局限于任何供应商

### 4.16 FTS5 中文分词方案

**当前实现**：`services/search/ftsService.ts` 使用 FTS5 `unicode61` tokenizer + CJK 查询扩展，无需额外分词依赖。

**目标方案**（计划引入，当前未安装）：jieba 预处理 + FTS5 simple tokenizer，提升中文分词精度：

- 依赖：`nodejieba`（C++ 原生 Node.js binding）
- 写入流程：文本 -> nodejieba 分词 -> 空格分隔的词语 -> 写入 FTS5
- 查询流程：搜索词 -> nodejieba 分词 -> FTS5 MATCH 查询

```ts
import { cut } from 'nodejieba'

const text = '张三走进了柏林的安全屋'
const segmented = cut(text).join(' ')  // "张三 走进 了 柏林 的 安全屋"
```

### 4.17 用户体验原则

- KG 对用户透明：用户看到的是"角色卡片""关系网络""时间线"，不是"知识图谱"
- 自定义必须简单：加一个"修炼境界"属性应该跟在 Notion 加一列一样简单
- AI 提取不能烦人：先加，错了再改，不弹窗确认
- Schema 演进而非设计：不需要写作前设计好 Schema

---

## 五、版本控制与分支写作

Git for Stories——每次 AI 写操作 = 一个版本快照，用户可以回退。分支、fork、合并为設計目标（計劃实现）。

### 5.1 版本（Version）

- 每次 AI 写操作 = 一个 version snapshot（对应 INV-1 原稿保护）
- 用户可随时回退到任何历史版本
- 版本存储在 SQLite 的 `document_versions` 表，支持 diff 和全量快照

### 5.2 分支（Branch）

设计目标（当前分支 IPC 尚未对外暴露，`version:branch:*` handler 未注册）：

- 用户可在任意版本节点创建分支（计划实现；当前内部 `createBranch` 仅从当前 head 创建）
- 多条分支可并行存在（像 GTA5 的三个结局）
- 每条分支有自己独立的 KG（计划实现；当前 KG 表仅按 `project_id` 维度隔离，尚无 `branch_id` 关联）
- 分支可有标签（"光明结局"、"黑暗结局"、"原版"）

### 5.3 Fork（协作创作）（计划实现；当前无发布/fork/PR 协作流程）

设计目标：类似 GitHub 的开源协作模式：用户 A 发布项目 -> 用户 B fork -> 基于此写自己的故事 -> 可以提交 PR 合并回主线。

### 5.4 数据模型

> 目标 schema，当前 P0 实现见 `document_versions` / `document_branches` 表（列结构有差异）。

```sql
CREATE TABLE document_branches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_branch_id TEXT,
  fork_version_id TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE document_versions (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  parent_version_id TEXT,
  content_snapshot TEXT,
  operation TEXT,            -- "ai_write" / "user_edit" / "merge"
  created_at TEXT NOT NULL,
  FOREIGN KEY (branch_id) REFERENCES document_branches(id)
);
```

优先级：基础版本控制（快照 + 回退）是 P0（INV-1 依赖），分支写作是 P2，Fork 协作是 P3+。

---

## 六、离线模式与导出导入

CN 是本地桌面应用。断网时用户必须能继续写作，数据完全属于用户。

### 6.1 离线模式（设计目标，尚未实现专门的离线检测/恢复流程）

```
用户断网
  -> 写作正常（纯本地编辑器）
  -> KG 查询正常（SQLite 本地）
  -> FTS5 搜索正常（SQLite 本地）
  -> 版本快照正常（SQLite 本地）
  -> AI 功能不可用 -> 友好提示"当前离线，AI 功能暂停"
  -> 系统记录"待提取队列"

用户恢复网络
  -> 系统每 20 分钟检测网络状态（计划实现）
  -> 检测到联网 -> 检查 API 可用性
    -> 可用 -> 自动运行待提取队列（后台异步）
    -> 不可用 -> 提醒用户"API 余额不足"
```

核心原则：能本地正常的一定要保证正常。只有 AI 生成和 KG 提取需要网络。

### 6.2 导出

当前已实现的导出格式：Markdown / Word（docx） / PDF / TXT（由 `prosemirrorExporter.ts` 提供）。

- 计划新增：ePub 格式导出（尚未实现）
- 可选导出 KG：用户勾选"同时导出 KG 数据"时，导出 JSON 格式（计划实现）
- 分支导出：可以选择导出哪条分支（计划实现；当前导出 IPC 无分支参数）
- 数据完全属于用户，当前已支持文档内容的完整导出（Markdown/Word/PDF/TXT）；KG 和分支维度的完整导出为计划实现

### 6.3 导入（计划实现）

以下功能尚未实现，当前代码中无 import IPC handler 或 import service：

- 支持导入纯文本（Markdown / Word / TXT）-> AI 自动跑一遍 KG 提取
- 支持导入 CN 格式的 KG JSON -> 还原完整项目

---

## 七、多 Agent 协作与质量评判

### 7.1 Writer + Reviewer 双 Agent 模式（计划实现；当前 Post-Writing Hook 仅含 cost-tracking 和 auto-save-version）

设计目标：

- Writer Agent：负责写作（续写、改写、润色）
- Reviewer Agent：负责检查（是否与 KG 矛盾、是否符合角色设定、是否有逻辑漏洞）
- Writer 写完 -> Reviewer 自动检查 -> 有问题则标记（不自动修改，让用户决定）
- 本质上是 Post-Writing Hook 链的一部分（INV-8）

### 7.2 Judge（质量评判）

AI 写完后，另一个 LLM 调用给写作质量打分。评分维度：

- 是否符合已有的角色性格和行为模式
- 是否与 KG 中的已有事实矛盾
- 文风是否与用户偏好一致

优先级：P3。简单的 Reviewer 在 P2 即可落地。
