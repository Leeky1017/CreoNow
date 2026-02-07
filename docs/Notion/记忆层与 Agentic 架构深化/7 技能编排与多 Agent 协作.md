# 7. 技能编排与多 Agent 协作

<aside>
🔗

**核心思想**：单个技能解决单个问题，编排层解决复杂问题；单个 Agent 擅长一个领域，多 Agent 协作覆盖全部创作需求。本章定义 CN 的高阶 AI 协作架构。

</aside>

---

## Part 1：技能编排（Skill Orchestration）

---

### 1. 为什么需要编排层？

当前技能系统是**扁平的**——每个技能独立运行，互不知晓。但真实创作场景中，任务往往需要**多个技能协同**：

| **任务** | **涉及的技能** | **协同方式** |
| --- | --- | --- |
| "用金庸风格重写这段对白" | 风格分析 → 改写 → 角色声音检查 | 串行流水线 |
| "帮我写三个不同版本的结局" | 续写 × 3（并行） → 对比分析 | 并行分支 + 汇合 |
| "扩写这段但不超过 500 字" | 扩写 → 字数检查 → 如超出则缩写 | 条件循环 |
| "修改这个角色性格并更新全文" | 知识图谱更新 → 全文扫描 → 批量改写 → 一致性检查 | 复杂 DAG |

---

### 2. 编排模型

#### 编排原语

CN 的技能编排支持四种基本模式，可嵌套组合：

#### a. 串行流水线（Pipeline）

```
技能 A → 技能 B → 技能 C
   输出 A 作为输入 B，输出 B 作为输入 C
```

```tsx
interface Pipeline {
  type: 'pipeline';
  steps: SkillInvocation[];
  // 数据流：前一步的输出自动作为后一步的输入
}
```

#### b. 并行分支（Parallel）

```
         ┌→ 技能 A ─┐
输入 ──→ ├→ 技能 B ─┤→ 汇合处理
         └→ 技能 C ─┘
```

```tsx
interface Parallel {
  type: 'parallel';
  branches: SkillInvocation[];
  merge: MergeStrategy;  // 'best_of' | 'combine' | 'user_choose'
}
```

#### c. 条件分支（Conditional）

```
      条件判断
     ╱        ╲
  true        false
   │            │
技能 A       技能 B
```

```tsx
interface Conditional {
  type: 'conditional';
  condition: ConditionCheck;  // 可以是字数检查、质量评分等
  ifTrue: OrchestrationNode;
  ifFalse: OrchestrationNode;
}
```

#### d. 循环（Loop）

```
┌→ 技能 A → 条件检查 ──满足──→ 输出
│                │
└── 不满足 ←─────┘
```

```tsx
interface Loop {
  type: 'loop';
  body: OrchestrationNode;
  condition: ConditionCheck;    // 继续循环的条件
  maxIterations: number;        // 安全上限
}
```

---

### 3. 用户自定义编排（Skill Chains）

允许用户创建可保存和复用的技能链：

```tsx
interface SkillChain {
  id: string;
  name: string;                    // 如 "金庸风格改写流程"
  description: string;
  scope: 'global' | 'project';
  
  // 编排定义
  orchestration: OrchestrationNode;
  
  // 输入参数模板
  inputTemplate: {
    requiredInputs: string[];     // 如 ['selectedText', 'targetStyle']
    optionalInputs: string[];
  };
  
  // 元数据
  createdAt: number;
  usageCount: number;
  avgSatisfactionScore: number;  // 来自用户反馈
}
```

**用户创建技能链的 UI（简化版）**：

