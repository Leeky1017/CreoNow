# Knowledge Graph Specification

## P3 变更摘要

P3 阶段将知识图谱从完整图数据库降级为**列表式 CRUD**——仅保留角色/地点的列表管理能力，不做图可视化、自动识别、关系连线等高级功能。这是有意的范围控制：「先让角色设定真正被 AI 读到，再谈可视化」。

| 变更 | 描述 |
|------|------|
| P3 — 角色列表 CRUD | 创建/读取/更新/删除角色条目，键值属性 |
| P3 — 地点列表 CRUD | 创建/读取/更新/删除地点条目，键值属性 |
| P3 — AI 续写注入 | 角色/地点设定通过 Context Engine Settings 层注入 AI prompt |

**P3 明确降级**：图可视化、力导向图、自动实体识别、关系管理、时间线视图均推迟到 P4+。P3 只做 list CRUD + AI 注入。

## Purpose

管理创作项目中的实体（角色、地点、事件、物品、阵营）和关系，提供语义检索能力，为 AI 推理提供结构化上下文。包含角色管理系统（Character System）作为 KG 的上层交互界面。

### Scope

| Layer    | Path                                                            |
| -------- | --------------------------------------------------------------- |
| Backend  | `main/src/services/kg/`                                         |
| IPC      | `main/src/ipc/knowledgeGraph.ts`                                |
| Frontend | `renderer/src/features/kg/`, `renderer/src/features/character/` |
| Store    | `renderer/src/stores/kgStore.ts`                                |

## Requirements

### Requirement: 实体管理

系统**必须**支持用户在知识图谱界面中管理实体（节点）。支持的实体类型为：

| 实体类型 | 类型 ID     | 节点颜色 Token           | 图标 |
| -------- | ----------- | ------------------------ | ---- |
| 角色     | `character` | `--color-node-character` | 人物 |
| 地点     | `location`  | `--color-node-location`  | 地图 |
| 事件     | `event`     | `--color-node-event`     | 闪电 |
| 物品     | `item`      | `--color-node-item`      | 宝石 |
| 阵营     | `faction`   | `--color-node-other`     | 旗帜 |

每个实体**必须**包含以下字段：`id`、`type`、`name`、`description`、`attributes`（键值对形式的自定义属性）、`projectId`、`createdAt`、`updatedAt`。

实体的 CRUD 操作通过以下 IPC 通道完成：

| IPC 通道                  | 通信模式         | 方向            | 用途           |
| ------------------------- | ---------------- | --------------- | -------------- |
| `knowledge:entity:create` | Request-Response | Renderer → Main | 创建实体       |
| `knowledge:entity:read`   | Request-Response | Renderer → Main | 读取实体详情   |
| `knowledge:entity:update` | Request-Response | Renderer → Main | 更新实体       |
| `knowledge:entity:delete` | Request-Response | Renderer → Main | 删除实体       |
| `knowledge:entity:list`   | Request-Response | Renderer → Main | 列出项目内实体 |

所有 IPC 数据**必须**通过 Zod schema 进行运行时校验。

每个实体有独立的详情页面，用户可在详情页中填写属性和描述。详情页使用 `--color-bg-surface` 背景，表单字段遵循 `DESIGN_DECISIONS.md` §6.2 输入框规范。

实体详情页**必须**有 Storybook Story，覆盖默认态（已填写内容）、空态（新建实体，属性为空）、错误态（保存失败）。

#### Scenario: 用户手动创建角色实体

- **假设** 用户打开知识图谱界面
- **当** 用户点击「添加节点」按钮，选择类型「角色」，输入名称「林远」
- **则** 系统通过 `knowledge:entity:create` 将实体数据发送到主进程
- **并且** 主进程 Zod 校验通过后写入 SQLite，返回创建成功
- **并且** 新节点以 `--color-node-character` 颜色出现在关系图视图中
- **并且** 实体详情页自动打开，用户可继续填写描述和属性

#### Scenario: 用户编辑实体属性

- **假设** 实体「林远」已存在，用户打开其详情页
- **当** 用户修改描述字段并添加自定义属性「年龄: 28」
- **则** 系统通过 `knowledge:entity:update` 保存变更
- **并且** 关系图视图中该节点的 tooltip 信息同步更新

