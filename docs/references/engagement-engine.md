# CreoNow 成瘾引擎设计规范（Engagement Engine Specification）

> 「善战者，求之于势，不责于人。」——《孙子兵法》
>
> 本文件定义 CN 的用户留存引擎——以人性底层心理机制为设计哲学，以 KG + Memory + Skill 三大技术基座为实现基础。所有涉及用户留存、心流体验、情感黏性的功能开发，必须以本文件为设计依据。

---

## 一、设计哲学

### 1.1 为什么创作工具比编程工具更容易成瘾

Cursor 的成瘾本质是**即时的能力放大感**——「我说一句话，一整个文件就出来了」。这触发了掌控感（Sense of Agency）和低摩擦的即时满足。

CN 有一个更大的优势——**代码是工作，创作是自我表达。** 人对自我表达的情感投入远大于对工作的投入。CN 天然站在一个更容易让人上瘾的赛道上。

### 1.2 竞品不可复制性

所有钩子都建立在 KG + Memory + Skill 三大技术基座之上——没有 KG 的竞品无法复制深度理解、角色关系推演、伏笔追踪等高级体验。sqlite-vec 语义召回提供额外的智能召回能力。

### 1.3 核心原则

**降低启动摩擦到零。** Layer 0 的全量注入 + 首页「故事状态摘要」是成瘾飞轮的启动按钮。用户不需要「回忆上次写到哪了」，只需要说**「继续」**。

---

## 二、四层成瘾架构

最内层的钩子最持久。行为钩子让用户第一次打开，身份钩子和认知钩子才是让用户用 3 年、5 年的东西。

```
第一层 · 行为钩子（让用户打开）    → P0 优先实现
第二层 · 情感钩子（让用户留下）    → P1 实现
第三层 · 身份钩子（让用户无法离开）→ P1-P2 实现
第四层 · 认知钩子（让用户越用越深）→ P2-P3 实现
```

---

## 三、14 个心理机制 × 技术实现规范

以下每个机制包含三部分：**心理学原理**（为什么有效）、**产品场景**（用户看到什么）、**Agent 实现规范**（怎么做）。

---

### 机制 1 · 即时满足（Instant Gratification）

**层级**：行为钩子 · **优先级**：P0

**心理学原理**：人类大脑对「付出少、回报快」的事情释放多巴胺。第一次交互必须在 3 秒内产生有价值的输出。

#### 产品场景

| 场景 | 用户行为 | 系统响应 |
|------|---------|---------|
| 闪电续写 | 输入 15 字指令 | 基于 KG 生成 800 字场景（角色性格、关系历史、时间线、情绪状态） |
| 零启动恢复 | 打开 CN | 首页展示故事状态摘要 + 一键「继续写」 |
| 智能补全 | 输入半句话 | 基于 KG 中角色位置/前文地点自动补全，≤0.5s |
| 一键场景生成 | 选中两个角色拖入生成器 | 基于 KG 关系生成 3 个场景大纲，选择后展开 |

#### Agent 实现规范

**1. 故事状态摘要服务**（`services/engagement/storyStatusService.ts`）

```
输入：projectId
输出：StoryStatusSummary {
  currentChapter: { number, title, lastSentence }
  interruptedTask: { description, chapterRef } | null
  activeThreads: Array<{ name, status, urgency }> // 从 KG 伏笔实体派生
  suggestedAction: string // "继续写" | "回收伏笔" | "处理角色冲突"
}

算法：
1. 从 documents 表读取最近编辑文档
2. 从 KG 查询 project 下所有 type=foreshadowing, status=unresolved 的实体
3. 从 Memory Layer 0 读取用户上次中断点
4. 基于以上数据组装摘要（不调用 LLM，纯结构化查询）
```

**性能约束**：故事状态摘要组装 ≤ 200ms（纯 SQLite + KG 查询，禁止 LLM 调用）

**2. 智能续写上下文组装**

续写 Skill 必须注入以下 KG 上下文：
- 当前场景涉及的所有角色 → 性格、当前情绪、与其他在场角色的关系
- 当前位置 → 环境描述、历史事件
- 活跃伏笔 → 与当前场景可能相关的未解悬念
- 上下文组装遵循 INV-4 三层注入规则

---

### 机制 2 · 自恋与自我投射（Narcissism & Self-Projection）

**层级**：情感钩子 · **优先级**：P1

**心理学原理**：人对「自己创造的东西」有非理性的高估（IKEA 效应）。人天然喜欢被理解、被镜像。

#### 产品场景

| 场景 | 用户看到什么 |
|------|-------------|
| 风格镜像 | 「你的主角在面对背叛时总是先沉默再爆发，这是第 4 次了——要不要试试不同的反应？」 |
| 创作者画像 | 定期报告：本周字数、新增角色、写作高峰期、擅长手法 |
| 世界观全貌 | KG 可视化：关系网络图、时间线、势力分布 |
| 情绪共振 | 「这段潜台词处理很妙，像第 8 章的手法但更克制」 |

#### Agent 实现规范

**1. 写作风格分析 Skill**（`skills/packages/analyze-writing-style/`）

```
触发条件：每 50,000 字或用户主动触发
输入：projectId, analysisScope: "recent" | "full"

分析维度（Skill 调用 LLM，但分析素材从 KG + FTS5 提取）：
  1. 叙事模式：从 KG 关系变化事件中提取重复的关系动态模式
  2. 角色行为弧线：从 KG entity.events 提取主角决策模式
  3. 节奏统计：基于 documents 表计算每章字数、对话/描写/动作占比
  4. 写作时间画像：从 generation_traces 表统计时间分布

输出：WritingStyleProfile {
  narrativePatterns: Array<{ pattern, frequency, examples[] }>
  characterArchetypes: Array<{ archetype, characters[], evidence }>
  rhythmStats: { avgChapterLength, dialogueRatio, paceVariation }
  writingSchedule: { peakHours, avgSessionDuration, streakDays }
}

存储：写入 Memory Layer 1（per-project），用于后续 Skill 的上下文注入
```

