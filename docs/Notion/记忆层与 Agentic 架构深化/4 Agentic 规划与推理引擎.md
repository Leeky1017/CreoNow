# 4. Agentic 规划与推理引擎

<aside>
🧭

**核心思想**：真正的 Agentic 能力不是"调用一个 API 然后返回结果"，而是 AI 能够**自主分解复杂任务、制定执行计划、按步骤推进、并在过程中动态调整**。对于创作场景，这意味着 AI 能像一个真正的写作搭档一样，理解"帮我把第三章的伏笔收回来"这种高层次指令。

</aside>

---

## 1. 从单步技能到多步规划

### 当前技能系统的局限

当前技能系统本质上是**单步工具调用**：

```
用户指令 → 选择技能 → 执行 → 返回结果
```

但创作场景中大量任务是**多步的、需要推理的**：

| **用户指令** | **需要的步骤** | **单步技能能否完成？** |
| --- | --- | --- |
| "帮我把第三章的伏笔在第十章回收" | 定位伏笔 → 理解当前第十章 → 寻找植入点 → 生成文本 | ❌ 不行 |
| "把这个角色的性格从懦弱改成果断，调整之前所有相关描写" | 定位所有相关段落 → 理解每段上下文 → 逐段改写 → 一致性检查 | ❌ 不行 |
| "按照金庸的风格重写这一章" | 分析金庸风格特征 → 分段处理 → 保持剧情不变仅改风格 → 连贯性检查 | ❌ 不行 |
| "续写 200 字" | 理解上下文 → 生成续写 | ✅ 可以 |

---

## 2. 任务规划器（Task Planner）

### 架构

```
用户高层指令
     │
     ▼
┌──────────────┐
│ Intent Parser │  ← 意图解析：理解用户想做什么
└──────────────┘
     │
     ▼
┌──────────────┐
│ Task Planner  │  ← 任务规划：分解为有序步骤
└──────────────┘
     │
     ▼
┌──────────────┐
│  Executor     │  ← 逐步执行，每步调用对应技能
└──────────────┘
     │
     ▼
┌──────────────┐
│  Reviewer     │  ← 执行后审查（见"反思机制"章节）
└──────────────┘
```

### Intent Parser（意图解析器）

将用户的自然语言指令解析为结构化意图：

```tsx
interface ParsedIntent {
  // 意图类型
  type: 
    | 'single_generation'    // 单步生成（续写、改写等）
    | 'multi_step_edit'      // 多步编辑（角色性格修改、风格迁移等）
    | 'cross_reference'      // 跨章节操作（伏笔回收、一致性修复等）
    | 'analysis'             // 分析类（节奏分析、角色弧光检查等）
    | 'question';            // 问答类（"这个角色之前说过什么？"）
  
  // 涉及的实体
  entities: {
    characters: string[];    // 涉及的角色
    chapters: string[];      // 涉及的章节
    scenes: string[];        // 涉及的场景
    plotElements: string[];  // 涉及的剧情元素（伏笔、冲突等）
  };
  
  // 约束条件
  constraints: {
    preservePlot: boolean;   // 是否保持剧情不变
    preserveStyle: boolean;  // 是否保持风格不变
    scope: 'paragraph' | 'scene' | 'chapter' | 'global';
  };
  
  // 预估复杂度
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}
```

### Task Planner（任务规划器）

根据解析后的意图，生成**可执行的步骤序列**：

```tsx
interface TaskPlan {
  id: string;
  intent: ParsedIntent;
  
  steps: TaskStep[];
  
  // 用户确认策略
  confirmationPolicy: 
    | 'none'           // 简单任务，直接执行
    | 'before_execute' // 执行前展示计划让用户确认
    | 'per_step';      // 每步执行前确认
    
  // 预估资源消耗
  estimatedTokens: number;
  estimatedTime: string;
}

interface TaskStep {
  id: string;
  order: number;
  
  // 步骤描述（人类可读）
  description: string;
  
  // 执行配置
  skill: string;                 // 调用的技能
  inputSources: InputSource[];   // 输入数据来源
  outputTarget: OutputTarget;    // 输出目标
  
  // 依赖关系
  dependsOn: string[];           // 依赖的前置步骤 ID
  
  // 条件分支
  condition?: {
    check: string;               // 检查条件
    ifTrue: string;              // 条件成立时跳转到哪个步骤
    ifFalse: string;             // 条件不成立时跳转到哪个步骤
  };
}
```

