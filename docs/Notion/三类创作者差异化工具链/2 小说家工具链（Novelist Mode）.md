# 2. 小说家工具链（Novelist Mode）

<aside>
📖

**定位**：小说家是 CN 最核心的目标用户群体。CN 的知识图谱、伏笔追踪、角色弧光等核心能力都围绕长篇叙事而生。本章定义小说模式下的完整工具集。

</aside>

---

## 工具矩阵总览

| **工具** | **优先级** | **依赖基座能力** | **状态** |
| --- | --- | --- | --- |
| 📋 章节大纲编辑器 | P0（核心） | 编辑器 | 需新增 |
| 🧬 角色弧光可视化 | P0（核心） | 知识图谱 | 需新增 |
| 🕸️ 关系图谱可视化 | P0（核心） | 知识图谱 | 需新增 |
| ⏳ 时间线编辑器 | P1（重要） | 知识图谱 | 需新增 |
| 🌍 世界观构建器 | P1（重要） | 知识图谱 + 模板 | 需新增 |
| 🎯 伏笔追踪看板 | P0（核心） | 主动感知 | 已在主动感知章节定义 |
| 📊 节奏分析面板 | P1（重要） | 主动感知 | 已在主动感知章节定义 |
| 📖 阅读视角模拟 | P2（增强） | AI 引擎 | 需新增 |

---

## 工具 1：📋 章节大纲编辑器（Outline Editor）

### 设计目标

为长篇叙事提供**结构化的大纲管理**，让作者能在"宏观叙事结构"和"微观章节内容"之间自由切换。

### 大纲数据结构

```tsx
interface OutlineNode {
  id: string;
  type: 'volume' | 'part' | 'chapter' | 'scene';
  title: string;
  
  // 内容摘要
  summary: string;                  // 单句概述（AI 可自动生成）
  detailedSummary?: string;         // 详细大纲（用户手写或 AI 辅助）
  
  // 叙事元数据
  narrativeMeta: {
    pov: string;                    // 视角人物
    timeline: string;               // 时间标记
    location: string;               // 地点
    mood: string;                   // 氛围/基调
    tensionLevel: number;           // 紧张度 0-10
    plotFunction: string;           // 叙事功能（铺垫/推进/高潮/过渡/结局）
  };
  
  // 关联实体
  involvedCharacters: string[];     // 出场角色
  involvedPlotElements: string[];   // 涉及的剧情元素
  foreshadowings: string[];         // 涉及的伏笔（埋设/强化/回收）
  
  // 状态
  status: 'planned' | 'drafting' | 'drafted' | 'revising' | 'final';
  wordCount: number;                // 已写字数
  targetWordCount?: number;         // 目标字数
  
  // 子节点
  children: OutlineNode[];
}
```

### UI 布局

```
┌─────────────────────────────────────────────────────┐
│  📋 大纲编辑器                    [树形] [卡片] [看板] │
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│  卷一：暗流涌动    │  第三章：红色信封                   │
│  ├ 第一章 ✅      │  ──────────────────              │
│  ├ 第二章 ✅      │  摘要：林远在旧书店发现一封神秘的     │
│  ├ 第三章 ✏️      │  红色信封，信封上的字迹让他想起       │
│  │  ├ 场景1      │  了失踪的父亲。                     │
│  │  ├ 场景2      │                                  │
│  │  └ 场景3      │  视角: 林远 | 地点: 旧书店          │
│  ├ 第四章 📝      │  氛围: 悬疑 | 紧张度: 6/10         │
│  └ 第五章 ⬜      │  功能: 铺垫                        │
│                  │                                  │
│  卷二：真相浮现    │  出场角色: 林远, 书店老板            │
│  ├ 第六章 ⬜      │  伏笔: 🔴 埋设"红色信封"            │
│  └ ...           │        🟡 强化"失踪的父亲"          │
│                  │                                  │
│                  │  [AI: 生成详细大纲] [跳转到正文]     │
│                  │                                  │
└──────────────────┴──────────────────────────────────┘
```

### 三种视图模式