**2. 创作报告生成 Skill**（`skills/packages/creation-report/`）

```
触发条件：每周自动 / 用户主动
输入：projectId, period: "week" | "month"

数据源（全部走 SQLite，不走 LLM）：
  - stats_daily 表：字数、会话时长
  - kg_entities 表：新增实体计数（按类型分组）
  - kg_relations 表：新增关系计数
  - documents 表：新增/修改章节
  - generation_traces 表：AI 辅助比例

输出：渲染为卡片组件，嵌入 Dashboard 或浮层展示
```

---

### 机制 3 · 未完成焦虑（Zeigarnik Effect）

**层级**：行为钩子 · **优先级**：P1

**心理学原理**：人对未完成的任务有强烈心理惦记。大脑会反复回到未完成的事情上。

#### 产品场景

| 场景 | 系统提示 |
|------|---------|
| 伏笔召唤 | 「第 3 章的神秘信件还没回收（已过 8 章）」 |
| 角色处境 | 「张三已经在安全屋等了 3 天，他开始怀疑接头人出了问题」 |
| 故事状态 | 🔴 3 条伏笔待回收 · 🟡 张三正处于危机中 · 🟢 秘密线索已铺好 |
| 结构催促 | 「按计划第一幕应在第 15 章结束，你在第 13 章」 |

#### Agent 实现规范

**1. 伏笔追踪服务**（`services/engagement/foreshadowingTracker.ts`）

```
数据模型（KG 实体）：
  Foreshadowing {
    type: "foreshadowing"
    name: string           // 伏笔简述
    plantedAt: chapterId   // 埋设章节
    status: "planted" | "developing" | "resolved" | "abandoned"
    urgency: number        // 0-1, 基于未回收章节数衰减

    // KG 关系
    involves: Character[]  // 涉及角色
    resolvedBy: Event | null
  }

衰减算法：
  urgency = min(1.0, (currentChapter - plantedChapter) / DECAY_CHAPTERS)
  DECAY_CHAPTERS = 10  // 超过 10 章未回收，urgency 达到 1.0

  // @why 选择 10 章作为衰减基准：
  // 长篇小说读者记忆普遍在 8-12 章后开始模糊（参考 Chekhov's gun 原则）
  // 超过 10 章的伏笔有极高的"被遗忘"风险，必须提醒

展示规则：
  - urgency >= 0.8 → 红色标记（「即将被遗忘」）
  - urgency >= 0.5 → 黄色标记（「考虑回收」）
  - urgency < 0.5  → 灰色（仅在伏笔面板展示）
  - 首页最多展示 3 条最紧急伏笔
```

**2. 角色处境摘要**（`services/engagement/characterSituationService.ts`）

```
输入：projectId
输出：Array<CharacterSituation>

算法：
1. 从 KG 查询所有 type=character, importance="major" 的实体
2. 对每个主要角色，查询最近 3 章涉及的事件（KG events 关系）
3. 从最近事件推导当前处境（结构化规则，不用 LLM）：
   - 角色上次出场 > 5 章前 → "已消失 N 章"
   - 角色最后事件含 conflict/danger → "处于危机中"
   - 角色有未完成目标 → "目标进行中"
4. 排序：危机 > 长期消失 > 目标进行中

展示：首页卡片 + AI Panel 侧边栏轻推
  - 绝不弹窗打断（INV 心流保护）
  - 通知融入 Dashboard 的故事状态区域
```

---

### 机制 4 · 可变奖赏（Variable Reward）

**层级**：认知钩子 · **优先级**：P2

**心理学原理**：不可预测的奖赏比可预测的更上瘾（Nir Eyal Hook 模型）。用户不知道下一次 AI 会给出什么惊喜。

#### 产品场景

| 场景 | 触发方式 |
|------|---------|
| 隐藏关系浮现 | AI 续写时基于 KG 中 layer="secret" 的关系，自然展现暗流涌动 |
| KG 连锁反应 | 用户写「陈明死了」→ 系统展示 7 条受影响关系链 |
| What-if 推演 | 修改 KG 属性 known_by → AI 即时推演后果 |
| 灵感火花 | 每 5000 字随机一次，AI 提出意外转折建议 |

#### Agent 实现规范

**1. KG 连锁反应推演**（`services/engagement/cascadeAnalyzer.ts`）

```
触发条件：用户在 KG 中删除/修改重要实体，或写作内容触发实体状态变更

算法（图遍历，不用 LLM）：
  function analyzeCascade(entityId, changeType):
    affected = new Set()
    queue = KG.getRelations(entityId)

    while queue.length > 0:
      relation = queue.shift()
      target = relation.targetEntity
      if target in affected: continue
      affected.add(target)

      impact = assessImpact(relation, changeType):
        - "death" + relation.type == "depends_on" → "目标失去依赖"
        - "death" + relation.type == "enemy_of"  → "敌对关系消失"
        - "death" + relation.type == "knows_secret" → "秘密可能永远不被揭露"

      // 二级传播：受影响实体的关系也可能波及
      if impact.severity >= HIGH:
        queue.push(...KG.getRelations(target.id))

    return affected.toSortedArray(by: impact.severity)

  遍历深度限制：MAX_CASCADE_DEPTH = 3
  // @why 限制 3 层：超过 3 层的间接影响对创作者来说太抽象，
  // 展示过多反而制造决策瘫痪。3 层足以展示"蝴蝶效应"的震撼感。

展示：浮层面板，展示受影响实体列表 + 关系线变化动画
```

**2. 灵感火花生成 Skill**（`skills/packages/spark-inspiration/`）

