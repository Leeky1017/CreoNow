# CreoNow Architecture

本文件是 CN 后端的架构规范与全局不变量详解。所有 Agent 在 AGENTS.md 之后必须阅读本文件。

---

## 一、全局不变量详解（Invariants）

以下 10 条是 CN 后端的宪法。任何 PR 必须逐条声明遵守/违反（附理由）。

### INV-1 -- 原稿保护铁律（P0）

AI 对用户原稿的任何写操作（续写、改写、删除）必须经过 Permission Gate。只读操作自动放行。写操作必须先创建 version snapshot，用户可一键撤销。无快照 = 禁止写入。

- CC 来源：Permission 系统 + fileHistory 快照（Report 05/07）
- 落地方式：`services/skills/permissionGate.ts`（目标架构，尚未实现）拦截所有写操作，写入前调用 `document_versions` 表创建快照

### INV-2 -- 并发安全默认关闭（fail-closed）

所有 Skill Step 的 `concurrencySafe` 默认为 `false`。只有被显式标记为 `true` 的步骤（KG 查询、记忆召回、文档只读）才能并发。未标记 = 串行。

- CC 来源：`isConcurrencySafe` 分区批次编排（Report 02）
- 落地方式：SkillOrchestrator 检查每个 Step 的 `concurrencySafe` 标记，未标记的强制串行执行

### INV-3 -- 上下文预算必须对 CJK 准确

Token 估算必须区分 CJK（~1.5 tokens/字）和 ASCII（~0.25 tokens/byte）。禁止统一用 `UTF8_BYTES / 4`。所有依赖 token 估算的决策（预算、压缩触发、成本）都建立在这个精度之上。

- CN 审计来源：`tokenBudget.ts` 的 4:1 公式对中文偏低 30-50%（Report 06）
- 落地方式：CJK-aware 实现在 `services/context/tokenEstimation.ts`（`estimateTokens(text)` 函数，内部区分 CJK/ASCII）。`packages/shared/tokenBudget.ts` 当前仍使用 `UTF8_BYTES / 4` 简化公式，待迁移到 CJK-aware 版本

### INV-4 -- 记忆优先于检索（Memory-First）

CN 的记忆架构分三层。默认走 Layer 0+1，只有 0+1 无法回答时才升级到 Layer 2。存储统一用文件（Markdown），文件即真相。KG + FTS5 是主检索路径；RAG（向量检索 + embedding）作为补充手段存在（`services/rag/`、`services/embedding/`），但不作为默认检索策略。（目标约束：逐步收敛到 KG+FTS5 优先，RAG 仅在精度不足时降级使用）

**Layer 0 -- 始终注入（Always-Inject Core）**

- 内容：蒸馏后的用户事实 + 行为洞察 + 活跃项目核心设定
- 存储：`MEMORY.md`（<=200 行 / 25KB）+ `PROJECT_CONTEXT.md`（项目级）（均为计划创建，尚未存在）
- 注入方式：每次对话全量注入 system prompt，不搜索、不检索
- 预算：硬性上限（如 3000 tokens），超出则触发整合

**Layer 1 -- 会话感知注入（Session-Aware Injection）**

- 内容：近期对话摘要 + 今日工作笔记 + 当前活跃章节的 KG 实体摘要
- 存储：`memory/YYYY-MM-DD.md`（每日笔记，计划创建）+ KG 摘要缓存
- 注入方式：按时间和话题相关性选择性注入（轻量匹配：关键词/标签/KG 关联，不走向量检索）
- 预算：动态，填充 Layer 0 之后的剩余 context budget

**Layer 2 -- 精确检索（KG + FTS5）**

- 内容：50 万字小说的具体章节全文、历史对话细节、深层 KG 关系查询
- 触发条件：Layer 0+1 无法回答时才启动
- 检索方式：KG 结构化查询 + SQLite FTS5 全文搜索（零额外模型）

**RAG 使用约束**

当前代码库已包含 RAG 实现（`services/rag/`、`services/embedding/`），但 KG + FTS5 是主检索路径。新功能应优先使用 KG + FTS5，仅在精度不足时才引入 RAG 补充。禁止新增向量数据库依赖（sqlite-vec/FAISS/Pinecone）。（目标约束：当前代码仍有 RAG 实现，长期方向是 KG+FTS5 优先）