```
┌─────────────────────────────────────────────┐
│  ⛓ 创建技能链                                │
├─────────────────────────────────────────────┤
│                                             │
│  名称: [金庸风格改写流程        ]              │
│                                             │
│  步骤:                                       │
│  ┌──────────────────────────────┐           │
│  │ 1. 🎨 风格分析                │           │
│  │    输入: 选中文本              │           │
│  │    输出: 当前风格特征          │           │
│  │                    [+ 条件]   │           │
│  ├──────────────────────────────┤           │
│  │       ↓ (传递给下一步)        │           │
│  ├──────────────────────────────┤           │
│  │ 2. ✏️ 风格迁移改写            │           │
│  │    目标风格: 金庸              │           │
│  │    约束: 保持剧情不变          │           │
│  ├──────────────────────────────┤           │
│  │       ↓                      │           │
│  ├──────────────────────────────┤           │
│  │ 3. 🎭 角色声音验证            │           │
│  │    如果不通过 → 回到步骤 2     │           │
│  └──────────────────────────────┘           │
│                                             │
│  [保存] [测试运行]                            │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 4. 内置编排模板

CN 预装常用的编排模板，用户可直接使用或基于模板修改：

| **模板名** | **流程** | **适用场景** |
| --- | --- | --- |
| 精修流水线 | 改写 → 风格检查 → 一致性检查 | 段落级精修 |
| 多版本对比 | 续写 ×3（并行） → 展示对比 → 用户选择 | 探索不同方向 |
| 渐进式扩写 | 扩写 → 字数检查 → 如超出则缩写（循环） | 精确控制字数 |
| 全文角色重塑 | 知识图谱更新 → 全文扫描 → 逐段改写 → 一致性验证 | 角色性格调整 |
| 章节完成检查 | 一致性检查 + 伏笔状态 + 节奏分析（并行）→ 汇总报告 | 写完一章后的自检 |

---

## Part 2：多 Agent 协作架构

---

### 1. 为什么要多 Agent？

单个 AI 调用在长 prompt 下容易出现：

- **注意力稀释**：太多指令导致部分被忽略
- **角色混淆**：同时要求"写出好文字"和"检查一致性"，两个目标可能互相干扰
- **上下文浪费**：一致性检查不需要风格记忆，但单 Agent 模式下它们共享同一个上下文窗口

**多 Agent 方案**：每个 Agent 专注一个职责，拥有独立的 system prompt、上下文配置和记忆子集。

---

### 2. Agent 角色定义

```
┌─────────────────────────────────────────────────────┐
│                   Orchestrator Agent                  │
│            （编排者：理解用户意图，分配任务）            │
├───────────┬───────────┬───────────┬─────────────────┤
│  Writer   │  Editor   │  Lore     │  Narrator       │
│  Agent    │  Agent    │  Keeper   │  Agent          │
│  写手     │  编辑     │  设定守卫  │  叙事顾问       │
└───────────┴───────────┴───────────┴─────────────────┘
```

#### Agent 详细定义

| **Agent** | **职责** | **上下文来源** | **记忆子集** |
| --- | --- | --- | --- |
| **🎯 Orchestrator** | 理解用户意图，分解任务，分配给专职 Agent，汇总结果 | 用户指令 + 任务历史 | 无独立记忆 |
| **✍️ Writer** | 生成文字内容（续写、改写、扩写等核心创作任务） | Immediate + Retrieved + 风格记忆 | 风格偏好 + 情景记忆 |
| **📝 Editor** | 审查文字质量（语法、风格、节奏），提供修改建议 | 生成内容 + 风格规则 | 风格偏好 |
| **📚 Lore Keeper** | 守护设定一致性，管理知识图谱，检查矛盾 | 知识图谱 + Rules 层 | 无（直接查知识图谱） |
| **🎭 Narrator** | 分析叙事结构（伏笔、节奏、角色弧光），提供叙事建议 | 全文大纲 + 伏笔追踪数据 | 叙事偏好 |

---

### 3. Agent 间通信协议

```tsx
interface AgentMessage {
  from: AgentRole;
  to: AgentRole;
  type: 'request' | 'response' | 'alert' | 'query';
  
  payload: {
    task?: TaskDescription;
    result?: TaskResult;
    query?: string;
    alert?: AlertInfo;
  };
  
  // 上下文传递（仅传递接收方需要的部分）
  contextSlice: {
    relevantEntities?: Entity[];
    relevantMemory?: MemoryEntry[];
    relevantText?: string;
  };
  
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
}
```

### 4. 协作流程示例

**用户指令**："续写下一段，注意林远的性格和前面埋的伏笔"

```
用户指令
    │
    ▼