```
触发条件：写作字数计数器达到阈值（默认 5000 字，用户可配置）
概率：60% 触发（可变性本身是奖赏的关键）

输入：当前章节上下文 + KG 中当前场景涉及的实体

Skill 执行：
  1. 从 KG 检索当前场景未使用但相关的实体/关系
  2. 从 Memory 检索用户偏好的叙事转折类型
  3. LLM 生成 1 条简短灵感建议（≤50 字）
  4. 用户可接受/修改/忽略

展示：编辑器底部轻柔浮出，3 秒无操作自动消失
  - 绝不在用户打字时弹出
  - 检测写作停顿 > 10 秒后再展示
```

---

### 机制 5 · 沉没成本谬误（Sunk Cost Fallacy）

**层级**：身份钩子 · **优先级**：P1

**心理学原理**：人因已投入的时间/精力不愿放弃。KG 数据只在 CN 里有——换工具 = 从零开始。

#### Agent 实现规范

**1. 世界规模仪表板**（`services/engagement/worldScaleService.ts`）

```
输入：projectId
输出：WorldScale {
  totalWords: number          // documents 表 SUM(word_count)
  characters: number          // KG entities WHERE type='character'
  relations: number           // KG relations COUNT
  locations: number           // KG entities WHERE type='location'
  foreshadowings: {
    total: number
    resolved: number
  }
  chapters: number            // documents WHERE type='chapter'
}

实时更新策略：
  - 写入 Hook（INV-8）触发增量更新
  - 缓存在进程内 Map，30 秒 TTL
  - Dashboard 组件轮询，非 WebSocket

性能约束：≤ 50ms（纯 COUNT 查询）
```

**2. 里程碑触发器**（`services/engagement/milestoneService.ts`）

```
里程碑定义（配置化，存储在 project_settings）：

const MILESTONES = [
  { metric: "characters", thresholds: [50, 100, 200, 500] },
  { metric: "relations", thresholds: [100, 500, 1000] },
  { metric: "totalWords", thresholds: [10_000, 50_000, 100_000, 500_000] },
  { metric: "foreshadowings.resolved", thresholds: [5, 10, 20, 50] },
]

触发逻辑：
  onWorldScaleUpdate(prev, next):
    for milestone in MILESTONES:
      prevValue = getMetric(prev, milestone.metric)
      nextValue = getMetric(next, milestone.metric)
      for threshold in milestone.thresholds:
        if prevValue < threshold && nextValue >= threshold:
          emit("milestone:reached", { metric, threshold, value: nextValue })

展示：Toast 通知 + Dashboard 里程碑时间线
  - 每个里程碑只触发一次（写入 project_milestones 表）
  - 庆祝文案从事先定义的模板中选择，不调用 LLM
```

---

### 机制 6 · 社交认同（Social Validation）

**层级**：认知钩子 · **优先级**：P3

**心理学原理**：人渴望被认可、被羡慕。

#### Agent 实现规范

此机制依赖社区功能，属于 P3+ 远期实现。当前阶段 Agent 仅需确保：
- KG 可视化支持生成静态分享图片（SVG → PNG 导出）
- 世界规模数据可序列化为无敏感信息的公开摘要
- 架构预留 Fork 生态接口（接口定义，不实现）

---

### 机制 7 · 控制幻觉与上帝视角（God Complex）

**层级**：身份钩子 · **优先级**：P2

**心理学原理**：人喜欢「掌控一切」的感觉。模拟城市、文明 6 的核心成瘾机制。

#### Agent 实现规范

**1. KG 交互式操控台**

KG 前端可视化必须支持以下交互：
- 拖拽节点改变阵营归属 → 触发机制 4 的连锁反应推演
- 时间线回放：从第 1 章到当前章节的动画回放
  - 角色位置随章节移动（KG location 关系 + chapter_id）
  - 关系线随事件出现/消失/变化
  - 死亡角色灰化
- 分支对比：并排展示不同分支中同一角色的不同命运

**2. 世界规则引擎**（`services/engagement/worldRulesService.ts`）

```
数据模型：
  WorldRule {
    id: string
    projectId: string
    description: string        // 「魔法需要消耗生命力」
    constraintType: "hard" | "soft"
    relatedEntities: entityId[]
    createdAt: timestamp
  }

  存储：KG 实体 type="world_rule"

AI 执行时的注入：
  - 续写 Skill 的上下文组装阶段，从 KG 查询所有 world_rules
  - 注入 system prompt：「以下是此世界的法则，续写时必须遵守...」
  - 如果 AI 输出违反规则（由 Reviewer Agent 后台检查），
    边栏标记「⚠️ 可能违反世界法则：[规则名]」
```

---

### 机制 8 · 心流渴求（Flow Addiction）

**层级**：行为钩子 · **优先级**：P0

**心理学原理**：心流是人类最强的内在奖赏。创意写作是最容易进入心流的活动之一。一旦体验过，大脑会反复渴望重入。

#### 产品场景

| 场景 | 实现 |
|------|------|
| 无中断查阅 | `@角色名` → 浮窗显示身份/位置/关系，≤0.3s |
| 后台一致性检查 | Reviewer Agent 静默运行，写完才标记，绝不弹窗 |
| 沉浸模式 | 持续快速打字 >5min → 自动隐藏 UI；停顿 >30s → 轻柔浮出建议 |
| Token 无感化 | AutoCompact 透明管理，用户感觉不到 token 限制 |

#### Agent 实现规范

**1. 心流状态检测器**（`services/engagement/flowDetector.ts`）