### 规划示例

**用户指令**："帮我把第三章埋的那个'红色信封'的伏笔在第十章收回来"

**生成的计划**：

```
计划：伏笔回收 —— "红色信封"
预估复杂度：中等 | 预估消耗：~4000 tokens | 确认策略：执行前确认

步骤 1/5：定位伏笔
  ├ 技能：知识图谱查询
  ├ 输入：搜索实体"红色信封"及其关联
  └ 输出：伏笔的原文位置、上下文、关联角色

步骤 2/5：分析当前叙事线
  ├ 技能：上下文分析
  ├ 输入：第十章全文 + 第九章结尾
  ├ 依赖：无
  └ 输出：第十章的叙事节奏、当前场景、可植入位置

步骤 3/5：确定植入方案
  ├ 技能：AI 推理
  ├ 输入：步骤 1 的伏笔信息 + 步骤 2 的叙事分析
  ├ 依赖：步骤 1, 步骤 2
  └ 输出：2-3 个植入方案（位置 + 方式）

步骤 4/5：生成文本（用户选择方案后）
  ├ 技能：续写 / 改写
  ├ 输入：用户选择的方案 + 植入位置的上下文
  ├ 依赖：步骤 3 + 用户选择
  └ 输出：可直接插入的文本段落

步骤 5/5：一致性检查
  ├ 技能：一致性验证
  ├ 输入：修改后的第十章 + 知识图谱
  ├ 依赖：步骤 4
  └ 输出：一致性报告（是否引入新的矛盾）
```

---

## 3. 执行引擎（Executor）

### 执行模式

| **模式** | **适用场景** | **用户参与度** |
| --- | --- | --- |
| **全自动** | 简单任务（续写、改写、缩写） | 低：执行完毕后展示结果 |
| **半自动** | 中等复杂任务（伏笔回收、风格迁移） | 中：展示计划 → 用户确认 → 关键节点选择 |
| **协作式** | 高度复杂任务（全文角色重塑、叙事结构重组） | 高：每步执行前确认，用户可修改中间结果 |

### 执行状态机

```
IDLE → PLANNING → AWAITING_CONFIRMATION → EXECUTING → STEP_COMPLETE
  ↑                                           │            │
  │                                           │            ▼
  │                                           │    AWAITING_USER_INPUT
  │                                           │            │
  │                                           ▼            │
  └──────────────── COMPLETED ◄──────────── REVIEWING ◄───┘
                        │
                        ▼
                    ALL_DONE (版本自动标记为 actor=ai)
```

### 中断与恢复

- 用户可以在任何步骤**暂停**执行
- 暂停后可以**修改**中间结果再继续
- 可以**回退**到之前的步骤
- 可以**取消**整个计划，所有修改自动回滚（依赖版本管理系统）

---

## 4. 上下文感知的动态规划

### 问题

静态计划可能在执行过程中变得不适用。例如：

- 步骤 1 发现伏笔不在第三章而在第四章
- 步骤 3 的 AI 推理发现当前的叙事线不适合植入伏笔回收

### 解决方案：动态重规划

```tsx
interface DynamicReplanning {
  // 每步执行完后检查计划是否仍然有效
  validatePlan(
    currentPlan: TaskPlan, 
    stepResult: StepResult
  ): PlanValidation;
  
  // 如果计划失效，重新规划剩余步骤
  replan(
    originalPlan: TaskPlan,
    completedSteps: StepResult[],
    invalidationReason: string
  ): TaskPlan;
}

interface PlanValidation {
  isValid: boolean;
  issues: string[];
  suggestedAction: 
    | 'continue'        // 继续执行
    | 'replan'          // 需要重新规划
    | 'ask_user';       // 需要用户决策
}
```

### 动态重规划示例

> **原计划步骤 1**：在知识图谱中查找"红色信封"
> 

> **实际结果**：未找到"红色信封"实体，但在第四章文本中发现了相关描写
> 

> **重规划**：新增步骤 1.5 — 从文本中提取伏笔信息并补充到知识图谱
>