🎯 Orchestrator
    ├── 解析意图：续写 + 角色一致性 + 伏笔关联
    │
    ├── 1) 向 📚 Lore Keeper 查询
    │      "林远的性格设定？当前未回收的伏笔？"
    │      → 返回：林远性格描述 + 2 个活跃伏笔
    │
    ├── 2) 向 🎭 Narrator 查询
    │      "当前叙事节奏如何？适合插入伏笔回收吗？"
    │      → 返回：节奏分析 + 建议（适合轻度提及伏笔A）
    │
    ├── 3) 将收集到的信息整合，派发给 ✍️ Writer
    │      "续写下一段，要求：
    │       - 符合林远性格（果断、寡言）
    │       - 自然地提及伏笔A（红色信封）
    │       - 保持当前的紧张节奏"
    │      → 返回：续写文本草稿
    │
    ├── 4) 将草稿交给 📝 Editor 审查
    │      → 返回：审查通过，1 个小建议
    │
    ├── 5) 将草稿交给 📚 Lore Keeper 做一致性检查
    │      → 返回：无矛盾
    │
    └── 6) 汇总结果呈现给用户
           续写文本 + 审查报告 + 一致性确认
```

---

### 5. 渐进式部署策略

<aside>
📌

多 Agent 架构不需要一步到位。以下是建议的渐进式部署路径。

</aside>

#### Phase 1：单 Agent + 多 Prompt（MVP）

- 只有一个 AI 调用，但通过不同的 system prompt 模拟不同角色
- 例如：先用"Writer prompt"生成，再用"Editor prompt"审查
- **优点**：实现简单，无需 Agent 通信机制
- **缺点**：无法并行，上下文共享可能导致干扰

#### Phase 2：双 Agent（Writer + Reviewer）

- 分离生成和审查为两个独立的 AI 调用
- Writer 有自己的上下文（风格 + 记忆 + 当前段落）
- Reviewer 有自己的上下文（规则 + 知识图谱 + 生成结果）
- **这是性价比最高的阶段**，解决了最核心的质量问题

#### Phase 3：四 Agent 完整架构

- 完整部署 Orchestrator + Writer + Editor + Lore Keeper
- Narrator Agent 可以作为可选插件

#### Phase 4：可扩展 Agent 框架

- 允许用户自定义 Agent（类似自定义技能，但是 Agent 级别）
- 例如：用户可以创建一个"方言顾问 Agent"，专门负责检查对白中的方言用法是否正确

---

### 6. 成本控制

<aside>
💰

多 Agent 意味着多次 AI 调用，成本是重要的设计约束。

</aside>

#### 成本优化策略

| **策略** | **方法** | **节省幅度** |
| --- | --- | --- |
| 按需激活 | Lore Keeper 仅在涉及设定相关的任务时激活，而非每次都参与 | ~30% |
| 模型分级 | Writer 用强模型（如 Claude Sonnet），Editor 用轻量模型（如 Haiku）做规则检查 | ~40% |
| Prompt caching | 利用分层上下文的 stablePrefixHash，Agent 的 system prompt + 静态上下文部分可被缓存 | ~50%（重复调用） |
| 本地规则引擎 | 一致性检查和风格检查中的简单规则（字数、格式）用本地代码执行，不调用 AI | ~20% |
| 用户可配置 | 让用户选择"快速模式"（仅 Writer）或"完整模式"（全部 Agent） | 用户可控 |

---

## 总结：从工具到搭档

```
当前状态                          目标状态
────────                        ────────
单步技能调用                      多步任务规划
无反思                           自动审查 + 修正循环
被动响应                          主动感知 + 提醒
扁平技能列表                      可编排的技能链
单一 AI 调用                      专职多 Agent 协作

           ┌────────────────────────┐
           │  CreoNow 从"工具"进化为  │
           │    "AI 写作搭档"         │
           └────────────────────────┘
```