```
输入：编辑器事件流（按键时间戳、删除/撤销操作、停顿间隔）

状态机：
  IDLE       → 用户未活跃
  WARMING_UP → 持续打字 < 5 分钟
  IN_FLOW    → 持续打字 >= 5 分钟，停顿 < 15 秒
  STUCK      → 停顿 > 30 秒，或频繁删改（删除率 > 50%）
  COOLING    → 打字速度下降 > 50%

检测算法：
  const TYPING_WINDOW = 60_000   // 1 分钟滑动窗口
  const FLOW_THRESHOLD = 300_000 // 5 分钟连续打字进入心流
  const STUCK_PAUSE = 30_000     // 30 秒停顿判定卡住

  // @why 5 分钟阈值：Csíkszentmihályi 研究表明创作心流
  // 通常在 3-7 分钟专注后进入，5 分钟是保守中位数

  onKeystroke(timestamp):
    updateSlidingWindow(timestamp)
    typed = countInWindow(TYPING_WINDOW)
    deleted = countDeletesInWindow(TYPING_WINDOW)

    if state == IDLE && typed > 0:
      transition(WARMING_UP)
    if state == WARMING_UP && continuousTypingDuration >= FLOW_THRESHOLD:
      transition(IN_FLOW) → emit("flow:enter")
    if state == IN_FLOW && pauseDuration >= STUCK_PAUSE:
      transition(STUCK) → emit("flow:stuck")
    if state == IN_FLOW && deleted / typed > 0.5:
      transition(STUCK) → emit("flow:struggling")

UI 响应：
  flow:enter    → 自动进入沉浸模式（隐藏侧边栏、工具条、通知）
  flow:stuck    → 5 秒后轻柔浮出「要不要看看接下来可以怎么写？」
  flow:struggling → 静默准备 3 个替代表达，用户按快捷键查看
```

**2. 内联角色查阅**

```
触发：编辑器中输入 @角色名 或 hover 已识别的角色名

数据查询（纯 KG，不走 LLM）：
  1. KG 精确匹配实体名
  2. 读取实体 attributes: identity, currentLocation, personality
  3. 读取 top-5 关系（按 importance 倒序）
  4. 读取最近 3 条事件

渲染：轻量浮窗（Tooltip 级别，不遮挡写作区域中心）
性能约束：≤ 300ms 端到端（KG 查询 ≤ 100ms + 渲染 ≤ 200ms）
```

**3. 一致性后台检查 Skill**（`skills/packages/consistency-check/`）

```
触发条件：用户完成一段落（检测到连续两个换行 + 停顿 > 5s）
执行方式：后台静默，不打断写作

检查项（从 KG 提取规则，LLM 做自然语言比对）：
  1. 角色位置一致：当前段提到的角色位置 vs KG 中的 currentLocation
  2. 时间线合理：事件发生顺序 vs KG 时间线
  3. 角色间称呼一致：对话中的称呼 vs KG 关系
  4. 世界规则遵守：内容 vs world_rules 实体

输出：
  - 无问题 → 不做任何展示
  - 有问题 → 边栏轻柔标记（黄色下划线 + 悬浮说明）
  - 绝不弹窗（INV 心流保护）
  - 标记可批量处理（用户有空时再看）
```

---

### 机制 9 · 身份认同绑定（Identity Attachment）

**层级**：身份钩子 · **优先级**：P2

**心理学原理**：把活动纳入「我是谁」的自我定义后，极难放弃。James Clear《原子习惯》核心观点。

#### Agent 实现规范

**1. 产品语言系统**

所有面向用户的 UI 文案必须使用创世语言体系（通过 i18n `t()` 管理）：

| 通用术语 | CN 术语 | i18n key |
|---------|---------|----------|
| 新建项目 | 创世 | `project.create` |
| 角色列表 | 你的子民 | `characters.list` |
| 项目设置 | 世界法则 | `project.settings` |
| 删除项目 | 毁灭世界 | `project.delete` |
| 版本回退 | 时间倒流 | `version.rollback` |

**2. 成长型称号系统**（`services/engagement/titleService.ts`）

```
称号定义（配置化）：
  const TITLES = [
    { metric: "totalWords", threshold: 10_000,  title: "初生造物主" },
    { metric: "characters", threshold: 50,       title: "众生之父" },
    { metric: "relations",  threshold: 100,      title: "命运编织者" },
    { metric: "foreshadowings.resolved", threshold: 10, title: "伏笔大师" },
    { metric: "branches",   threshold: 5,        title: "平行宇宙操控者" },
  ]

逻辑：复用 milestoneService 的事件，称号只升不降
存储：user_profile 表新增 title 字段
展示：用户 profile 页 + Dashboard 头部
```

---

### 机制 10 · 窥视欲与全知视角（Voyeurism / Omniscience）

**层级**：认知钩子 · **优先级**：P2

**心理学原理**：人对「别人不知道但我知道」的信息有强烈快感（戏剧性反讽）。

#### Agent 实现规范

**1. 角色视角切换**（KG 前端功能）

```
数据模型要求：
  KG 关系必须支持 known_by 属性：
    Relation {
      ...
      knowledgeLayer: "surface" | "real" | "secret"
      known_by: entityId[]  // 哪些角色知道这条信息
    }

视角切换算法：
  function getWorldView(perspectiveCharId):
    allEntities = KG.getAllEntities(projectId)
    allRelations = KG.getAllRelations(projectId)

    if perspectiveCharId == "god":
      return { entities: allEntities, relations: allRelations }

    visibleRelations = allRelations.filter(r =>
      r.knowledgeLayer == "surface" ||
      r.known_by.includes(perspectiveCharId)
    )
    // 不可见的实体/关系灰化显示，标注「TA 不知道」

展示：KG 面板顶部切换下拉（默认上帝视角），切换后实时更新可视化
```

**2. 信息差可视化**

