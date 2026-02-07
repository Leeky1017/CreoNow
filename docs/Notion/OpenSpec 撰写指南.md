# OpenSpec 撰写指南

本文档定义 CreoNow 项目中 OpenSpec 的撰写标准、工作机制和协作流程。面向项目 Owner（非编程背景）和 AI Agent 双方，确保 spec 既能准确表达产品意图，又能直接驱动 TDD 开发。与 [测试规范与 TDD 指南](https://www.notion.so/TDD-e6b00c14cffa410291b04b7a43c44a40?pvs=21) 和 [交付流程与 CI/CD 规范](https://www.notion.so/CI-CD-0f8c0f375299448ba81f0955845ba847?pvs=21) 配套使用。

---

# 一、OpenSpec 是什么

## 1.1 一句话定义

OpenSpec 是一套**规范驱动开发（Spec-Driven Development）**框架。它的核心思想是：维护一份统一的、活的行为规范文档作为系统设计的唯一权威参考，所有代码开发都必须以这份规范为起点。

## 1.2 在 CreoNow 中的角色

在 CreoNow 这样一个完全由 AI Agent 开发的项目中，OpenSpec 承担着特殊的使命：

<aside>
💡

**OpenSpec = 你和 Agent 之间的合同**

你（项目 Owner）负责定义「系统应该做什么」，Agent 负责实现「系统怎么做到」。Spec 就是这份合同——它把你脑子里的想法变成 Agent 能精确理解和执行的格式。

</aside>

没有 spec 时，Agent 只能根据模糊的口头描述去猜，质量完全不可控。有了 spec，Agent 的每一行代码都有据可依，你也有了验收的标准。

## 1.3 OpenSpec 不是什么

| **OpenSpec 是** | **OpenSpec 不是** |
| --- | --- |
| 产品行为的精确描述 | 技术实现方案（不写代码结构、不写算法细节） |
| Agent 写代码前必须阅读的输入 | 写完代码后补的文档 |
| 活的、随系统演进的文档 | 一次性写完就不动的需求文档 |
| 可直接翻译为测试用例的场景 | 抽象的、不可验证的愿景描述 |

---

# 二、你的工作流程

## 2.1 核心循环

你不需要手动写 spec 的每一个字。你的工作流是：

```
想法 → 描述 → AI 起草 → 你审阅优化 → 确认 → Agent 执行
```

具体展开：

| **步骤** | **你做什么** | **AI/Agent 做什么** | **产出** |
| --- | --- | --- | --- |
| 1. 表达想法 | 用自然语言描述你想要的功能或改动 | — | 你的需求描述（聊天消息、语音备忘等） |
| 2. 起草 Proposal | 审阅 AI 起草的 proposal | 将你的想法结构化为 [`proposal.md`](http://proposal.md) | [`proposal.md`](http://proposal.md)（变更提案） |
| 3. 起草 Spec | 审阅每个 Scenario 是否符合你的意图 | 将 proposal 细化为 GIVEN/WHEN/THEN 场景 | [`spec.md`](http://spec.md)（行为规范） |
| 4. 优化 | 补充遗漏的场景、修正不准确的描述 | 根据你的反馈调整 spec | 定稿的 spec |
| 5. 确认执行 | 确认 spec 可以交给开发 Agent 执行 | — | 创建 Issue，开始开发 |
| 6. 验收 | 查看测试覆盖和实际效果 | 按 spec 写测试、写实现、提交 PR | 合并的 PR |

## 2.2 你的审阅清单

当 AI 为你起草了 spec 后，你需要检查以下几点：

- [ ]  **每个 Scenario 我都能看懂吗？**（如果看不懂，说明写得太技术化，要求重写）
- [ ]  **正常情况覆盖了吗？**（用户正常使用时应该发生什么）
- [ ]  **异常情况覆盖了吗？**（输入为空、数据不存在、服务不可用时怎么办）
- [ ]  **边界情况覆盖了吗？**（刚好等于阈值、只有一个元素、超大数据量）
- [ ]  **我能用这些 Scenario 来验收吗？**（如果不能，说明描述太模糊）
- [ ]  **有没有我关心但没写到的情况？**（你的直觉很重要，补上去）

## 2.3 你描述想法时的最佳实践

你的描述不需要很正式，但包含以下信息会让 AI 起草的 spec 质量更高：

**说清楚「为什么」**

> ❌ 「给记忆加一个衰减功能」
> 

> ✅ 「角色记忆不应该永远不变。如果一个细节很久没被提到，续写时它的影响应该减弱。这样更像真实的叙事。」
> 

**说清楚「用户感知」**

> ❌ 「优化上下文引擎」
> 

> ✅ 「现在续写的时候，AI 经常会忘记前面章节的设定。我希望即使在第 20 章，AI 也能记住第 1 章的关键设定。」
> 

**说清楚「不要什么」**

> ❌ （没说）
> 

> ✅ 「但我不希望所有记忆都永远保留，那样会导致上下文太长，续写质量反而下降。」
> 

---

# 三、Spec 文件结构标准

## 3.1 主规范（Source of Truth Spec）

每个功能模块有一个 [`spec.md`](http://spec.md)，代表该模块**当前的完整行为定义**。

### 必须包含的结构

```markdown
# <模块名称> Specification

## Purpose
一句话描述模块的核心职责。
不写实现方式，只写「这个模块对系统有什么价值」。

## Requirements

### Requirement: <行为名称>
<用 1-3 句话描述这个行为的规则>

#### Scenario: <正常场景名称>
- GIVEN <前置条件>
- WHEN <触发动作>
- THEN <期望结果>

#### Scenario: <异常场景名称>
- GIVEN <前置条件>
- WHEN <异常输入/异常情况>
- THEN <期望的错误处理>

#### Scenario: <边界场景名称>
- GIVEN <边界条件>
- WHEN <触发动作>
- THEN <边界情况下的期望结果>
```

### 完整示例：记忆衰减

```markdown
# Memory System Specification

## Purpose
管理创作项目中的角色记忆、世界观设定和情节事件的存储与检索，
确保 AI 续写时能获得相关且适量的上下文信息。

## Requirements

### Requirement: 记忆衰减
长时间未被引用的记忆应逐渐降低权重，使上下文引擎优先使用
近期活跃的记忆。但标记为「核心设定」的记忆不受衰减影响。

#### Scenario: 长期未引用的记忆权重下降
- GIVEN 一条普通记忆已 30 天未被引用
- WHEN 上下文引擎组装 retrieved 层
- THEN 该记忆的权重低于 7 天内引用过的同类型记忆

#### Scenario: 被再次引用后权重恢复
- GIVEN 一条已衰减的记忆（30 天未引用）
- WHEN 用户在新文本中再次提及相关内容，系统识别到引用
- THEN 该记忆的权重恢复到初始水平

#### Scenario: 核心设定不衰减
- GIVEN 一条标记为「核心设定」的记忆
- WHEN 经过 365 天未被引用
- THEN 权重始终不低于核心设定最低阈值

#### Scenario: 所有记忆均已衰减
- GIVEN retrieved 层的所有候选记忆权重都低于最低可用阈值
- WHEN 上下文引擎组装 retrieved 层
- THEN retrieved 层返回空集合，不注入低质量记忆

### Requirement: 记忆检索
...
```

## 3.2 变更提案（Proposal）

当需要新增功能或修改现有行为时，先写 [`proposal.md`](http://proposal.md)。

### 必须包含的结构

```markdown
# 提案：<变更标题>

## 背景
为什么需要这个变更？当前的问题是什么？

## 变更内容
- <变更点 1>
- <变更点 2>

## 受影响的模块
- <模块名> — <如何受影响>

## 不做什么（可选但推荐）
明确列出本次变更不涉及的范围，防止 Agent 过度发挥。
```

### Proposal 的审阅标准

- 背景是否清晰说明了「为什么」？
- 变更内容是否具体到可以写 Scenario？
- 受影响模块是否完整列出？
- 是否明确了不做什么？

## 3.3 Delta Spec（变更规范）

变更提案确认后，需要写 Delta Spec——即对主规范的增量修改。Delta Spec 使用标记来标识变更类型：

```markdown
### Requirement: 记忆衰减 [ADDED]
...

### Requirement: 记忆检索 [MODIFIED]
原有的检索逻辑不变，但新增衰减权重作为排序因子。

#### Scenario: 检索结果按衰减权重排序 [ADDED]
- GIVEN 多条记忆匹配当前文本
- WHEN 上下文引擎检索记忆
- THEN 结果按衰减后的权重降序排列
```

三种标记：

- **[ADDED]**：新增的 Requirement 或 Scenario
- **[MODIFIED]**：修改了已有的描述或条件
- **[REMOVED]**：删除了已有的 Requirement 或 Scenario

---

# 四、Scenario 编写规范

Scenario 是 spec 中最重要的部分。它是 Agent 写测试和写代码的直接输入。

## 4.1 GIVEN / WHEN / THEN 格式

| **关键词** | **含义** | **写作要求** |
| --- | --- | --- |
| **GIVEN** | 前置条件——场景开始时系统的状态 | 必须具体、可构造。Agent 需要能在测试中 setup 这个状态。 |
| **WHEN** | 触发动作——用户或系统做了什么 | 必须是单一动作。如果有多个动作，拆成多个 Scenario。 |
| **THEN** | 期望结果——系统应该产生什么响应 | 必须可验证。Agent 需要能在测试中 assert 这个结果。 |

## 4.2 好的 Scenario vs 坏的 Scenario

**✅ 好的：具体、可验证、无歧义**

```markdown
#### Scenario: Token 预算不足时优先保障 immediate 层
- GIVEN 总 token 预算为 200
- WHEN 上下文引擎分配预算
- THEN immediate 层获得的 token 数不低于 100
- AND rules 层 + settings 层 + retrieved 层共享剩余预算
```

**❌ 坏的：模糊、不可验证、有歧义**

```markdown
#### Scenario: 预算分配应该合理
- GIVEN 预算比较少
- WHEN 分配预算
- THEN 各层获得合理的分配
```

问题在于：「比较少」是多少？「合理」是什么标准？Agent 无法根据这个写测试。

## 4.3 Scenario 的三条路径覆盖原则

与 [测试规范与 TDD 指南](https://www.notion.so/TDD-e6b00c14cffa410291b04b7a43c44a40?pvs=21) 中的 §2.6 对齐，每个 Requirement 至少覆盖三类 Scenario：

| **路径类型** | **描述** | **示例** |
| --- | --- | --- |
| **正常路径（Happy Path）** | 标准输入，预期输出 | 用户触发续写，AI 返回续写结果 |
| **边界情况（Edge Cases）** | 极端值、空值、刚好等于阈值 | token 预算刚好等于最低值、知识图谱中只有 1 个实体 |
| **错误路径（Error Path）** | 无效输入、服务不可用、数据缺失 | LLM API 超时、知识图谱为空、记忆数据损坏 |

**你在审阅 spec 时，看到一个 Requirement 下面只有正常路径的 Scenario，就应该要求补充边界和错误路径。** 这是你作为审阅者最有价值的反馈。

## 4.4 用数字消除模糊

| **模糊写法 ❌** | **精确写法 ✅** |
| --- | --- |
| 长时间未引用的记忆应衰减 | 超过 30 天未引用的记忆，权重应降至初始值的 50% 以下 |
| 续写结果不能太长 | 续写结果的 token 数不超过 500 |
| 检索应该很快 | 知识图谱检索响应时间不超过 200ms（1000 个实体规模下） |
| 上下文不能占太多空间 | 组装后的上下文总 token 数不超过 budget 参数指定的值 |

如果你暂时定不了具体数字，写成 `<TBD: 待性能测试后确定>` 也可以，但不能留一个模糊的形容词。Agent 看到 TBD 会知道先跳过，看到「很快」会按自己的理解乱写。

---

# 五、OpenSpec 与 TDD 的衔接

原生 OpenSpec 不包含 TDD 要求。以下是 CreoNow 项目中的补充规范。

## 5.1 Scenario → 测试用例的映射关系

每个 Scenario **必须**被翻译为至少一个测试用例。这是 Agent 的硬性要求。

```
Spec Scenario          →  测试用例
──────────────────────────────────────────────────
GIVEN                  →  Arrange（准备输入和依赖）
WHEN                   →  Act（执行被测行为）
THEN                   →  Assert（验证结果）
```

示例对照：

| **Spec（你写的/审阅的）** | **测试（Agent 写的）** |
| --- | --- |
| GIVEN 一条普通记忆已 30 天未被引用 | `const memory = createMemory({ lastReferenced: daysAgo(30) })` |
| WHEN 上下文引擎组装 retrieved 层 | `const result = contextEngine.buildRetrieved()` |
| THEN 该记忆的权重低于 7 天内引用过的同类型记忆 | `expect(result.weight(oldMemory)).toBeLessThan(result.weight(recentMemory))` |

## 5.2 TDD 对 Spec 的反向要求

TDD 要求测试必须可独立运行、确定性、快速反馈（详见 [测试规范与 TDD 指南](https://www.notion.so/TDD-e6b00c14cffa410291b04b7a43c44a40?pvs=21)）。这对 spec 的写法提出了以下约束：

### 约束一：GIVEN 必须可构造

```markdown
❌ GIVEN 系统已运行一段时间（Agent 无法在测试中 setup「运行一段时间」）
✅ GIVEN 一条记忆的 lastReferenced 时间为 30 天前
```

### 约束二：THEN 必须可断言

```markdown
❌ THEN 续写结果的质量应该不错（什么是「不错」？无法用代码判断）
✅ THEN 续写结果中不包含知识图谱中不存在的角色名
```

### 约束三：Scenario 不能依赖外部状态

```markdown
❌ GIVEN 用户昨天创建了一个角色（依赖真实时间）
✅ GIVEN 知识图谱中存在一个角色「林黛玉」，创建时间为任意过去时间
```

### 约束四：每个 Scenario 必须独立

```markdown
❌ Scenario A 创建角色，Scenario B 检查角色是否存在
   （B 依赖 A 的结果，不能独立运行）

✅ Scenario A：创建角色后，图谱中应包含该角色
   Scenario B：GIVEN 图谱中已有角色 X，WHEN 查询，THEN 返回 X
   （各自独立，各自 setup 自己需要的前置条件）
```

## 5.3 Agent 的执行流程（TDD + OpenSpec）

当 Agent 收到一个开发任务时，必须按以下顺序执行：

1. **读 spec** — 找到相关模块的 [`spec.md`](http://spec.md)，理解所有 Requirement 和 Scenario
2. **写测试** — 把每个 Scenario 翻译为测试用例，运行确认全部失败（Red）
3. **写实现** — 编写最少量代码让测试通过（Green）
4. **重构** — 在绿灯保护下优化代码结构（Refactor）
5. **交叉验证** — 确认测试覆盖了 spec 中的所有 Scenario，无遗漏

**禁止行为**：

- 禁止跳过 spec 直接写代码
- 禁止先写实现再补测试
- 禁止测试覆盖的 Scenario 少于 spec 中定义的 Scenario
- 禁止 Scenario 在 spec 中被删除后，对应的测试仍然保留（保持同步）

---

# 六、变更流程（Change Workflow）

## 6.1 三阶段流程

所有对主规范（Source of Truth Spec）的修改必须经过三个阶段：

```
Proposal → Apply → Archive
```

| **阶段** | **做什么** | **产出** | **谁负责** |
| --- | --- | --- | --- |
| **Proposal** | 描述变更意图，起草 proposal + delta spec | `changes/<name>/[proposal.md](http://proposal.md)`
`changes/<name>/specs/**/[spec.md](http://spec.md)` | 你描述想法 → AI 起草 → 你审阅确认 |
| **Apply** | 按 delta spec 实现代码（TDD 流程） | PR（含测试和实现） | Agent 执行 |
| **Archive** | PR 合并后，将 delta spec 合并回主 spec，归档变更记录 | 更新的 `specs/**/[spec.md](http://spec.md)`
归档的 `changes/<name>/` | Agent 执行 |

## 6.2 为什么不能直接改主 Spec？

主 Spec 代表系统的**当前真实状态**。如果直接改主 spec：

- 改了 spec 但代码还没改 → spec 和代码不一致 → 一切混乱
- 没有 proposal 记录 → 事后不知道为什么改 → 决策不可追溯
- 没有 delta 标记 → Agent 不知道哪些是新增的、哪些是修改的 → 容易遗漏

通过 Proposal → Apply → Archive 流程：

- 主 spec 永远和代码同步（只在代码合并后才更新主 spec）
- 每次变更都有 proposal 留痕
- delta 标记让 Agent 精确知道改动范围

## 6.3 变更的文件结构

```
openspec/changes/add-memory-decay/
├── proposal.md              ← 变更提案
├── tasks.md                 ← Rulebook 任务拆解
└── specs/
    └── memory-system/
        └── spec.md          ← Delta Spec（标记 ADDED/MODIFIED/REMOVED）
```

---

# 七、Spec 的持续维护

## 7.1 何时需要更新 Spec

| **触发事件** | **Spec 操作** |
| --- | --- |
| 新增功能 | 新建变更（Proposal → Delta Spec），合并后归档到主 Spec |
| 修改已有行为 | 新建变更，Delta Spec 中标记 [MODIFIED] |
| 删除功能 | 新建变更，Delta Spec 中标记 [REMOVED] |
| 修复 Bug（行为不变） | 不需要改 Spec（因为行为定义没变，只是实现有 bug） |
| 重构（行为不变） | 不需要改 Spec（因为行为定义没变，只是内部结构变了） |

## 7.2 Spec 和测试的同步规则

Spec 和测试必须保持同步。这是一条硬规则：

- **Spec 新增了 Scenario → 必须有对应的新测试**
- **Spec 修改了 Scenario → 对应的测试必须同步修改**
- **Spec 删除了 Scenario → 对应的测试必须同步删除**
- **测试发现的新边界情况 → 应反向补充到 Spec 中**

最后一条很重要：如果 Agent 在开发中发现了 spec 没覆盖到的边界情况，不能只写测试不更新 spec。Spec 是唯一权威参考，必须保持完整。

## 7.3 Spec 的健康度检查

定期（如每个开发周期结束时）检查：

- [ ]  每个代码模块都有对应的 spec 吗？
- [ ]  每个 spec 的 Scenario 都有对应的测试吗？
- [ ]  有没有测试存在但 spec 中没有对应 Scenario 的情况？
- [ ]  主 spec 中是否有残留的 [ADDED]/[MODIFIED] 标记未清理？
- [ ]  `changes/` 目录中是否有已合并但未归档的变更？

---

# 八、目录结构参考

```
openspec/
├── project.md                         ← 项目概述（Agent 的入口文件）
│
├── specs/                             ← 主规范（Source of Truth）
│   ├── context-engine/
│   │   └── spec.md
│   ├── knowledge-graph/
│   │   └── spec.md
│   ├── memory-system/
│   │   └── spec.md
│   ├── skill-system/
│   │   └── spec.md
│   ├── editor/
│   │   └── spec.md
│   ├── ipc/
│   │   └── spec.md
│   └── version-control/
│       └── spec.md
│
├── changes/                           ← 进行中的变更
│   ├── add-memory-decay/
│   │   ├── proposal.md
│   │   ├── tasks.md
│   │   └── specs/
│   │       └── memory-system/
│   │           └── spec.md            ← Delta Spec
│   └── improve-context-budget/
│       ├── proposal.md
│       ├── tasks.md
│       └── specs/
│           └── context-engine/
│               └── spec.md
│
└── _ops/
    └── task_runs/                     ← 执行证据（RUN_LOG）
        ├── ISSUE-1.md
        └── ISSUE-2.md
```

---

# 九、速查表

## 9.1 你（项目 Owner）的速查

| **我想…** | **我应该…** |
| --- | --- |
| 加一个新功能 | 描述想法 → 让 AI 起草 proposal + spec → 审阅 → 确认执行 |
| 改一个已有功能的行为 | 同上，但 delta spec 中用 [MODIFIED] 标记改动 |
| 删掉一个功能 | 写 proposal 说明原因 → delta spec 用 [REMOVED] 标记 |
| 修复一个 bug | 如果 spec 本身没问题（行为定义是对的，只是实现有 bug）→ 直接修复，不改 spec |
| 验收 Agent 的交付 | 检查：测试是否覆盖了 spec 中所有 Scenario？实际效果是否符合预期？ |

## 9.2 Agent 的速查

| **Agent 收到…** | **Agent 应该…** |
| --- | --- |
| 一个新功能的开发任务 | 读 spec → 写测试（Red）→ 写实现（Green）→ 重构（Refactor）→ 交叉验证覆盖度 |
| Owner 描述的想法（非正式） | 起草 [proposal.md](http://proposal.md)  • delta spec → 提交给 Owner 审阅 |
| 一个 bug 修复任务 | 检查 spec 是否正确 → 如果 spec 正确，补测试+修代码；如果 spec 有误，先走变更流程改 spec |
| 开发中发现 spec 遗漏的场景 | 先在 delta spec 中补充 → 通知 Owner → 等确认后再写对应测试和实现 |

---

本文档为 CreoNow 项目的 OpenSpec 撰写权威指南。所有 spec 的编写、审阅和变更必须遵循本文档中的标准。