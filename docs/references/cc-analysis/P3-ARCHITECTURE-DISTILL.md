# P3 Architecture Distill — CC 到 CN 的模式映射

> **阶段**: P3（项目制长篇创作）
> **用途**: 记录 CC（Claude Code）中提取的架构模式如何映射到 CN（CreoNow）的 P3 实现。供实现 Agent 在编码前阅读，理解设计意图和取舍。

---

## 1. memdir/ Forked Agent → Simple Memory 自动注入

### CC 原始模式

**文件**: `memdir/` 目录 + `services/memory/`

CC 的 Forked Agent 记忆模式：

- **Forked Agent 架构**: 从主对话 fork 出独立 agent，共享 parent message prefix 以获得 prompt cache hit
- **precision > recall 策略**: 宁可遗漏记忆，也不注入不相关内容——因为不相关的记忆比遗漏更有害
- **key-value 存储**: `memdir/` 下以文件形式存储记忆条目，按命名空间组织
- **自动注入**: 记忆在每次对话开始时自动注入 system prompt

### CN 适配（改了什么）

| CC 特性 | CN 改造 | 原因 |
|---------|---------|------|
| 文件系统存储 | **SQLite `memory_records` 表** | 桌面应用需要结构化查询和事务支持 |
| 通用记忆 | **分类记忆**（preference / character-setting / location-setting / style-rule） | 创作场景需要区分用户偏好和角色设定 |
| 全量注入 | **相关性筛选注入** | 小说项目可能有几十个角色，不能全部注入 |
| 单一 scope | **双 scope**（global + project） | 用户在不同小说项目中有不同的风格偏好 |
| Agent fork | **Context Engine Settings 层注入** | CN 使用 WritingOrchestrator 管线，非 Agent fork |

### 关键设计决策

1. **precision > recall 是核心原则**: 直接沿用 CC 的设计哲学。在 CreoNow 中，注入一个不相关角色的设定（如在武侠场景中注入科幻角色）会严重干扰 AI 生成。
2. **用户偏好全量注入**: `category: 'preference'` 和 `category: 'style-rule'` 始终注入，因为它们是全局风格指令，不存在「不相关」的问题。
3. **角色/地点按相关性筛选**: 仅注入当前文档文本中提及的角色/地点。通过简单的关键词匹配（角色名/地点名出现在文档文本中），不使用向量相似度。
4. **Token 预算控制**: 记忆注入总 token 不超过 Context Engine Settings 层预算的 40%，剩余 60% 留给用户显式设定的创作规则。

### 实现要点

```typescript
// 注入逻辑伪代码
function buildMemoryInjection(projectId: string, documentText: string): MemoryInjection {
  // 1. 全量注入用户偏好
  const preferences = queryMemory({ projectId, category: 'preference' })
  const styleRules = queryMemory({ projectId, category: 'style-rule' })

  // 2. 按相关性筛选角色/地点
  const allCharacters = queryMemory({ projectId, category: 'character-setting' })
  const relevantCharacters = allCharacters.filter(c =>
    documentText.includes(extractNameFromValue(c.value))
  )

  const allLocations = queryMemory({ projectId, category: 'location-setting' })
  const relevantLocations = allLocations.filter(l =>
    documentText.includes(extractNameFromValue(l.value))
  )

  // 3. 序列化并检查 token 预算
  const injection = serialize([...preferences, ...styleRules, ...relevantCharacters, ...relevantLocations])
  return truncateToTokenBudget(injection, settingsLayerBudget * 0.4)
}
```

---

## 2. skills/ SKILL.md Frontmatter → Skill Definition 文件

### CC 原始模式

**文件**: `skills/` 目录 + `commands/` 目录

CC 的技能系统：

- **SKILL.md 格式**: 每个技能以 Markdown 文件定义，YAML frontmatter 声明元数据
- **Frontmatter 字段**: `name`, `description`, `category`, `inputRequired`, `outputType` 等
- **正文即 prompt**: Markdown 正文部分是 system prompt 模板，支持 `{{variable}}` 占位符
- **注册派发**: 应用启动时扫描目录，解析 frontmatter，注册到 orchestrator
- **意图路由**: 用户指令通过意图匹配路由到对应技能

### CN 适配（改了什么）

| CC 特性 | CN 改造 | 原因 |
|---------|---------|------|
| 通用技能 | **创作专用技能**（一致性检查、对白生成、大纲展开） | CN 面向创作场景，不需要代码相关技能 |
| 简单输入 | **结构化输入要求**（requiresSelection / requiresProjectContext） | 创作技能需要明确声明输入依赖 |
| 无上下文规则 | **SkillContextRules**（声明需要注入的上下文层） | 不同技能需要不同的上下文：一致性检查需要角色设定，大纲展开需要风格偏好 |
| 动态注册 | **启动时静态注册**（P3 仅内置技能） | P3 不做自定义技能系统 |