#### Scenario: 删除实体时的关联关系处理

- **假设** 实体「林远」与其他实体有 3 条关系连线
- **当** 用户点击删除「林远」
- **则** 系统弹出确认对话框，提示「删除角色"林远"将同时删除与其相关的 3 条关系，此操作不可撤销」
- **当** 用户确认删除
- **则** 系统通过 `knowledge:entity:delete` 删除实体及其所有关联关系
- **并且** 关系图视图中该节点和相关连线消失

---

### Requirement: 关系管理

系统**必须**支持用户在实体之间建立有类型标签的关系（连线）。

关系数据结构**必须**包含：`id`、`sourceEntityId`、`targetEntityId`、`relationType`（如「敌对」「盟友」「父子」「从属」「持有」等）、`description`（可选的关系描述）、`projectId`、`createdAt`。

系统**必须**提供一组预置关系类型：`ally`（盟友）、`enemy`（敌对）、`parent`（父子）、`sibling`（兄弟）、`belongs_to`（从属）、`owns`（持有）、`located_at`（位于）、`participates_in`（参与）。用户**可以**自定义新的关系类型。

关系的 CRUD 通过以下 IPC 通道完成：

| IPC 通道                    | 通信模式         | 方向            | 用途           |
| --------------------------- | ---------------- | --------------- | -------------- |
| `knowledge:relation:create` | Request-Response | Renderer → Main | 创建关系       |
| `knowledge:relation:update` | Request-Response | Renderer → Main | 更新关系       |
| `knowledge:relation:delete` | Request-Response | Renderer → Main | 删除关系       |
| `knowledge:relation:list`   | Request-Response | Renderer → Main | 列出实体的关系 |

#### Scenario: 用户在关系图中建立连线

- **假设** 关系图视图中存在「林远」和「张薇」两个节点
- **当** 用户从「林远」节点拖拽连线到「张薇」节点
- **则** 系统弹出关系类型选择面板，显示预置类型和「自定义」选项
- **当** 用户选择「盟友」
- **则** 系统通过 `knowledge:relation:create` 创建关系
- **并且** 关系图中两节点之间出现带「盟友」标签的连线

#### Scenario: 用户使用自定义关系类型

- **假设** 用户在创建关系时预置类型不满足需求
- **当** 用户选择「自定义」，输入关系类型「师徒」
- **则** 系统以该自定义类型创建关系
- **并且** 「师徒」类型被记录，后续创建关系时出现在可选列表中

#### Scenario: 删除关系

- **假设** 「林远」和「张薇」之间存在「盟友」关系
- **当** 用户右击连线并选择「删除关系」
- **则** 系统通过 `knowledge:relation:delete` 删除该关系
- **并且** 连线从关系图中消失，两个实体节点保持不变

---

### Requirement: 可视化关系图（P4+ 规划，非 P3 验收）

系统**必须**提供交互式的可视化关系图展示，位于左侧栏的知识图谱面板（Icon Bar 中的 `graph` 入口）。

关系图视图规范：

- 节点以圆形展示，颜色使用 `--color-node-*` Token，大小按关系数量自适应
- 连线使用 `--color-fg-subtle` 颜色，关系类型标签以小字体（12px）显示在连线中部
- 节点支持拖拽移动，布局算法使用力导向图（Force-directed layout）
- 鼠标悬停节点时显示 Tooltip，内容为实体名称和类型
- 点击节点打开实体详情页
- 支持缩放和平移操作
- 关系图背景使用 `--color-bg-base`

关系图组件**必须**有 Storybook Story，覆盖：有多个节点和关系的默认态、仅一个节点的最简态、空态（无实体）。

#### Scenario: 关系图展示项目实体

- **假设** 项目中有 5 个角色实体和 8 条关系
- **当** 用户点击 Icon Bar 中的知识图谱入口
- **则** 左侧 Sidebar 切换为知识图谱面板，显示力导向关系图
- **并且** 每个节点颜色对应其实体类型
- **并且** 连线上显示关系类型标签