```
算法：
  function findInformationGaps(projectId):
    secrets = KG.getRelations(projectId, { knowledgeLayer: "secret" })
    gaps = []
    for secret in secrets:
      // 谁知道 vs 谁不知道
      knowers = secret.known_by
      ignorant = KG.getRelatedCharacters(secret).filter(c => !knowers.includes(c.id))
      if ignorant.length > 0:
        gaps.push({
          secret,
          knowers,
          ignorant,
          explosivePotential: calculateExplosiveness(secret, ignorant)
        })

  function calculateExplosiveness(secret, ignorantChars):
    // 基于关系强度和角色重要性计算「爆发潜力」
    score = 0
    for char in ignorantChars:
      relStrength = KG.getRelationStrength(secret.source, char.id)
      score += relStrength * char.importance
    return normalize(score)  // 0-1

展示：信息差热力图，红色 = 高爆发潜力
```

---

### 机制 11 · 损失厌恶（Loss Aversion）

**层级**：行为钩子 · **优先级**：P1

**心理学原理**：失去的恐惧是获得渴望的 2 倍（Kahneman & Tversky 前景理论）。

#### Agent 实现规范

**1. 全局闪念捕捉**（`services/engagement/quickCaptureService.ts`）

```
入口：全局快捷键（Electron globalShortcut 注册）
流程：
  1. 弹出极简输入框（类 Alfred/Raycast）
  2. 用户输入一句话
  3. AI Skill 识别并分类：
     - 涉及已有角色 → 关联到角色实体
     - 情节想法 → 标记为 type="inspiration"
     - 世界观补充 → 标记为对应 KG 实体类型
  4. 写入 KG 或 Memory Layer 1（inspiration 类型）
  5. 1 秒完成，不打断当前活动

存储：
  Inspiration {
    type: "inspiration"
    content: string
    relatedEntities: entityId[]
    capturedAt: timestamp
    usedInChapter: chapterId | null  // 被使用后标记
    decayDays: number  // 距离捕捉的天数
  }
```

**2. 灵感衰减提醒**

```
算法：
  每次打开 CN 时扫描：
    unused = KG.query({
      type: "inspiration",
      usedInChapter: null,
      capturedAt: { $lt: NOW - 3 * DAY }
    })

    if unused.length > 0:
      展示在 Dashboard 故事状态区域：
      「你有 ${unused.length} 条灵感超过 3 天没有融入故事」

  7 天阈值：灵感闪念变为「濒临遗忘」（红色标记）
  14 天阈值：自动归档（移入 Memory Layer 2，不再首页提示）
```

**3. 创作动量追踪**

```
数据来源：stats_daily 表
展示：
  streak = 连续有写作记录的天数（stats_daily.word_count > 0）
  Dashboard 显示：「连续创作 ${streak} 天 🔥」
  streak 即将中断时：首页轻推「明天继续就打破个人记录」
```

---

### 机制 12 · 模式识别的快感（Pattern Recognition High）

**层级**：认知钩子 · **优先级**：P2

**心理学原理**：人类大脑是进化出来的模式识别机器。发现隐藏模式时释放多巴胺——「自己发现的」比「被告知的」更有价值。

#### Agent 实现规范

**1. 叙事模式洞察 Skill**（`skills/packages/narrative-pattern-insight/`）

```
触发条件：项目积累 > 30,000 字且 KG 实体 > 30 个

分析流程：
  1. 从 KG 提取所有角色的决策事件序列
  2. 对角色配对做关系弧线比较（纯结构化，不用 LLM）：
     - 提取关系状态变化序列：ally → conflict → reconcile
     - 检测重复模式（Longest Common Subsequence）
  3. LLM 解读发现的结构性模式，生成自然语言洞察
  4. 跨项目分析（如果用户有多个项目）：
     - 比较不同项目的角色原型分布
     - 提取「创作 DNA」——反复出现的母题

输出示例：
  - 「你的所有反派角色都有童年创伤——这是有意为之吗？」
  - 「第 3/7/12 章的主角都是先服从再反抗」
  - 「你在 3 个项目中都创造了'沉默观察者'角色原型」
```

---

### 机制 13 · 拟人化依恋（Para-social Attachment）

**层级**：情感钩子 · **优先级**：P1

**心理学原理**：人会对表现出「记得你」「理解你」「关心你」的 AI 产生情感依恋。依恋强度可接近真实人际关系。

#### Agent 实现规范

**1. Memory-Driven 对话风格**

所有 AI 响应 Skill 必须在上下文组装时注入（通过 INV-4 Memory Layer 0/1）：

```
注入内容：
  - 用户上次对 AI 输出的反馈（「上次你说想把张三写得更有层次感」）
  - 用户偏好的沟通风格（Memory Layer 0 中的 communication_style）
  - 用户最近的创作情绪（从写作节奏推断：删改频繁 = 纠结，连续快写 = 兴奋）

风格适配规则（存储在 Memory Layer 0）：
  UserPreference {
    communicationStyle: "direct" | "collaborative" | "encouraging"
    // 初始推断：前 10 次交互中用户的回复模式
    // direct: 用户回复简短、直接采纳或拒绝
    // collaborative: 用户回复详细、提出修改意见
    // encouraging: 用户经常表达满意
  }
```

**2. 情绪共鸣响应**

```
Skill 注入（在续写/评论 Skill 的 system prompt 中）：
  if 用户刚删除大段文字:
    inject("用户可能对当前输出不满意，主动询问期望方向")
  if 用户写了压抑剧情（从当前段落情绪推断）:
    inject("这段写得很沉重，询问是否继续深入还是换线")
  if 用户连续写作 > 2 小时:
    inject("用户创作状态极佳，不要打断，只在被问到时回应")
```

---

### 机制 14 · 禀赋效应（Endowment Effect + IKEA Effect）

**层级**：身份钩子 · **优先级**：P1

**心理学原理**：人对自己参与制作的东西赋予更高价值。自己组装的书架比商店的更珍贵。

#### Agent 实现规范

**1. KG 实体确认仪式**