1. **树形视图**（默认）：层级结构，适合管理长篇小说的卷/章/场景
2. **卡片视图**：每个章节一张卡片，可视化状态和字数进度
3. **看板视图**：按状态分列（计划中 / 草稿 / 修改中 / 定稿），拖拽管理

### AI 辅助大纲功能

- **自动摘要**：当章节内容更新后，AI 自动更新大纲摘要
- **大纲展开**：用户写一句话概述，AI 展开为详细的场景级大纲
- **结构建议**：AI 分析当前大纲结构，建议"这里需要一个过渡章节"或"高潮来得太早"
- **缺口检测**：标记大纲中的逻辑缺口（如"角色从 A 地到 B 地的过程缺少描写"）

---

## 工具 2：🧬 角色弧光可视化（Character Arc Visualizer）

### 设计目标

将角色在全文中的**情感、成长、关系变化**绘制为可视化曲线，帮助作者识别角色发展是否扁平或不连贯。

### 角色弧光数据模型

```tsx
interface CharacterArc {
  characterId: string;
  characterName: string;
  
  // 弧光节点（按章节/场景标记）
  arcPoints: ArcPoint[];
  
  // 弧光类型标签
  arcType: 'positive_change' | 'negative_change' | 'flat' | 'corruption' | 'redemption';
  
  // AI 分析摘要
  arcSummary: string;              // "林远从被动逃避到主动面对真相"
  arcStrength: number;             // 弧光强度 0-10（越高变化越大）
}

interface ArcPoint {
  chapterId: string;
  sceneId?: string;
  
  // 多维度评分
  dimensions: {
    emotionalState: number;        // 情感状态 -10（绝望）到 +10（喜悦）
    confidence: number;            // 自信程度 0-10
    moralAlignment: number;        // 道德倾向 -10（黑化）到 +10（正义）
    relationshipHealth: number;    // 核心关系健康度 0-10
    powerLevel: number;            // 能力/权力水平 0-10
  };
  
  // 关键事件
  keyEvent: string;                // 触发变化的事件
  source: 'user_tagged' | 'ai_detected';
}
```

### 可视化呈现

```
角色弧光：林远
─────────────────────────────────────────────────
  10 │                                    ★ 觉醒
     │                              ╱
   5 │          ╱╲              ╱╱
     │     ╱╱      ╲         ╱
   0 │ ──╱            ╲    ╱
     │                  ╲╱ ← 低谷：被背叛
  -5 │
     └──────────────────────────────────────────
      Ch1  Ch2  Ch3  Ch4  Ch5  Ch6  Ch7  Ch8

  ── 情感状态    ╌╌ 自信程度    ·· 道德倾向

  📊 弧光类型: 正向成长 (Positive Change)
  📈 弧光强度: 8/10
  💡 AI 诊断: 第四章到第五章的低谷转折非常有力。
     建议在第三章增加一个小挫折作为铺垫，
     使低谷更有情感冲击力。
```

### AI 辅助功能

- **自动检测弧光节点**：AI 分析每章内容，自动标记角色的情感/状态变化点
- **弧光诊断**：识别问题模式：
    - "角色在第三章到第六章之间没有任何变化（扁平化风险）"
    - "角色的道德转变过于突然，缺少铺垫"
    - "两个主角的弧光曲线过于相似，缺乏差异性"
- **弧光建议**：基于经典叙事理论，建议在哪些位置安排转折点

---

## 工具 3：🕸️ 关系图谱可视化（Relationship Map）

### 设计目标

将知识图谱中的角色关系以**交互式网络图**呈现，并支持按时间线查看关系演变。

### 关系数据结构

```tsx
interface Relationship {
  id: string;
  fromCharacterId: string;
  toCharacterId: string;
  
  // 关系属性
  type: 'family' | 'romantic' | 'friendship' | 'rivalry' | 'professional' | 'custom';
  label: string;                   // "师徒" / "情敌" / "同事"
  strength: number;                // 关系强度 0-10
  sentiment: number;               // 情感倾向 -10（敌意）到 +10（亲密）
  
  // 时间维度
  establishedAt: string;           // 建立于哪个章节
  changes: RelationshipChange[];   // 关系变化记录
  
  // 当前状态
  currentStatus: 'active' | 'broken' | 'hidden' | 'evolving';
}

interface RelationshipChange {
  chapterId: string;
  description: string;             // "林远发现陈默是幕后黑手"
  sentimentShift: number;          // 情感变化量
  typeChange?: string;             // 关系类型变化（如 朋友 → 敌人）
}
```