- 设计来源：GPT 记忆系统（6 层上下文 + Saved Memory/User Insights/Chat History）、CC 的 CLAUDE.md + MEMORY.md（计划创建）、OpenClaw 的文件即真相 + Dreaming 机制、Mem0 的 reconcile pipeline

### INV-5 -- 压缩必须叙事感知

AutoCompact 压缩对话时，必须保留：活跃章节 KG 实体、角色设定、未解决伏笔、写作风格偏好。这些标记为 `compactable: false`。通用摘要不适用于长篇创作。

- CC 来源：AutoCompact 框架可搬，策略必须为叙事场景定制（Report 03/07）
- 落地方式：`services/ai/compact/narrativeCompact.ts`（目标架构，尚未实现）实现叙事感知的压缩策略

### INV-6 -- 一切能力皆 Skill，统一接口

Agent 的所有能力必须建模为 Skill，遵循统一管线：输入 Schema -> 权限检查 -> 执行 -> 结果返回。禁止在 Skill 体系外直接调用 LLM 或修改文档。

- CC 来源：「一切皆 Tool」哲学（Report 01）
- 落地方式：`services/skills/` 下注册所有 Skill，SkillOrchestrator 统一调度

### INV-7 -- 命令统一入口（CommandDispatcher）

所有操作（GUI IPC / 未来 CLI / 未来 SDK）必须走 `CommandDispatcher.execute()` 统一路径。禁止在 IPC handler 中直接调用 Service。

- CC 来源：三种 I/O 模式共享同一执行核心（Report 08）
- 落地方式：`core/commandDispatcher.ts`（目标架构，尚未实现）是唯一入口，IPC handler 仅做参数转发

### INV-8 -- 后处理 Hook 链必须挂载

每次 AI 写作完成后必须执行 post-writing hook 链：自动保存版本 -> KG 更新 -> 记忆提取 -> 质量检查。Hook 链可配置、可跳过，但框架必须存在。

- CC 来源：handleStopHooks -> extractMemories -> confidenceRating -> commitAttribution（Report 02/07）
- 落地方式：`services/skills/postWritingHooks.ts`（目标架构，尚未实现）按顺序执行 hook 链

### INV-9 -- 成本必须可追踪、可展示

每次 AI 调用记录：模型名称、input/output tokens、prompt cache 命中量、估算费用（USD）。主进程 in-memory Map 追踪（maxRecords=500 自动淘汰）。IPC handler 已注册，渲染进程 UI（计划实现）。

- CC 来源：cost-tracker.ts（Report 03）
- 落地方式：`services/ai/costTracker.ts` 记录每次调用，当前为进程内内存存储（Map，maxRecords=500），跨会话持久化到 SQLite 计划实现

### INV-10 -- 错误不丢上下文

Skill 执行中断时，必须为每个未完成步骤生成合成错误结果（`is_error: true`），保证消息格式合法。禁止静默丢弃上下文。连续失败 3 次触发断路器（circuit breaker）。

- CC 来源：`yieldMissingToolResultBlocks` + `MAX_CONSECUTIVE_FAILURES = 3`（Report 02/05）
- 落地方式：SkillOrchestrator 捕获异常后生成合成结果，断路器在 `services/ai/circuitBreaker.ts`（目标架构，尚未实现）

---

## 二、分层架构（严格单向依赖）

> **路径约定**：本文档中 `services/X` 均指 `apps/desktop/main/src/services/X`，`core/X` 均指 `apps/desktop/main/src/core/X`。

```
Renderer (React + electron-vite + Tailwind)
  | Electron IPC（契约化，contract:check 门禁）
Preload (桥接层，仅做类型转换)
  |
Main Process
  +-- CommandDispatcher（统一入口，INV-7）
  |     +-- SkillOrchestrator（编排层）
  +-- Service Layer（20 服务模块）
  +-- DB Layer（SQLite）
  +-- Skills Layer
  |
Shared Layer (Types + Utils + Token Budget)
```

### 2.1 依赖方向铁律

| 层级 | 允许依赖 | 禁止依赖 |
| --- | --- | --- |
| Renderer | Shared Types | Main Process 任何模块（必须走 IPC） |
| CommandDispatcher | Service Layer, Skills Layer, Shared | Renderer, Preload, DB Layer（通过 Service 访问 DB） |
| Service Layer | 同层 Service（显式注入）, DB Layer, Shared | Renderer, Preload, CommandDispatcher（禁止反向） |
| DB Layer | Shared | 其他任何层（纯数据访问，无业务逻辑） |
| Shared | 无外部依赖（只有纯工具/类型） | 任何业务层 |