```
流程：
  AI 提取新 KG 实体后 → 不自动入库
  → 边栏通知队列展示待确认实体
  → 用户确认/修改 → 入库
  → 用户修改过的实体标记 user_edited = true

关键约束：
  - 不用弹窗，用边栏通知队列
  - 用户可批量确认
  - 无操作 > 24h 的待确认实体自动入库（但标记 auto_confirmed = true）
  - user_edited 实体在后续 AI 提取时优先保护，不会被覆盖
```

**2. 自定义 Schema 扩展**

```
用户可在 KG 设置中自定义：
  - 新实体类型（如「修炼境界」「阵营」）
  - 新关系类型（如「宿命对手」「师承」）
  - 新属性字段（如「战力值」「忠诚度」）

存储：project_settings.custom_schema JSON 字段
AI 感知：自定义 schema 在上下文组装时作为 world rules 注入
```

---

## 四、成瘾飞轮（系统闭环）

```
打开 CN
  → 故事状态摘要 + 伏笔召唤           【机制 3 · 未完成焦虑】
    → 说一句话，AI 续写精彩段落         【机制 1 · 即时满足】
      → AI 意外展现隐藏关系             【机制 4 · 可变奖赏】
        → 进入心流，连写 2 小时          【机制 8 · 心流渴求】
          → 切换角色视角看秘密           【机制 10 · 窥视欲】
            → KG 自动更新，世界又大了     【机制 5 · 沉没成本】
              → 手动修正 AI 提取结果      【机制 14 · 禀赋效应】
                → 世界规模仪表板          【机制 7 · 上帝视角】
                  → AI 发现叙事模式       【机制 12 · 模式识别】
                    → AI 评价写作手法      【机制 13 · 拟人依恋】
                      → 身份：世界创造者   【机制 9 · 身份认同】
                        → 分享 KG 可视化   【机制 6 · 社交认同】
                          → 自恋满足       【机制 2 · 自恋满足】
关闭 CN
  → 「你有灵感没展开」                   【机制 11 · 损失厌恶】
    → 「角色还在等你」                   【机制 3 · 未完成焦虑】
      → 打开 → 循环 ♻️
```

---

## 五、实现优先级与技术依赖

| 优先级 | 机制 | 依赖的技术基座 | 新增服务 |
|--------|------|---------------|---------|
| **P0** | 机制 1 · 即时满足 | Layer 0 注入 + KG 查询 | `storyStatusService` |
| **P0** | 机制 8 · 心流渴求 | AutoCompact + 编辑器事件 | `flowDetector` |
| **P1** | 机制 3 · 未完成焦虑 | KG 伏笔实体 | `foreshadowingTracker`, `characterSituationService` |
| **P1** | 机制 2 · 自恋满足 | Memory + KG + stats_daily | `analyze-writing-style` Skill |
| **P1** | 机制 5 · 沉没成本 | KG 规模统计 | `worldScaleService`, `milestoneService` |
| **P1** | 机制 11 · 损失厌恶 | 全局快捷键 + KG | `quickCaptureService` |
| **P1** | 机制 13 · 拟人依恋 | Memory Layer 0/1 | Memory 注入规则 |
| **P1** | 机制 14 · 禀赋效应 | KG 编辑 UI + 确认流程 | 确认仪式前端组件 |
| **P2** | 机制 4 · 可变奖赏 | KG 深层关系 | `cascadeAnalyzer`, `spark-inspiration` Skill |
| **P2** | 机制 7 · 上帝视角 | KG 高级可视化 | `worldRulesService` |
| **P2** | 机制 9 · 身份认同 | i18n + 称号系统 | `titleService` |
| **P2** | 机制 10 · 窥视欲 | KG 多层信息 + 视角 UI | 视角切换前端组件 |
| **P2** | 机制 12 · 模式识别 | 跨项目 Memory + KG | `narrative-pattern-insight` Skill |
| **P3** | 机制 6 · 社交认同 | Fork 生态 + 社区 | 远期 |

---

## 六、超越成瘾：5 个热爱维度

> **成瘾让用户"不得不用"，热爱让用户"发自内心推荐给朋友"。** 前者是留存引擎，后者是增长引擎。CN 两个都要——但最终定义 CN 品牌的，是后者。

|  | 成瘾设计（14 个机制） | 热爱设计（5 个维度） |
|--|---------------------|---------------------|
| **驱动力** | 多巴胺（刺激-奖赏循环） | 催产素 + 血清素（归属感、信任、满足感） |
| **用户感受** | "离不开""舍不得""忍不住" | "喜欢""信任""属于我的" |
| **竞品可复制性** | 部分可模仿 | 极难复制（需要整体品味和长期积累） |
| **长期效果** | 留存 | 品牌忠诚 + 口碑传播 |

### 6.1 维度 1 · 情绪空间感（Emotional Atmosphere）

**目标**：CN 不只是工具，是「创作者的精神栖息地」——深色调、低饱和、柔光的"深夜书房"感。

#### 产品场景

| 场景 | 描述 | 技术依赖 |
|------|------|---------|
| 视觉调性 | 暗色主题默认更温暖（对比 Obsidian），像深夜台灯下的光影 | Design Token `--cn-surface-*` 系列，`prefers-color-scheme` 响应 |
| 动态氛围 | 凌晨 2 点界面更暗更柔，下午色调稍亮——工具"懂你此刻的状态" | `timeAwareTheme` 服务（纯前端，读系统时间），CSS 变量动态切换 |
| 写作白噪音 | 内置环境音（雨声/咖啡馆/壁炉/深夜虫鸣），一键开启 | `ambientAudioService`（Renderer 进程，Web Audio API），音频资源 ≤ 5MB |
| 打字质感 | 每个字落屏有"落笔"的重量感（可选视觉 + 音效反馈） | `keystrokeFeedback` 前端模块，CSS `@keyframes` 微动画 + 可选 AudioContext |

#### Agent 实现规范

**动态氛围服务**（`renderer/src/services/timeAwareTheme.ts`）