#### Scenario: 关系图空状态

- **假设** 当前项目没有任何实体
- **当** 用户打开知识图谱面板
- **则** 显示空状态：图标 + 文案「暂无实体，点击添加你的第一个角色或地点」
- **并且** 提供「添加节点」按钮

#### Scenario: 关系图节点拖拽和缩放

- **假设** 关系图中有多个节点
- **当** 用户拖拽某个节点到新位置
- **则** 节点移动到目标位置，相关连线实时跟随重绘
- **当** 用户滚轮缩放
- **则** 关系图以鼠标位置为中心进行缩放

---

### Requirement: 自动识别与建议添加（P4+ 规划，非 P3 验收）

系统**必须**在写作过程中自动识别新出现的实体（角色、地点等），并建议用户添加到知识图谱。自动识别的结果**必须**经用户确认后才正式写入图谱。

自动识别流程：

1. 用户在编辑器中编辑内容时，系统在后台（主进程）对新增文本进行实体识别
2. 识别到的新实体（不在现有图谱中）通过 `knowledge:suggestion:new`（Push Notification）推送到渲染进程
3. 渲染进程在 AI 面板或知识图谱面板中以非侵入式的卡片通知展示建议
4. 用户可选择「添加到图谱」（跳转实体创建流程）或「忽略」
5. 被忽略的实体短期内不再重复建议

识别触发条件：文档保存时（autosave 触发后）在后台异步执行，不阻塞编辑器操作。

自动识别的 IPC 通道：

| IPC 通道                       | 通信模式          | 方向            | 用途               |
| ------------------------------ | ----------------- | --------------- | ------------------ |
| `knowledge:suggestion:new`     | Push Notification | Main → Renderer | 推送新实体识别建议 |
| `knowledge:suggestion:accept`  | Request-Response  | Renderer → Main | 用户接受建议       |
| `knowledge:suggestion:dismiss` | Fire-and-Forget   | Renderer → Main | 用户忽略建议       |

#### Scenario: 系统自动识别新角色

- **假设** 用户正在编辑第三章，写到「林远的妹妹林小雨第一次出场」
- **当** 文档自动保存触发后台实体识别
- **则** 系统识别到「林小雨」为新角色（不在现有图谱中）
- **并且** 通过 `knowledge:suggestion:new` 推送建议卡片到渲染进程
- **并且** 知识图谱面板顶部出现提示「检测到新角色"林小雨"，是否添加到知识图谱？」

#### Scenario: 用户接受自动识别建议

- **假设** 知识图谱面板显示「检测到新角色"林小雨"」的建议卡片
- **当** 用户点击「添加到图谱」
- **则** 系统通过 `knowledge:suggestion:accept` 创建实体
- **并且** 自动填充实体名称为「林小雨」、类型为「角色」
- **并且** 实体详情页打开，用户可补充描述和属性

#### Scenario: 用户忽略自动识别建议

- **假设** 知识图谱面板显示「检测到新地点"废弃仓库"」的建议卡片
- **当** 用户点击「忽略」
- **则** 建议卡片消失
- **并且** 系统通过 `knowledge:suggestion:dismiss` 记录忽略状态
- **并且** 短期内（同一编辑会话中）不再为「废弃仓库」推送建议

#### Scenario: 自动识别降级——识别服务不可用

- **假设** 实体识别依赖的 LLM 调用失败（网络或配额问题）
- **当** 文档保存触发后台识别
- **则** 识别流程静默失败，不影响文档保存和编辑器操作
- **并且** 在应用日志中记录错误（不弹 Toast 打扰用户）
- **并且** 用户仍可手动添加实体

---

### Requirement: AI 续写中的知识图谱利用

AI 续写时**必须**参考知识图谱中的实体设定，确保叙事一致性。具体行为规则：

1. AI 续写提到某个角色时，**不应**与知识图谱中该角色的设定矛盾（如图谱记录「林远，28岁，性格冷静」，续写不应出现「林远暴躁地摔门」）
2. 若用户新建了一个角色但未填写详细设定，AI 续写时**应该**避免胡编该角色的背景，仅使用已有信息
3. AI**应该**优先使用知识图谱中的已有信息来保持叙事一致性