CI 执行依赖方向检查（计划实现，可用 `dependency-cruiser` 或自写脚本），违反 = 阻止合并。

### 2.2 目录结构约定

```
apps/desktop/
  +-- main/src/
  |   +-- core/                       <- （目标架构，尚未实现）
  |   |   +-- commandDispatcher.ts   <- 统一入口 (INV-7)
  |   |   +-- skillOrchestrator.ts   <- 编排层
  |   +-- services/
  |   |   +-- ai/                    <- LLM 调用、流式、消息管理
  |   |   |   +-- compact/           <- AutoCompact + NarrativeCompact (INV-5)（目标架构，尚未实现）
  |   |   +-- context/               <- 分层组装、Token 预算 (INV-3)
  |   |   +-- documents/             <- CRUD、分支、合并、版本
  |   |   +-- kg/                    <- 知识图谱：实体、关系、状态
  |   |   +-- memory/                <- 情景记忆、偏好学习
  |   |   +-- search/                <- FTS5 全文搜索、查询规划
  |   |   +-- skills/                <- 加载、路由、执行、校验
  |   |   |   +-- permissionGate.ts  <- 原稿保护 (INV-1)（目标架构，尚未实现）
  |   |   |   +-- taskState.ts       <- 任务状态机（目标架构，尚未实现）
  |   |   |   +-- postWritingHooks.ts <- 后处理 Hook 链 (INV-8)（目标架构，尚未实现）
  |   |   +-- stats/                 <- 写作统计（字数、时长、Skill 使用频率）
  |   |   +-- judge/                 <- AI 质量评判
  |   +-- ipc/                       <- IPC handler（仅转发到 CommandDispatcher）
  |   +-- db/                        <- SQLite schema、迁移、访问层
  +-- preload/
  +-- renderer/                      <- 前端（不在本规范范围内）
packages/
  +-- shared/                        <- 跨进程类型 + 纯工具
  |   +-- tokenBudget.ts             <- Token 预算（待迁移到 CJK-aware，INV-3）
  |   +-- types/
  +-- pkg.creonow.builtin/           <- 内置技能包（目标架构，尚未实现）
```

### 2.3 新增模块的规则

- 每个新模块必须有 `index.ts` 入口，包含「模块入口注释」（见第四节）
- 每个 Service 模块必须在 `index.ts` 中导出纯接口（interface），实现内部私有
- 新能力必须注册为 Skill（INV-6），禁止裸写 Service 方法暴露给前端
- 跨模块通信必须通过显式注入或事件总线，禁止直接 import 其他 Service 的内部实现

### 2.4 状态管理与持久化

| 数据类型 | 存储位置 | 生命周期 |
| --- | --- | --- |
| 运行时状态（当前会话、任务队列） | 内存 Store（轻量 Zustand 风格） | 进程内 |
| 用户文档、版本、分支 | SQLite (better-sqlite3) | 永久 |
| KG 实体/关系、记忆 | SQLite (better-sqlite3) | 永久 |
| 会话成本、性能指标 | 进程内内存（Map） | 进程内（SQLite 持久化计划实现） |
| 用户配置、权限规则 | SQLite (settings 表) | 永久 |
| 会话历史（用于恢复） | SQLite (chat_sessions / chat_messages 表) | 永久，可清理 |

规则：

- 单一真相源：每种数据只有一个权威存储位置，禁止内存与 SQLite 双写不同步
- 迁移必须版本化：SQLite schema 变更必须通过迁移脚本，禁止手动 ALTER TABLE
- 会话恢复：每次对话结束时必须 `flushSession()`，用户可「继续上次对话」

---

## 三、性能预算

没有数字的性能要求等于没有。以下是 Agent 必须遵守的硬指标。