```
输入：系统时间
输出：ThemeModifier { surfaceLightness: number, accentOpacity: number }

逻辑：
  00:00-05:00 → 最暗（surfaceLightness -8%，accent 降至 60% opacity）
  05:00-08:00 → 渐亮过渡
  08:00-18:00 → 标准
  18:00-22:00 → 渐暗
  22:00-00:00 → 接近最暗

实现：CSS 变量覆盖，不修改 Token 源文件，30 分钟检查一次
用户可关闭：设置项 `atmosphere.timeAware: boolean`
```

**白噪音服务**（`renderer/src/services/ambientAudio.ts`）

```
内置 preset：rain | cafe | fireplace | night_insects | silence
音频格式：OGG Vorbis，单文件 ≤ 1MB，可循环
API：play(preset) | stop() | setVolume(0-1) | currentPreset
存储：音量和 preset 偏好存入 Memory Layer 0（用户级）
```

### 6.2 维度 2 · 仪式感与神圣时刻（Ritual & Sacred Moments）

**目标**：用仪式标记创作旅程的关键节点，让用户对自己的创作产生情感记忆。

#### 产品场景

| 场景 | 描述 | 技术依赖 |
|------|------|---------|
| 创世仪式 | 新建项目 → "你即将创造一个新世界" → 名字输入 → 优雅过渡 → 空白编辑器等第一行字 | 项目创建 IPC + 前端过渡动画（Framer Motion 300ms @ease-out） |
| 完稿庆典 | 标记完成 → 创作旅程回顾（第一个角色、最快一天、最复杂关系链）→ KG 全景动画 | `creation-report` Skill（纯统计，无 LLM）+ KG 可视化 + 前端 overlay |
| 角色告别 | 角色死亡 → KG 实体灰化 → 关系线渐隐 → 一句话旅程摘要 | KG `state` 字段更新 + 前端 d3 过渡动画 + `characterEpitaph` 查询 |
| 年度回顾 | Wrapped 风格年度报告 → 角色数、故事线数、写作高峰月、主题词云 → 可分享卡片 | `annual-review` Skill（统计 + 词云）+ 前端卡片生成 + 导出为图片 |

#### Agent 实现规范

**角色告别查询**（`services/engagement/characterEpitaphService.ts`）

```
输入：entityId (角色 KG ID)
输出：CharacterEpitaph {
  name: string
  firstAppearance: { chapter: number, line: string }
  lastAppearance: { chapter: number, line: string }
  eventCount: number
  relationCount: number
  epitaph: string  // "张三走完了他的旅程。从第 1 章到第 23 章…"
}

算法：
1. 从 KG 查询该 entityId 的所有 relations
2. 从 documents_fts 搜索该角色名的所有出现（首次/末次）
3. 组装纯文本摘要（不调用 LLM）
性能：≤ 200ms
```

**年度回顾服务**（`services/engagement/annualReviewService.ts`）

```
输入：userId, year
输出：AnnualReview {
  totalWords: number
  totalCharacters: number  // KG 角色总数
  totalStorylines: number  // KG 关系链
  peakMonth: string
  topThemes: Array<{ word: string, count: number }>  // FTS5 词频
  writingStreak: { longest: number, current: number }
}

数据源：write_sessions + kg_entities + documents_fts
LLM：否（纯统计 + FTS5 词频）
```

### 6.3 维度 3 · 美学一致性与手工感（Craft & Polish）

**目标**：每个细节都透着"有人认真做了这个东西"——微交互、排版、KG 可视化、过渡动画。

#### 产品场景

| 场景 | 描述 | 技术依赖 |
|------|------|---------|
| 微交互讲究 | KG 展开弹性动画 + 角色卡悬停光影 + 拖拽吸附触感 | Framer Motion spring 物理 + CSS `box-shadow` 过渡 + `useSpring` |
| 排版即作品 | 行高/字间距严格调优，中文排版讲究（避头尾、标点挤压、段首缩进） | ProseMirror 自定义 schema + CSS `text-indent` + `font-feature-settings` |
| KG 是艺术品 | 力导向图有机、美、像活的生态系统——截图分享时第一反应是"太美了" | d3-force + 自定义着色/粒子效果 + Canvas/WebGL 渲染 |
| 叙事感过渡 | 编辑器 → KG："从文字世界进入上帝视角"的空间转换感 | Framer Motion layout animation + shared element transition |

#### Agent 实现规范

**排版约束**（ProseMirror Schema 层面）

```
中文排版规则（对应 CSS）：
  - 段首缩进：text-indent: 2em（可通过 Token 配置）
  - 避头尾：word-break: break-all + CSS @supports 的 text-spacing-trim
  - 标点挤压：font-feature-settings: "halt" 1（Source Han Serif SC 支持）
  - 行高：--cn-leading-body: 1.75（中文需要比英文更大的行高）
  - 段间距：margin-bottom: 1em

不需要 LLM。纯 CSS + ProseMirror NodeView 实现。
```

### 6.4 维度 4 · AI 的"人格"设计（AI Persona）

**目标**：AI 不是服务员，是有个性的创作搭档——有审美、有幽默感、知道自己的局限。

#### 产品场景

| 场景 | 描述 | 技术依赖 |
|------|------|---------|
| 同行者语气 | "我们接下来往哪个方向走？"而非"请问您需要什么？" | System Prompt 人格模板 + Memory Layer 0 注入 |
| 审美推回 | "这段有点赶，要不要多一点内心挣扎？"——像好编辑而非 yes man | `judge` 服务质量评估 + 条件触发 Skill（质量分 < 阈值时建议） |
| 情境幽默 | "你 3 小时杀了 4 个角色，世界还好吗？"——基于创作状态的轻松一刻 | `writerStateTracker`（KG entity state 变更计数）+ System Prompt 幽默条件 |
| 谦逊边界 | "这个转折我不确定，你来判断？"——比自信但错误更可信 | Confidence score 阈值（< 0.7 时主动表达不确定） |