技术实现：

- 知识图谱数据通过 Context Engine 的 **Settings 层**注入 AI prompt
- 注入格式为结构化文本，包含实体名称、类型、关键属性和关系
- 注入优先级：与当前编辑内容相关的实体优先（通过语义相似度或关键词匹配筛选）
- Token 预算受 Context Engine 统一管理，知识图谱信息在 Settings 层的优先级低于用户显式设定的创作规则

查询相关实体的 IPC 通道：

| IPC 通道                   | 通信模式         | 方向            | 用途                   |
| -------------------------- | ---------------- | --------------- | ---------------------- |
| `knowledge:query:relevant` | Request-Response | Renderer → Main | 查询与文本相关的实体   |
| `knowledge:query:byIds`    | Request-Response | Renderer → Main | 按 ID 批量查询实体详情 |

#### Scenario: 续写时注入角色设定

- **假设** 知识图谱中有角色「林远」，属性包含「28岁、性格冷静、前特种兵」
- **当** 用户在第十章触发续写技能，续写内容涉及林远
- **则** Context Engine 通过 `knowledge:query:relevant` 查询到「林远」实体
- **并且** 将「林远」的设定以结构化文本注入 prompt 的 Settings 层
- **并且** AI 续写结果与林远的性格设定保持一致

#### Scenario: 未填写设定的角色——AI 避免胡编

- **假设** 知识图谱中有角色「神秘老人」，仅有名称，无任何属性和描述
- **当** 用户续写涉及「神秘老人」
- **则** AI 在续写中仅使用前文已出现的信息描写该角色
- **并且** 不编造「神秘老人」的具体年龄、背景、能力等未定义属性

#### Scenario: 知识图谱为空时的续写降级

- **假设** 当前项目的知识图谱中没有任何实体
- **当** 用户触发续写技能
- **则** Context Engine 不注入知识图谱信息（Settings 层的 KG 部分为空）
- **并且** AI 仅依赖 Immediate 层（当前章节上下文）和 Settings 层（风格偏好）进行续写
- **并且** 功能正常，不报错

---

### Requirement: 扩展视图——时间线与角色卡（P4+ 规划，非 P3 验收）

系统**应该**支持知识图谱的扩展视图，为用户提供多维度的信息组织方式。

**时间线视图**：

- 按时间轴展示事件实体的发展脉络
- 横轴为时间（支持虚拟时间，如「第一章 → 第二章」），纵轴为事件节点
- 事件节点使用 `--color-node-event` 颜色
- 支持点击事件节点查看详情
- 支持拖拽调整事件顺序

**角色卡**：

- 为每个角色实体生成结构化的信息卡片
- 卡片内容包含：头像占位区、名称、类型标签、关键属性列表、关系摘要
- 卡片使用 `--color-bg-surface` 背景，`--color-border-default` 边框，`--radius-xl` 圆角
- 角色卡组件**必须**有 Storybook Story，覆盖完整填写态、部分填写态、空态

角色卡和时间线视图通过左侧栏 Icon Bar 的 `character` 入口或知识图谱面板内的标签切换访问。

#### Scenario: 用户查看时间线视图

- **假设** 项目中有 6 个事件实体，分别关联到不同章节
- **当** 用户在知识图谱面板中切换到「时间线」标签
- **则** 事件按章节顺序在时间轴上排列
- **并且** 每个事件节点显示名称和简要描述
- **并且** 点击事件节点打开事件详情页

#### Scenario: 用户查看角色卡列表

- **假设** 项目中有 4 个角色实体
- **当** 用户点击 Icon Bar 中的角色入口
- **则** 左侧 Sidebar 显示角色卡列表
- **并且** 每张卡片展示角色名称、类型标签和关键属性摘要
- **并且** 点击卡片打开角色详情页

#### Scenario: 角色卡空状态

- **假设** 项目中没有角色实体
- **当** 用户点击 Icon Bar 中的角色入口
- **则** 显示空状态：图标 + 文案「暂无角色，开始创建你的第一个角色」
- **并且** 提供「创建角色」按钮