| 指标 | 目标值 | 度量方式 |
| --- | --- | --- |
| 应用启动时间（到可交互） | <= 2s（冷启动） | profileCheckpoint 埋点 |
| 首次 LLM 响应（首 token） | <= 1.5s（流式） | streaming callback timestamp delta（计划実現，当前無専用測量） |
| Skill 执行超时 | <= 60s（单步骤） | AbortController 强制超时 |
| 上下文组装（p95） | <= 250ms | layerAssemblyService SLO |
| AutoCompact 单次执行 | <= 10s | compact 埋点 |
| KG 查询（单次） | <= 100ms | SQLite query profiling |
| 内存占用（主进程） | <= 512MB | process.memoryUsage() |
| Electron 打包体积 | <= 200MB（压缩后） | 构建产物检查 |

### 启动优化规则

- 并行初始化：SQLite 连接、FTS5 索引加载、文件系统扫描必须并行（不能串行等待）
- 重服务懒加载：KG、FTS5、Judge 等服务延迟到首次使用时才初始化
- Feature Flag 裁剪：未启用的功能模块不加载

---

## 四、注释原则与模板

注释是写给未来的重构者（人或 AI）看的。优先写代码本身看不出来的东西：边界、约束、原因、风险、回滚策略。不重复显而易见的实现。

### 4.1 从 CC 源码提取的 5 种高价值注释模式

**A -- 安全默认值注释**

```ts
// 默认值：isConcurrencySafe=false, isReadOnly=false（fail-closed）
// 意图：未显式标记的工具假设不安全，宁可串行也不冒并发风险
```

告诉 AI "为什么是这个默认值"，防止重构时随意改。

**B -- 性能决策注释**

```ts
startMdmRawRead()      // 在其余 ~135ms 的 import 期间并行运行
startKeychainPrefetch() // 否则会通过 sync spawn 顺序读取 (~65ms)
```

写清"不这么做会怎样"，AI 不会把并行改成串行。

**C -- 阈值注释**

```ts
const MAX_CONSECUTIVE_FAILURES = 3
// 背景: BQ 数据显示曾有 session 连续失败 3,272 次，浪费 ~250K API 调用/天
```

用数据解释阈值来源，AI 不会随意改成 5 或 10。

**D -- 意图保留注释**

```ts
// 三级压缩管线（按执行顺序，非互斥，可叠加）：
// 1. Snip -- 历史裁剪
// 2. Microcompact -- 轻量级，纯 ID 匹配
// 3. AutoCompact -- 重量级，LLM 驱动
```

总览注释说明整体意图，修改任一级时都知道全貌。

**E -- 边界声明注释**

命名即边界（`checkPermissions` 而非 `needsPermissions`），注释解释"为什么不叫那个名字"。

### 4.2 CN 注释三层模板

**第一层 -- 模块入口（文件头）**

```ts
/**
 * @module <模块名>
 * ## 职责：<1-2 句话>
 * ## 不做什么：<明确列出边界>
 * ## 依赖方向：允许 / 禁止
 * ## 关键不变量：引用 INV-*
 * ## 性能约束：SLO / 预算
 */
```

**第二层 -- 关键决策（函数/类）**

```ts
/** @why / @risk / @invariant / @rollback */
```

**第三层 -- 阈值/魔法数字（行级）**

```ts
const CJK_TOKENS_PER_CHAR = 1.5  // cl100k_base 实测，样本 10K 中文字符
const MAX_RETRY = 3               // CC 源码验证: 连续失败 3 次断路
const COMPACT_BUFFER = 8_000      // CC 默认 13K，CN 因中文 token 密度更高调低
```

### 4.3 注释规范（写入 AGENTS.md 的版本）

**必须写：**

1. 模块入口：用「模块入口模板」
2. 安全默认值：解释为什么是这个默认值
3. 性能决策：写「不这么做会怎样」
4. 阈值/魔法数字：写数据来源
5. 非显而易见的设计：@why / @risk / @invariant

**禁止写：**

1. 显而易见的实现（// 返回结果 -> 删掉）
2. 重复类型签名（TypeScript 类型即文档）
3. 不完整的 TODO（必须带 owner + 日期）

**语言：**

- 代码注释：英文
- 架构文档（AGENTS.md / README）：中文

### 4.4 CI 自动检查（计划实现）

- 模块入口注释：CI 检查 `index.ts` / `service.ts` 文件头含 `@module` + 职责 + 边界
- 阈值注释：正则检查硬编码数字（排除 0/1/-1）旁是否有注释
- Invariant 引用：检查新增注释是否正确引用 `INV-*`
- 注释风格审计：Audit Agent 在阶段 C 检查