### 关键设计决策

1. **SkillContextRules 是关键创新**: CC 的技能不需要声明上下文依赖（因为上下文由 Agent 自主管理），但 CN 的技能必须显式声明——这样 Context Engine 可以精确注入所需上下文，避免 token 浪费。
2. **outputType 分化**: CC 的技能输出都是文本，但 CN 区分 `replacement`（替换选区）、`suggestion`（Diff 预览）、`annotation`（标注，不修改文档）、`new-content`（生成新内容）。
3. **P3 仅内置三个新技能**: `consistency-check`、`dialogue-gen`、`outline-expand`。加上 P1 的 `continue`、`polish`、`rewrite`，总共 6 个内置技能。

### 新技能设计原理

| 技能 | CC 对应能力 | CN 创作适配 |
|------|------------|------------|
| `consistency-check` | 无直接对应（CC 没有项目级检查） | 利用角色/地点设定检查叙事一致性 |
| `dialogue-gen` | 无直接对应（CC 是通用生成） | 根据角色性格生成符合人设的对白 |
| `outline-expand` | CC 的 `expand` 能力 | 保持项目风格设定的大纲展开 |

---

## 3. precision > recall → 记忆注入策略

### CC 原始策略

**核心原则**: 「It's better to miss a relevant memory than to inject an irrelevant one.」

CC 的实现：
- 记忆按 key 精确匹配
- 无模糊搜索，无向量召回
- 每次注入有严格的 token 上限
- 过期/低置信度记忆自动过滤

### CN 适配

| 策略 | CC 实现 | CN P3 实现 |
|------|---------|-----------|
| 匹配方式 | key 精确匹配 | **关键词匹配**（角色名/地点名出现在文档文本中） |
| 注入范围 | 全部匹配 | **分类注入**（偏好全量 + 角色/地点按相关性） |
| 预算控制 | token 上限 | **Settings 层 40% 预算** |
| 降级策略 | 无记忆继续工作 | **同上** + `degraded: true` 标记 |

### 为什么不用向量召回

P3 明确不做向量语义搜索（推迟到 P4+）。理由：

1. **简单有效**: 角色名/地点名是确定性的字符串匹配，关键词匹配足够精确
2. **零依赖**: 不需要嵌入模型或向量数据库
3. **可预测**: 用户可以明确知道"哪些设定会被 AI 读到"
4. **性能**: 字符串匹配 < 1ms，向量搜索需要 50-200ms

---

## 4. ProseMirror 文档适配

### 导出管线

P3 的导出管线需要从 ProseMirror JSON 格式转换，而非 P1 之前的 TipTap JSON。

```
ProseMirror JSON Document
  → TextExtractor（提取可索引文本，用于 FTS）
  → ProseMirrorExporter
    → toMarkdown()  → 保留结构语义的 Markdown
    → toDocx()      → 结构化 DOCX（使用 docx 库）
    → toPdf()       → 结构化 PDF（使用 pdf-lib 或类似库）
```

### 关键约束

1. **不支持的节点必须报错**: ProseMirror 允许自定义节点（如 `mention`、`ai-suggestion`），导出时必须检测并报错，禁止静默降级
2. **增量索引更新**: 文档保存后，通过 `TextDiff` 增量更新 FTS5 索引，避免全量重建
3. **格式能力矩阵**: 每种导出格式对 ProseMirror 节点的支持程度有明确矩阵，由 Owner 固定

---

## 5. 模块依赖关系（P3）

```
P2 outputs（端到端闭环 + Agentic Loop + Diff Preview + Cost visibility）
    │
    ▼
┌──────────────────────┐
│  3A Project Mgmt     │ ← ProjectConfig, multi-doc
│  (project-management)│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│  3B Settings Mgmt    │     │  3D Skill Extension  │ ← independent
│  (knowledge-graph)   │     │  (skill-system)      │
│  Character/Location  │     │  consistency-check   │
│  List CRUD           │     │  dialogue-gen        │
└──────────┬───────────┘     │  outline-expand      │
           │                 └──────────────────────┘
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│  3C Simple Memory    │     │  3E Full-text Search │ ← independent
│  (memory-system)     │     │  (search-retrieval)  │
│  key-value + inject  │     │  FTS5 project-scoped │
└──────────────────────┘     └──────────────────────┘

                             ┌──────────────────────┐
                             │  3F Export            │ ← depends on 3A + stable doc format
                             │  (document-management)│
                             │  ProseMirror → MD/    │
                             │  DOCX/PDF             │
                             └──────────────────────┘
```

---

## 6. P3 总体验收链路

```
用户创建小说项目
  → 添加角色（林远、林小雨）和地点（废弃仓库）
    → AI 续写时考虑角色设定（「林远：冷静」→ 生成冷静语气）
      → 一致性检查发现矛盾
        → 全文搜索定位相关章节
          → 导出为 Word 投稿
            = 可交付产品
```