---

### Requirement: 查询契约、循环关系检测与降级检索

知识图谱必须定义可验证查询契约，并显式处理循环关系和查询降级。

查询 IPC：

| IPC 通道                   | 通信模式         | 方向            | 用途                      |
| -------------------------- | ---------------- | --------------- | ------------------------- |
| `knowledge:query:subgraph` | Request-Response | Renderer → Main | 获取中心实体的 k-hop 子图 |
| `knowledge:query:path`     | Request-Response | Renderer → Main | 查询两实体最短关系路径    |
| `knowledge:query:validate` | Request-Response | Renderer → Main | 校验实体与关系完整性      |

边界与算法：

- 子图查询最大 `k=3`
- 最短路径最大扩展节点 10,000
- 检测到循环引用时返回 `cycles` 列表，不中断查询

#### Scenario: 子图查询返回可用上下文

- **假设** 用户在角色「林远」详情页请求 2-hop 关系
- **当** 执行 `knowledge:query:subgraph`
- **则** 返回林远相关 2 跳实体与关系
- **并且** 响应包含 `nodeCount/edgeCount/queryCostMs`

#### Scenario: 循环关系检测并标注

- **假设** 图中存在 A->B->C->A 的循环关系
- **当** 执行 `knowledge:query:validate`
- **则** 返回 `cycles=[A,B,C,A]`
- **并且** 图谱 UI 以警告样式标注循环边，不中断可视化

---

### Requirement: 模块级可验收标准（适用于本模块全部 Requirement）

- 量化阈值：
  - 实体 CRUD p95 < 220ms
  - 子图查询 p95 < 300ms
  - 相关实体检索 p95 < 250ms
- 边界与类型安全：
  - `TypeScript strict` + zod
  - 实体/关系字段校验必须在 IPC 入口统一执行
- 失败处理策略：
  - 写入失败硬失败并可重试
  - 识别服务失败可降级（仅手动模式）
  - 查询超时返回 `KG_QUERY_TIMEOUT`
- Owner 决策边界：
  - 实体类型集合、关系类型核心枚举、注入优先级由 Owner 固定
  - Agent 不得扩展未审批核心实体类型

#### Scenario: KG 查询性能达标

- **假设** 单项目 50,000 节点、120,000 边
- **当** 执行 1,000 次 `knowledge:query:relevant`
- **则** p95 小于 250ms
- **并且** p99 小于 600ms

#### Scenario: 查询超时降级

- **假设** 图谱服务负载过高
- **当** 查询耗时超过 2s
- **则** 返回 `KG_QUERY_TIMEOUT` 并提示改用关键词过滤
- **并且** 不阻塞编辑器主流程

---

### Requirement: 异常与边界覆盖矩阵

| 类别         | 最低覆盖要求                         |
| ------------ | ------------------------------------ |
| 网络/IO 失败 | 图谱写入失败、查询失败、识别服务失败 |
| 数据异常     | 重复实体、非法关系、循环引用         |
| 并发冲突     | 并发更新同一实体、并发删除实体与关系 |
| 容量溢出     | 节点/边超上限、子图请求过大          |
| 权限/安全    | 跨项目实体访问、未授权删除           |

#### Scenario: 并发更新实体冲突

- **假设** 两个窗口同时修改实体「林远」描述
- **当** 第二次提交版本落后
- **则** 返回 `KG_ENTITY_CONFLICT`
- **并且** 提供 latest snapshot 供用户合并

#### Scenario: 节点容量超限阻断

- **假设** 项目节点已达上限 50,000
- **当** 用户继续创建节点
- **则** 返回 `KG_CAPACITY_EXCEEDED`
- **并且** 引导用户归并重复实体

---

### Non-Functional Requirements

**Performance**

- 实体 CRUD：p50 < 90ms，p95 < 220ms，p99 < 450ms
- relevant query：p50 < 110ms，p95 < 250ms，p99 < 600ms
- 子图 query：p95 < 300ms

**Capacity**

- 单项目节点上限：50,000
- 单项目边上限：200,000
- 单实体属性键上限：200

**Security & Privacy**