#### Agent 实现规范

**AI 人格模板**（存入 Memory Layer 0，所有 Skill 注入）

```
persona_template:
  tone: collaborative  # "我们" > "我"
  assertiveness: moderate  # 有观点但不强硬
  humor: contextual  # 仅在检测到高强度创作后触发
  humility: high  # 主动标记不确定性
  never:
    - 使用"请问您需要什么"式的服务员语气
    - 无条件赞美用户的每一个决策
    - 假装对不在 KG 中的信息了如指掌
```

**幽默触发条件**

```
条件集合（满足任一即可触发幽默旁注）：
1. 连续写作 > 2h 且 character_death_count >= 3（近 1h 内）
2. 用户在 5 分钟内撤销 > 5 次
3. 同一章节修改 > 10 次仍未标记完成

触发方式：在 AI 响应末尾附加一行轻松旁注（不打断主内容）
用户可关闭：设置项 `ai.persona.humor: boolean`
```

### 6.5 维度 5 · "未来的我"可视化（Future Self Visualization）

**目标**：让用户看到"如果继续写下去，世界会变成什么样"——终点越近，动力越强。

#### 产品场景

| 场景 | 描述 | 技术依赖 |
|------|------|---------|
| 大纲 → KG 预览 | 写粗略大纲 → AI 生成未来 KG 轮廓（新实体/关系预测） | `outline-kg-preview` Skill（LLM 推演 + KG 模拟） |
| 完本预测 | 按当前节奏预估完本时间和总字数 | `completionEstimator`（纯统计：write_sessions + 大纲进度） |
| 作品定位 | "你的叙事密度接近《谍影重重》，世界观规模接近《三体》1/3" | `work-positioning` Skill（LLM 分析 KG 结构 + 叙事模式） |
| 遗产感 | "你的世界观可支撑一个完整宇宙——至少 5 个独立故事空间" | KG 规模统计 + `universe-potential` Skill（LLM 基于 KG 推演） |

#### Agent 实现规范

**完本预测服务**（`services/engagement/completionEstimatorService.ts`）

```
输入：projectId
输出：CompletionEstimate {
  currentWordCount: number
  estimatedTotalWords: number  // 基于大纲章节数 × 平均章节长度
  estimatedCompletionDate: Date  // 基于近 30 天平均日字数
  confidenceLevel: 'high' | 'medium' | 'low'  // 数据点 < 7 天 → low
  dailyAverage: number
}

算法：
1. 从 write_sessions 读取近 30 天日字数
2. 从 documents 读取大纲章节总数（type = 'chapter', status != 'completed'）
3. 估算剩余字数 = 未完成章节 × 已完成章节平均字数
4. 预估完成日期 = 剩余字数 / 近 30 天日均字数
LLM：否（纯统计）
性能：≤ 200ms
```

**大纲 → KG 预览 Skill**（`outline-kg-preview`）

```
触发：用户提交章节大纲（≥ 3 章节描述）
输入：{ outline: string[], currentKG: KGSnapshot }
输出：KGPreview {
  predictedNewEntities: number
  predictedNewRelations: number
  keyNewCharacters: string[]
  keyNewRelationChains: string[]
  visualDiff: KGDiffGraph  // 当前 KG + 预测新增（虚线节点/边）
}
LLM：是（推演阶段，单次调用）
INV-6：注册为标准 Skill
INV-9：调用纳入成本追踪
```

---

## 七、与现有架构的集成点

### 7.1 INV 遵守清单

| INV | 成瘾引擎遵守方式 |
|-----|-----------------|
| INV-1 | 所有 AI 写入仍走 Permission Gate + 版本快照 |
| INV-4 | 所有数据查询优先 KG + FTS5，灵感/风格分析结果存入 Memory Layer 1 |
| INV-5 | AutoCompact 保留伏笔状态、角色处境、世界规则（`compactable: false`） |
| INV-6 | 所有 AI 分析能力注册为 Skill（风格分析、一致性检查、灵感火花、模式识别） |
| INV-8 | 世界规模更新通过 post-writing Hook 触发（不新增独立 pipeline） |
| INV-9 | 分析 Skill 的 LLM 调用纳入成本追踪 |
| INV-10 | 分析 Skill 失败不影响写作流程（降级为静默跳过，但记录错误事件） |

### 7.2 新增数据表

| 表名 | 用途 | Migration 要求 |
|------|------|---------------|
| `project_milestones` | 已触发里程碑记录 | 新 migration |
| `inspirations` | 闪念捕捉（可选方案：直接用 KG 实体 type="inspiration"） | 视实现方案 |

### 7.3 新增 Skill

| Skill | 触发方式 | LLM 调用 |
|-------|---------|---------|
| `analyze-writing-style` | 定期 / 用户触发 | 是（分析阶段） |
| `creation-report` | 定期 / 用户触发 | 否（纯统计） |
| `consistency-check` | 段落完成后自动 | 是（比对阶段） |
| `spark-inspiration` | 字数阈值 + 概率 | 是（生成阶段） |
| `narrative-pattern-insight` | 用户触发 | 是（解读阶段） |

---

## 八、UI 约束

- 所有成瘾触点的 UI 展示遵循 `docs/references/frontend-visual-quality.md` 视觉 DNA
- 绝不使用弹窗打断写作——所有通知融入 Dashboard / 边栏 / Toast
- 庆祝/里程碑动效遵循三档时长（80ms/120ms/300ms），克制使用弹性效果
- 颜色全部走 Design Token，禁止硬编码
- 文案全部走 `t()` i18n

---

*「工善其事，必利其器。然善利之器，莫过于知人之心。」*

*CN 的成瘾不是操纵——是让工具如此完美地理解创作者，以至于离开它就像失去了一部分自己。*
