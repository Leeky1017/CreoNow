# Phase 2 Agent 指令：Codex 上下文（6 Changes）

## 角色分工

| 角色 | 模型 | 职责 | 禁止 |
|------|------|------|------|
| **规划 Agent（你）** | Opus | 编写完整 change 文档（proposal.md + specs/*-delta.md + tasks.md 全部六段） | 禁止写任何代码 |
| **实现 Agent** | Codex | 按 tasks.md 逐步执行 TDD 实现，填入实际命令输出和 PR 链接 | 禁止修改 spec/proposal |

## 必读文件

| 顺序 | 文件 | 目的 |
|------|------|------|
| 1 | `AGENTS.md` | 规则和禁止行为 |
| 2 | `openspec/project.md` | 项目概述和模块索引 |
| 3 | `docs/plans/audit-roadmap.md` | 36-change 路线图 |
| 4 | `openspec/specs/knowledge-graph/spec.md` | C8/C9/C10 目标 spec |
| 5 | `openspec/specs/context-engine/spec.md` | C11/C12 目标 spec |
| 6 | `openspec/specs/memory-system/spec.md` | C13 目标 spec |
| 7 | `docs/audit/02-conversation-and-context.md` | §3.3-§3.4 方案（Codex 模型） |

代码文件（理解现有实现以确保 spec 准确性）：
- `apps/desktop/main/src/services/kg/kgService.ts` — KG 实体类型定义与 CRUD
- `apps/desktop/main/src/services/context/layerAssemblyService.ts` — Context Engine 四层组装
- `apps/desktop/main/src/services/memory/memoryService.ts` — Memory 注入预览
- `apps/desktop/main/src/services/ai/assembleSystemPrompt.ts` — P1 产出：分层 prompt 组装

## 执行流程

```
对每个 change (C8-C13)：
1. 阅读目标模块的 spec.md，理解现有 requirements 和 scenarios
2. 阅读对应审计报告章节，理解问题和建议方案
3. 阅读相关代码文件，确认现有实现状态
4. 创建 openspec/changes/<change-id>/proposal.md（提案：背景/范围/依赖）
5. 创建 openspec/changes/<change-id>/specs/<module>-delta.md（delta spec：REQ + Scenario）
6. 创建 openspec/changes/<change-id>/tasks.md（TDD 六段式）
7. 同步更新 openspec/changes/EXECUTION_ORDER.md
```

全部 6 个 change 文档完成后，执行二次核对和三次核对（见下方）。

## 交付物格式（三层结构）

每个 change 产出三个文件，参照 `openspec/changes/_template/`：

```
openspec/changes/<change-id>/
├── proposal.md                      ← 提案（背景/范围/依赖）
├── specs/<module>-delta.md          ← Delta Spec（REQ + Scenario）
└── tasks.md                         ← TDD 六段式
```

### 1. proposal.md（提案）

```markdown
# 提案：<change-id>

## 背景
<为什么要改；当前问题；不改的风险；审计来源 `docs/audit/<report>.md` §<section>>

## 变更内容
- <变更点 1>
- <变更点 2>

## 受影响模块
- <module> delta：`openspec/changes/<change-id>/specs/<module>-delta.md`
- <module>（后续实现阶段）：`apps/desktop/...`

## 不做什么
- <明确排除范围>

## 依赖关系
- 上游依赖：<无 / 列出 change-id>
- 下游依赖：<列出后续 change-id>

## Dependency Sync Check
- 核对输入：<列出需要核对的 spec 文件>
- 核对项：数据结构、IPC 契约、错误码、阈值
- 结论：`NO_DRIFT` / `DRIFT_FOUND`（若发现漂移需先修正）

## Codex 实现指引
- 目标文件路径：<具体路径>
- 验证命令：<pnpm vitest run ...>
- Mock 要求：<需要 mock 什么>

## 审阅状态
- Owner 审阅：`PENDING`
```

### 2. specs/<module>-delta.md（Delta Spec）

```markdown
# <Module> Specification Delta

## Change: <change-id>

### Requirement: <Requirement Name> [ADDED]
<新增/修改要求，使用可验证语句，避免模糊词。>

#### Scenario: <Scenario ID> <Scenario Name> [ADDED]
- **假设** <精确前提，含具体数据值>
- **当** <触发动作，含函数签名>
- **则** <可验证结果，含类型和值断言>
- **并且** <补充约束>
```

### 3. tasks.md（TDD 六段式）

```markdown
## 1. Specification
- [ ] 1.1 审阅并确认需求边界
- [ ] 1.2 审阅并确认错误路径与边界路径
- [ ] 1.3 审阅并确认验收阈值与不可变契约
- [ ] 1.4 若存在上游依赖，先完成 Dependency Sync Check 并记录结论；无依赖则标注 N/A

## 2. TDD Mapping（先测前提）
- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射
| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|-------------|---------|-----------|----------|
| S1          | xxx.test.ts | should xxx | expect(xxx).toBe(xxx) |

## 3. Red（先写失败测试）
- [ ] 3.1 创建测试文件 `<test-file-path>`
- [ ] 3.2 编写 S1 测试 `<test case name>` — 断言：<具体 expect>
- [ ] 3.N 编写 SN 测试...
- [ ] 3.X 运行测试确认全部 FAIL（模块/函数不存在）
Red 失败证据要求：记录 `Error: Cannot find module` 或断言失败输出

## 4. Green（最小实现通过）
- [ ] 4.1 创建/修改 `<implementation-file-path>`
- [ ] 4.2 实现 <函数/类/migration>，满足 S1-SN
- [ ] 4.N 运行测试确认全部 PASS

## 5. Refactor（保持绿灯）
- [ ] 5.1 <具体重构动作>
- [ ] 5.2 运行测试确认仍全部 PASS

## 6. Evidence
- 测试命令：`<pnpm vitest run ...>`
- 测试结果：N tests passed, exit code 0
- PR: <Codex 回填实际 PR 链接>
```

## C8-C13 内容与三层文件的映射

下方 C8-C13 各节包含该 change 的完整参考信息。编写时按以下规则分配到三个文件：

| C 节中的子标题 | 写入文件 | 对应模板章节 |
|---------------|---------|-------------|
| **模块 / 审计来源 / 前置依赖** | `proposal.md` | 背景 + 依赖关系 |
| **Scope** | `proposal.md` | 变更内容 + Codex 实现指引 |
| **Delta Spec** | `specs/<module>-delta.md` | Requirement [ADDED]/[MODIFIED] |
| **Scenario** | `specs/<module>-delta.md` | Scenario [ADDED]（假设/当/则 格式） |
| **验证命令** | `proposal.md` 的 Codex 实现指引 + `tasks.md` §2 | 验证命令 + Scenario→Test 映射 |

---

## 二次核对（第一轮完成后）

全部 6 个 change 文档写完后，逐一执行以下检查：

| # | 检查项 | 方法 |
|---|--------|------|
| 1 | **Requirement ID 唯一** | 搜索所有 `specs/*-delta.md`，确认无重复 REQ-ID |
| 2 | **Scenario 完整** | 每个 REQ 至少有 1 个 Scenario 覆盖 |
| 3 | **Scenario 精确** | 每个 GIVEN/WHEN/THEN 包含具体数据值，无模糊描述 |
| 4 | **依赖正确** | 前置依赖的 change 确实提供了被依赖的能力 |
| 5 | **目标 spec 存在** | 引用的 spec.md 路径存在且包含被 MODIFIED 的 REQ |
| 6 | **现有代码对齐** | Scope 中提到的函数/文件确实存在于当前代码中 |
| 7 | **TDD Mapping 完整** | 每个 Scenario 在 tasks.md §2 中有对应测试用例 |
| 8 | **EXECUTION_ORDER 同步** | 所有 6 个 change 都在 EXECUTION_ORDER.md 中 |

发现问题立即修复，然后进入三次核对。

## 三次核对（二次核对修复后）

换一个视角重新审视：

| # | 检查项 | 方法 |
|---|--------|------|
| 1 | **Codex 可独立执行** | 仅凭 proposal.md + tasks.md，不看审计报告，Codex 能否无歧义地实现？ |
| 2 | **边界条件覆盖** | 每个 Scenario 集合是否覆盖了：空输入、超限输入、无效输入、正常路径？ |
| 3 | **跨 change 一致性** | C8 定义的 `aiContextLevel` 字段，C10/C11/C12 使用时是否一致？C9 的 `aliases`，C10 使用时字段是否对齐？ |
| 4 | **与现有 spec 不冲突** | 新增的 REQ-ID 不与现有 spec 中的 REQ-ID 冲突 |
| 5 | **审计建议全覆盖** | 对照 `docs/audit/02-conversation-and-context.md` §3.3-§3.4，所有建议是否都在 change 中体现？遗漏了什么？ |

---

## C8: `p2-kg-context-level`（0.5d）

**模块**: knowledge-graph
**审计来源**: `02-conversation-and-context.md` §3.3（NovelCrafter Codex 4 级 AI 上下文控制）

### Scope

在 `KnowledgeEntity` 类型上增加 `aiContextLevel` 字段，支持 4 级 AI 上下文控制。执行 SQLite migration 添加列。KG 编辑 UI 增加 `aiContextLevel` 下拉选择。

### Delta Spec（写入 `knowledge-graph/spec.md`）

```
[MODIFIED] Requirement: 实体管理
KnowledgeEntity 类型新增 `aiContextLevel` 字段：
  type AiContextLevel = "always" | "when_detected" | "manual_only" | "never";

每个实体必须包含 `aiContextLevel` 字段，默认值为 `"when_detected"`。

SQLite migration：ALTER TABLE knowledge_entities ADD COLUMN ai_context_level TEXT NOT NULL DEFAULT 'when_detected';

aiContextLevel 各级别语义：
| 级别 | 行为 | 适用场景 |
|------|------|---------|
| always | 始终注入 AI 上下文 | 世界观核心规则、主角档案 |
| when_detected | 文本中检测到引用时自动注入 | 配角、次要地点 |
| manual_only | 检测到也不自动注入（手动可拉入） | 不想让 AI 知道的伏笔 |
| never | 永远不注入 | 私密笔记、大纲草稿 |
```

### Scenario

**S1: 新建实体默认 aiContextLevel 为 when_detected**
```
GIVEN 调用 entityCreate({ projectId: "p1", type: "character", name: "林默", description: "侦探" })
WHEN 不指定 aiContextLevel
THEN 返回的实体 aiContextLevel === "when_detected"
AND 数据库中 ai_context_level 列值为 "when_detected"
```

**S2: 更新实体的 aiContextLevel**
```
GIVEN 实体 "林默" 存在，aiContextLevel 为 "when_detected"
WHEN 调用 entityUpdate({ id: "林默的ID", patch: { aiContextLevel: "always" } })
THEN 返回的实体 aiContextLevel === "always"
AND 数据库中 ai_context_level 列值为 "always"
```

**S3: 查询 always 级别实体**
```
GIVEN 项目中有 3 个实体：A(always), B(when_detected), C(never)
WHEN 调用 entityList({ projectId: "p1", filter: { aiContextLevel: "always" } })
THEN 返回 1 个实体（A）
AND 不包含 B 和 C
```

**S4: 无效 aiContextLevel 被拒绝**
```
GIVEN 调用 entityCreate({ ..., aiContextLevel: "invalid_value" })
WHEN Zod schema 校验
THEN 返回 { ok: false, error: { code: "VALIDATION_ERROR" } }
```

**验证命令**: `pnpm vitest run apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`

### Tasks（写入 `tasks.md`）

#### 1. Specification
- [ ] 1.1 审阅 `openspec/specs/knowledge-graph/spec.md` §实体管理，确认 `KnowledgeEntity` 当前字段列表
- [ ] 1.2 审阅 `kgService.ts` L47-57 的 `KnowledgeEntity` 类型定义，确认无 `aiContextLevel` 字段
- [ ] 1.3 确认 Zod schema 需同步新增 `aiContextLevel` 枚举校验
- [ ] 1.4 Dependency Sync Check: N/A（无上游依赖）

#### 2. TDD Mapping
| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|---|---|---|---|
| S1 | `kgService.contextLevel.test.ts` | `should default aiContextLevel to when_detected` | `entity.aiContextLevel === "when_detected"` |
| S2 | `kgService.contextLevel.test.ts` | `should update aiContextLevel to always` | `updated.aiContextLevel === "always"` |
| S3 | `kgService.contextLevel.test.ts` | `should filter entities by aiContextLevel` | `result.length === 1 && result[0].name === "A"` |
| S4 | `kgService.contextLevel.test.ts` | `should reject invalid aiContextLevel` | `result.ok === false && error.code === "VALIDATION_ERROR"` |

#### 3. Red（先写失败测试）
- [ ] 3.1 创建 `apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
- [ ] 3.2 编写 S1 测试 `should default aiContextLevel to when_detected` — `expect(entity.aiContextLevel).toBe("when_detected")`
- [ ] 3.3 编写 S2 测试 `should update aiContextLevel to always` — `expect(updated.aiContextLevel).toBe("always")`
- [ ] 3.4 编写 S3 测试 `should filter entities by aiContextLevel` — `expect(result).toHaveLength(1)`
- [ ] 3.5 编写 S4 测试 `should reject invalid aiContextLevel` — `expect(result.ok).toBe(false)`
- [ ] 3.6 运行测试确认全部 FAIL（`aiContextLevel` 属性不存在）
Red 失败证据要求：记录 `TypeError` 或属性 undefined 错误

#### 4. Green（最小实现通过）
- [ ] 4.1 在 `kgService.ts` 的 `KnowledgeEntity` 类型中添加 `aiContextLevel: AiContextLevel` 字段
- [ ] 4.2 定义 `AiContextLevel = "always" | "when_detected" | "manual_only" | "never"` 类型和 Zod enum
- [ ] 4.3 修改 `entityCreate` 方法：不传 `aiContextLevel` 时默认 `"when_detected"`
- [ ] 4.4 修改 `entityUpdate` 方法：支持 patch `aiContextLevel`
- [ ] 4.5 修改 `entityList` 方法：支持 `filter.aiContextLevel` 参数，生成 `WHERE ai_context_level = ?` SQL
- [ ] 4.6 添加 SQLite migration：`ALTER TABLE knowledge_entities ADD COLUMN ai_context_level TEXT NOT NULL DEFAULT 'when_detected'`
- [ ] 4.7 修改行映射函数 `rowToEntity`：从数据库行读取 `ai_context_level` 映射到 `aiContextLevel`
- [ ] 4.8 运行测试确认全部 PASS

#### 5. Refactor（保持绿灯）
- [ ] 5.1 确认 `AiContextLevel` 类型和 `AI_CONTEXT_LEVELS` 常量从 `kgService.ts` 正确导出
- [ ] 5.2 确认 Zod schema 的枚举值与类型定义一致
- [ ] 5.3 运行测试确认仍全部 PASS

#### 6. Evidence
- 测试命令：`pnpm vitest run apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
- 测试结果：4 tests passed, exit code 0
- PR: <Codex 回填>

---

## C9: `p2-kg-aliases`（0.5d）

**模块**: knowledge-graph
**审计来源**: `02-conversation-and-context.md` §3.3（Codex 引用检测需要别名匹配）

### Scope

在 `KnowledgeEntity` 类型上增加 `aliases: string[]` 字段。SQLite migration 添加 JSON 列。KG 编辑 UI 增加别名输入。

### Delta Spec（写入 `knowledge-graph/spec.md`）

```
[MODIFIED] Requirement: 实体管理
KnowledgeEntity 类型新增 `aliases` 字段：
  aliases: string[];  // 别名数组，用于 AI 上下文引用检测

默认值为空数组 `[]`。

SQLite migration：ALTER TABLE knowledge_entities ADD COLUMN aliases TEXT NOT NULL DEFAULT '[]';
数据库中以 JSON 字符串存储，读取时解析为 string[]。

别名用途：当 aiContextLevel 为 "when_detected" 时，系统通过实体的 name 和 aliases 匹配文本中的引用。
```

### Scenario

**S1: 新建实体默认 aliases 为空数组**
```
GIVEN 调用 entityCreate({ projectId: "p1", type: "character", name: "林默", description: "侦探" })
WHEN 不指定 aliases
THEN 返回的实体 aliases 为 []
AND typeof aliases === "object" && Array.isArray(aliases)
```

**S2: 创建实体时指定 aliases**
```
GIVEN 调用 entityCreate({ ..., name: "林默", aliases: ["小默", "默哥"] })
WHEN 实体创建成功
THEN 返回的实体 aliases === ["小默", "默哥"]
AND 数据库中 aliases 列值为 JSON 字符串 '["小默","默哥"]'
```

**S3: 更新实体的 aliases**
```
GIVEN 实体 "林默" 存在，aliases 为 ["小默"]
WHEN 调用 entityUpdate({ id: "林默的ID", patch: { aliases: ["小默", "默哥", "林侦探"] } })
THEN 返回的实体 aliases === ["小默", "默哥", "林侦探"]
```

**S4: aliases 非数组时被拒绝**
```
GIVEN 调用 entityCreate({ ..., aliases: "not_an_array" })
WHEN Zod schema 校验
THEN 返回 { ok: false, error: { code: "VALIDATION_ERROR" } }
```

**S5: aliases 中包含空字符串时被过滤**
```
GIVEN 调用 entityCreate({ ..., aliases: ["小默", "", "  "] })
WHEN 实体创建成功
THEN 返回的实体 aliases === ["小默"]（空白字符串被过滤）
```

**验证命令**: `pnpm vitest run apps/desktop/main/src/services/kg/__tests__/kgService.aliases.test.ts`

### Tasks（写入 `tasks.md`）

#### 1. Specification
- [ ] 1.1 审阅 `openspec/specs/knowledge-graph/spec.md` §实体管理，确认当前无 `aliases` 字段
- [ ] 1.2 审阅 `kgService.ts` L47-57 确认 `KnowledgeEntity` 类型
- [ ] 1.3 确认 SQLite JSON 存储策略：列类型 TEXT，读取时 `JSON.parse`，写入时 `JSON.stringify`
- [ ] 1.4 Dependency Sync Check: N/A（无上游依赖）

#### 2. TDD Mapping
| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|---|---|---|---|
| S1 | `kgService.aliases.test.ts` | `should default aliases to empty array` | `Array.isArray(entity.aliases) && entity.aliases.length === 0` |
| S2 | `kgService.aliases.test.ts` | `should store aliases when specified` | `entity.aliases deep equals ["小默", "默哥"]` |
| S3 | `kgService.aliases.test.ts` | `should update aliases` | `updated.aliases deep equals ["小默", "默哥", "林侦探"]` |
| S4 | `kgService.aliases.test.ts` | `should reject non-array aliases` | `result.ok === false` |
| S5 | `kgService.aliases.test.ts` | `should filter empty strings from aliases` | `entity.aliases deep equals ["小默"]` |

#### 3. Red（先写失败测试）
- [ ] 3.1 创建 `apps/desktop/main/src/services/kg/__tests__/kgService.aliases.test.ts`
- [ ] 3.2 编写 S1 测试 `should default aliases to empty array` — `expect(entity.aliases).toEqual([])`
- [ ] 3.3 编写 S2 测试 `should store aliases when specified` — `expect(entity.aliases).toEqual(["小默", "默哥"])`
- [ ] 3.4 编写 S3 测试 `should update aliases` — `expect(updated.aliases).toEqual(["小默", "默哥", "林侦探"])`
- [ ] 3.5 编写 S4 测试 `should reject non-array aliases` — `expect(result.ok).toBe(false)`
- [ ] 3.6 编写 S5 测试 `should filter empty strings from aliases` — `expect(entity.aliases).toEqual(["小默"])`
- [ ] 3.7 运行测试确认全部 FAIL（`aliases` 属性不存在）
Red 失败证据要求：记录属性 undefined 或 JSON parse 错误

#### 4. Green（最小实现通过）
- [ ] 4.1 在 `kgService.ts` 的 `KnowledgeEntity` 类型中添加 `aliases: string[]`
- [ ] 4.2 添加 Zod schema：`z.array(z.string())` + 预处理 `.transform(arr => arr.filter(s => s.trim() !== ""))`
- [ ] 4.3 修改 `entityCreate`：不传 `aliases` 时默认 `[]`；传入时过滤空白项后 `JSON.stringify` 存储
- [ ] 4.4 修改 `entityUpdate`：支持 patch `aliases`
- [ ] 4.5 修改 `rowToEntity`：从数据库行 `JSON.parse(row.aliases)` 映射到 `string[]`
- [ ] 4.6 添加 SQLite migration：`ALTER TABLE knowledge_entities ADD COLUMN aliases TEXT NOT NULL DEFAULT '[]'`
- [ ] 4.7 运行测试确认全部 PASS

#### 5. Refactor（保持绿灯）
- [ ] 5.1 确认 `aliases` JSON 存储/读取的 parse 错误有 try-catch 保护（损坏数据回退空数组）
- [ ] 5.2 确认空白过滤逻辑在 Zod transform 中统一处理
- [ ] 5.3 运行测试确认仍全部 PASS

#### 6. Evidence
- 测试命令：`pnpm vitest run apps/desktop/main/src/services/kg/__tests__/kgService.aliases.test.ts`
- 测试结果：5 tests passed, exit code 0
- PR: <Codex 回填>

---

## C10: `p2-entity-matcher`（1d）

**模块**: knowledge-graph
**审计来源**: `02-conversation-and-context.md` §3.3（Codex 引用检测实现）
**前置依赖**: C8 + C9

### Scope

实现 `matchEntities(text, entities)` 函数，替换 mock `kgRecognitionRuntime.ts`。输入文本 + 实体列表（含 name + aliases），返回匹配到的实体 ID 列表。性能要求：100 实体 × 1000 字 < 10ms。

### Delta Spec（写入 `knowledge-graph/spec.md`）

```
[ADDED] REQ-KG-ENTITY-MATCHER
知识图谱必须提供实体名/别名文本匹配引擎。

函数签名：
  type MatchableEntity = {
    id: string;
    name: string;
    aliases: string[];
    aiContextLevel: AiContextLevel;
  };

  type MatchResult = {
    entityId: string;
    matchedTerm: string;   // 匹配到的名称或别名
    position: number;      // 在文本中的位置
  };

  function matchEntities(text: string, entities: MatchableEntity[]): MatchResult[];

匹配规则：
- 只匹配 aiContextLevel 为 "when_detected" 的实体
- 匹配实体的 name 和 aliases 中的所有项
- 匹配为子字符串包含（case-sensitive，因为中文无大小写）
- 同一实体如果 name 和 alias 都匹配，只返回一次（去重按 entityId）
- 空文本返回空数组
- 空实体列表返回空数组
```

### Scenario

**S1: 匹配实体名称**
```
GIVEN text = "林默推开门，走进长安城"
AND entities = [
  { id: "e1", name: "林默", aliases: [], aiContextLevel: "when_detected" },
  { id: "e2", name: "长安城", aliases: ["长安"], aiContextLevel: "when_detected" }
]
WHEN 调用 matchEntities(text, entities)
THEN 返回 2 个结果
AND 包含 { entityId: "e1", matchedTerm: "林默" }
AND 包含 { entityId: "e2", matchedTerm: "长安城" }
```

**S2: 通过别名匹配**
```
GIVEN text = "小默推开门"
AND entities = [
  { id: "e1", name: "林默", aliases: ["小默", "默哥"], aiContextLevel: "when_detected" }
]
WHEN 调用 matchEntities(text, entities)
THEN 返回 1 个结果
AND result[0].entityId === "e1"
AND result[0].matchedTerm === "小默"
```

**S3: always/never/manual_only 实体不参与匹配**
```
GIVEN text = "林默和张薇在讨论"
AND entities = [
  { id: "e1", name: "林默", aliases: [], aiContextLevel: "always" },
  { id: "e2", name: "张薇", aliases: [], aiContextLevel: "never" },
  { id: "e3", name: "讨论", aliases: [], aiContextLevel: "manual_only" }
]
WHEN 调用 matchEntities(text, entities)
THEN 返回空数组（无 when_detected 实体）
```

**S4: 同一实体 name + alias 都匹配时去重**
```
GIVEN text = "林默和小默一起出发"
AND entities = [
  { id: "e1", name: "林默", aliases: ["小默"], aiContextLevel: "when_detected" }
]
WHEN 调用 matchEntities(text, entities)
THEN 返回 1 个结果（按 entityId 去重）
AND result[0].entityId === "e1"
```

**S5: 空文本返回空数组**
```
GIVEN text = ""
AND entities = [{ id: "e1", name: "林默", aliases: [], aiContextLevel: "when_detected" }]
WHEN 调用 matchEntities(text, entities)
THEN 返回 []
```

**S6: 性能——100 实体 × 1000 字 < 10ms**
```
GIVEN 100 个实体（每个有 2 个 aliases）
AND text 为 1000 个中文字符
WHEN 调用 matchEntities(text, entities) 并计时
THEN 执行时间 < 10ms
```

**验证命令**: `pnpm vitest run apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`

### Tasks（写入 `tasks.md`）

#### 1. Specification
- [ ] 1.1 审阅 C8 delta spec 确认 `AiContextLevel` 类型定义
- [ ] 1.2 审阅 C9 delta spec 确认 `aliases: string[]` 字段定义
- [ ] 1.3 确认 `kgRecognitionRuntime.ts` 为当前 mock 实现，将被替换
- [ ] 1.4 Dependency Sync Check: 核对 C8 `AiContextLevel` 和 C9 `aliases` 字段 → `NO_DRIFT`

#### 2. TDD Mapping
| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|---|---|---|---|
| S1 | `entityMatcher.test.ts` | `should match entities by name` | `results.length === 2`，包含 e1 和 e2 |
| S2 | `entityMatcher.test.ts` | `should match entities by alias` | `result[0].matchedTerm === "小默"` |
| S3 | `entityMatcher.test.ts` | `should skip non-when_detected entities` | `results.length === 0` |
| S4 | `entityMatcher.test.ts` | `should deduplicate by entityId` | `results.length === 1` |
| S5 | `entityMatcher.test.ts` | `should return empty for empty text` | `results.length === 0` |
| S6 | `entityMatcher.test.ts` | `should complete within 10ms for 100 entities` | `elapsed < 10` |

#### 3. Red（先写失败测试）
- [ ] 3.1 创建 `apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`
- [ ] 3.2 编写 S1 测试 `should match entities by name` — 构造 2 个 when_detected 实体，text 包含两个名字，`expect(results).toHaveLength(2)`
- [ ] 3.3 编写 S2 测试 `should match entities by alias` — 实体 name 不在 text 中但 alias 在，`expect(results[0].matchedTerm).toBe("小默")`
- [ ] 3.4 编写 S3 测试 `should skip non-when_detected entities` — 3 个实体分别为 always/never/manual_only，`expect(results).toHaveLength(0)`
- [ ] 3.5 编写 S4 测试 `should deduplicate by entityId` — 实体 name 和 alias 都出现在 text 中，`expect(results).toHaveLength(1)`
- [ ] 3.6 编写 S5 测试 `should return empty for empty text` — `expect(matchEntities("", entities)).toEqual([])`
- [ ] 3.7 编写 S6 测试 `should complete within 10ms for 100 entities` — 生成 100 实体 × 1000 字，`expect(elapsed).toBeLessThan(10)`
- [ ] 3.8 运行测试确认全部 FAIL（`matchEntities` 函数不存在）
Red 失败证据要求：`Error: Cannot find module` 或 `matchEntities is not a function`

#### 4. Green（最小实现通过）
- [ ] 4.1 创建 `apps/desktop/main/src/services/kg/entityMatcher.ts`
- [ ] 4.2 导出 `MatchableEntity` 和 `MatchResult` 类型
- [ ] 4.3 实现 `matchEntities(text, entities)` 函数：
    - 过滤 `aiContextLevel !== "when_detected"` 的实体
    - 对每个实体，检查 `text.includes(name)` 和遍历 aliases 检查 `text.includes(alias)`
    - 找到第一个匹配的 term 记录 position（`text.indexOf(term)`）
    - 按 `entityId` 去重（`Map<string, MatchResult>`）
    - 返回 `MatchResult[]`
- [ ] 4.4 运行测试确认全部 PASS

#### 5. Refactor（保持绿灯）
- [ ] 5.1 评估是否需要 Aho-Corasick 优化（当前朴素扫描对 100 实体足够，暂不优化）
- [ ] 5.2 确认函数为纯函数，无副作用，无 IO
- [ ] 5.3 运行测试确认仍全部 PASS

#### 6. Evidence
- 测试命令：`pnpm vitest run apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`
- 测试结果：6 tests passed, exit code 0
- PR: <Codex 回填>

---

## C11: `p2-fetcher-always`（0.5d）

**模块**: context-engine
**审计来源**: `02-conversation-and-context.md` §3.3（rules fetcher → Codex Always 实体注入）
**前置依赖**: C8

### Scope

替换 `layerAssemblyService.ts` 中 `defaultFetchers()` 的 rules fetcher 硬编码桩，改为查询 KG 中 `aiContextLevel="always"` 的实体并格式化注入。

### Delta Spec（写入 `context-engine/spec.md`）

```
[ADDED] REQ-CE-RULES-KG-ALWAYS
Context Engine 的 rules fetcher 必须查询知识图谱中 aiContextLevel="always" 的实体，格式化为结构化文本注入 Rules 层。

查询方式：调用 kgService.entityList({ projectId, filter: { aiContextLevel: "always" } })

注入格式：
  [知识图谱 — 始终注入]
  ## 角色：林默
  - 类型：character
  - 描述：28岁侦探，性格冷静
  - 属性：年龄=28, 职业=侦探

  ## 地点：长安城
  - 类型：location
  - 描述：故事主要发生地

每个实体一个 ## 段落，包含 type/description/attributes。

当 KG 查询失败时，rules fetcher 返回空 chunks + warning "KG_UNAVAILABLE"，不中断组装。
当无 always 实体时，rules fetcher 返回空 chunks（正常情况，非错误）。
```

### Scenario

**S1: 注入 always 实体到 rules 层**
```
GIVEN 项目中有 2 个 always 实体：
  { name: "林默", type: "character", description: "28岁侦探", attributes: { age: "28" } }
  { name: "魔法系统", type: "item", description: "本世界的超能力体系", attributes: {} }
WHEN rules fetcher 执行组装
THEN 返回的 chunks 中包含 "林默" 和 "魔法系统"
AND chunks[0].source === "kg:always:林默的ID"
AND chunks[0].content 包含 "28岁侦探"
AND chunks[1].content 包含 "魔法系统"
```

**S2: 无 always 实体时返回空**
```
GIVEN 项目中所有实体的 aiContextLevel 均为 "when_detected" 或 "never"
WHEN rules fetcher 执行组装
THEN 返回 { chunks: [] }
AND 无 warning
```

**S3: KG 查询失败时降级**
```
GIVEN kgService.entityList 抛出异常或返回错误
WHEN rules fetcher 执行组装
THEN 返回 { chunks: [], warnings: ["KG_UNAVAILABLE: 知识图谱数据未注入"] }
AND 不抛出异常，组装继续
```

**S4: 格式化输出包含完整结构**
```
GIVEN always 实体 { name: "林默", type: "character", description: "侦探", attributes: { age: "28", skill: "推理" } }
WHEN rules fetcher 格式化该实体
THEN 输出包含 "## 角色：林默"
AND 输出包含 "类型：character"
AND 输出包含 "描述：侦探"
AND 输出包含 "age=28"
AND 输出包含 "skill=推理"
```

**验证命令**: `pnpm vitest run apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts`

注意：测试中必须 mock `kgService.entityList`，禁止依赖真实数据库。

### Tasks（写入 `tasks.md`）

#### 1. Specification
- [ ] 1.1 审阅 `layerAssemblyService.ts` 的 `defaultFetchers()` → `rules` fetcher 当前桩实现
- [ ] 1.2 审阅 C8 delta spec 确认 `entityList` 支持 `filter.aiContextLevel` 参数
- [ ] 1.3 确认 `ContextLayerFetcher` 函数签名和 `ContextLayerFetchResult` 返回类型
- [ ] 1.4 Dependency Sync Check: 核对 C8 `entityList({ filter: { aiContextLevel: "always" } })` 接口 → `NO_DRIFT`

#### 2. TDD Mapping
| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|---|---|---|---|
| S1 | `rulesFetcher.test.ts` | `should inject always entities into rules layer` | `chunks.length >= 2`，内容包含实体名和描述 |
| S2 | `rulesFetcher.test.ts` | `should return empty chunks when no always entities` | `chunks.length === 0`，无 warning |
| S3 | `rulesFetcher.test.ts` | `should degrade with KG_UNAVAILABLE warning on error` | `chunks.length === 0`，`warnings[0]` 包含 `KG_UNAVAILABLE` |
| S4 | `rulesFetcher.test.ts` | `should format entity with type, description, attributes` | 输出包含 `## 角色：林默` 和属性键值对 |

#### 3. Red（先写失败测试）
- [ ] 3.1 创建 `apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts`
- [ ] 3.2 mock `kgService.entityList` 返回 2 个 always 实体
- [ ] 3.3 编写 S1 测试 `should inject always entities into rules layer` — `expect(result.chunks.length).toBeGreaterThanOrEqual(1)`，`expect(result.chunks[0].content).toContain("林默")`
- [ ] 3.4 编写 S2 测试 `should return empty chunks when no always entities` — mock 返回空数组，`expect(result.chunks).toEqual([])`
- [ ] 3.5 编写 S3 测试 `should degrade with KG_UNAVAILABLE warning on error` — mock 抛出异常，`expect(result.warnings![0]).toContain("KG_UNAVAILABLE")`
- [ ] 3.6 编写 S4 测试 `should format entity with type, description, attributes` — `expect(content).toContain("## 角色：林默")`，`expect(content).toContain("age=28")`
- [ ] 3.7 运行测试确认全部 FAIL（rules fetcher 仍为桩实现）
Red 失败证据要求：断言失败——桩返回硬编码字符串而非 KG 实体

#### 4. Green（最小实现通过）
- [ ] 4.1 创建 `apps/desktop/main/src/services/context/fetchers/rulesFetcher.ts`
- [ ] 4.2 实现 `createRulesFetcher(deps: { kgService })` 工厂函数，返回 `ContextLayerFetcher`
- [ ] 4.3 fetcher 内部逻辑：
    - 调用 `kgService.entityList({ projectId: request.projectId, filter: { aiContextLevel: "always" } })`
    - 如果返回 `ok: false` 或抛出异常，返回 `{ chunks: [], warnings: ["KG_UNAVAILABLE: ..."] }`
    - 格式化每个实体为结构化文本 chunk（`formatEntityForContext` 辅助函数）
- [ ] 4.4 实现 `formatEntityForContext(entity)` — 输出 `## <类型中文>：<name>\n- 类型：<type>\n- 描述：<description>\n- 属性：<key=value, ...>`
- [ ] 4.5 修改 `layerAssemblyService.ts` 的 `defaultFetchers()`，将 rules 位替换为 `createRulesFetcher`
- [ ] 4.6 运行测试确认全部 PASS

#### 5. Refactor（保持绿灯）
- [ ] 5.1 将 `formatEntityForContext` 提取为独立导出函数（C12 retrieved fetcher 复用）
- [ ] 5.2 确认 fetcher 工厂函数使用显式依赖注入（不 import 全局单例）
- [ ] 5.3 运行测试确认仍全部 PASS

#### 6. Evidence
- 测试命令：`pnpm vitest run apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts`
- 测试结果：4 tests passed, exit code 0
- PR: <Codex 回填>

---

## C12: `p2-fetcher-detected`（1d）

**模块**: context-engine
**审计来源**: `02-conversation-and-context.md` §3.3（retrieved fetcher → Codex 引用检测）
**前置依赖**: C10 + C11

### Scope

替换 `defaultFetchers()` 的 retrieved fetcher 桩，改为：
1. 从 request 获取光标前后文本
2. 从 KG 加载所有 `when_detected` 实体的 name + aliases
3. 调用 `matchEntities()` 进行引用检测
4. 将匹配到的实体详情格式化为 chunks 注入 Retrieved 层

### Delta Spec（写入 `context-engine/spec.md`）

```
[ADDED] REQ-CE-RETRIEVED-CODEX-DETECTED
Context Engine 的 retrieved fetcher 必须执行 Codex 引用检测：

1. 从 ContextAssembleRequest.additionalInput 获取光标前后文本
2. 调用 kgService.entityList({ projectId, filter: { aiContextLevel: "when_detected" } }) 获取所有可检测实体
3. 调用 matchEntities(text, entities) 执行匹配
4. 对每个匹配到的实体，查询完整详情并格式化为 chunk

注入格式（与 rules fetcher 一致）：
  [知识图谱 — 引用检测]
  ## 角色：林小雨
  - 类型：character
  - 描述：林默的妹妹

当文本为空时，跳过引用检测，返回空 chunks。
当 KG 查询失败时，返回空 chunks + warning "KG_UNAVAILABLE"。
当匹配引擎失败时，返回空 chunks + warning "ENTITY_MATCH_FAILED"。

此 fetcher 不处理 always 实体（由 rules fetcher 处理）。
此 fetcher 不处理 never/manual_only 实体（不注入）。
```

### Scenario

**S1: 检测到引用并注入实体详情**
```
GIVEN 实体 "林小雨" aiContextLevel="when_detected", aliases=["小雨"]
AND 实体 "魔法系统" aiContextLevel="always"（不在 retrieved 处理范围）
AND additionalInput = "小雨推开门走了进来"
WHEN retrieved fetcher 执行组装
THEN 返回 chunks 包含 "林小雨" 的详情
AND 不包含 "魔法系统"（由 rules 层处理）
AND chunks[0].source === "codex:detected:林小雨的ID"
```

**S2: 无匹配时返回空**
```
GIVEN 实体 "林默" aiContextLevel="when_detected"
AND additionalInput = "天气很好，阳光明媚"
WHEN retrieved fetcher 执行组装
THEN 返回 { chunks: [] }
```

**S3: additionalInput 为空时跳过检测**
```
GIVEN 多个 when_detected 实体存在
AND additionalInput 为 undefined 或 ""
WHEN retrieved fetcher 执行组装
THEN 返回 { chunks: [] }
AND 不调用 matchEntities
```

**S4: KG 查询失败降级**
```
GIVEN kgService.entityList 返回错误
WHEN retrieved fetcher 执行组装
THEN 返回 { chunks: [], warnings: ["KG_UNAVAILABLE: 知识图谱数据未注入"] }
```

**S5: matchEntities 异常降级**
```
GIVEN matchEntities 抛出运行时异常
WHEN retrieved fetcher 执行组装
THEN 返回 { chunks: [], warnings: ["ENTITY_MATCH_FAILED: 实体匹配异常"] }
AND 不抛出异常到上层
```

**验证命令**: `pnpm vitest run apps/desktop/main/src/services/context/__tests__/retrievedFetcher.test.ts`

注意：测试中必须 mock `kgService.entityList` 和 `matchEntities`，禁止依赖真实数据库。

### Tasks（写入 `tasks.md`）

#### 1. Specification
- [ ] 1.1 审阅 `layerAssemblyService.ts` 的 `defaultFetchers()` → `retrieved` fetcher 当前桩实现
- [ ] 1.2 审阅 C10 delta spec 确认 `matchEntities` 函数签名和 `MatchResult` 类型
- [ ] 1.3 审阅 C11 确认 `formatEntityForContext` 已抽取为可复用函数
- [ ] 1.4 Dependency Sync Check: 核对 C10 `matchEntities` 签名 + C8 `entityList({ filter })` → `NO_DRIFT`

#### 2. TDD Mapping
| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|---|---|---|---|
| S1 | `retrievedFetcher.test.ts` | `should inject detected entities into retrieved layer` | `chunks[0].source` 包含 `codex:detected`，内容包含实体详情 |
| S2 | `retrievedFetcher.test.ts` | `should return empty when no entities matched` | `chunks.length === 0` |
| S3 | `retrievedFetcher.test.ts` | `should skip detection when additionalInput is empty` | `chunks.length === 0`，`matchEntities` 未被调用 |
| S4 | `retrievedFetcher.test.ts` | `should degrade with KG_UNAVAILABLE on kg error` | `warnings[0]` 包含 `KG_UNAVAILABLE` |
| S5 | `retrievedFetcher.test.ts` | `should degrade with ENTITY_MATCH_FAILED on matcher error` | `warnings[0]` 包含 `ENTITY_MATCH_FAILED` |

#### 3. Red（先写失败测试）
- [ ] 3.1 创建 `apps/desktop/main/src/services/context/__tests__/retrievedFetcher.test.ts`
- [ ] 3.2 mock `kgService.entityList` 和 `matchEntities`
- [ ] 3.3 编写 S1 测试 `should inject detected entities into retrieved layer`：
    - mock entityList 返回 1 个 when_detected 实体
    - mock matchEntities 返回 `[{ entityId: "e1", matchedTerm: "小雨", position: 0 }]`
    - `expect(result.chunks[0].source).toContain("codex:detected")`
- [ ] 3.4 编写 S2 测试 `should return empty when no entities matched` — mock matchEntities 返回 `[]`
- [ ] 3.5 编写 S3 测试 `should skip detection when additionalInput is empty` — request.additionalInput = `""`，`expect(matchEntities).not.toHaveBeenCalled()`
- [ ] 3.6 编写 S4 测试 `should degrade with KG_UNAVAILABLE on kg error` — mock entityList 抛出异常
- [ ] 3.7 编写 S5 测试 `should degrade with ENTITY_MATCH_FAILED on matcher error` — mock matchEntities 抛出异常
- [ ] 3.8 运行测试确认全部 FAIL（retrieved fetcher 仍为桩实现）
Red 失败证据要求：断言失败——桩返回空/硬编码而非 Codex 检测结果

#### 4. Green（最小实现通过）
- [ ] 4.1 创建 `apps/desktop/main/src/services/context/fetchers/retrievedFetcher.ts`
- [ ] 4.2 实现 `createRetrievedFetcher(deps: { kgService, matchEntities })` 工厂函数
- [ ] 4.3 fetcher 内部逻辑：
    - 若 `request.additionalInput` 为空/undefined，直接返回 `{ chunks: [] }`
    - 调用 `kgService.entityList({ projectId, filter: { aiContextLevel: "when_detected" } })`（try-catch → KG_UNAVAILABLE）
    - 将实体映射为 `MatchableEntity[]`
    - 调用 `matchEntities(text, matchableEntities)`（try-catch → ENTITY_MATCH_FAILED）
    - 对每个匹配结果，用 `formatEntityForContext` 格式化为 chunk，source 为 `codex:detected:<entityId>`
- [ ] 4.4 修改 `layerAssemblyService.ts` 的 `defaultFetchers()`，将 retrieved 位替换为 `createRetrievedFetcher`
- [ ] 4.5 运行测试确认全部 PASS

#### 5. Refactor（保持绿灯）
- [ ] 5.1 确认与 C11 rulesFetcher 共用 `formatEntityForContext`（不重复实现）
- [ ] 5.2 确认两层 try-catch 各自产出不同 warning code
- [ ] 5.3 运行测试确认仍全部 PASS

#### 6. Evidence
- 测试命令：`pnpm vitest run apps/desktop/main/src/services/context/__tests__/retrievedFetcher.test.ts`
- 测试结果：5 tests passed, exit code 0
- PR: <Codex 回填>

---

## C13: `p2-memory-injection`（1d）

**模块**: memory-system
**审计来源**: `02-conversation-and-context.md` §3.3（settings fetcher → Memory previewInjection）
**前置依赖**: Phase1.C2（assembleSystemPrompt）

### Scope

替换 `defaultFetchers()` 的 settings fetcher 桩，改为调用 `memoryService.previewInjection()` 获取记忆注入预览，格式化为 chunks 注入 Settings 层。同时将 Memory previewInjection 结果接入 `assembleSystemPrompt` 的 `memoryOverlay` 参数。

### Delta Spec（写入 `memory-system/spec.md`）

```
[ADDED] REQ-MEM-CONTEXT-INJECTION
Memory 系统必须通过 Context Engine 的 settings fetcher 将用户偏好记忆注入 AI 上下文。

注入流程：
1. settings fetcher 调用 memoryService.previewInjection({ projectId, documentId, mode })
2. previewInjection 返回 MemoryInjectionPreview（已有接口）
3. settings fetcher 将 preview.items 格式化为 chunks

注入格式：
  [用户写作偏好 — 记忆注入]
  - 动作场景：偏好短句，节奏紧凑（来源：learned）
  - 叙事视角：严格第一人称（来源：manual，用户确认）

每条 memory item 一行，包含 content 和 origin 标注。

当 memoryService 不可用或返回空时，settings fetcher 返回空 chunks（非错误）。
当 memoryService.previewInjection 抛出异常时，返回空 chunks + warning "MEMORY_UNAVAILABLE"。
当 previewInjection 返回 diagnostics.degradedFrom 时，将降级信息添加到 warnings。
```

### Scenario

**S1: 正常注入记忆到 settings 层**
```
GIVEN memoryService.previewInjection 返回 {
  items: [
    { id: "m1", type: "preference", scope: "project", origin: "learned", content: "动作场景偏好短句", reason: { kind: "deterministic" } },
    { id: "m2", type: "preference", scope: "global", origin: "manual", content: "严格第一人称叙述", reason: { kind: "deterministic" } }
  ],
  mode: "deterministic"
}
WHEN settings fetcher 执行组装
THEN 返回 chunks 数量 >= 1
AND chunks 内容包含 "动作场景偏好短句"
AND chunks 内容包含 "严格第一人称叙述"
AND chunks[0].source === "memory:injection"
```

**S2: 记忆为空时返回空 chunks**
```
GIVEN memoryService.previewInjection 返回 { items: [], mode: "deterministic" }
WHEN settings fetcher 执行组装
THEN 返回 { chunks: [] }
AND 无 warning
```

**S3: memoryService 异常时降级**
```
GIVEN memoryService.previewInjection 抛出异常
WHEN settings fetcher 执行组装
THEN 返回 { chunks: [], warnings: ["MEMORY_UNAVAILABLE: 记忆数据未注入"] }
AND 不抛出异常
```

**S4: 语义降级时报告 diagnostics**
```
GIVEN memoryService.previewInjection 返回 {
  items: [...],
  mode: "deterministic",
  diagnostics: { degradedFrom: "semantic", reason: "embedding service unavailable" }
}
WHEN settings fetcher 执行组装
THEN chunks 正常返回
AND warnings 包含 "MEMORY_DEGRADED: embedding service unavailable"
```

**S5: 格式化输出包含 origin 标注**
```
GIVEN memory item { content: "偏好简洁风格", origin: "learned" }
WHEN settings fetcher 格式化该 item
THEN 输出包含 "偏好简洁风格"
AND 输出包含 "learned" 或 "自动学习"
```

**验证命令**: `pnpm vitest run apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`

注意：测试中必须 mock `memoryService.previewInjection`，禁止依赖真实数据库和 LLM。

### Tasks（写入 `tasks.md`）

#### 1. Specification
- [ ] 1.1 审阅 `layerAssemblyService.ts` 的 `defaultFetchers()` → `settings` fetcher 当前桩实现
- [ ] 1.2 审阅 `memoryService.ts` 确认 `previewInjection` 方法签名和 `MemoryInjectionPreview` 返回类型
- [ ] 1.3 审阅 `assembleSystemPrompt.ts` 确认 `memoryOverlay` 参数接入点
- [ ] 1.4 Dependency Sync Check: 核对 P1.C2 `assembleSystemPrompt({ memoryOverlay })` 参数 → `NO_DRIFT`

#### 2. TDD Mapping
| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|---|---|---|---|
| S1 | `settingsFetcher.test.ts` | `should inject memory items into settings layer` | `chunks[0].content` 包含偏好文本 |
| S2 | `settingsFetcher.test.ts` | `should return empty chunks when no memory items` | `chunks.length === 0` |
| S3 | `settingsFetcher.test.ts` | `should degrade with MEMORY_UNAVAILABLE on error` | `warnings[0]` 包含 `MEMORY_UNAVAILABLE` |
| S4 | `settingsFetcher.test.ts` | `should report MEMORY_DEGRADED on semantic degradation` | `warnings` 包含 `MEMORY_DEGRADED` |
| S5 | `settingsFetcher.test.ts` | `should include origin in formatted output` | 输出包含 `learned` 或 `manual` |

#### 3. Red（先写失败测试）
- [ ] 3.1 创建 `apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`
- [ ] 3.2 mock `memoryService.previewInjection`
- [ ] 3.3 编写 S1 测试 `should inject memory items into settings layer`：
    - mock 返回 2 条 items（一条 learned，一条 manual）
    - `expect(result.chunks[0].content).toContain("动作场景偏好短句")`
    - `expect(result.chunks[0].source).toBe("memory:injection")`
- [ ] 3.4 编写 S2 测试 `should return empty chunks when no memory items` — mock 返回 `{ items: [], mode: "deterministic" }`，`expect(result.chunks).toEqual([])`
- [ ] 3.5 编写 S3 测试 `should degrade with MEMORY_UNAVAILABLE on error` — mock 抛出异常，`expect(result.warnings![0]).toContain("MEMORY_UNAVAILABLE")`
- [ ] 3.6 编写 S4 测试 `should report MEMORY_DEGRADED on semantic degradation` — mock 返回 `diagnostics: { degradedFrom: "semantic", reason: "embedding service unavailable" }`，`expect(result.warnings).toContainEqual(expect.stringContaining("MEMORY_DEGRADED"))`
- [ ] 3.7 编写 S5 测试 `should include origin in formatted output` — `expect(content).toMatch(/learned|自动学习/)`
- [ ] 3.8 运行测试确认全部 FAIL（settings fetcher 仍为桩实现）
Red 失败证据要求：断言失败——桩返回空 chunks 而非记忆注入内容

#### 4. Green（最小实现通过）
- [ ] 4.1 创建 `apps/desktop/main/src/services/context/fetchers/settingsFetcher.ts`
- [ ] 4.2 实现 `createSettingsFetcher(deps: { memoryService })` 工厂函数
- [ ] 4.3 fetcher 内部逻辑：
    - 调用 `memoryService.previewInjection({ projectId: request.projectId, documentId: request.documentId })`（try-catch → MEMORY_UNAVAILABLE）
    - 如果 items 为空，返回 `{ chunks: [] }`
    - 格式化 items 为单个 chunk：`[用户写作偏好 — 记忆注入]\n` + 每条 item `- <content>（来源：<origin>）\n`
    - 如果 diagnostics?.degradedFrom 存在，添加 warning `MEMORY_DEGRADED: <reason>`
- [ ] 4.4 修改 `layerAssemblyService.ts` 的 `defaultFetchers()`，将 settings 位替换为 `createSettingsFetcher`
- [ ] 4.5 运行测试确认全部 PASS

#### 5. Refactor（保持绿灯）
- [ ] 5.1 确认 fetcher 工厂函数使用显式依赖注入
- [ ] 5.2 确认格式化输出中 origin 的中文映射（`learned` → `自动学习`，`manual` → `手动添加`）
- [ ] 5.3 运行测试确认仍全部 PASS

#### 6. Evidence
- 测试命令：`pnpm vitest run apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`
- 测试结果：5 tests passed, exit code 0
- PR: <Codex 回填>

---

## 约束

- **禁止写任何代码**——你的交付物只有 proposal.md + specs/*-delta.md + tasks.md
- 每个 change 必须产出三个文件，参照 `openspec/changes/_template/` 的目录结构
- Delta spec 中的每个 Scenario 必须使用"假设/当/则/并且"格式，包含具体数据值，禁止模糊描述
- 每个 proposal.md 必须包含 Codex 实现指引（目标文件路径、验证命令、Mock 要求）
- 每个 tasks.md **全部六段**（§1-§6）必须完整填写：§3 Red 精确到每个测试文件路径、测试用例名和断言；§4 Green 精确到每个实现文件和函数；§5 Refactor 列出具体重构动作；§6 Evidence 列出验证命令和预期测试数量
- §6 Evidence 中的 PR 链接字段写 `<Codex 回填>`，其余所有内容必须由规划 Agent 完成
- 完成全部 6 个 change 的三层文档后，必须执行二次核对和三次核对
- 核对发现的问题必须修复后才能宣布交付

## 推荐编写顺序

```
C8 (kg-context-level) → C9 (kg-aliases) → C10 (entity-matcher)
C11 (fetcher-always) → C12 (fetcher-detected)
C13 (memory-injection) — 可与 C8-C12 主线并行编写
```

按依赖顺序编写，确保后序 change 引用前序 change 定义的类型/接口时保持一致。