- 图谱数据按项目物理隔离
- 日志不记录用户完整实体描述正文
- 自动识别输入需做敏感词脱敏

**Concurrency**

- 同实体写操作串行
- 查询与写入采用读写锁
- 并发自动识别任务最大 4

#### Scenario: 读写锁保证查询稳定

- **假设** 持续写入关系边同时执行查询
- **当** 并发达到高峰
- **则** 查询仍返回一致性快照
- **并且** 不出现半写入状态

#### Scenario: 并发识别超限背压

- **假设** 自动识别任务瞬时达到 20 个
- **当** 超过上限 4
- **则** 其余任务排队并可取消
- **并且** 不影响手动实体操作

---

## P3: 角色/地点列表 CRUD（Settings Management）

> **阶段**: P3（项目制长篇创作）
> **设计决策**: P3 仅实现列表式 CRUD，不做图可视化。角色和地点是写作中最核心的设定，优先让它们"被 AI 读到"。

### Requirement: P3 — 角色条目 CRUD

系统**必须**支持用户以列表形式管理角色条目。每个角色是一条扁平记录，不涉及关系连线或图结构。

#### 接口契约

```typescript
/** P3 角色条目——列表式 CRUD */
interface CharacterEntry {
  /** 条目 ID */
  id: string
  /** 所属项目 ID */
  projectId: string
  /** 角色名称 */
  name: string
  /** 角色描述（自由文本） */
  description: string
  /** 自定义属性（键值对形式，灵活可扩展） */
  attributes: Record<string, string>
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
}

/** 角色条目创建请求 */
interface CreateCharacterRequest {
  projectId: string
  name: string
  description?: string
  attributes?: Record<string, string>
}

/** 角色条目更新请求 */
interface UpdateCharacterRequest {
  id: string
  name?: string
  description?: string
  attributes?: Record<string, string>
}
```

#### IPC 通道

| IPC 通道 | 通信模式 | 方向 | 用途 |
|----------|---------|------|------|
| `settings:character:create` | Request-Response | Renderer → Main | 创建角色 |
| `settings:character:read` | Request-Response | Renderer → Main | 读取角色详情 |
| `settings:character:update` | Request-Response | Renderer → Main | 更新角色 |
| `settings:character:delete` | Request-Response | Renderer → Main | 删除角色 |
| `settings:character:list` | Request-Response | Renderer → Main | 列出项目内角色 |

#### 数据流

```
用户编辑角色
  → settings:character:update IPC
    → Zod 校验 → SQLite 持久化
    → 通知 Context Engine 角色设定已更新
    → AI 续写时自动从 Settings 层读取最新角色设定
```

#### 错误处理

| 错误场景 | code | 处理策略 |
|---------|------|---------|
| 角色名称为空 | `CHARACTER_NAME_REQUIRED` | 阻断创建 |
| 同项目内角色重名 | `CHARACTER_NAME_DUPLICATE` | 提示用户修改 |
| 角色不存在 | `CHARACTER_NOT_FOUND` | 返回错误 |
| 属性键超长（>100 字符） | `CHARACTER_ATTR_KEY_TOO_LONG` | 校验阻断 |
| 单角色属性数超限（>50） | `CHARACTER_ATTR_LIMIT_EXCEEDED` | 校验阻断 |

#### WritingEvent 扩展

```typescript
/** P3 新增 WritingEvent——角色条目变更 */
type CharacterUpdatedEvent = {
  type: 'character-updated'
  timestamp: number
  projectId: string
  characterId: string
  action: 'created' | 'updated' | 'deleted'
}
```

#### Scenario: P3 用户创建角色条目

- **假设** 用户打开项目「暗流」的角色管理面板
- **当** 用户点击「添加角色」，输入名称「林远」
- **则** 系统通过 `settings:character:create` 创建角色条目
- **并且** 角色列表中出现「林远」
- **并且** 角色详情页打开，用户可继续填写描述和属性

#### Scenario: P3 用户编辑角色属性

- **假设** 角色「林远」已存在
- **当** 用户在详情页添加属性「年龄: 28」「性格: 冷静理性」「职业: 退休刑警」
- **则** 系统通过 `settings:character:update` 保存
- **并且** 下次 AI 续写涉及林远时，这些属性将注入 prompt