### 时间线滑块

关系图谱的一个核心交互是**时间线滑块**——用户可以拖动滑块，查看"截至第 N 章时的关系状态"：

```
┌─────────────────────────────────────────────────┐
│  🕸️ 角色关系图谱                                  │
│                                                 │
│         林远 ───敌意──→ 陈默                      │
│        ╱    ╲           ╱                       │
│    师徒     暧昧      同事                        │
│      ╱        ╲      ╱                          │
│   老张        苏晴 ─?─ 李明                       │
│                                                 │
│  ──────────────────●─────────────               │
│  Ch1    Ch3    Ch5 ▲ Ch7    Ch9                  │
│                    │                            │
│              当前视图: 第五章                      │
│                                                 │
│  图例: ── 正面关系  ╌╌ 负面关系  ·· 未知关系       │
│        线条粗细 = 关系强度                         │
└─────────────────────────────────────────────────┘
```

---

## 工具 4：⏳ 时间线编辑器（Timeline Editor）

### 设计目标

管理复杂的时间线结构（多线叙事、插叙、闪回），确保时间逻辑不矛盾。

### 时间线数据模型

```tsx
interface TimelineEvent {
  id: string;
  
  // 时间信息
  storyTime: {
    absolute?: string;             // 绝对时间（如 "2024年3月15日"）
    relative?: string;             // 相对时间（如 "事件A三天后"）
    duration?: string;             // 持续时间
    precision: 'exact' | 'approximate' | 'vague';
  };
  
  // 叙事时间
  narrativePosition: {
    chapterId: string;             // 出现在哪个章节
    paragraphRange: [number, number]; // 段落范围
  };
  
  // 事件信息
  description: string;
  involvedCharacters: string[];
  location: string;
  
  // 因果关系
  causedBy: string[];              // 前因事件 ID
  causes: string[];                // 后果事件 ID
  
  // 时间线归属
  timelineId: string;              // 属于哪条时间线（主线/支线/回忆线）
}

interface Timeline {
  id: string;
  name: string;                    // "主线" / "林远回忆线" / "陈默暗线"
  color: string;                   // 可视化颜色
  events: TimelineEvent[];
}
```

### 可视化呈现

```
⏳ 时间线编辑器                  [故事时间] [叙事时间]

故事时间 →
──────────────────────────────────────────────
主线    ●───────●──────●─────────●──────●───→
        事件A   事件B   事件C      事件D   事件E
        
回忆线          ●────●
               回忆1  回忆2
               
暗线      ●─────────────●────────────●───→
         密谋开始       行动         暴露

──────────────────────────────────────────────

叙事时间（章节顺序）→
──────────────────────────────────────────────
Ch1: 事件A → Ch2: 回忆1 → Ch3: 事件B → Ch4: 回忆2
→ Ch5: 密谋开始(闪回) → Ch6: 事件C → ...

⚠️ 冲突检测: 事件B 标记为"周二"，但事件C标记为
   "事件B的前一天"且为"周三"——时间逻辑矛盾！
```

---

## 工具 5：🌍 世界观构建器（World Builder）

### 设计目标

为不同类型的小说提供**结构化的世界观框架**，将世界观设定直接注入知识图谱，成为 AI 推理的一部分。

### 预设世界观模板

| **类型** | **模板内容** | **知识图谱实体类型** |
| --- | --- | --- |
| 🏰 奇幻 | 魔法体系、种族、阵营、地理、历史纪元、神话 | 魔法规则、种族、阵营、神明、魔法物品 |
| 🚀 科幻 | 科技水平、星系地理、种族/文明、政治体系、物理法则（如超光速规则） | 科技、星球、文明、飞船、AI 实体 |
| 🏙️ 现代都市 | 城市地理、组织/公司、社会阶层、法律/规则 | 组织、地点、社会规则 |
| ⚔️ 历史 | 历史背景、真实事件、历史人物、时代特征、语言/礼仪规范 | 历史事件、历史人物、时代规范 |
| 🔍 推理 | 案件结构、线索网络、嫌疑人列表、时间线、不在场证明 | 线索、嫌疑人、证据、动机 |