#### Scenario: P3 删除角色的确认流程

- **假设** 角色「林远」已被引用于 Memory 和 AI 上下文
- **当** 用户点击删除
- **则** 系统弹出确认对话框「删除角色"林远"后，AI 续写将不再参考该角色设定。确定？」
- **当** 用户确认
- **则** 角色被删除，Context Engine 的 Settings 层不再注入该角色

#### Scenario: P3 角色列表为空

- **假设** 新项目没有任何角色
- **当** 用户打开角色管理面板
- **则** 显示空状态：图标 + 文案「暂无角色，添加角色后 AI 续写将参考角色设定」
- **并且** 提供「添加角色」按钮

---

### Requirement: P3 — 地点条目 CRUD

系统**必须**支持用户以列表形式管理地点条目，结构与角色一致。

#### 接口契约

```typescript
/** P3 地点条目——列表式 CRUD */
interface LocationEntry {
  /** 条目 ID */
  id: string
  /** 所属项目 ID */
  projectId: string
  /** 地点名称 */
  name: string
  /** 地点描述 */
  description: string
  /** 自定义属性 */
  attributes: Record<string, string>
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
}

/** 地点条目创建请求 */
interface CreateLocationRequest {
  projectId: string
  name: string
  description?: string
  attributes?: Record<string, string>
}

/** 地点条目更新请求 */
interface UpdateLocationRequest {
  id: string
  name?: string
  description?: string
  attributes?: Record<string, string>
}
```

#### IPC 通道

| IPC 通道 | 通信模式 | 方向 | 用途 |
|----------|---------|------|------|
| `settings:location:create` | Request-Response | Renderer → Main | 创建地点 |
| `settings:location:read` | Request-Response | Renderer → Main | 读取地点详情 |
| `settings:location:update` | Request-Response | Renderer → Main | 更新地点 |
| `settings:location:delete` | Request-Response | Renderer → Main | 删除地点 |
| `settings:location:list` | Request-Response | Renderer → Main | 列出项目内地点 |

#### 错误处理

| 错误场景 | code | 处理策略 |
|---------|------|---------|
| 地点名称为空 | `LOCATION_NAME_REQUIRED` | 阻断创建 |
| 同项目内地点重名 | `LOCATION_NAME_DUPLICATE` | 提示用户修改 |
| 地点不存在 | `LOCATION_NOT_FOUND` | 返回错误 |
| 属性键超长（>100 字符） | `LOCATION_ATTR_KEY_TOO_LONG` | 校验阻断 |
| 单地点属性数超限（>50） | `LOCATION_ATTR_LIMIT_EXCEEDED` | 校验阻断 |
| 地点数量超限 | `LOCATION_CAPACITY_EXCEEDED` | 引导用户整理 |

#### WritingEvent 扩展

```typescript
/** P3 新增 WritingEvent——地点条目创建 */
type LocationCreatedEvent = {
  type: 'location-created'
  timestamp: number
  projectId: string
  locationId: string
}

/** P3 新增 WritingEvent——地点条目更新 */
type LocationUpdatedEvent = {
  type: 'location-updated'
  timestamp: number
  projectId: string
  locationId: string
}

/** P3 新增 WritingEvent——地点条目删除 */
type LocationDeletedEvent = {
  type: 'location-deleted'
  timestamp: number
  projectId: string
  locationId: string
}
```

#### Scenario: P3 用户创建地点条目

- **假设** 用户打开项目「暗流」的地点管理面板
- **当** 用户点击「添加地点」，输入名称「废弃仓库」
- **则** 系统通过 `settings:location:create` 创建地点条目
- **并且** 用户可填写描述「城郊一处废弃多年的物流仓库，布满灰尘，空气潮湿」

#### Scenario: P3 地点属性注入 AI

- **假设** 地点「废弃仓库」有属性「气氛: 阴冷压抑」「灯光: 昏暗」
- **当** 用户在该地点相关的章节中触发续写
- **则** Context Engine 查询相关地点设定并注入 Settings 层
- **并且** AI 续写对废弃仓库的环境描写与设定一致

---

### Requirement: P3 — 角色/地点设定的 AI 注入

系统**必须**将角色和地点设定自动注入 AI 续写的上下文，确保叙事一致性。

#### 注入机制

```
AI 续写触发
  → Context Engine 通过 memory:simple:inject 统一获取角色/地点设定
    （角色/地点数据由事件同步写入 MemoryRecord，canonical source 为 SimpleMemoryService）
    → Context Engine 不直接调用 settings:character:list，避免 prompt 中角色数据重复
    → 序列化为结构化文本
    → 注入 Context Engine Settings 层
```

#### 注入格式

```
[角色设定]
- 林远：28 岁，退休刑警，性格冷静理性，前特种兵
- 林小雨：林远的妹妹，性格活泼开朗

[地点设定]
- 废弃仓库：城郊废弃物流仓库，气氛阴冷压抑，灯光昏暗
```

#### 注入策略

- **precision > recall**（精确优先）：宁可漏掉不太相关的角色，也不注入无关角色占用 token
- 注入优先级：直接被文档文本提及的角色/地点 > 同章节相关 > 全项目
- Token 预算：角色/地点设定在 Settings 层中的 token 预算由 Context Engine 统一管理
- 双重截断：先按相关度选取最多 10 个角色 + 5 个地点（初始选择上限），再按 40% token 预算截断。数量上限是初始筛选门控，token 预算是最终硬约束

#### Scenario: P3 续写时注入角色设定

- **假设** 项目有 15 个角色，当前章节涉及「林远」「张薇」「神秘老人」
- **当** 用户触发续写
- **则** Context Engine 注入这 3 个角色的设定（而非全部 15 个）
- **并且** AI 续写结果与角色设定保持一致

#### Scenario: P3 无角色设定时的降级

- **假设** 项目未添加任何角色或地点
- **当** 用户触发续写
- **则** Settings 层的角色/地点部分为空
- **并且** AI 仅依赖文档上下文和风格设定进行续写
- **并且** 功能正常，不报错

#### Scenario: P3 角色设定不完整时的保守策略

- **假设** 角色「神秘老人」仅有名称，无任何属性和描述
- **当** 注入该角色设定
- **则** 仅注入「神秘老人：（无详细设定）」
- **并且** AI 不编造该角色的未定义属性

---

### P3 Settings Module 模块级可验收标准

- 量化阈值：
  - `settings:character:create` p95 < 200ms
  - `settings:character:list` p95 < 150ms
  - `settings:location:list` p95 < 150ms
  - 角色/地点设定注入 Context Engine p95 < 100ms
- 边界与类型安全：
  - `TypeScript strict` + zod
  - `settings:*` 通道返回统一 `IPCResponse`
- 失败处理策略：
  - 写入失败硬失败并返回错误码
  - 读取失败可降级（AI 续写不注入设定）
  - 设定数据损坏不影响编辑器主功能
- Owner 决策边界：
  - 注入格式和 token 预算由 Owner 固定
  - Agent 不可扩展实体类型（P3 仅 character + location）

#### Scenario: P3 角色/地点 CRUD 性能达标

- **假设** 项目有 200 个角色、100 个地点
- **当** 连续执行 500 次 list 查询
- **则** p95 < 150ms
- **并且** 无超时错误

#### Scenario: P3 角色容量上限

- **假设** 项目角色数已达 500
- **当** 用户继续创建角色
- **则** 返回 `{ code: "CHARACTER_CAPACITY_EXCEEDED", message: "角色数量已达上限" }`
- **并且** 引导用户整理或删除不再需要的角色

---

### P3 不做清单（Settings Module）

- ❌ 不做图可视化（力导向图、关系连线）
- ❌ 不做关系管理（角色之间的关系类型和连线）
- ❌ 不做自动实体识别与建议添加
- ❌ 不做时间线视图
- ❌ 不做事件/物品/阵营实体（P3 仅 character + location）
- ❌ 不做子图查询、最短路径查询
- ❌ 不做循环关系检测
- ❌ 不做角色卡组件（P3 用列表 + 详情页替代）