### 世界观条目结构

```tsx
interface WorldBuildingEntry {
  id: string;
  category: string;                // "魔法体系" / "地理" / "政治"
  name: string;
  description: string;
  
  // 规则约束（直接注入 Rules 层）
  rules: WorldRule[];
  
  // 层级关系
  parentId?: string;               // 上级条目（如 "火系魔法" 属于 "魔法体系"）
  childIds: string[];
  
  // 与其他实体的关联
  relatedEntities: string[];
}

interface WorldRule {
  id: string;
  statement: string;               // "魔法在白天不可用"
  scope: 'absolute' | 'conditional';
  condition?: string;              // "除非持有月光石"
  importance: 'critical' | 'important' | 'flavor';
  
  // 此规则会被注入上下文引擎的 Rules 层
  // 一致性守卫会用此规则检查 AI 生成的内容
}
```

---

## 工具 6：📖 阅读视角模拟（Reader Perspective Simulator）

### 设计目标

让作者能从**读者的视角**审视自己的作品——读者在这一刻知道多少信息？读者会有什么样的情感反应？

### 功能

- **信息量追踪**：标记读者在每个章节结束时已知的信息（哪些秘密已揭示？哪些还在隐藏？）
- **悬念温度计**：评估当前悬念的强度——读者有多想知道接下来会发生什么？
- **情感预测**：AI 预测读者在关键情节点的情感反应（震惊/感动/困惑/无聊）
- **首读模拟**：AI 扮演"第一次阅读的读者"，逐章阅读并记录反应和疑问

```tsx
interface ReaderSimulation {
  chapterId: string;
  
  // 读者已知信息
  knownFacts: string[];            // 读者已经知道的事实
  suspectedFacts: string[];        // 读者可能猜到的事实
  unknownFacts: string[];          // 读者还不知道的事实
  
  // 悬念评估
  suspenseLevel: number;           // 悬念强度 0-10
  openQuestions: string[];         // 读者心中的未解问题
  
  // 情感预测
  emotionalResponse: {
    primary: string;               // 主要情感（紧张/感动/好奇等）
    intensity: number;             // 情感强度 0-10
    engagement: number;            // 投入度 0-10
  };
  
  // 潜在问题
  issues: {
    confusion: string[];           // 可能让读者困惑的地方
    boredom: string[];             // 可能让读者无聊的地方
    disbelief: string[];           // 可能让读者出戏的地方
  };
}
```

---

## 小说模式的专属技能

| **技能名称** | **功能** | **触发方式** |
| --- | --- | --- |
| 章节续写 | 基于大纲和前文续写下一段/下一节 | 默认技能，快捷键 Tab |
| 场景扩写 | 将简略描写扩展为完整场景 | 选中文字 → 技能菜单 |
| 对白润色 | 让对白更符合角色性格 | 选中对白 → 技能菜单 |
| 视角转换 | 将段落从一个角色的视角重写为另一个角色的视角 | 选中文字 → 技能菜单 |
| 氛围渲染 | 为场景增加环境描写和氛围渲染 | 选中文字 → 技能菜单 |
| 伏笔植入 | 在当前段落中自然地植入指定伏笔 | 从伏笔看板拖入 → 选择植入位置 |
| 章节摘要 | 自动生成章节摘要并更新大纲 | 章节完成后自动触发 / 手动 |
| 角色一致性修复 | 检测并修复当前段落中与角色设定不一致的描写 | 反思循环自动触发 / 手动 |

---

## 小说模式的专属审查维度

在通用审查维度（设定一致性、风格匹配、叙事连贯、角色声音）基础上，增加：

1. **伏笔状态审查**：检查已埋设的伏笔是否被遗忘或悬挂过久
2. **节奏曲线审查**：检查最近章节的节奏是否单调
3. **信息揭示审查**：检查是否过早揭示了关键信息（破坏悬念）
4. **Show vs Tell 审查**：检测是否过多使用"告诉"而非"展示"——如"他很生气"vs "他的拳头捏得发白"