# CN-fd-v3 — 融合设计规范

> **📂 SSOT 文件夹入口**：[docs/cn-frontend-ssot/README.md](cn-frontend-ssot/README.md) —— 本文档已按职责拆分为结构化 SSOT 文件夹，新人请从那里开始阅读。

<aside>

**V3 = V2 的骨架 + V1 的灵魂 + 全新的 AI 面板。** 这不是简单拼接，而是基于两版源码的完整审计，重新定义每个组件在 CreoNow 这个「创作型产品」中的角色。核心原则：**界面为创作让路，AI 为创作赋能，一切服务于 Cinematic Calm。**

</aside>

---

## 目录

---

## 1. 融合决策总览

| **组件** | **来源** | **决策理由** | **改造工作** |
| --- | --- | --- | --- |
| **Icon Rail** | V2 | 48px 纯图标轨道正确——创作工具不需要文字导航占空间 | 微调：图标 18px、hover 用 V1 透明层、激活色 `#7AA2F7`（与全局 accent 统一） |
| **Context Panel** | V2 | 文件树 + 大纲双视图正确，注入 V1 视觉气质 | 背景色 `#000000`；选中态用 `--accent-subtle` 高亮 + 左侧 `--accent` 指示线；大纲激活色 `#7AA2F7` |
| **搜索面板 ⌘K** | V1 风格 + V2 动画 | V1 的 CommandPalette 是最有韵味的组件——左右分栏 + 预览。快捷键 `Ctrl+K`（macOS `⌘+K`） | 保留 V1 分栏；加 V2 motion 动画；新增 AI Actions 搜索类别 |
| **AI 面板（右侧）** | **全新设計（V3 原创）** | V1/V2 都是「套皮 ChatGPT」。CN 应参考 Cursor 的简洁范式 | Cursor 式对话面板 + 底部工具栏（模式/模型/Skill 弹出式列表）。见 §4 |
| **AI FAB** | V2 概念 + 重设计 | 可拖拽 FAB 概念正确，但交互粗糙 | 单击打开面板（300ms）；双击展开快速菜单；长按拖拽 |
| **Dashboard** | V2 结构 + V1 气质 | V2 的 Heatmap + Insights 更完整 | 背景色回退到 V1 风格；Heatmap 用 accent 渐变梯度（见 §2.2） |
| **Editor** | V2 功能 + V1 氛围 | V2 的 Zen Mode + AI Inline Block + 状态栏是正确演进 | 编辑区背景 `#050505`；AI Inline Block 降低侵入感（左侧 2px 指示线） |
| **Analytics** | V2 | V2 的 PieChart + Agent Suggestions 更完整 | Agent Suggestions 用 V3 AI 视觉语言 |
| **Characters** | V2 | V2 的可编辑 + Creo Agent 分析是正确方向 | Agent 分析面板用 V3 AI 视觉语言 |
| **Knowledge Graph** | V2 | V2 的形状节点 + motion 更成熟 | 节点色彩回退到 V1 白色主调，仅 AI 关联边用蓝色 |
| **Settings Modal** | V2 结构 + V1 视觉 | V2 的 5 Tab + 3 层级切换器功能完整 | 视觉回退到 V1 低对比度风格 |
| **主题色系** | V1 + V2 融合 | V1 的 `#050505` 纯黑底更有电影感；V2 的 `#7AA2F7` 是正确的产品 accent 色选择 | 背景 `#050505`；`#7AA2F7` 作为**统一 accent 色**用于所有激活态与交互态，AI 功能与其他功能共享同一色彩语言 |
| **动画系统** | V2 | `motion` stagger 动画是现代标准 | 入场 stagger 从 60ms 降至 40ms；退场增加 blur |
| **字体系统** | V2 | Inter + Playfair Display + Source Serif 4 + JetBrains Mono | 保持不变 |
| **Design Token** | V2 | 完整 A-K Token 系统 | Token 值按 V3 色彩决策微调 |

---

## 2. V3 色彩系统

<aside>

**核心哲学：一个 accent，贯穿全局。** 看 Cursor——chat 面板的发送按钮、sidebar 激活图标、settings tab 激活态、内联补全接受键，全部同一个蓝色 accent，没有「AI 色」和「非 AI 色」之分。Notion 同理，AI 写作结果与普通文字共享完全相同的字体、颜色、间距。AI 是产品功能，不是外来物——为它单独造一套色彩语言，反而告诉用户「这里有一个异质的东西」，制造认知割裂。

**V3 的 `#7AA2F7` 是产品的统一 accent 色**，用于所有激活态与交互态。AI 面板的 Tab、Icon Rail 的激活图标、按钮 hover、选中的文件节点——都用同一个 accent。一致性 = 融合感。

</aside>

### 2.1 基础色板

| **Token** | **V1** | **V2** | **V3** | **理由** |
| --- | --- | --- | --- | --- |
| `--background` | `#050505` | `#0D0D0D` | `#050505` | 回退 V1——更深的黑底给文字更强的浮雕感，更有「电影暗房」氛围 |
| `--card` | `#0A0A0A` | `#111111` | `#0A0A0A` | 跟随背景回退 |
| `--muted` | `#1A1A1A` | `#1E1E1E` | `#1A1A1A` | 跟随背景回退 |
| `--accent` | `#1A1A1A`（无彩色，实为缺失） | `#7AA2F7`（全局强调） | `#7AA2F7`（**全局统一 accent**） | V2 的选色方向正确，V3 继承并将其真正落实为全局 accent——所有激活态、交互态、选中态统一使用，不再分 AI/非 AI |
| `--accent-foreground` | — | `#050505` | `#050505` | accent 底色上的文字用深色 |
| `--accent-hover` | — | — | `#8BB3F8` | 比 accent 亮 ~8%，用于 hover 态 |
| `--accent-subtle` | — | — | `rgba(122,162,247,0.08)` | 选中行背景、活动节点底色等低饱和场景 |
| `--accent-muted` | — | — | `rgba(122,162,247,0.20)` | 边框、分隔线等中等饱和场景 |
| `--sidebar` | `#000000` | `#0A0A0A` | `#000000` | 回退 V1 纯黑——侧边栏应该「消失」在背景中 |
| `--sidebar-primary` | `#FFFFFF`（无强调色） | `#7AA2F7` | `#7AA2F7` | 与 V2 对齐——激活图标用产品 accent，与其他激活态一致 |

### 2.2 Accent 色使用规则（全局一致）

<aside>

**统一原则：凡是「激活/选中/聚焦/交互反馈」，一律用 `#7AA2F7`。** 区分 AI 内容与用户内容靠的是**图标（Lucide Sparkles）和排版**，而非另起一套颜色。

</aside>

| **场景** | **使用方式** | **Token** |
| --- | --- | --- |
| Icon Rail 激活图标 | 图标本身染色 `#7AA2F7` | `--accent` |
| Context Panel 文件选中行 | 左侧 2px 指示线 + 底色 `--accent-subtle` | `--accent` / `--accent-subtle` |
| 编辑器工具栏激活按钮（write/split/preview） | 按钮底色 `--accent-subtle`，文字 `--accent` | `--accent-subtle` |
| AI 面板 Tab 激活指示器 | 底部 2px `--accent` 线——**与其他 Tab 激活态完全相同** | `--accent` |
| AI Inline Block 左侧指示线 | 左侧 2px `--accent`（标识这段内容是 AI 写的） | `--accent` |
| AI FAB | 按钮背景 `--accent`——它是一个按钮，用 accent 符合按钮规范 | `--accent` |
| 模式/模型/Skill 选择器当前选中项 | 文字颜色 `--accent`，行底色 `--accent-subtle` | `--accent` / `--accent-subtle` |
| Settings Tab 激活态 | 与 Icon Rail、编辑器工具栏激活态一致：底部 2px 线 `--accent` | `--accent` |
| 搜索面板选中结果行 | 底色 `--accent-subtle` | `--accent-subtle` |
| Dashboard KPI 数字 | 保持 `--foreground`（`#F0F0F0`）——数据本身不需要强调色，避免所有数字都变蓝 | `--foreground` |
| Heatmap 色阶 | 用 accent 渐变：`#0A0A0A` → `--accent-subtle` → `--accent-muted` → `--accent` | `--accent` 系列 |
| 输入框 focus ring | `--accent-muted` 边框 | `--accent-muted` |

---

## 3. Icon Rail + Context Panel（取自 V2，视觉微调）

### 3.1 Icon Rail 规范

| **属性** | **V2 原值** | **V3 调整** | **理由** |
| --- | --- | --- | --- |
| 宽度 | 48px | 48px | 保持 |
| 背景色 | `#0A0A0A` | `#000000` | 回退 V1 纯黑 |
| 图标尺寸 | 20×20px stroke 1.5px | 18×18px stroke 1.5px | 略小 + 更多空白 = 更精致 |
| 可点击区域 | 36×36px | 36×36px | 保持（满足可访问性） |
| 图标间距 | 4px | 6px | 更宽松的呼吸感 |
| Hover 背景 | `#1E1E1E` | `rgba(255,255,255,0.06)` | V1 风格——透明层而非实色 |
| 激活色 | `#7AA2F7` | `#7AA2F7` | 与全局 accent 对齐，导航激活和其他激活态使用同一颜色 |
| Hover 动画 | 无指定 | `ease-out 150ms` | 加入 V1 缓动曲线 |

### 3.2 图标列表（与 V2 一致）

- **上区**：Search → LayoutDashboard → Folder → BarChart2 → Calendar
- **分隔线**
- **下区**：User（Characters）→ Network（KG）
- **flex-1 留白**
- **底部**：Settings

### 3.3 Context Panel 调整

- **背景色**：`#000000`（V1）
- **文件树节点高度**：32px（V2）
- **选中态**：`--accent-subtle`（`rgba(122,162,247,0.08)`）背景 + 左侧 2px `--accent`（`#7AA2F7`）指示线
- **大纲激活色**：`#7AA2F7`（与 Icon Rail、Settings Tab 激活态统一）
- **字数统计底栏**：保留 V2 设计

---

## 4. AI 面板：参考 Cursor，为创作场景适配

<aside>

**设计原则：Cursor 的 AI 面板已经验证了正确范式——简洁对话面板 + 底部工具栏 + 弹出式选择器。** CN 不需要发明新范式，只需要把 Cursor 的范式适配到创作场景：模式（Agent/Plan → CN 的对应模式）、模型选择、**Skill 选择**（CN 独有）。所有选择器都是弹出式列表，不是占空间的卡片网格。

</aside>

### 4.1 整体布局（参考 Cursor）

```
┌─────────────────────────────────────┐
│  New Chat                  + ⏱ ··· │  ← 顶栏：新建对话 + 历史
├─────────────────────────────────────┤
│                                     │
│  （对话区域——可滚动）               │
│                                     │
│  用户:                              │
│  帮我续写 Elara 发现水晶的场景       │
│                                     │
│  Creo:                              │
│  Elara 的指尖触碰到水晶表面的一刹   │
│  那，整个密室的符文同时亮起——先     │
│  是微弱的磷光，然后是刺目的白炽…    │
│                                     │
│  ┌─ ✅ 接受  ─  ✏️ 编辑  ─  🔄 ─┐  │  ← 行动栏
│  └────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Plan, @ for context, / for cmds    │  ← 输入框
│                                     │
│                                     │
│  ┌─────┐ ┌──────────┐  ┌───────┐   │
│  │Agent▾│ │Model ▾   │  │Skill ▾│   │  ← 底部工具栏
│  └─────┘ └──────────┘  └───────┘   │  全部弹出式列表
│  [Folder] Local ▾              [Mic] [Image]│
└─────────────────────────────────────┘
```

### 4.2 底部工具栏三个选择器

**所有选择器都是弹出式列表（Popover），点击后弹出，选中后收起。不在面板中铺展任何内容。**

#### 4.2.1 模式选择器（左侧）

点击弹出模式列表，与 Cursor 的 Agent/Plan/Debug/Ask 对应：

| **CN 模式** | **对应 Cursor** | **说明** |
| --- | --- | --- |
| **Agent** | Agent | Creo 自主执行：续写、修改编辑器内容、操作文件树。可以连续调用多个 Skill |
| **Plan** | Plan | Creo 先给出计划（大纲/步骤），用户确认后再执行。适合大规模修改 |
| **Analyze** | Debug 的变体 | 分析模式：对选中文本或全文做一致性检查、人物弧光分析、风格分析。只读，不修改编辑器。**IPC 映射说明：** `ai:skill:run` 的 `mode` 字段只有 `"agent" | "plan" | "ask"`，无 `"analyze"`。Analyze 模式在 IPC 层映射为 `mode: "ask"`  • 分析类 skillId（`critique` / `describe` / `synopsis` 等）。`useAIStore.activeMode` 维护前端 UI 态，在调用 IPC 前由 `ModeSelector` 组件做转换。 |
| **Ask** | Ask | 纯对话：问答、讨论情节、头脑风暴。不触碰编辑器内容 |

弹出列表样式：

- 背景 `#0A0A0A`，圆角 8px，阴影 `0 8px 32px rgba(0,0,0,0.5)`
- 每行高度 36px，hover `rgba(255,255,255,0.06)`
- 当前选中项有 ✓ 标记
- 快捷键标注在右侧（如 `Ctrl+I` for Agent 等）

#### 4.2.2 模型选择器（中间）

点击弹出模型列表：

- 顶部：搜索框（`Search models`）
- 模型列表：显示可用模型，当前选中有 ✓
- 底部：`Add Models >`
- 样式与模式选择器一致

CN 的模型列表由后端 `ai:models:*` 通道提供，前端只做展示。

#### 4.2.3 Skill 选择器（CN 独有，在模型选择器右侧）

**这是 CN 相对于 Cursor 的唯一新增 UI 元素。** 点击弹出 Skill 列表：

- 当前激活的 Skill 列表（可多选）
- 每个 Skill 一行：图标 + 名称 + 开/关 Toggle
- 底部：`Add Skills >` → 进入 Skill 商店/管理页
- 激活的 Skill 会影响 Agent 的行为（类似 Cursor 的 tool 概念）

内置 Skill 示例（取自 §29 完整清单，skillId 为真实值）：

- **continue（PenLine）** — `pkg.creonow.builtin/continue` — 根据上下文续写内容
- **critique（AlertCircle）** — `pkg.creonow.builtin/critique` — 扫描情节/逻辑不一致
- **dialogue（MessageSquare）** — `pkg.creonow.builtin/dialogue` — 角色对话质量分析与改写
- **polish（Sparkles）** — `pkg.creonow.builtin/polish` — 调整文风/节奏/用词
- **summarize（FileText）** — `pkg.creonow.builtin/summarize` — 生成章节/全文摘要
- **translate（Languages）** — `pkg.creonow.builtin/translate` — 段落级翻译
- **expand（Maximize2）** — `pkg.creonow.builtin/expand` — 扩展世界观设定细节（基于 KG 上下文）

### 4.3 对话区域规范

对话区域是标准的消息流，**但 Creo 的文学内容输出使用衬线体以区分系统消息和创作内容**：

| **元素** | **规范** |
| --- | --- |
| 用户消息 | 左对齐，背景 `rgba(255,255,255,0.04)` 圆角 8px padding 12px，Inter 13px `#E8E8E8` |
| Creo 回复（文学内容） | 左对齐，无背景色，Source Serif 4 **15px** `#E8E8E8`，行高 1.8。**当 Creo 输出的是小说/散文等文学内容时用衬线体**。字号选用 15px 而非编辑器的 16px，是刻意制造一级微妙的层级差异：AI 对话区的内容「略小于」编辑器正文，在视觉上暗示「这还在讨论中」而非「已落纸为定稿」。Focus Mode 下改为 16px（见 §6.5），与编辑器平级——因为 Focus Mode 的本意是 AI 内容与正文等价协作。 |
| Creo 回复（分析/建议/通用） | 左对齐，无背景色，Inter 13px `#B0B0B0`，行高 1.6。分析报告、建议列表等用无衬线体 |
| 行动栏 | 每条 Creo 回复下方：接受 · 编辑 · 重新生成 · 复制。水平排列，12px `#555555`，hover `#F0F0F0`。无边框无背景 |
| 流式输出 | 标准逐 token 渲染。文学内容用 Source Serif 4，分析内容用 Inter |

### 4.4 输入框

- 多行输入框，最小高度 44px，最大高度 160px（自动扩展）
- Placeholder：`Plan, @ for context, / for commands`（Win 优先展示 Ctrl 快捷键）
- **@ 引用**：弹出上下文选择器（当前文档、角色、章节、KG 实体）
- **/ 命令**：弹出快捷命令列表
- 右侧：图片上传（Lucide `Image` 16px）+ 语音输入（Lucide `Mic` 16px）

### 4.5 上下文指示（输入框下方）

- `[Folder] Local ▾`：显示当前上下文范围（Local = 当前文档 / Project = 整个项目 / Selection = 选中文本）
- 点击弹出上下文范围切换列表

### 4.6 AI ↔ Info 切换：单图标翻转，非双 Tab

<aside>

**原则：右侧面板永远只展示一种内容——AI 对话或文档 Info。** 两者并列展示既无必要，也浪费空间。切换入口应尽可能小、尽可能隐蔽，让面板内容本身成为视觉主角。

</aside>

**交互逻辑：**

右侧面板顶栏右上角放置一个 16px 的 `Info` 图标（Lucide `Info`），作为唯一的视图切换入口：

- **默认态**：面板显示 AI 对话视图（§4.1–§4.5），`Info` 图标颜色为 `#3A3A3A`（低调，存在但不抢眼）
- **单击 Info 图标**：整个面板内容切换为 Info 视图，图标高亮为 `#7AA2F7`（accent），表示当前处于 Info 模式
- **再次单击（或点击面板顶部的 `Bot` 图标）**：切回 AI 对话视图
- **快捷键**：`Ctrl+Shift+I` 切换（Win/Linux）/ `Cmd+Shift+I`（macOS）

**顶栏布局（AI 视图）：**

```
┌─────────────────────────────────────┐
│  New Chat              + ⏱ ···  ⓘ  │
│                                (16px, #3A3A3A)
```

**顶栏布局（Info 视图激活时）：**

```
┌─────────────────────────────────────┐
│  Document Info                   ⓘ  │
│                             (#7AA2F7 accent)
```

**视觉规范：**

| **元素** | **AI 视图（默认）** |
| --- | --- |
| 切换图标（`Info` 16px） | `#3A3A3A`，hover `#737373` |
| 面板标题文字 | 「New Chat」（Inter 13px `#737373`） |
| 面板主体内容 | AI 对话区 + 输入框 + 底部工具栏（§4.1–§4.5） |
| 切换动画 | `opacity 0→1`，`--duration-normal`，`--ease-out`；内容区淡出/淡入，无位移 |

**Info 视图内容（来自 V1 INFO Tab）：**

- **字数** / **阅读时间**（`--text-numeric` JetBrains Mono）
- **创建日期** / **最后修改**
- **标签**（可编辑 multi-select）
- **版本历史**（最近 5 条快照，点击可展开 diff）
- **关联角色**（KG 中与当前文档相关的 Character 节点列表，点击跳转）
- 所有数值用 `#F0F0F0`，标签文字用 `#737373`，行高 1.6，Inter 13px

---

## 5. AI FAB 交互规范

**可见规则：**

- **Zen Mode** — FAB 隐藏
- **AI Focus 模式** — FAB 隐藏（已进入全屏 AI 界面，入口冗余）
- 其余所有页面 — FAB 始终可见

| **手势** | **V2 行为** | **V3 行为** | **时序说明** |
| --- | --- | --- | --- |
| **单击** | 无定义（仅可拖拽） | 打开/关闭 AI Sidebar | 延迟 **300ms** 后触发（W3C 双击检测标准窗口） |
| **双击**（300ms 内二次单击） | 无定义 | 展开快速菜单（内容动态，见 §23.2） | 第二击时立即执行，取消第一击的 Sidebar 动作 |
| **长按 500ms** | 无定义 | 进入 AI Focus 模式 | 500ms 时触觉反馈（scale 1.1），松手执行 |
| **拖拽**（按下后移动 > 4px） | 任意拖拽 | 拖拽到任意位置，松手后吸附最近屏幕边缘 | 跟手无缓动，吸附动画 `--duration-fast --ease-out` |
| **单击**（有文字选中时） | 无定义 | 直接聚焦 Inline 工具栏（若已显示）或弹出 Inline 工具栏。**此分支优先于「无选中」的 300ms 延迟分支**——有选中文本时立即响应，取消 300ms 计时器。 | 无延迟，立即执行 |

**FAB 视觉规范：**

- **尺寸**：44×44px，圆形
- **背景色**：`#7AA2F7`，filled CTA，accent 色
- **图标**：Lucide `Bot` 20×20px，`#050505`；快速菜单开启时切换为 `X` 图标
- **阴影**：`0 8px 32px rgba(0,0,0,0.5)`
- **Hover**：`#8BB3F8` + `scale(1.05)` + 外圈光晕 `0 0 0 6px rgba(122,162,247,0.15)`
- **z-index**：`--z-fab`（100）
- **快速菜单详细设计**：见 §23.2

---

## 6. AI Focus Mode — 全屏 AI 创作模式

<aside>

**AI Focus Mode 与 Zen Mode 是两个完全不同的模式，不可混淆。** Zen Mode = 人类写作，界面让路，AI 消失。Focus Mode = AI 主导创作，编辑器与 AI 面板并列全屏，人类在旁协作。两者触发逻辑、布局结构、退出方式均不同。

</aside>

### 6.1 与 Zen Mode 的本质区别

| **维度** | **Zen Mode** | **AI Focus Mode** |
| --- | --- | --- |
| **核心意图** | 人类独立写作，消除所有干扰 | AI 深度介入创作，高效协作 |
| **布局** | 全屏编辑器，无任何 UI chrome | 左侧编辑器（50%）+ 右侧 AI 面板（50%），两栏等分 |
| **AI 元素** | FAB 隐藏，AI 面板隐藏，AI Inline Block 仍可见 | AI 面板占据半屏，FAB 隐藏（入口冗余） |
| **Icon Rail** | 隐藏 | 隐藏（保持沉浸感） |
| **Context Panel** | 隐藏 | 隐藏（保持沉浸感） |
| **触发方式** | `Alt+Z` / 工具栏图标 / ⌘K | FAB 长按 500ms / ⌘K 搜索「focus」/ AI 面板顶栏按钮 |
| **退出方式** | `Alt+Z` / `Esc` / 工具栏图标 | `Esc` / 顶栏退出按钮 / `Ctrl+Shift+F` |
| **适用场景** | 深度写作、初稿创作、需要高度专注时 | AI 续写大段内容、多轮修改打磨、分析与写作交替进行时 |

### 6.2 布局规范

```
┌─────────────────────────────────────────────────────────────┐
│  [X 退出 Focus]               AI Focus Mode          Ctrl+Shift+F │  ← 顶栏（仅 Focus Mode 独有）
├─────────────────────────────┬───────────────────────────────┤
│                             │  New Chat          + ⏱ ···  ⓘ │
│                             ├───────────────────────────────┤
│   编辑器区域                │                               │
│   Source Serif 4            │   AI 对话区（可滚动）          │
│   最大宽度：无限制           │                               │
│   （Focus 下不居中）         │   用户: 帮我续写…             │
│                             │                               │
│                             │   Creo: 月光透过…             │
│                             │                               │
│                             │   接受 · 编辑 · 重新生成       │
│                             ├───────────────────────────────┤
│                             │  [输入框]                      │
│                             │  [Agent] [Model] [Skill]      │
└─────────────────────────────┴───────────────────────────────┘
    ←─────── 50% ──────────→  ←─────────── 50% ─────────────→
```

**布局参数：**

| **元素** | **规范** |
| --- | --- |
| 顶栏高度 | 40px，背景 `#050505`，底部 1px `rgba(255,255,255,0.06)` 分隔线，`z-index: 150`（高于 FAB=100，低于 CommandPalette=200） |
| 退出按钮 | 左侧 `X` 图标（Lucide `X` 16px）+ 文字「退出 Focus」，Inter 12px `#737373`，hover `#F0F0F0` |
| 中央标题 | 「AI Focus Mode」Inter 12px `#737373`，居中，仅装饰性 |
| 快捷键提示 | 右侧显示 `Ctrl+Shift+F`（Badge 样式），提醒用户退出快捷键 |
| 分栏比例 | 默认 50:50，用户可拖拽中间分隔线调整（最小各 320px） |
| 分隔线 | 1px `rgba(255,255,255,0.08)`，hover 时高亮为 `--accent-muted`，显示双向箭头光标 |
| 编辑器区 | 左右 padding 48px（比普通模式略小，因为空间有限），无最大宽度限制 |
| AI 面板区 | 完全复用 §4 的 AI 面板组件，背景 `#080808`（略区别于编辑器背景） |

### 6.3 触发方式（三入口）

| **入口** | **操作** | **说明** |
| --- | --- | --- |
| ① FAB 长按（首选移动入口） | 长按 AI FAB 500ms | 500ms 时 FAB 产生 scale 1.1 触觉反馈，松手后进入 Focus Mode。FAB 长按明确指向「更深的 AI 介入」，语义自然 |
| ② 快捷键 | `Ctrl+Shift+F`（macOS `Cmd+Shift+F`） | 键盘用户首选。三键组合防止误触 |
| ③ AI 面板顶栏按钮 | AI 面板顶栏右侧 `Maximize` 图标（Lucide `Maximize2` 16px） | 当 AI 面板已打开时，点击此图标进入 Focus Mode（面板从右侧扩展为半屏） |

**不提供的入口：**

- 不在 Icon Rail 中放置 Focus Mode 图标（Icon Rail 应保持路由导航的单一职责）
- 不在 ⌘K 搜索中列出（⌘K 会消失，减少模式切换混乱）

### 6.4 进入/退出动画

**进入 Focus Mode：**

1. Icon Rail `translateX(-48px)` + `opacity→0`，`--duration-slow --ease-in`
2. Context Panel 同步 `translateX(-240px)` + `opacity→0`
3. AI 面板从当前宽度（320px）扩展至 50vw，`width transition --duration-slow --ease-out`
4. 编辑器区同步从全宽收缩至 50vw
5. 顶栏从 `opacity 0` 淡入，`--duration-normal --ease-out`
6. 总时长：`--duration-slow`（300ms）

**退出 Focus Mode：**

- 上述动画的完全逆向
- 退出后恢复进入前的面板状态（若进入前 Context Panel 是展开的，退出后也展开）

### 6.5 Focus Mode 内的 AI 面板特殊行为

Focus Mode 中 AI 面板复用 §4 所有规范，但有以下差异：

- **去掉顶栏的 `+ ⏱ ···` 操作区**——空间有限，在 Focus Mode 中这些操作不是重点
- **输入框高度增加**：最小高度 56px（普通模式 44px），给用户更大的输入空间
- **Creo 回复文字**：文学内容用 Source Serif 4 **16px**（普通面板是 15px），与编辑器正文同等字号，强化「协作对话」感
- **快速动作区**（输入框上方）：Focus Mode 下显示 3 个常用快速动作按钮（否则需要手动输入），点击直接触发：
    - `续写当前段落`（PenLine 图标）
    - `优化选中文本`（Sparkles 图标，需有文字选中）
    - `分析节奏/一致性`（Activity 图标）

### 6.6 键盘行为

| **按键** | **行为** |
| --- | --- |
| `Tab` | 焦点在编辑器区和 AI 面板输入框之间切换（两个主要交互区） |
| `Esc` | 退出 Focus Mode，回到普通编辑器视图 |
| `Ctrl+Shift+F` | 切换 Focus Mode（再次按下退出） |
| `Ctrl+Enter`（AI 面板 focused） | 发送当前输入框内容 |
| `Ctrl+Alt+Left/Right` | 调整分栏比例（每次 ±5%，最小各 30%） |

---

## 7. 搜索面板 ⌘K（V1 风格 + V2 动画）

<aside>

**V1 的搜索面板是两版设计中最有韵味的组件。** V3 完全保留 V1 的分栏布局和预览面板，加入 V2 的 motion 动画和一个新的 AI 搜索类别。

</aside>

### 7.1 布局（保留 V1 的左右分栏）

```
┌───────────────────────────────────────────────┐
│  [Search]  搜索 CreoNow...             Ctrl+K    │
├──────────────────────┬────────────────────────┤
│  [FileText] Documents   │  Chapter 12: The       │
│  ├ Chapter 12...     │  Convergence           │
│  ├ Character Arc...  │                        │
│  [Folder] Projects      │  3,420 words           │
│  ├ Project Phoenix   │  Last edited: 2h ago   │
│  [User] Characters      │  Tags: #draft #ch12    │
│  ├ Elara Vance       │                        │
│  [CheckSquare] Tasks    │  ──────────────        │
│  ├ Review draft...   │  The morning light     │
│  [Bot] AI Actions  NEW  │  filtered through...   │
│  ├ 续写当前章节      │                        │
│  ├ 分析角色弧光      │  [ Open ]              │
└──────────────────────┴────────────────────────┘
```

### 7.2 V3 新增：AI Actions 搜索类别

V1 有 4 类搜索结果：Document / Project / Character / Task。V3 新增第 5 类：**AI Actions**——输入自然语言后匹配可直接执行的 AI 技能。

- 输入「续写」→ 显示「续写当前章节」「续写选中段落」「续写指定角色对话」
- 输入「Elara 眼睛颜色」→ 显示「搜索全文中 Elara 外貌描写」「一致性检查: Elara」
- AI Actions 类别使用 `#7AA2F7` 图标色，其他类别保持白色图标

### 7.3 规范

| **属性** | **V1 值** | **V3 调整** |
| --- | --- | --- |
| 尺寸 | `cmdk` 默认 | 560px × max 480px（采纳 V2 App Shell 规范） |
| 位置 | 居中 | 水平居中，距顶部 20vh |
| 圆角 | Tailwind 默认 | 12px（V2 App Shell 规范） |
| 背景 | `#0A0A0A` | `#0A0A0A`（保持） |
| 输入框高度 | 未指定 | 48px，背景 `#050505`（sunken 感） |
| 结果行高度 | 未指定 | 40px，最多 8 条 |
| 预览面板 | 有（V1 独有） | 保留——显示选中项的元数据 + 内容预览 + Open 按钮 |
| 动画 | 无 | V2 的 motion：opacity + scale(0.98→1) 进入，300ms easing-enter |
| 遮罩层 | 无指定 | `rgba(0,0,0,0.6)` 高斯模糊，z-index 200 |

---

## 8. 编辑器（V2 功能 + V1 氛围）

### 8.1 编辑区视觉调整

| **属性** | **V2 值** | **V3 调整** | **理由** |
| --- | --- | --- | --- |
| 背景色 | `#0D0D0D` | `#050505` | 回退 V1——更深的编辑区 = 更沉浸的写作体验 |
| 正文字体 | Source Serif 4 16px | Source Serif 4 16px | 保持——V2 的衬线体选择正确 |
| 行高 | 1.7（继承架构文档） | 1.8 | 略宽松的行高提升阅读舒适度 |
| 左右 padding | `px-16`（64px） | 80px | 更宽的边距 = 更像纸张的感觉 |
| Zen Mode 最大宽度 | `max-w-2xl`（672px） | 640px | 略窄——更接近纸质书籍的行宽 |

### 8.2 AI Inline Block 重设计

V2 的 AI Inline Block 使用了 `border border-accent/30 bg-accent/5`——太像一个「弹窗」，破坏了编辑区的沉浸感。V3 重新设计：

| **属性** | **V2** | **V3** |
| --- | --- | --- |
| 容器 | 圆角边框 + 背景色 | **无容器**——仅左侧 2px `#7AA2F7` 指示线，padding-left 12px |
| 标识 | 「AI Suggestion」标签 + Sparkles 图标 | 左侧指示线即是标识——无额外文字标签 |
| AI 内容字体 | 与编辑器正文相同 | 与编辑器正文相同（Source Serif 4 16px），但色彩略浅：`#C0C0C0` 而非 `#F0F0F0` |
| 操作按钮 | 三个独立按钮（Accept/Reject/Regenerate） | 水平工具条，与 Dialog 模式的行动栏一致：接受 · 编辑 · 重新生成。字号 12px，颜色 `#555555`，hover `#F0F0F0` |
| 动画 | motion height auto | 用「墨水流淌」效果：每个字符 opacity 0→1 过渡 30ms，模拟真实书写 |

### 8.3 Zen Mode — App 级全屏沉浸（V3 全新定义）

<aside>

**V1/V2 都没有真正实现 Zen Mode。** V2 的 `zenMode` 只是 EditorPage 内部隐藏了 Outline 并居中内容，但 IconRail、ContextPanel、AI FAB 仍然可见——这不是 Zen。V3 的 Zen Mode 是 **App 级别的全屏模式**，由 `AppLayout` 统一控制，整个 Shell 消失，屏幕上只剩编辑器。

</aside>

**触发方式（多入口，越快越好）：**

| **方式** | **操作** | **说明** |
| --- | --- | --- |
| ① 快捷键（首选） | `Alt+Z`（macOS `Opt+Z`） | 两键组合，左手单手可达，Z = Zen。不与任何系统级快捷键冲突 |
| ② 工具栏图标 | 编辑器工具栏右侧 Maximize 图标 | 鼠标用户的入口 |
| ③ 搜索面板 | `Ctrl+K`（macOS `⌘+K`）→ 输入 "zen" / "专注" | 搜索用户的入口 |

**进入 Zen Mode 后隐藏的元素（全部由 AppLayout 控制）：**

| **元素** | **Zen Mode 行为** |
| --- | --- |
| Icon Rail（48px） | 隐藏 |
| Context Panel | 隐藏 |
| Right Sidebar（AI 面板） | 隐藏 |
| AI FAB | 隐藏 |
| 编辑器顶部工具栏（write/split/preview） | 隐藏（鼠标移至顶部边缘时 fade-in 显示，2s 无操作后 fade-out） |
| 底部状态栏 | 隐藏（鼠标移至底部边缘时 fade-in 显示） |
| 编辑区域 | 全屏居中，最大宽度 640px，背景 `#050505` 铺满整个窗口 |
| 光标 | 可见（3s 无操作后隐藏，任意按键/鼠标移动恢复） |

**退出 Zen Mode：**

- `Alt+Z`（macOS `Opt+Z`）再按一次
- `Esc` 键
- 鼠标移至顶部边缘后点击工具栏中的 Minimize 图标

**视觉规范：**

- 进入/退出动画：`opacity 0→1` + 各面板 `translateX` 滑出，300ms `ease-out`
- 编辑区正文：Source Serif 4 16px，行高 1.8，`#E8E8E8`
- 左右 padding：`max(80px, calc((100vw - 640px) / 2))`——在任何屏幕宽度下都居中
- 无任何 UI chrome——纯文字 + 纯黑背景，像打开一本书

**实现层级：**

- Zen Mode 状态存储在 `AppLayout` 层（不是 EditorPage），通过 React Context 传递
- `AppLayout` 根据 `isZenMode` 条件性渲染 IconRail / ContextPanel / RightSidebar / FAB
- 仅在 `/app/editor/:id` 路由下可激活

---

### 8.4 功能保留与修正（基于源码审计）

以下逐项对照 V1/V2 源码确认实际实现状态：

| **功能** | **V1 源码** | **V2 源码** | **V3 决策** |
| --- | --- | --- | --- |
| **write / split / preview 三模式** | 已实现（`EditorPage.tsx` 有 `mode` state） | 已实现（同上，激活态用 `bg-accent` 蓝色） | 保留。激活按钮用 `--accent-subtle` 底色 + `--accent` 文字——与全局激活态一致 |
| **Zen Mode** | 未实现 | 已实现（`zenMode` state + `Maximize`/`Minimize` 图标切换，隐藏 Outline，`mx-auto max-w-2xl`） | 保留 V2 实现。最大宽度改为 640px |
| **AI Inline Block** | 未实现 | 已实现（`border border-accent/30 bg-accent/5` 容器 + Sparkles 图标 + Accept/Reject/Regenerate 三按钮 + `motion` height auto 动画） | 保留概念，重设计视觉：去掉容器，改为左侧 2px `#7AA2F7` 指示线（见 §8.2） |
| **左侧 Outline** | 已实现（`outlineSections`  • 可展开/折叠） | 已实现（同 V1 结构，`expandedSections` Set） | 保留。V2 Outline 无激活色定义，V3 指定用 `#F0F0F0` |
| **底部状态栏** | 未实现 | 已实现（`border-t` 底栏：`Hash` 字数 + `Clock` 阅读时间 + 保存时间） | 保留 V2 实现 |
| **编辑器字体** | 未使用衬线体（Inter only） | 已实现（`font-serif` Playfair Display 用于标题，`prose` 正文也用衬线。Source Serif 4 在 fonts.css 引入但编辑器代码中用的是 `font-serif`） | V3 编辑器正文指定用 `--font-editor: Source Serif 4`，标题用 `--font-serif: Playfair Display` |
| **RightSidebar AGENT Tab** | ASSISTANT Tab：模拟对话 + 代码高亮 + Apply 按钮 | AGENT Tab：对话线程 + Markdown 代码块（Apply to Editor）+ 快捷动作芯片（续写/总结本章/漏洞/对话/弧光）+ 输入框（Bot 图标 + placeholder + Enter 发送） | V3 按 §4 Cursor 式重设计，但 V2 的快捷动作芯片概念保留为底部 Skill 选择器 |
| **RightSidebar INFO Tab** | 完整实现（字数/阅读时间/创建日期/标签/版本历史/关联角色） | 部分实现（基本为空）（仅一句提示文字 "Select an entity..."） | V3 用 **V1 的 INFO Tab 数据结构**，V2 的视觉风格 |
| **AI FAB** | 未实现 | 已实现（`AppLayout.tsx` 中 `button`  • `onMouseDown` 拖拽。**仅拖拽**，无单击/双击事件绑定） | 保留拖拽，新增单击/双击交互（见 §5） |
| **CommandPalette 预览面板** | 有左右分栏 + 右侧预览面板（元数据 + Open 按钮） | ⚠️ V2 的 CommandPalette 代码未在 Notion 页面中完整展示，但目录结构有 `CommandPalette.tsx`（部分实现） | V3 保留 V1 的分栏预览面板设计 |
| **Dashboard Heatmap** | 未实现 | 已实现（`heatmapData` 52×7 随机值 + 4 级颜色梯度 `#161616` → `#1e3a5f` → `#3b6daa` → `#7aa2f7`） | 保留。Heatmap 颜色用 accent 渐变：`#0A0A0A` → `--accent-subtle` → `--accent-muted` → `--accent`（与 §2.2 对齐） |
| **Analytics PieChart** | 未实现（仅进度条） | 已实现（`recharts` PieChart + 4 类别） | 保留 V2 |
| **Analytics Agent Suggestions** | 未实现 | 已实现（3 条 AI 建议 + Sparkles 图标） | 保留，视觉用 V3 AI 语言 |
| **Characters 可编辑** | 不可编辑（静态详情面板） | 已实现（`EditableField`  • `EditableTraits` 内联编辑 + Creo Agent 分析面板 `agentInsights`） | 保留 V2 |
| **KG 形状节点** | 仅圆形 SVG 节点 | 已实现（`circle` / `rect` / `polygon` 按类型区分 + motion 入场） | 保留 V2，节点颜色回退到 V1 白色主调 |
| **@ 引用 / / 命令** | 未实现 | 未实现 | V3 新增（§4.4 输入框规范） |

---

## 9. V3 theme.css 完整代码

```css
@custom-variant dark (&:is(.dark *));

:root {
  --font-size: 16px;
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-serif: "Playfair Display", Georgia, serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
  --font-editor: "Source Serif 4", Georgia, serif;

  /* === V3 Color Tokens === */
  /* Base: V1's deep black (#050505) for cinematic depth */
  --background: #050505;
  --foreground: #f0f0f0;
  --card: #0a0a0a;
  --card-foreground: #f0f0f0;
  --popover: #0a0a0a;
  --popover-foreground: #f0f0f0;
  /* --primary follows shadcn convention: main filled-button color */
  --primary: #7aa2f7;
  --primary-foreground: #050505;
  --secondary: #161616;
  --secondary-foreground: #f0f0f0;
  --muted: #1a1a1a;
  --muted-foreground: #737373;

  /* V3: #7aa2f7 is the unified product accent — used for ALL active/interactive states */
  --accent: #7aa2f7;
  --accent-foreground: #050505;
  --accent-hover: #8bb3f8;
  --accent-subtle: rgba(122, 162, 247, 0.08);
  --accent-muted: rgba(122, 162, 247, 0.20);

  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: rgba(255, 255, 255, 0.08);
  --input: rgba(255, 255, 255, 0.08);
  --input-background: #050505;
  --switch-background: #333333;
  --ring: rgba(122, 162, 247, 0.30);

  /* Brand */
  --brand-success: #22c55e;
  --brand-warning: #f59e0b;

  /* Chart: accent gradient for data viz */
  --chart-1: #f0f0f0;
  --chart-2: #737373;
  --chart-3: #404040;
  --chart-4: #a3a3a3;
  --chart-5: #22c55e;

  /* V2 explicit px radius (kept) */
  --radius: 8px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Sidebar: V1 pure black */
  --sidebar: #000000;
  --sidebar-foreground: #f0f0f0;
  --sidebar-primary: #7aa2f7;  /* V3: unified accent — same as all other active states */
  --sidebar-primary-foreground: #050505;
  --sidebar-accent: #1a1a1a;
  --sidebar-accent-foreground: #f0f0f0;
  --sidebar-border: rgba(255, 255, 255, 0.06);
  --sidebar-ring: rgba(255, 255, 255, 0.2);

  /* V3: Editor-specific tokens */
  --editor-bg: #050505;
  --editor-text: #e8e8e8;
  --editor-text-pending: #c0c0c0;  /* pending/unaccepted AI text slightly dimmer */
  --editor-line-height: 1.8;
  --editor-max-width: 640px;
}

@theme inline {
  --font-family-sans: var(--font-sans);
  --font-family-serif: var(--font-serif);
  --font-family-mono: var(--font-mono);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground); /* bg-primary → blue filled button */
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground font-sans; }
  html { font-size: var(--font-size); }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
}
```

---

## 10. 全局数字一览

| **维度** | **V1** | **V2** | **V3** |
| --- | --- | --- | --- |
| 背景色 | `#050505` | `#0D0D0D` | `#050505`（回退 V1） |
| Accent 色 | 无（V1 缺失此项） | `#7AA2F7`（全局） | `#7AA2F7`（**统一全局 accent**） |
| 左侧导航 | LeftSidebar（文字+图标） | IconRail 48px + ContextPanel | IconRail 48px + ContextPanel（V2） |
| AI 面板模式 | 1（ASSISTANT Tab） | 1（AGENT Tab） | **4 模式弹出切换**（Agent/Plan/Analyze/Ask）+ Skill 选择器 |
| AI FAB 交互 | 无 | 拖拽只 | 单击面板(300ms) + 双击菜单 + 长按拖拽 |
| 搜索类别 | 4（Doc/Project/Char/Task） | 4 | **5**（+ AI Actions） |
| 搜索预览面板 | 有 | 无 | 有（回退 V1） |
| 字体族 | 2（Inter + Playfair） | 4（+ Source Serif 4 + JetBrains Mono） | 4（V2） |
| 动画 | 无 | `motion` stagger 60ms | `motion` stagger 40ms + blur 退场 |
| AI Inline Block | 无 | 边框 + 背景色容器 | 左侧 2px 指示线（无容器） |
| 编辑器行高 | 未指定 | 1.7 | 1.8 |
| Design Token 文档 | 无 | A-K 完整系统 | A-K + V3 微调 |

---

## 11. Dashboard 完整布局规范

<aside>

**Dashboard 是用户进入 CreoNow 的第一个页面。** 它不是一个信息展示看板，而是一个「创作指挥中心」——帮用户快速回到未完成的内容、了解创作势头、接受 AI 建议。所有数据都是为「下一步应该写什么」服务的。

</aside>

### 11.1 页面结构（上到下）

```
+----------------------------------------------------------+
|  欢迎回来，Leeky                             上午 10:24  |
|  继续上次的创作：Chapter 12 - The Convergence... [>打开]   |
+----------------------------------------------------------+
|  KPI 卡片区（四列等宽）                                  |
|  [总字数]  [本周字数]  [创作天数]  [AI 协作次数]  |
+----------------------------------------------------------+
|  Heatmap（全宽）                                         |
|  52 周 x 7 天的创作热度图（如 GitHub 贡献图）      |
+----------------------------------------------------------+
|  最近文档         |  AI 建议（Agent Suggestions） |
|  卡片列表         |  Creo 的 3 条建议卡片         |
+----------------------------------------------------------+
|  氽注 / 快速记录入口（底部固定）                      |
+----------------------------------------------------------+
```

### 11.2 顶部迎接区

- **问候文字**：「欢迎回来，[firstName]」，Playfair Display 24px `#F0F0F0`
- **时间显示**：当前时间，JetBrains Mono 12px `#737373`，右对齐
- **“继续上次”快捷入口**：若有未保存的文档，展示文件名 + 『打开』按钒，Inter 13px，背景 `rgba(122,162,247,0.08)` + 1px `--accent-muted` 边框
- **最小高度**：80px，顶部 padding 32px

### 11.3 KPI 卡片区

**四张卡片，等宽排列，间距 24px：**

| **卡片** | **标题** | **数据** | **副标题** | **图标** |
| --- | --- | --- | --- | --- |
| 总字数 | 「总字数」 Inter 11px `--muted-foreground` | JetBrains Mono 32px `#F0F0F0` | 「全部作品」 11px `#737373` | Lucide `FileText` 20px `#737373` |
| 本周字数 | 「本周新增」 Inter 11px `--muted-foreground` | JetBrains Mono 32px `#F0F0F0` | 足迹指示：「+ 12% vs 上周」 11px `#22C55E`（上升）/ `#EF4444`（下降） | Lucide `TrendingUp` 20px `#737373` |
| 创作天数 | 「连续创作」 Inter 11px `--muted-foreground` | JetBrains Mono 32px + 「天」 14px `#F0F0F0` | 「最长连续：42 天」 11px `#737373` | Lucide `Flame` 20px `#7AA2F7`（连续中用 accent 提示） |
| AI 协作 | 「AI 协作次数」 Inter 11px `--muted-foreground` | JetBrains Mono 32px `#F0F0F0` | 「本周接受 NN 条」 11px `#737373` | Lucide `Bot` 20px `#7AA2F7` |

**卡片规格：**

- 背景 `#0A0A0A`（`--card`），圆角 12px，padding 24px
- 内部布局：左上标题 + 图标，中间大数字，左下副标题
- Hover：`box-shadow 0 4px 16px rgba(0,0,0,0.3)` + `translateY(-2px)`，`--duration-fast --ease-out`
- 数字必须用 JetBrains Mono（对齐精准）

### 11.4 Heatmap 活动热度图

**布局：**

- 52 列（周）x 7 行（天）的方块网格
- 每个方块 12x12px，间距 2px，圆角 2px
- 左侧标签：星期一…星期日（Inter 10px `#737373`，居中对齐行）
- 顶部标签：每隔 4 周显示月份（Jan / Feb...），Inter 10px `#737373`
- 右下角：图例（较少 → 较多，五个梯度块）

**颜色梯度（与 §2.2 对齐）：**

| **级别** | **字数区间** | **颜色** | **Token** |
| --- | --- | --- | --- |
| 0（无创作） | 0 | `#0A0A0A` | `--card` |
| 1（较少） | 1–200 | `rgba(122,162,247,0.15)` | `--accent-subtle` 加深 |
| 2（中等） | 201–600 | `rgba(122,162,247,0.35)` | `--accent-muted` 居中 |
| 3（较多） | 601–1500 | `rgba(122,162,247,0.60)` | `--accent` 60% |
| 4（高产出） | > 1500 | `#7AA2F7` | `--accent` 100% |

**交互：**

- 鼠标悬停方块：显示 Tooltip（日期 + 字数 + 星期几）
- Tooltip 样式：背景 `#1A1A1A`，圆角 6px，阴影 `0 4px 12px rgba(0,0,0,0.4)`，内容 Inter 12px `#E8E8E8`
- 点击方块：跳转到对应日期的 Calendar 页面

### 11.5 最近文档列表

**展示最近修改的 5 个文件：**

| **列** | **内容** | **规范** |
| --- | --- | --- |
| 文件名 | 文档标题 | Inter 13px `#E8E8E8`，单行湢出省略 |
| 归属项目 | 项目名 / 独立文件 | Inter 11px `#737373`，Badge 样式 |
| 最后修改 | 相对时间（〢2小时前」） | JetBrains Mono 11px `#737373` |
| 字数 | 文档当前字数 | JetBrains Mono 11px `#737373` |
| 快据操作 | hover 时显示：「继续」「预览」 | Inter 11px `#737373`，hover 时出现 |
- 列表行高 48px，hover 背景 `rgba(255,255,255,0.04)`
- 列表顶部：标题「最近局」 + 「查看全部 >」链接（`--accent` 颜色）
- 列表与 AI 建议区并排两栏，同一行高度

### 11.6 AI 建议区（Agent Suggestions）

<aside>

**这是 Dashboard 上最有价值的区域。** Creo 主动分析用户的创作模式，提出具体的局部行动建议——不是「加油」这种模糊鼓励，而是「你的第 12 章最后一段要写 Elara 和 Sera 的对话」这种具体建议。

</aside>

**卡片结构（每条建议一张卡片）：**

```
+-----------------------------------------------+
| [Sparkles 16px #7AA2F7]  AI 建议              |
+-----------------------------------------------+
| 建议内容（具体，参考你的内容）         Source Serif 4 14px #B0B0B0 |
| 关联文件/章节名称                       Inter 11px #737373 |
+-----------------------------------------------+
| [立即尝试]     [稍后]     [不需要]      |
+-----------------------------------------------+
```

**设计规范：**

| **元素** | **规范** |
| --- | --- |
| 卡片容器 | 背景 `#0A0A0A`，圆角 12px，padding 20px，左侧 2px `--accent` 指示线（AI 内容标识） |
| 标题行 | Lucide Sparkles 16px `#7AA2F7`  • 「AI 建议」Inter 11px `#7AA2F7`，同行两端对齐（右侧日期 11px `#555555`） |
| 建议内容 | Source Serif 4 14px `#B0B0B0`，行高 1.6，最多 3 行湢出 |
| 关联内容 | Inter 11px `#555555`，前缀“关联」——可点击跳转对应文档 |
| [立即尝试] 按钒 | 背景 `--accent`，文字 `#050505`，圆角 6px，Inter 12px。点击后进入 AI Focus Mode 并自动加载建议内容到输入框 |
| [稍后] 按钒 | 肾 line，文字 `#737373`，hover `#B0B0B0`。将该建议推迟 8h（转为权重较低的提示） |
| [不需要] 按钒 | 同「稍后」样式。消除该条建议， Creo 不再针对此内容重复提示 |
| 卡片之间 | 间距 16px，最多展示 3 张，下方「查看全部建议 >」链接 |

### 11.7 快速记录入口（底部固定）

- 底部固定栏：高 48px，背景 `#0A0A0A`，顶部 1px `rgba(255,255,255,0.06)` 分隔线
- 左侧：透明文字输入框 placeholder 「记录一个想法…」（Inter 13px `#3A3A3A`）——点击后创建一个快速氽注页
- 右侧：「+ 新建文档」按钒，圆角 6px，Inter 12px `#737373`，hover 肾 line 变亮
- `Ctrl+N` 全局快捷键：创建新文档

### 11.8 布局网格规范

**内容区域最大宽度 1280px，水平居中；内部布局出心空白 32px；**

| **区域** | **高度** | **内部网格** |
| --- | --- | --- |
| 迎接区 | 自适应（最小 80px） | 两栏：文字左对齐，时间右对齐 |
| KPI 卡片区 | 120px | 4 列等宽，间距 24px |
| Heatmap 区 | 120px | 全宽，内部两侧 24px padding |
| 内容双栏区 | 自适应（最小 320px） | 6:4 两栏（左迟最近文档，右 AI 建议），间距 24px |
| 底部固定栏 | 48px | 全宽，固定在底部 |

**断点响应式调整：**

- **Compact 以下（< 1024px）**：KPI 卡片改为 2 列，双栏内容区改为单栏（AI 建议移至最近文档下方）
- **Minimal（< 800px）**：KPI 卡片改为 1 列，Heatmap 隐藏，只显示迎接区 + 最近文档 + 快速记录

---

## 12. Settings Modal 完整规范

<aside>

**Settings Modal 是 V2 的功能结构 + V1 的视觉气质。** V2 的 5 Tab + 3 层级切换器功能完整，保留并将视觉回退到 V1 的低对比度风格。Settings Modal 属于全局层，z-index 300。

</aside>

### 12.1 Modal 容器规范

- **尺寸**：宽 720px，最大高度 85vh（内容超出时内部滚动）
- **位置**：水平居中 + 垂直距顶部 8vh
- **背景**：`#0A0A0A`，圆角 12px，边框 1px `rgba(255,255,255,0.08)`
- **阴影**：`0 24px 80px rgba(0,0,0,0.7)`
- **覆盖层**：`rgba(0,0,0,0.6)` + 背景模糊 `backdrop-filter: blur(4px)`
- **入场动画**：`opacity 0→1` + `translateY(-8px)→0`，`--duration-normal --ease-out`
- **退出**：`Esc` / 点击覆盖层 / 左上角 × 按钒

### 12.2 左侧 Tab 导航栏

**左侧固定 Tab 列表，宽 180px，背景 `#080808`（比 Modal 背景略深）：**

| **Tab 名称** | **Lucide 图标** | **内容概述** |
| --- | --- | --- |
| 外观 | `Palette` | 主题（仅深色）、语言、字体大小 |
| 编辑器 | `FileEdit` | 字体、行高、自动保存间隔、拼写检查 |
| AI 与 Creo | `Bot` | 默认模型、Skill 管理、对话历史、权限 |
| 账户 | `User` | 用户名、头像、邮箕、密码、订阅计划 |
| 快捷键 | `Keyboard` | 所有全局快捷键列表 + 自定义 |

**Tab 激活态规范：**

- 激活 Tab：左侧 2px `--accent` 指示线 + 背景 `--accent-subtle` + 文字 `#F0F0F0`
- 默认 Tab：背景透明 + 文字 `#737373`、hover `#B0B0B0`
- 行高 40px，左右 padding 16px，图标 16px + 文字间距 10px

### 12.3 Tab 1 — 外观

| **设置项** | **控件** | **选项** |
| --- | --- | --- |
| 主题 | 展示文字（不可切换） | 「深色模式是 CreoNow 的唯一主题」——此设置为锁定状态，不提供开关 |
| 界面语言 | Select 下拉 | 简中、English |
| 基础字号 | 滑块（Slider） | 12px – 20px，默认 16px；实时预览周围文字变化 |
| 编辑器字体大小 | 滑块 | 14px – 22px，默认 16px；独立于基础字号 |

### 12.4 Tab 2 — 编辑器

| **设置项** | **控件** | **选项/默认值** |
| --- | --- | --- |
| 编辑器字体 | Select 下拉 | Source Serif 4（默认）/ Playfair Display / Georgia / Times New Roman |
| 行高 | 滑块 | 1.4 – 2.2，默认 1.8；步长 0.1 |
| 段落间距 | 滑块 | 8px – 32px，默认 16px |
| 自动保存 | Toggle | 开（默认）——关闭后只有手动 Ctrl+S 保存 |
| 自动保存间隔 | Select | 10s / 30s / 1min / 5min，默认 30s（仅自动保存开时可用） |
| 拼写检查 | Toggle | 开（默认）——关闭后编辑器不高亮拼写错误 |
| 行号显示 | Toggle | 关（默认） |
| 内容最大宽度 | Select | 无限制 / 640px / 720px / 800px，默认无限制（Zen Mode 下除外） |

### 12.5 Tab 3 — AI 与 Creo

| **分组** | **设置项** | **控件** | **选项/默认值** |
| --- | --- | --- | --- |
| 模型 | 默认语言模型 | Select 下拉 | 后端返回的模型列表（动态），默认第一个可用模型 |
| 模型 | AI 回复语言 | Select | 与界面语言一致 / 中文 / English |
| 输入 | 默认模式 | Select | Agent / Plan / Analyze / Ask |
| 输入 | 流式输出 | Toggle | 开（默认）——关闭后 AI 回复一次性呈现 |
| Skill | 已安装的 Skill 列表 | 可开关 + 可卸载的列表 | 显示所有已安装 Skill，每行一个：图标 + 名称 + 版本 + 开关 + 卸载按钒 |
| Skill | Skill 商店入口 | 按钒 | 「+ 添加更多 Skill」——跳转到 Skill 商店页面 |
| 权限 | 允许 Creo 修改文件树 | Toggle | 开（默认）——关闭后 Creo 仅能查看，不能创建/删除文件 |
| 权限 | 允许 Creo 读取全部项目 | Toggle | 开（默认）——关闭后仅当前文档内。平衡隐私与 AI 能力 |
| 对话历史 | 保留对话历史 | Toggle + Select | 开（默认）；保留期 30天 / 90天 / 永久 |
| 对话历史 | 清空全部对话 | 危险按钒（红色） | 点击后弹出确认 Dialog，不可还原 |

### 12.6 Tab 4 — 账户

| **分组** | **设置项** | **控件** |
| --- | --- | --- |
| 个人信息 | 头像（可上传）+ 显示名（可编辑） | 图片上传区 + 文字输入框 |
| 个人信息 | 登录邮箕（显示，不可直接编辑） | 只读文字 + 「更改邮箕 >」链接 |
| 安全 | 修改密码 | 按钒（弹出密码修改 Dialog） |
| 安全 | 两步验证 | Toggle + 配置入口 |
| 订阅 | 当前计划显示 + 到期日 | 只读信息 + 「管理订阅 >」按钒 |
| 数据 | 导出全部数据 | 按钒，生成 JSON 打包下载 |
| 数据 | 删除账户 | 危险按钒（红色）+ 二次确认 Dialog |

### 12.7 Tab 5 — 快捷键

展示所有全局快捷键，分组展示：

| **分组** | **操作** | **默认快捷键** | **可自定义** |
| --- | --- | --- | --- |
| 全局 | 搜索（⌘K） | `Ctrl+K` | 是 |
| 全局 | 新建文档 | `Ctrl+N` | 是 |
| 编辑器 | Zen Mode | `Alt+Z` | 是 |
| 编辑器 | AI Focus Mode | `Ctrl+Shift+F` | 是 |
| 编辑器 | AI 面板切换 | `Ctrl+Shift+A` | 是 |
| 编辑器 | AI↔Info 切换 | `Ctrl+Shift+I` | 是 |
| 编辑器 | 保存 | `Ctrl+S` | 否 |
| 导航 | Context Panel 展开/收起 | `Ctrl+B` | 是 |
| 导航 | Dashboard | `Ctrl+1` | 否 |
| 导航 | Files | `Ctrl+2` | 否 |

**快捷键自定义规则：**

- 点击快捷键显示内容时，出现「点击输入新快捷键」提示
- 如果与系统快捷键冲突，显示警告文字（红色）提示冲突
- 重置按钒恢复默认快捷键

### 12.8 表单元素规范

所有 Settings 表单元素共用同一规格：

| **元素** | **规范** |
| --- | --- |
| 表单行容器 | 最小高度 48px，内容右侧 `--space-8`（控件区域） |
| 设置项标签 | Inter 13px `#E8E8E8`，左对齐 |
| 设置项说明 | Inter 11px `#737373`，标签下方一行 |
| Toggle（开关） | 宽 40px 高 22px，关态 `#3A3A3A`，开态 `--accent`，内圆 18px白色，动画 `--duration-fast` |
| Select 下拉 | 高 36px，肾 line边框，chevron 图标，展开时同一层弹出 Popover |
| Slider | 轨道高 2px `rgba(255,255,255,0.15)`，滑块 16px 圆形 `--accent`，已选轨道 `--accent` |
| 危险按钒（删除/清空） | border `#EF4444`，文字 `#EF4444`，hover 背景 `rgba(239,68,68,0.08)`。独立分组展示，与常规设置项相隔 24px |
| 分组标题 | Inter 10px `#555555` uppercase，距上方设置项 24px，距下方 12px |

---

## 13. 前端路由结构 + 组件树骨架

<aside>

**架构定位：Electron + React + TanStack Router（或 react-router v6）。** 所有页面运行在 renderer 进程，通过 `ipcRenderer.invoke` 调用主进程的 `ipcMain.handle` 注册的通道，响应格式统一为 `IpcResponse<T> = { ok: true; data: T } | { ok: false; error: IpcError }`。

</aside>

### 13.1 路由结构

```
/ (root)
├── /app
│   ├── /dashboard              ← Dashboard（创作指挥中心，见 §11）
│   ├── /projects               ← 项目列表页（project:project:list）
│   ├── /files                  ← 文件浏览器（file:document:list）
│   ├── /editor/:documentId     ← 编辑器页面（file:document:read + ai:skill:run）
│   ├── /analytics              ← 数据分析（stats:range:get + recharts）
│   ├── /characters             ← 角色管理（knowledge:entity:list / type=character）
│   ├── /knowledge-graph        ← 知识图谱（knowledge:query:subgraph）
│   └── /calendar               ← 日历（stats:day:gettoday）
└── /onboarding                 ← 首次启动引导（见 §27）
```

**路由守卫逻辑：**

- 进入 `/app/*` 前检查是否有活跃项目（`project:project:getcurrent`），无则跳转 `/projects` 创建/选择
- `/editor/:documentId` 需验证文档存在（`file:document:read`），不存在则 404 → 返回 `/files`
- `/onboarding` 仅在 `app:system:ping` 后检测无项目时展示，完成后永久跳过

### 13.2 AppLayout 组件树

```
<AppLayout>                          ← 顶层布局，持有 isZenMode / isFocusMode 状态
  <IconRail width="48px"/>           ← 隐藏于 Zen/Focus Mode
  <ContextPanel width="240px"/>      ← 隐藏于 Zen/Focus Mode；可折叠
  <MainContent>
    <Outlet/>                        ← react-router 路由出口
  </MainContent>
  <RightSidebar width="320px"/>     ← AI 面板；隐藏于 Zen Mode
  <AIFab/>                          ← 可拖拽浮动按钮；隐藏于 Zen/Focus Mode
  <ToastProvider/>                  ← z-index 400，全局 Toast 系统（见 §23.5）
  <CommandPalette/>                 ← z-index 200，Ctrl+K 搜索面板（见 §7）
  <SettingsModal/>                  ← z-index 300，懒加载
</AppLayout>
```

### 13.3 编辑器页面组件树

```
<EditorPage documentId={id}>
  <EditorToolbar/>                  ← write / split / preview 切换 + Zen/Focus 入口
  <EditorLayout>
    <OutlineOverlay/>               ← Minimap 式大纲（见 §23.4），绝对定位叠加
    <TipTapEditor
      extensions={[
        StarterKit,
        HeadingNode,
        AIInlineBlock,               ← V3 自定义 Node：左侧 2px 指示线样式
        AtMentionPlugin,             ← @ 引用上下文
        SlashCommandPlugin,          ← / 命令列表
      ]}
    />
    <PreviewPane/>                  ← split/preview 模式下右侧只读预览
  </EditorLayout>
  <EditorStatusBar/>                ← 底部：字数 + 阅读时间 + 保存状态
</EditorPage>
```

### 13.4 RightSidebar（AI 面板）组件树

```
<RightSidebar>
  <SidebarHeader>
    <NewChatButton/>  <HistoryButton/>  <MoreButton/>  <InfoToggle/>
  </SidebarHeader>
  {view === 'ai' ? (
    <AIChatView>
      <MessageList>
        <UserMessage/>  <CreoMessage contentType="literary|analysis"/>
        <ActionBar onAccept onEdit onRegenerate onCopy/>
      </MessageList>
      <FocusQuickActions/>           ← 仅 Focus Mode 下显示
      <ChatInput
        minHeight={44}  maxHeight={160}
        atMentionPopover  slashCommandPopover
      />
      <ContextScope/>                ← [Folder] Local ▾
      <BottomToolbar>
        <ModeSelector/>              ← Agent / Plan / Analyze / Ask
        <ModelSelector/>             ← ai:models:list
        <SkillSelector/>             ← skill:registry:list
        <ImageUploadButton/>  <MicButton/>
      </BottomToolbar>
    </AIChatView>
  ) : (
    <InfoView
      wordCount  readTime  createdAt  updatedAt
      tags  versionHistory  relatedCharacters
    />
  )}
</RightSidebar>
```

---

## 14. 状态管理规范

<aside>

**原则：最小全局状态。** 能用 URL 参数表达的不放 Store，能用 Server State（React Query / SWR）缓存的不放 Zustand，只有真正需要跨组件共享且无法从 URL 推导的才进全局 Store。

</aside>

### 14.1 全局 Store（Zustand）

| **Store** | **状态字段** | **来源 IPC 通道** | **说明** |
| --- | --- | --- | --- |
| `useAppStore` | `isZenMode` `isFocusMode` `focusSplitRatio` `sidebarVisible` | 纯客户端状态，不持久化 | AppLayout 级别的布局状态，通过 React Context 向下传递 |
| `useProjectStore` | `currentProjectId` `currentProjectPath` `projectList` | `project:project:getcurrent` `project:project:list` | 跨页面共享当前项目上下文；切换项目时刷新所有依赖数据 |
| `useDocumentStore` | `currentDocumentId` `documentMeta` `saveStatus` `isDirty` | `file:document:getcurrent` `file:document:read` `file:document:save` | `saveStatus`: `idle | saving | saved | error`；自动保存逻辑托管在此 Store |
| `useAIStore` | `activeMode` `activeModelId` `activeSkillIds` `activeSessionId` `isStreaming` `runRegistry` | `ai:config:get` `ai:models:list` `skill:registry:list` `ai:chat:sessions` | `activeSkillIds`: Set<string>，多选；`runRegistry` 用于 cancel 时查找 runId |
| `useMemoryStore` | `memorySettings` `semanticRules` `conflictQueue` | `memory:settings:get` `memory:semantic:list` | Settings Modal 的 AI Tab 展示用；冲突队列用于提醒 badge |

### 14.2 Server State（React Query）

所有 IPC 调用都包装为 React Query `useQuery` / `useMutation`，命名规范：

- `useDocumentQuery(projectId, documentId)` → `file:document:read`
- `useDocumentsQuery(projectId)` → `file:document:list`
- `useProjectsQuery()` → `project:project:list`
- `useChatHistoryQuery(projectId, sessionId)` → `ai:chat:list`
- `useKGSubgraphQuery(projectId, centerId, k)` → `knowledge:query:subgraph`
- `useStatsRangeQuery(from, to)` → `stats:range:get`
- `useSkillRegistryQuery()` → `skill:registry:list`

**缓存策略：**

| **数据类型** | **staleTime** | **gcTime** | **理由** |
| --- | --- | --- | --- |
| 文档列表 / 元数据 | 10s | 5min | 文件树需要相对实时，但不必每次渲染都重取 |
| 文档内容（contentJson） | 0（always fresh） | 10min | 编辑器内容是 SSOT，任何 save 后立刻 invalidate |
| Stats / Heatmap | 60s | 30min | 统计数据变化慢，60s 内不重取 |
| AI 模型列表 | 5min | 1h | 模型列表变化极慢，长缓存节省 IPC 开销 |
| Skill 注册表 | 30s | 30min | 用户可能刚安装/卸载 Skill，30s 内刷新 |
| KG 子图 | 30s | 5min | KG 实体在 autosave 后可能更新，30s 内视为新鲜 |

### 14.3 页面级本地状态（useState / useReducer）

| **位置** | **状态** | **理由不放全局** |
| --- | --- | --- |
| EditorPage | `editorMode: 'write' | 'split' | 'preview'` `isOutlineFixed` | 仅影响当前编辑器实例，多文档分栏时各自独立 |
| AIFab | `fabPosition: {x,y}` `isDragging` | 拖拽状态只对 FAB 自身有意义 |
| CommandPalette | `query` `selectedIndex` `activeCategory` | 搜索状态关闭即清空，无需持久 |
| SettingsModal | `activeTab` | Tab 切换只影响 Modal 内部 |
| MultiPaneEditor | `panes: DocumentPane[]` `splitRatios: number[]` | 多栏分割状态局部于编辑器，不影响其他页面 |

### 14.4 持久化层（SQLite via IPC）

所有持久化数据由主进程 SQLite 管理，renderer **不直接操作任何数据库**。持久化边界：

- **文档内容**：`file:document:save`（contentJson = TipTap JSON）→ 主进程存储 + 派生 contentText / contentMd / contentHash
- **版本快照**：每次 save 自动或手动触发 `version:snapshot:create`
- **AI 记忆**：`memory:entry:*` / `memory:semantic:*` 全量由主进程管理
- **Skill 配置**：`skill:custom:*` / `skill:registry:toggle` 写入主进程 DB
- **项目 / 文档 元数据**：`project:project:*` / `file:document:update`
- **UI 偏好**（字体、行高等）：通过 `context:settings:read` 读取 `.creonow/settings.json`，通过 `context:settings:*` 写回

---

## 15. IPC 通道完整规范

<aside>

**基于源码审计：`apps/desktop/main/src/ipc/contract/ipc-contract.ts` 完整定义了 134 条 IPC 通道**，所有通道遵循统一格式 `IpcResponse<T>`。Push 事件（AI 流式输出）通过 `ipcRenderer.on` 监听，不走 invoke/handle 模式。

</aside>

### 15.1 通道命名空间总览

| **命名空间** | **数量** | **职责** | **对应服务** |
| --- | --- | --- | --- |
| `app:*` | 6 | 系统 ping、窗口控制、renderer 错误上报 | Electron 原生 / 日志 |
| `stats:*` | 2 | 每日创作统计、时间段汇总 | `statsService` |
| `export:*` | 5 | 文档导出（Markdown/PDF/DOCX/TXT）+ 项目打包 | `exportService` |
| `backup:*` | 4 | 项目快照创建/列出/还原/删除 | `backupService` |
| `ai:*` | 11 | Chat 对话、Skill 执行、模型配置、模型列表 | `aiService`  • `skillExecutor` |
| `memory:*` | 18 | 记忆 CRUD、语义规则、情节记录、蒸馏、溯源 | `memoryService`  • `episodicMemoryService` |
| `search:*` | 6 | 全文搜索、策略查询、排名解释、查找替换 | `searchService` |
| `embedding:*` | 3 | 向量生成、语义搜索、索引重建 | `embeddingService` |
| `rag:*` | 3 | RAG 上下文检索、配置读写 | `ragService` |
| `knowledge:*` | 14 | KG 实体/关系 CRUD、图查询、实体识别、规则注入 | `kgService`  • `kgRecognitionRuntime` |
| `skill:*` | 8 | Skill 注册表读写、自定义 Skill CRUD | `skillService` |
| `project:*` | 13 | 项目 CRUD、重命名、归档、切换、生命周期 | `projectService` |
| `context:*` | 10 | 项目上下文目录、文件监听、Token 预算、Prompt 组装 | `contextService`  • `layerAssemblyService` |
| `constraints:*` | 6 | 创作约束策略 CRUD（世界观规则等） | `constraintsService` |
| `judge:*` | 3 | 本地判断模型状态、质量评估 | `judgeService` |
| `file:*` | 10 | 文档 CRUD、内容保存（TipTap JSON）、状态更新 | `documentService` |
| `version:*` | 10 | 版本快照 CRUD、diff、回滚、分支管理、合并冲突 | `versionService` |
| `db:*` | 1 | 调试用途：列出所有 SQLite 表名（`db:debug:tables`） | SQLite 直接查询 |
| `dialog:*` | 1 | 系统对话框：原生文件夹选择弹窗（`dialog:folder:select`） | Electron `dialog` 模块 |

**合计：134 条 invoke/handle 通道 + 3 条 push 事件通道（见 §15.3）**

### 15.2 高频通道详细规范

#### 15.2.1 ai:skill:run — Skill 执行（核心通道）

```tsx
// Request
{
  skillId: string;          // e.g. "pkg.creonow.builtin/continue"
  hasSelection?: boolean;
  input: string;            // 用户输入或选中文本
  mode: "agent" | "plan" | "ask";  // 对应 §4.2.1 的 CN 模式
  model: string;            // 模型 ID，来自 ai:models:list
  candidateCount?: number;  // 1-5，默认 1；>1 时禁用流式
  context?: { projectId?: string; documentId?: string; };
  stream: boolean;          // true 时通过 push 事件推流
}
// Response
{
  executionId: string;
  runId: string;
  outputText?: string;      // stream=false 时返回完整文本
  candidates?: Array<{ id: string; runId: string; text: string; summary: string; }>;
  usage?: { promptTokens: number; completionTokens: number; sessionTotalTokens: number; estimatedCostUsd?: number; };
}
```

#### 15.2.2 file:document:save — 文档保存

```tsx
// Request
{
  projectId: string;
  documentId: string;
  contentJson: string;     // TipTap JSON，序列化字符串，上限 5MB
  actor: "user" | "auto" | "ai";    // user=手动保存，auto=自动保存，ai=AI 接受
  reason: "manual-save" | "autosave" | "ai-accept" | "status-change";
}
// Response
{ updatedAt: number; contentHash: string; compaction?: { code: "VERSION_SNAPSHOT_COMPACTED"; deletedCount: number; } }
// 副作用（主进程自动触发）：
// 1. stats 更新（wordsWritten delta）
// 2. KG 实体识别入队（actor=auto && reason=autosave）
// 3. Embedding 索引更新入队（同上）
```

#### 15.2.3 project:project:switch — 切换项目

```tsx
// Request
{ projectId: string; operatorId: string; fromProjectId: string; traceId: string; }
// Response
{ currentProjectId: string; switchedAt: string; }
// 切换后 renderer 需要 invalidate 所有 React Query 缓存并重新拉取
```

### 15.3 push 事件通道（ipcRenderer.on）

| **Channel 常量** | **触发时机** | **payload 关键字段** | **前端处理** |
| --- | --- | --- | --- |
| `SKILL_STREAM_CHUNK_CHANNEL` | AI 流式输出每个 token chunk | `type: "chunk"` `text: string` `runId: string` | 追加到对话气泡的流式渲染缓冲区 |
| `SKILL_QUEUE_STATUS_CHANNEL` | Skill 执行排队状态变化 | `type: "queue"` `status: "queued" | "running" | "cancelled"` | 显示 AI 面板顶部的排队指示器 |
| `SKILL_STREAM_DONE_CHANNEL` | 流式输出完成（或错误） | `type: "done"` `terminal: "completed" | "failed"` `outputText: string` `traceId: string` | 流式渲染结束，显示行动栏（接受/编辑/重新生成） |

**反压控制（Backpressure）：** 主进程通过 `createIpcPushBackpressureGate` 对每个 renderer 会话限流（`streamRateLimitPerSecond`），超速 chunk 直接丢弃并记录日志。前端不需要额外处理。

### 15.4 IPC 错误码

| **错误码** | **含义** | **前端处理建议** |
| --- | --- | --- |
| `DB_NOT_READY` | 数据库尚未初始化（启动中） | 显示加载态，500ms 后重试，最多 5 次 |
| `INVALID_ARGUMENT` | 参数不合法（类型/必填校验失败） | Toast error，不重试（属于前端 bug） |
| `NOT_FOUND` | 资源不存在（文档/项目/Skill） | 跳转到列表页，Toast warning |
| `FORBIDDEN` | 跨项目访问（projectId 与 session 绑定不匹配） | 强制重新绑定项目，Toast error |
| `DOCUMENT_SIZE_EXCEEDED` | 文档超过 5MB 上限 | Toast error + 提示用户拆分文档 |
| `SKILL_DEPENDENCY_MISSING` | Skill 依赖的其他 Skill 未启用 | Toast warning + 列出缺失依赖，引导用户到 Settings 开启 |
| `INTERNAL` | 主进程未预期异常 | Toast error「发生了错误，请重试」+ `app:renderer:logerror` 上报 |

---

## 16. shadcn 使用边界声明 + 内置 Skill 完整清单

### 16.1 shadcn 使用边界

<aside>

**原则：shadcn 只提供骨架，样式必须 override。** CN 的 `--background` 是 `#050505`（极深黑），shadcn 的默认 token 值会让组件「泡在灰色浆糊里」。每个 shadcn 组件使用前必须通过 V3 token 重新映射。

</aside>

#### 16.1.1 可直接使用的 shadcn 组件（token 覆盖后）

| **shadcn 组件** | **使用场景** | **必要 token 覆盖** |
| --- | --- | --- |
| `Button` | 所有按钮（Primary/Ghost/Destructive） | `--primary: #7AA2F7` `--primary-foreground: #050505`（已在 theme.css 覆盖） |
| `Input` / `Textarea` | Settings 表单、搜索框、AI 输入框 | `--input: rgba(255,255,255,0.08)` `--ring: rgba(122,162,247,0.30)` |
| `Select` / `Popover` | 模式/模型/Skill 选择器，Settings 下拉 | `--popover: #0A0A0A` `--popover-foreground: #F0F0F0` |
| `Switch` / `Toggle` | Settings 表单开关 | `--switch-background: #333333`；开启态 `--accent` |
| `Slider` | Settings 字号/行高/段落间距 | 轨道色 `rgba(255,255,255,0.15)`，thumb + 已选轨道 `--accent` |
| `Tooltip` | 图标提示、Heatmap 方块提示 | `--popover: #1A1A1A`（比 card 略亮，区分层级） |
| `Dialog` | Settings Modal、危险操作确认 | `--card: #0A0A0A`；覆盖层 `rgba(0,0,0,0.6) blur(4px)` |
| `Badge` | 项目名标签、状态标签、版本标签 | `--secondary: #161616` `--secondary-foreground: #F0F0F0` |
| `Separator` | Icon Rail 分隔线、Settings 分组线 | `--border: rgba(255,255,255,0.08)` |
| `ScrollArea` | 对话区、文件树、KG 侧边栏 | 滚动条 `rgba(255,255,255,0.10)` hover `rgba(255,255,255,0.20)` |

#### 16.1.2 禁止直接使用（需完全自定义）

| **禁止组件** | **替代方案** | **禁止理由** |
| --- | --- | --- |
| `shadcn/Toast` (`Sonner`) | 自定义 `ToastProvider`（见 §23.5） | Sonner 的定位逻辑和堆叠行为与 V3 规范不符；CN 需要左侧标识线、进度条、堆叠展开等定制行为 |
| `shadcn/NavigationMenu` | 自定义 `IconRail`（见 §3.1） | NavigationMenu 是水平导航假设，CN 是 48px 纯图标垂直轨道，完全不同结构 |
| `shadcn/Command`（cmdk） | 自定义 `CommandPalette`（见 §7） | cmdk 不支持左右分栏预览面板，V3 的 AI Actions 类别也需要深度定制渲染 |
| `shadcn/Tabs` | 自定义 Tab 组件 | CN 的 Tab 激活态是底部 2px 指示线，shadcn Tabs 默认用背景色区分，需要完全重写样式 |
| `shadcn/Card` | 自定义 `KPICard` / `SuggestionCard` | Card 过于通用，CN 的卡片有 hover 上浮动画、左侧 AI 指示线等特定行为 |

#### 16.1.3 shadcn 使用黄金法则

- **所有 shadcn 组件必须在 `components/ui/` 目录下有对应的「CN 包装版本」**，直接从 `@/components/ui/button` import，不从 shadcn 原始路径 import
- **禁止使用 shadcn 内置的 `cn()` 合并 className 时附加 shadcn 默认颜色类**（如 `bg-background text-foreground`），应使用 V3 CSS Token 变量
- **组件 Props 禁止透传 `variant="default"`** ——V3 只有一套视觉语言，不存在「default vs primary vs secondary」的视觉切换需求

### 16.2 内置 Skill 完整清单

<aside>

**来源：`apps/desktop/main/skills/packages/pkg.creonow.builtin/1.0.0/skills/`** — 共 17 个内置 Skill，全部预装，可单独开关（`skill:registry:toggle`），不可删除（scope = builtin）。

</aside>

| **Skill ID** | **中文名** | **Lucide 图标** | **适用场景** | **输入类型** |
| --- | --- | --- | --- | --- |
| `write` | 写作 | `PenLine` | 从提示词/大纲生成正文段落 | 文本输入 / 无选中 |
| `continue` | 续写 | `ArrowRight` | 根据当前文档上下文续写后续内容 | 文档末尾 / 无选中 |
| `expand` | 扩写 | `Maximize2` | 将选中段落扩展为更丰富的内容 | 选中文本 |
| `shrink` | 缩写 | `Minimize2` | 将选中内容压缩为更精炼的版本 | 选中文本 |
| `condense` | 精炼 | `Filter` | 保留核心信息，去除冗余表达 | 选中文本 |
| `rewrite` | 改写 | `RefreshCw` | 用不同表达方式重写选中内容 | 选中文本 |
| `polish` | 润色 | `Sparkles` | 提升文字质感、节奏和风格一致性 | 选中文本 |
| `style-transfer` | 风格转换 | `Paintbrush` | 将选中内容改写为指定风格（悬疑/浪漫/简洁等） | 选中文本 + 风格指令 |
| `translate` | 翻译 | `Languages` | 段落级双语翻译 | 选中文本 |
| `summarize` | 摘要 | `FileText` | 生成章节/全文摘要（不修改原文） | 选中文本 / 全文 |
| `synopsis` | 梗概 | `AlignLeft` | 从章节内容生成故事梗概（宣传/投稿用） | 选中文本 / 全文 |
| `critique` | 评析 | `Search` | 分析逻辑漏洞、情节不一致、节奏问题 | 选中文本 / 全文（只读） |
| `describe` | 描写生成 | `Eye` | 为场景/人物/环境生成感官描写 | 文本输入（描述对象） |
| `dialogue` | 对话生成 | `MessageSquare` | 基于角色设定和场景生成自然对话 | 文本输入 / 角色 @ 引用 |
| `brainstorm` | 头脑风暴 | `Lightbulb` | 生成情节点子、角色动机、世界观元素列表 | 文本输入（任意问题） |
| `roleplay` | 角色扮演 | `User` | 以指定角色视角续写或对话 | 角色 @ 引用 + 场景输入 |
| `chat` | 自由对话 | `Bot` | 与 Creo 进行无结构创作讨论（对应 Ask 模式） | 文本输入 |

### 16.3 Skill 选择器与内置 Skill 的对应关系

**§4.2.3 Skill 选择器弹出列表中展示的「内置 Skill 示例」** 对应上述清单中的：

- **续写** → `continue`（`ArrowRight`）
- **漏洞检查** → `critique`（`Search`）
- **人物弧光** → 需自定义 Skill（内置清单中无此 Skill，设计规范中的描述为 V3 期望新增）
- **风格润色** → `polish`（`Sparkles`）
- **总结** → `summarize`（`FileText`）
- **翻译** → `translate`（`Languages`）
- **世界观扩展** → 需自定义 Skill（内置清单中无此 Skill，需结合 KG `knowledge:rules:inject` 实现）

**自定义 Skill 接口（`skill:custom:create`）关键字段：**

- `promptTemplate: string` — 含 `input` `context` `document` 占位符的 prompt 模板
- `inputType: "selection" | "full-document" | "user-input"` — 控制 Skill 的输入来源
- `contextRules` — 是否自动注入 KG / Memory / RAG 上下文
- `scope: "global" | "project"` — global 对所有项目可用，project 仅限当前项目

---

## 23.1 App Shell 框架

<aside>

**App Shell 是整个应用的骨架层**，由 `AppLayout` 组件统一持有和控制。所有布局模式（普通/Zen/Focus/多栏）都是 AppLayout 的状态变体，而非独立页面。Shell 的职责是：路由出口管理、布局状态控制、全局浮层（Toast/CommandPalette/SettingsModal）挂载。

</aside>

### 23.1.1 Shell 层级结构

```
<AppShell>                          z-index 层级
  ├── <IconRail/>                   z: 20（低于 Outline，高于编辑器内容）
  ├── <ContextPanel/>               z: 20
  ├── <MainContent>
  │     └── <RouterOutlet/>         z: 0（编辑器内容基准层）
  ├── <RightSidebar/>               z: 20
  ├── <AIFab/>                      z: 100（--z-fab）
  ├── <CommandPalette/>             z: 200（--z-command）
  ├── <SettingsModal/>              z: 300（--z-modal）
  └── <ToastProvider/>              z: 400（--z-toast，最高层）
```

### 23.1.2 Shell 布局参数

| **元素** | **默认尺寸** | **Zen Mode** | **Focus Mode** | **多栏模式** |
| --- | --- | --- | --- | --- |
| Icon Rail | 48px 固定宽 | 隐藏 | 隐藏 | 隐藏 |
| Context Panel | 240px，可折叠为 0 | 隐藏 | 隐藏 | 隐藏 |
| Main Content | `flex-1`（剩余宽度） | 100vw | 50vw（可拖调） | 按分栏比例 |
| Right Sidebar | 320px，可关闭 | 隐藏 | 50vw（AI 面板） | 不显示（AI 面板嵌入分栏） |
| AI FAB | 44×44px，右下角 | 隐藏 | 隐藏 | 隐藏（AI 面板已在分栏中） |

### 23.1.3 Shell 状态机

| **状态** | **触发** | **互斥** | **存储位置** |
| --- | --- | --- | --- |
| Normal（默认） | 应用启动 / 退出其他模式 | — | `useAppStore.mode = 'normal'` |
| Zen Mode | `Alt+Z` / 工具栏图标 | 与 Focus Mode 互斥 | `useAppStore.mode = 'zen'` |
| Focus Mode | FAB 长按 500ms / `Ctrl+Shift+F` | 与 Zen Mode 互斥 | `useAppStore.mode = 'focus'` |
| Multi-Pane | `Ctrl+\` / Context Panel 右键 | 与 Zen/Focus 互斥（退出后恢复） | `useAppStore.panes[]` |

**模式切换动画时长统一为 `--duration-slow`（300ms）**，各面板用 `translateX` + `opacity` 组合过渡，具体参数见各章节规范（§6.4 / §8.3）。

### 23.1.4 全局快捷键注册

Shell 层在 `useEffect` 中注册全局 `keydown` 监听，优先级高于编辑器内部快捷键：

- `Ctrl+K` → 打开 CommandPalette
- `Alt+Z` → 切换 Zen Mode（仅在 `/editor/*` 路由）
- `Ctrl+Shift+F` → 切换 Focus Mode（仅在 `/editor/*` 路由）
- `Ctrl+,` → 打开 SettingsModal
- `Ctrl+B` → 折叠/展开 Context Panel
- `Escape` → 优先关闭最高层浮层（Toast 不响应，Modal → CommandPalette → Focus/Zen）

---

## 23.3 Context Panel 详细交互

<aside>

**Context Panel 是文件树 + 项目导航的组合面板**，宽 240px，背景纯黑 `#000000`。它有两个视图：文件树（默认）和大纲导航。大纲导航已独立设计为编辑器内 Minimap 叠加层（见 §23.4），Context Panel 中不再重复——Context Panel 只做文件树。

</aside>

### 23.3.1 面板结构

```
┌────────────────────────────────┐
│ [≡] Project Phoenix   [+] [···]│  ← 顶栏：项目名 + 新建 + 菜单
├────────────────────────────────┤
│ [Search] 搜索文件...            │  ← 内联搜索框（Ctrl+F 激活）
├────────────────────────────────┤
│ ▶ 草稿                         │  ← 文件夹（可折叠）
│   ├ Chapter 01 - Awakening     │  ← 文档节点（32px 高）
│   ├ Chapter 02 - Discovery     │  ← 选中态：左 2px accent 线
│   └ Chapter 03 - Conflict      │
│ ▶ 已发布                       │
│   └ The Final Draft            │
│ ─────────────────────────────  │  ← 分隔线
│ + 新建文档                     │  ← 底部固定操作区
├────────────────────────────────┤
│ 总字数 42,318  已写 8 天        │  ← 底部状态栏（来自 V2）
└────────────────────────────────┘
```

### 23.3.2 文件节点规范

| **状态** | **视觉表现** | **触发条件** |
| --- | --- | --- |
| Default | 背景透明，文字 `#737373`（Inter 13px），Lucide `FileText` 14px | 未选中 |
| Hover | 背景 `rgba(255,255,255,0.04)`，文字 `#B0B0B0` | 鼠标悬停 |
| Active（当前打开） | 左侧 2px `--accent` 指示线 + 背景 `--accent-subtle`  • 文字 `#F0F0F0` | 文档在编辑器中打开 |
| Dirty（有未保存修改） | 文件名右侧显示 3px `--brand-warning`（`#F59E0B`）圆点 | `isDirty = true` |
| Focused（键盘焦点） | outline `2px --accent-muted`，圆角 4px | Tab 键盘导航 |

**节点高度**：32px。**左侧缩进**：每层 16px（文件夹嵌套最多 3 层）。

### 23.3.3 文件夹节点

- 图标：`ChevronRight`（折叠）/ `ChevronDown`（展开），14px `#555555`
- 点击图标展开/折叠，点击文字区域展开/折叠
- 展开状态持久化到 `localStorage`（key: `creonow:folder-expanded:{projectId}`）
- 折叠时若子文档为当前活跃文档，指示线仍显示在文件夹行

### 23.3.4 右键上下文菜单

文件节点右键弹出 Popover（背景 `#0A0A0A`，圆角 8px，阴影 `0 8px 32px rgba(0,0,0,0.5)`）：

| **菜单项** | **图标** | **IPC 调用** |
| --- | --- | --- |
| 打开 | `ExternalLink` | 路由跳转 `/editor/:id` |
| 在分栏中打开 | `Columns2` | 追加到 `useAppStore.panes[]` |
| 重命名 | `Pen` | `file:document:update`（title patch） |
| 复制 | `Copy` | `file:document:create`  • 内容复制 |
| 导出 | `Download` | `export:document:markdown/pdf/docx/txt`（子菜单） |
| 删除 | `Trash2`（红色） | `file:document:delete`  • 确认 Dialog |

### 23.3.5 顶栏操作区

- **`+` 按钒**：弹出快捷菜单（新建文档 / 新建文件夹），调用 `file:document:create`
- **`···` 按钒**：项目级操作菜单（项目设置 / 备份 / 归档 / 导出全部），调用 `backup:snapshot:create` / `project:project:archive` 等
- **项目名**：可点击弹出项目切换列表（`project:project:list`），切换时调用 `project:project:switch`

### 23.3.6 内联搜索框

- `Ctrl+F`（在 Context Panel 获焦时）激活，搜索框从顶部区域展开，高度 32px
- 输入时实时过滤文件树节点（客户端过滤，不触发 IPC）
- 匹配字符在文件名中高亮（`--accent` 色），非匹配节点透明度降低至 30%
- `Esc` 清空并关闭搜索框，恢复完整文件树

### 23.3.7 底部状态栏

高 36px，背景 `#000000`，顶部 1px `rgba(255,255,255,0.06)` 分隔线：

- **左侧**：总字数（JetBrains Mono 11px `#737373`）——来自 `stats:day:gettoday`
- **右侧**：连续创作天数（JetBrains Mono 11px `#737373`）——来自 `stats:range:get`
- hover 时展示完整 Tooltip（今日写了 N 字 / 本周 N 字）

### 23.3.8 面板折叠/展开

- 折叠按钒：顶栏左侧的 `≡` 图标（Lucide `PanelLeft` 16px `#555555`），点击后面板宽度 `240px → 0`，`--duration-normal --ease-out`
- 折叠时 Icon Rail 保持可见（Icon Rail 与 Context Panel 是独立组件）
- 折叠态下 Icon Rail 对应图标无激活高亮（因为没有 Panel 承接内容）
- 快捷键 `Ctrl+B` 全局切换折叠/展开（即使光标在编辑器中也响应）

---

## 23.4 大纲（Outline）—— Minimap 式结构导航

<aside>

**设计原则：大纲是编辑器的「第六感」——它应该存在，但不应该被看见。** 传统大纲面板占 240px 宽，与文件树争空间。V3 的大纲贴着编辑器左侧，像一根细竖线，鼠标扫过时才展开成可操作的结构面板——设计上参考了 VS Code minimap 的「存在感极低、信息密度极高」逻辑。

</aside>

### 23.4.1 整体视觉结构

```
收起态（默认）                  hover 展开态（160px）

┌──┬────────────────────┐      ┌────────────────┬────────────────────┐
│  │                    │      │ 大纲            │                    │
│▌ │                    │      │────────────────  │                    │
│  │  编辑器正文区域     │      │ H1 第一章       │  编辑器正文区域     │
│▌ │                    │      │   H2 开篇       │                    │
│  │                    │      │   H2 转折       │                    │
│▌ │                    │      │ H1 第二章       │                    │
│  │                    │      │   H2 高潮  ←▌  │                    │
│  │                    │      │   H2 尾声       │                    │
└──┴────────────────────┘      └────────────────┴────────────────────┘
  ↑ 20px 竖向细线                  ↑ 展开 160px，左侧指示线跟随当前位置
  细线上标记 H1/H2/H3 大致位置    ↑ 当前视口所在标题高亮 accent
```

### 23.4.2 收起态规范（默认态）

| **属性** | **规范** |
| --- | --- |
| 宽度 | 20px，固定在编辑器内容区左侧（绝对定位叠加，不影响编辑区宽度计算） |
| 视觉形态 | 1px 竖向实线，颜色 `rgba(255,255,255,0.08)`，高度为编辑器内容高度 |
| 标题位置标记 | 在竖线上对应标题位置处，显示 2×6px 横向小方块：H1 用 `rgba(255,255,255,0.25)`，H2 用 `rgba(255,255,255,0.12)`，H3 用 `rgba(255,255,255,0.06)` |
| 当前视口指示 | 对应当前视口滚动位置，显示 3px 宽的 `--accent`（`#7AA2F7`）竖线段，长度与视口高度成比例 |
| z-index | `--z-outline: 10`，低于 FAB（100）/ Modal（300）/ Toast（400） |
| Hover 触发区域 | 距竖线中心左右各 10px 的 20px 宽热区（实际可点击宽度大于视觉宽度） |

### 23.4.3 展开态规范（hover 后）

| **属性** | **规范** |
| --- | --- |
| 展开宽度 | 160px，从竖线向左展开（绝对定位叠加在编辑器左侧，不推挤编辑器） |
| 展开动画 | `width 0→160px`  • `opacity 0→1`，`--duration-fast`（150ms），`--ease-out` |
| 背景 | `rgba(5,5,5,0.92)`  • `backdrop-filter: blur(8px)`——半透明磨砂，保持与编辑区的视觉联系 |
| 顶部标题栏 | 「大纲」Inter 10px `#555555` uppercase，高 28px，底部 1px `rgba(255,255,255,0.06)` 分隔线；右侧 Pin 图标（Lucide `Pin` 12px `#555555`） |
| 关闭行为 | 鼠标离开展开区域后延迟 200ms 收起（防止误操作）；收起动画同展开逆向 |
| 固定展开 | 单击 Pin 图标可固定展开，编辑器内容区 `paddingLeft` 从 80px 增加到 240px，过渡 `--duration-normal`；再次点击 Pin 取消固定 |

### 23.4.4 标题层级渲染规范

| **层级** | **左侧缩进** | **字号/字重** | **默认颜色** | **当前激活颜色** |
| --- | --- | --- | --- | --- |
| H1 | 0（padding-left 12px） | Inter 12px / 500 | `#B0B0B0` | `#F0F0F0`  • 左侧 2px `--accent` 指示线 |
| H2 | 10px | Inter 11px / 400 | `#737373` | `#D0D0D0`  • 左侧 2px `--accent` 指示线 |
| H3 | 20px | Inter 10px / 400 | `#555555` | `#B0B0B0`  • 左侧 2px `--accent` 指示线 |

**节点高度**：H1 行高 28px，H2 行高 24px，H3 行高 22px。超出 160px 宽度的标题文字截断加省略号。

**当前激活逻辑**：`IntersectionObserver` 观察所有标题节点，当前视口内最顶部可见的标题块为激活态。激活标题的所有父级（H2 → H1）也高亮，但仅提升颜色不加指示线。

### 23.4.5 点击行为

| **操作** | **行为** | **动画** |
| --- | --- | --- |
| 单击标题项 | 编辑器平滑滚动至该标题，标题顶部对齐视口上方 40px 处（留出呼吸空间） | `scrollBehavior: smooth`，`ease-out`，时长由距离决定（最长 400ms） |
| Hover 标题项 | 行背景 `rgba(255,255,255,0.04)`，文字色升高一档（H2: `#737373` → `#B0B0B0`） | `background 100ms ease-out` |
| 单击 Pin 图标 | 面板固定展开，编辑器内容区左移 160px 让位 | `--duration-normal --ease-out` |
| 右键标题项 | 弹出上下文菜单：「复制链接」「跳转至此处」「折叠此节」 | 标准 Popover 动画 |

### 23.4.6 与各模式的关系

| **模式** | **大纲行为** | **理由** |
| --- | --- | --- |
| 普通编辑模式 | 收起态可见（20px 细线），hover 展开 | 默认状态，随时可访问但不占空间 |
| Zen Mode | **完全隐藏**（包括 20px 细线） | Zen Mode 的核心是零 UI chrome——大纲细线也是干扰 |
| AI Focus Mode（50:50 分栏） | **完全隐藏**（编辑区仅 50vw，不适合叠加大纲） | Focus Mode 下编辑区已经很窄，再叠加大纲会过于拥挤 |
| Split Mode（write/preview） | 仅在 write 栏左侧显示，preview 栏不显示 | 大纲服务于编辑操作，预览区不需要导航 |
| 多文档对比分栏（§23.8） | 每栏独立显示各自文档的大纲细线，hover 时展开对应文档的大纲 | 每栏是独立的编辑上下文，大纲跟随各自文档 |

### 23.4.7 状态矩阵（大纲容器）

| **状态** | **视觉表现** | **触发条件** |
| --- | --- | --- |
| Default（收起） | 20px 细线 `rgba(255,255,255,0.08)`，标题位置有灰色小方块，accent 色视口指示器 | 非 hover、非固定 |
| Hover（展开中） | 160px 面板淡入，背景磨砂，标题列表可见 | 鼠标进入热区 |
| Fixed（固定展开） | 160px 面板常驻，编辑区左移，Pin 图标高亮 `--accent` | 单击 Pin 图标 |
| Empty（文档无标题） | 收起态细线变为虚线，hover 时展示「文档暂无标题结构」提示 Inter 10px `#3A3A3A` | 文档不包含 H1/H2/H3 |
| Hidden（Zen/Focus） | 完全不渲染（`display: none`），不保留任何视觉痕迹 | Zen Mode / AI Focus Mode 激活时 |

### 23.4.8 实现说明

- **数据来源**：解析 ProseMirror 文档树中的 heading 节点，实时更新（节流 300ms）
- **滚动监听**：`IntersectionObserver` 观察所有标题节点，取第一个 intersecting 的节点为激活态
- **固定态存储**：存储在 `EditorLayout` state 中，页面刷新后重置（不做持久化）
- **编辑器适配**：固定态下，编辑区 `paddingLeft` 从 80px 增加到 240px，`--duration-normal` 过渡
- **z-index 层级**：`--z-outline: 10`，低于 FAB（100）/ Modal（300）/ Toast（400）

---

## 23.5 Toast 与通知系统

<aside>

**Toast 是系统反馈的唯一通道。** 所有反馈必须通过 Toast （或 inline 错误状态）传达，不得使用 Modal 进行不重要的操作提示。

</aside>

### 23.5.1 Toast 类型

| **类型** | **图标** | **左侧标识线颜色** | **自动消失** | **典型场景** |
| --- | --- | --- | --- | --- |
| 成功（success） | Lucide `CheckCircle` 16px `#22C55E` | `#22C55E` | 3s | 文件保存成功、Skill 执行完成 |
| 错误（error） | Lucide `XCircle` 16px `#EF4444` | `#EF4444` | 8s 或手动关闭 | 保存失败、AI 调用错误 |
| 警告（warning） | Lucide `AlertTriangle` 16px `#F59E0B` | `#F59E0B` | 5s | 网络不稳定、Token 即将用尽 |
| 信息（info） | Lucide `Info` 16px `#7AA2F7` | `#7AA2F7` | 4s | AI 建议可用提示、版本更新通知 |
| AI 任务（ai） | Lucide `Bot` 16px `#7AA2F7` | `--accent`（若 success 则绝)亮动效果） | 5s | Creo 完成一个长时间任务（如全文分析） |

### 23.5.2 Toast 单个规格

```
+--------------------------------------------------+
|▮ [CheckCircle] 文件已保存                 [X] |
|▮                                               |
+--------------------------------------------------+
```

- 左侧：3px 圆角顶底标识线（颜色如上表）
- 图标 16px + 消息文字 Inter 13px `#E8E8E8`，行高 1.5
- 右底角：可选的操作按钒（如「查看」「撤销」），Inter 12px `--accent`
- 关闭按钒：右上角 × 16px `#737373`，hover `#F0F0F0`
- 背景：`#1A1A1A`，圆角 8px，内边距 12px 16px，阴影 `0 8px 32px rgba(0,0,0,0.5)`
- 宽度：最小 280px，最大 400px。内容超出 2 行时湢出。
- 自动消失进度条：底部 2px 线条，逐渐缩短至 0，颜色与标识线一致

### 23.5.3 堆叠规则

- **位置**：右下角，距屏幕边距 24px
- **z-index**：`--z-toast`（400，最高层）
- 最多同时显示 3 条，堆叠时新 Toast 从下方推入
- 超出 3 条时：最早的 Toast 向上厌缩消失
- 每条 Toast 上下间距 8px
- **展开/收起**：鼠标悬停 Toast 区域时，所有 Toast 展开并暂停自动消失计时
- **进入/退出动画**（与 §14.3 对齐）：`translateY(100%)→0`，`--duration-normal --ease-out`；退出 `translateY(0)→(100%)` + `opacity→0`，`--duration-fast --ease-in`

### 23.5.4 Toast 内容设计原则

- **一条 Toast 只传达一件事**——不要将多个操作结果内嵌在一条消息里
- **文字要短**——「文件已保存」胜过「你的文档已成功保存到本地磁盘」
- **错误 Toast 必须给出操作建议**——如「重试」「复制错误信息」，而非仅展示错误文字
- **AI 任务 Toast 不得在任务进行中出现**——只在任务完成后显示

---

## 23.8 多文档对比分栏

<aside>

**对比分栏是专业创作者的核心需求。** 将两个版本放在一起比较，或将参考文档放在一边写作，是很自然的需求。V3 的对比分栏基于多栏共享编辑区布局，不声不响地支持最多 3 个文档并列阅读和编辑。

</aside>

### 23.8.1 触发方式

| **方式** | **操作** | **说明** |
| --- | --- | --- |
| 快捷键 | `Ctrl+\\`（macOS `Cmd+\\`） | 在当前文档旁开展第二栏，展示最近文档列表以选择加入哪个文档 |
| Context Panel 右键 | 在文件节点上右键，选择「在分栏中打开」 | 直接将该文件加入对比栏 |
| 搜索面板 | 搜索结果中选择「在分栏中打开」 | 从搜索结果直接加入对比栏 |

### 23.8.2 布局规范

```
+----------------------------------------------------------+
|  文档 A       │    文档 B       │    文档 C (optional) |
|  [X]             │    [X]             │    [X]                  |
+------------------+-----------------+---------------------+
|                  │                 │                     |
|  编辑器内容 A  │  可读/编辑 B  │  可读/编辑 C        |
|                  │                 │                     |
+----------------------------------------------------------+
```

| **元素** | **规范** |
| --- | --- |
| 栏数上限 | 最多 3 栏，每栏最小 320px。小于 320px 时拒绝添加并提示 |
| 栏宽分配 | 默认平均分配，可拖拽分隔线调整（局部存储），刷新页面后重置 |
| 栏头部 | 高 32px，背景 `#0A0A0A`，底部 1px 分隔线。左侧文件名（Inter 12px `#737373`），右侧 × 关闭按钒（如为单栏则不显示） |
| 分隔线 | 1px `rgba(255,255,255,0.08)`，hover 高亮为 `--accent-muted`，显示 ↔ 指针光标 |
| 第一栏（主编辑栏） | 可完整编辑，左右 padding 80px，左侧头部显示「编辑」 Badge |
| 其他栏（附属栏） | 默认只读（背景纹理略深 2%），点击头部 “编辑”按钒可切换为可编辑模式（需确认提示） |
| 滚动同步 | 默认滚动独立。点击头部链接图标可开启「滚动同步」模式（左栏滚动时其他栏同步） |
| AI 跨文档能力 | 对比模式中，AI 面板的上下文范围可选择「全部已开栏文档」——AI 可引用多个文档的内容回答问题 |

### 23.8.3 应用场景

- **版本对比**：同一文档的两个版本并列（通过版本历史打开旧版本）
- **参考写作**：左栏是当前初稿，右栏是参考资料或前一章，边看边写
- **人物加山**：左栏 主角 A 的章节，右栏是主角 A 的评价页（Knowledge Graph 过来）

---

## 17. 实施优先级

<aside>

**以下按影响面和工作量排序，融入主架构文档的轮次制路线中。**

</aside>

1. **Round 1 同步实施**：V3 theme.css、Icon Rail 微调、Context Panel 视觉调整
2. **Round 2 同步实施**：编辑器背景色回退、行高调整、AI Inline Block 重设计
3. **Round 3 核心交付**：AI 面板（Cursor 式对话 + 模式/模型/Skill 选择器）、AI FAB 交互重设计
4. **Round 4 同步实施**：搜索面板 V1 风格回退 + AI Actions 类别

---

## 18. 排版比例尺（Type Scale）

<aside>

**设计原则：四族字体，各司其职，不可混用。** Source Serif 4 = 创作内容；Playfair Display = 标题装饰；Inter = 所有 UI 文字；JetBrains Mono = 代码与数值。字号、字重、行高全部 Token 化，开发不得硬编码。

</aside>

### 18.1 完整 Type Scale 表

| **级别 Token** | **字族** | **字号** | **字重** | **行高** | **字间距** | **颜色 Token** | **典型用途** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `--text-display-xl` | Playfair Display | 32px | 700 | 1.25 | -0.02em | `--foreground` | Dashboard 页面主标题、空状态大字 |
| `--text-display-lg` | Playfair Display | 24px | 600 | 1.3 | -0.01em | `--foreground` | 章节标题（编辑器 H1）、Modal 标题 |
| `--text-display-md` | Playfair Display | 20px | 600 | 1.35 | -0.005em | `--foreground` | 编辑器 H2、卡片标题 |
| `--text-display-sm` | Playfair Display | 17px | 600 | 1.4 | 0 | `--foreground` | 编辑器 H3、侧边栏分区标题 |
| `--text-editor-body` | Source Serif 4 | 16px | 400 | 1.8 | 0.01em | `--editor-text`（`#E8E8E8`） | 编辑器正文（用户写作内容） |
| `--text-editor-pending` | Source Serif 4 | 16px | 400 | 1.8 | 0.01em | `--editor-text-pending`（`#C0C0C0`） | AI 生成未接受内容（略暗以示区分） |
| `--text-editor-quote` | Source Serif 4 | 15px | 400 italic | 1.75 | 0.01em | `--muted-foreground`（`#737373`） | 编辑器引用块 |
| `--text-ui-md` | Inter | 14px | 400 | 1.5 | 0 | `--foreground` | 面板正文、按钮文字、列表项 |
| `--text-ui-sm` | Inter | 13px | 400 | 1.5 | 0 | `--foreground` | AI 面板对话文字、搜索结果标题 |
| `--text-ui-xs` | Inter | 12px | 400 | 1.4 | 0 | `--muted-foreground` | 行动栏按钮（接受 · 编辑）、时间戳 |
| `--text-label` | Inter | 11px | 500 | 1.4 | 0.04em | `--muted-foreground` | 状态栏（字数/阅读时间）、Badge、Tag |
| `--text-overline` | Inter | 10px | 600 | 1.3 | 0.08em uppercase | `--muted-foreground` | 分组标题（如「DOCUMENTS」「AI ACTIONS」） |
| `--text-code-inline` | JetBrains Mono | 13px | 400 | 1.5 | 0 | `--accent`（`#7AA2F7`） | 行内代码（编辑器内 `backtick` 代码） |
| `--text-code-block` | JetBrains Mono | 13px | 400 | 1.6 | 0 | `--foreground` | 代码块正文 |
| `--text-numeric` | JetBrains Mono | 13px | 500 | 1.5 | -0.01em | `--foreground` | Dashboard KPI 数字、字数统计 |

### 18.2 CSS Token 声明（追加至 theme.css）

```css
/* === Typography Tokens === */
:root {
  /* Font sizes */
  --text-size-display-xl: 32px;
  --text-size-display-lg: 24px;
  --text-size-display-md: 20px;
  --text-size-display-sm: 17px;
  --text-size-editor:     16px;
  --text-size-ui-md:      14px;
  --text-size-ui-sm:      13px;
  --text-size-ui-xs:      12px;
  --text-size-label:      11px;
  --text-size-overline:   10px;
  --text-size-code:       13px;

  /* Line heights */
  --text-leading-tight:   1.25;  /* display-xl */
  --text-leading-snug:    1.35;  /* display-md/sm */
  --text-leading-normal:  1.5;   /* UI */
  --text-leading-relaxed: 1.8;   /* editor body */

  /* Letter spacing */
  --text-tracking-tight:  -0.02em; /* display-xl */
  --text-tracking-normal:  0em;    /* UI */
  --text-tracking-wide:    0.04em; /* label */
  --text-tracking-wider:   0.08em; /* overline */
}
```

### 18.3 使用规则

- **编辑区只用 Source Serif 4 / Playfair Display**——Inter 不得进入 `contenteditable` 区域
- **Playfair Display 只用于标题（H1-H3）和装饰场景**——正文、UI 文字均不得使用
- **数字一律用 JetBrains Mono**——包括字数统计、Dashboard 数值、进度百分比，视觉对齐更精准
- **最小 UI 字号 11px**——低于此值在高分屏渲染模糊，macOS 尤其明显
- **字重只使用 400 / 500 / 600 / 700**——其余字重（300、800、900）不在设计系统内

---

## 19. 组件状态矩阵

<aside>

**所有交互组件必须覆盖以下 7 种状态：** Default · Hover · Active（按下瞬间）· Focus · Disabled · Loading · Error。未在此文档定义的状态，开发不得自行发明，需回到此处追加。

</aside>

### 19.1 Icon Rail 图标按钮

| **状态** | **图标色** | **背景色** | **过渡** | **备注** |
| --- | --- | --- | --- | --- |
| Default | `#737373`（`--muted-foreground`） | 透明 | — | 未激活的导航项 |
| Hover | `#B0B0B0` | `rgba(255,255,255,0.06)` | `background 150ms ease-out` | 图标亮度提升，背景淡入 |
| Active（pressed） | `#E0E0E0` | `rgba(255,255,255,0.10)` | `background 80ms ease-out` | 按下时瞬间加深 |
| **Selected（激活路由）** | `#7AA2F7`（`--accent`） | `rgba(122,162,247,0.10)`（`--accent-subtle`） | — | 当前路由图标，持续态 |
| Focus（键盘） | 继承 Selected 或 Default | 继承 + 外圈 2px `--ring`（`rgba(122,162,247,0.30)`）offset 2px | `outline 100ms ease` | Tab 键导航时必须可见 |
| Disabled | `#3A3A3A` | 透明 | — | 不可用图标（如当前上下文不可用），`cursor: not-allowed`，**不响应 hover** |
| Loading | 同 Selected（如适用） | 同 Selected + 图标位置显示 16px spinner（`border-2 border-accent border-t-transparent animate-spin`） | — | 如 AI 面板加载中，Bot 图标替换为 spinner |

### 19.2 Context Panel 文件节点

| **状态** | **背景** | **左侧指示线** | **文字色** | **过渡** |
| --- | --- | --- | --- | --- |
| Default | 透明 | 无 | `#737373` | — |
| Hover | `rgba(255,255,255,0.04)` | 无 | `#B0B0B0` | `background 120ms ease-out` |
| **Selected（当前文件）** | `rgba(122,162,247,0.08)`（`--accent-subtle`） | 2px `#7AA2F7` 实线，高度 = 行高（32px） | `#F0F0F0` | `background 150ms ease-out` |
| Focus（键盘） | 同 Hover + 外圈 1px `--ring` inset | 无（非 Selected 时） | 同 Hover | `outline 100ms ease` |
| Dragging | `rgba(122,162,247,0.05)` | 无 | `#737373` | `opacity 0.6` |
| Drop Target | `rgba(122,162,247,0.12)` | 2px `#7AA2F7` 虚线 | `#B0B0B0` | `background 100ms ease` |
| Rename（editing） | `rgba(255,255,255,0.06)` | 无 | `#F0F0F0` | — |

### 19.3 AI 面板底部选择器（Mode / Model / Skill）

| **状态** | **触发按钮样式** | **弹出列表行** | **过渡** |
| --- | --- | --- | --- |
| Default（收起） | 背景透明，文字 `#737373`，chevron-down 12px | — | — |
| Hover（收起时） | 背景 `rgba(255,255,255,0.06)`，文字 `#B0B0B0` | — | `background 120ms ease-out` |
| Open（弹出） | 背景 `rgba(122,162,247,0.10)`，文字 `#7AA2F7`，chevron 旋转 180° | 列表行高 36px，默认文字 `#B0B0B0` | `popover: opacity+translateY(-4px)→0 150ms ease-out`；chevron `transform 150ms ease` |
| 列表行 Hover | — | 背景 `rgba(255,255,255,0.06)`，文字 `#F0F0F0` | `background 100ms ease` |
| 列表行 Selected（当前值） | — | 左侧 ✓ 标记（`#7AA2F7` 14px），文字 `#7AA2F7`，背景 `rgba(122,162,247,0.08)` | — |
| Focus（键盘箭头导航） | — | 背景 `rgba(122,162,247,0.12)`，outline 1px `--ring` inset | `background 80ms ease` |
| Disabled（某 Model 不可用） | — | 文字 `#3A3A3A`，`cursor: not-allowed`，无 hover 响应，右侧 Badge「需订阅」 | — |

### 19.4 输入框（AI 面板 + 搜索面板）

| **状态** | **边框** | **背景** | **文字色** | **阴影/Ring** | **过渡** |
| --- | --- | --- | --- | --- | --- |
| Default（空） | 1px `rgba(255,255,255,0.08)` | `#050505` | Placeholder `#3A3A3A` | 无 | — |
| Hover | 1px `rgba(255,255,255,0.14)` | `#080808` | Placeholder `#505050` | 无 | `border-color 120ms ease` |
| Focus | 1px `rgba(122,162,247,0.40)`（`--accent-muted`） | `#050505` | `#F0F0F0` | `0 0 0 3px rgba(122,162,247,0.12)` | `border-color+box-shadow 150ms ease` |
| Filled（有内容，非 focus） | 1px `rgba(255,255,255,0.10)` | `#050505` | `#E8E8E8` | 无 | — |
| Disabled | 1px `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.02)` | `#3A3A3A` | 无 | — |
| Error | 1px `#EF4444`（`--destructive`） | `rgba(239,68,68,0.05)` | `#F0F0F0` | `0 0 0 3px rgba(239,68,68,0.12)` | `border-color+box-shadow 150ms ease` |
| Loading（提交中） | 1px `rgba(122,162,247,0.30)` | `#050505` | `#737373`（dimmed） | — | — |

### 19.5 AI FAB 按钮

| **状态** | **背景** | **图标色** | **阴影** | **Scale** | **过渡** |
| --- | --- | --- | --- | --- | --- |
| Default | `#7AA2F7` | `#050505` | `0 8px 32px rgba(0,0,0,0.5), 0 0 0 0 rgba(122,162,247,0)` | 1.0 | — |
| Hover | `#8BB3F8`（`--accent-hover`） | `#050505` | `0 12px 40px rgba(0,0,0,0.6), 0 0 0 6px rgba(122,162,247,0.15)` | 1.05 | `all 200ms cubic-bezier(0.34,1.56,0.64,1)`（带弹性） |
| Active（按下） | `#6A92E7`（比 accent 暗 8%） | `#050505` | `0 4px 16px rgba(0,0,0,0.4)` | 0.95 | `all 80ms ease-out` |
| Menu Open（单击后） | `#7AA2F7` | ✕（关闭图标）`#050505` | 同 Hover | 1.05 | 图标 `rotate 200ms ease` |
| Dragging | `rgba(122,162,247,0.85)`（半透明） | `#050505` | `0 16px 48px rgba(0,0,0,0.7)` | 1.08 | `transform 0ms`（无缓动，跟手） |
| Disabled（Zen Mode 中） | — | — | — | — | `opacity 0, pointer-events none, 300ms ease` |

### 19.6 编辑器工具栏按钮（write / split / preview）

| **状态** | **背景** | **文字色** | **过渡** |
| --- | --- | --- | --- |
| Default（未选中） | 透明 | `#737373` | — |
| Hover | `rgba(255,255,255,0.06)` | `#B0B0B0` | `background 120ms ease-out` |
| **Active（当前模式）** | `rgba(122,162,247,0.10)`（`--accent-subtle`） | `#7AA2F7`（`--accent`） | `background 150ms ease-out` |
| Focus（键盘） | 同 Hover + 1px `--ring` outline | 同 Hover | `outline 100ms ease` |
| Zen Mode（工具栏自动隐藏） | — | — | `opacity: 0 → 1，200ms ease`（鼠标移至顶部时 fade-in） |

---

## 20. 动画系统

<aside>
🎬

**设计原则：动画是功能，不是装饰。** 动画的存在必须有理由：引导视线、表达状态变化、建立空间感。没有理由的动画一律删除。所有 duration 和 easing 必须使用系统 Token，不得硬编码。

</aside>

### 20.1 Duration 分级

| **Token** | **值** | **适用场景** | **不适用场景** |
| --- | --- | --- | --- |
| `--duration-instant` | 80ms | 按下反馈（Active 态）、颜色切换（hover bg） | 面板展开、路由切换 |
| `--duration-fast` | 150ms | Tooltip 显示、Popover 收起、图标颜色变化、单行高度变化 | 大面积布局变化 |
| `--duration-normal` | 200ms | Popover 展开、Modal 进入、面板切换（Tab 切换）、FAB 快速菜单展开 | 页面级路由切换 |
| `--duration-slow` | 300ms | 页面路由过渡、Context Panel 展开/收起、Zen Mode 进入/退出、搜索面板弹出 | 微交互（hover） |
| `--duration-veryslow` | 500ms | 初次加载 Splash、KG 节点入场 stagger 总时长 | 任何重复触发的动画 |

### 20.2 Easing 曲线

| **Token** | **CSS 值** | **特征** | **适用场景** |
| --- | --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.0, 0.0, 0.2, 1.0)` | 快出慢停，有力感 | 元素进入（面板展开、Modal 显示）——**进入动画首选** |
| `--ease-in` | `cubic-bezier(0.4, 0.0, 1.0, 1.0)` | 慢出快停，自然消失 | 元素退出（面板收起、Modal 关闭）——**退出动画首选** |
| `--ease-in-out` | `cubic-bezier(0.4, 0.0, 0.2, 1.0)` | 匀速过渡，平稳 | 颜色变化、opacity 变化、状态切换 |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1.0)` | 超出目标后弹回，有弹性 | FAB hover scale、快速菜单弹出、成功状态图标 |
| `--ease-linear` | `linear` | 匀速，无加速 | Spinner 旋转、Progress Bar 填充 |

### 20.3 各组件动画规格

| **组件** | **进入** | **退出** | **特殊说明** |
| --- | --- | --- | --- |
| Context Panel | `translateX(-100%)→0`，`--duration-slow`，`--ease-out` | `translateX(0)→(-100%)`，`--duration-slow`，`--ease-in` | 同时触发编辑区 `margin-left` 变化（不 overlap） |
| AI 面板（右侧） | `translateX(100%)→0`，`--duration-slow`，`--ease-out` | `translateX(0)→(100%)`，`--duration-slow`，`--ease-in` | 同时触发编辑区 `margin-right` 变化 |
| 搜索面板（⌘K） | `opacity 0→1`  • `scale(0.97)→1`，`--duration-slow`，`--ease-out` | `opacity 1→0`  • `scale(1)→0.97`，`--duration-fast`，`--ease-in` | 遮罩层同步：`opacity 0→0.6`，`--duration-slow` |
| Popover（选择器） | `opacity 0→1`  • `translateY(-4px)→0`，`--duration-normal`，`--ease-out` | `opacity 1→0`  • `translateY(0)→(-4px)`，`--duration-fast`，`--ease-in` | 弹出方向跟随触发按钮位置自适应 |
| FAB 快速菜单 | 弧形展开，4 个选项 stagger 每项延迟 `40ms`，`--ease-spring`，每项 `--duration-normal` | 反向收起，stagger 20ms，`--ease-in`，`--duration-fast` | FAB 图标切换为 ✕，`rotate 180°`，`--duration-normal` |
| Zen Mode 进入 | 所有 Shell 元素 `opacity→0`  • 各自 `translateX`，`--duration-slow`，`--ease-in`；编辑区 `max-width→640px`，`--duration-slow`，`--ease-out` | 反向，`--duration-slow`，`--ease-out` | stagger：IconRail first (0ms), ContextPanel (+50ms), RightSidebar (+50ms), FAB (+80ms) |
| AI Inline Block（流式输出） | 每字符 `opacity 0→1`，每字 `30ms`，`--ease-out` | 接受时：左侧指示线 `opacity→0`，`--duration-fast` | 模拟书写感，不是整块 fade-in |
| KG 节点入场 | 节点 `opacity 0→1`  • `scale(0)→1`，stagger 每节点 `40ms`，`--ease-spring` | 退出场景时 `opacity→0`，`--duration-fast` | 边（Edge）在所有节点进场完毕后再 `drawLine`（SVG stroke-dashoffset） |
| Toast / 通知 | `translateY(100%)→0`，`--duration-normal`，`--ease-out`（从底部滑入） | `translateY(0)→(100%)`  • `opacity→0`，`--duration-fast`，`--ease-in` | 自动消失：成功 3s，警告 5s，错误 8s 或手动关闭 |
| 路由切换（页面间） | 进入页 `opacity 0→1`，`--duration-slow`，`--ease-out` | 退出页 `opacity 1→0`，`--duration-fast`，`--ease-in` | 退出先完成（100ms），进入再开始——避免两页同时可见 |

### 20.4 禁用动画的场景（明确列举）

- `prefers-reduced-motion: reduce`——所有动画缩短为 `1ms`（不完全禁用，避免位置跳变）
- **数据实时更新**（如字数统计每次击键变化）——直接切换，无过渡
- **流式文字输出**——字符级别已有动画，外容器不得再加 fade-in
- **Spinner 在 Disabled 输入框中**——Disabled 态不显示 Loading 动画
- **已折叠的列表项**——折叠后的子节点不得有入场动画
- **Tooltip**——`--duration-fast` 进入，退出 `--duration-instant`（太慢的 Tooltip 让用户烦躁）

### 20.5 CSS Token 声明

```css
/* === Motion Tokens === */
:root {
  --duration-instant:  80ms;
  --duration-fast:    150ms;
  --duration-normal:  200ms;
  --duration-slow:    300ms;
  --duration-veryslow:500ms;

  --ease-out:     cubic-bezier(0.0,  0.0,  0.2,  1.0);
  --ease-in:      cubic-bezier(0.4,  0.0,  1.0,  1.0);
  --ease-in-out:  cubic-bezier(0.4,  0.0,  0.2,  1.0);
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1.0);
  --ease-linear:  linear;

  /* stagger base */
  --stagger-base: 40ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-instant:   1ms;
    --duration-fast:      1ms;
    --duration-normal:    1ms;
    --duration-slow:      1ms;
    --duration-veryslow:  1ms;
  }
}
```

---

## 21. 无障碍规范（Accessibility）

<aside>

**目标：所有文字内容达到 WCAG 2.1 AA 标准（对比度 ≥ 4.5:1），大文字（≥18px regular 或 ≥14px bold）达到 3:1。** 以下对比度数值用 `#050505` 背景计算，工具验证建议用 [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)。

</aside>

### 21.1 颜色对比度矩阵

| **前景色** | **背景色** | **对比度** | **AA 小字（4.5:1）** | **AA 大字（3:1）** | **AAA（7:1）** | **使用场景** |
| --- | --- | --- | --- | --- | --- | --- |
| `#F0F0F0`（foreground） | `#050505` | **17.1:1** | 通过 | 通过 | 通过 | 编辑器正文、主要 UI 文字 |
| `#E8E8E8`（editor-text） | `#050505` | **15.4:1** | 通过 | 通过 | 通过 | 编辑器用户写作内容 |
| `#C0C0C0`（editor-text-pending） | `#050505` | **9.7:1** | 通过 | 通过 | 通过 | AI 生成未接受内容 |
| `#B0B0B0`（hover text） | `#050505` | **7.8:1** | 通过 | 通过 | 通过 | 图标/节点 Hover 态文字 |
| `#737373`（muted-foreground） | `#050505` | **4.6:1** | 通过（勉强） | 通过 | 不通过 | 辅助文字、Placeholder（**不得用于 11px 以下正文**） |
| `#737373`（muted-foreground） | `#0A0A0A`（card） | **4.4:1** | 临界值 | 通过 | 不通过 | **注意：Card 背景上的 muted 文字需升级到 `#787878`（4.5:1）** |
| `#7AA2F7`（accent） | `#050505` | **5.8:1** | 通过 | 通过 | 不通过 | 激活态图标、选中指示文字（**不得用作 11px 细字正文的唯一颜色**） |
| `#7AA2F7`（accent） | `#000000`（sidebar） | **5.9:1** | 通过 | 通过 | 不通过 | Icon Rail 激活图标 |
| `#050505`（foreground） | `#7AA2F7`（accent filled） | **5.8:1** | 通过 | 通过 | 不通过 | FAB 图标（深色图标在蓝色 FAB 上） |
| `#3A3A3A`（disabled text） | `#050505` | **1.9:1** | 不通过 | 不通过 | 不通过 | **Disabled 态故意降低对比度以表示不可用**——符合 WCAG 1.4.3 例外条款（non-text / inactive UI） |
| `#EF4444`（destructive） | `#050505` | **4.7:1** | 通过 | 通过 | 不通过 | 错误状态文字、Error 输入框边框文字 |

<aside>

**需立即处理的 1 个问题：** `--muted-foreground: #737373` 在 `--card: #0A0A0A` 背景上对比度为 4.4:1，未达 AA。受影响场景：AI 面板对话区（背景为 card）、搜索结果 snippet 文字。

**修正方案：** 在 `--card` 背景上使用 muted 文字时，改用 `#787878`（≥ 4.5:1）。可通过 CSS 自定义属性在 `.bg-card` 内覆盖：`.bg-card { --muted-foreground: #787878; }`

</aside>

### 21.2 Focus Ring 规范（键盘导航）

**所有可交互元素必须有可见 focus ring。** 以下是统一规格：

| **属性** | **值** | **说明** |
| --- | --- | --- |
| Ring 颜色 | `rgba(122, 162, 247, 0.30)`（`--ring`） | 与产品 accent 颜色一致，保持视觉统一 |
| Ring 宽度 | 2px | 低于 2px 在深色背景上几乎不可见 |
| Ring Offset | 2px | 与组件边缘保持间距，防止被背景色淹没 |
| Ring 形状 | 跟随组件 `border-radius` | 圆形按钮（FAB）用 `outline-radius: 50%`，方形用对应 `--radius` |
| 触发方式 | `:focus-visible`（**非 `:focus`**） | 鼠标点击不显示 ring，只有键盘 Tab/箭头导航时显示 |
| Zen Mode 中 | 保留 focus ring | Zen Mode 只隐藏 UI chrome，不得隐藏可访问性指示器 |

CSS 实现：

```css
/* Global focus-visible ring */
*:focus-visible {
  outline: 2px solid rgba(122, 162, 247, 0.30);
  outline-offset: 2px;
  border-radius: inherit;  /* 跟随组件圆角 */
  transition: outline var(--duration-fast) var(--ease-out);
}

/* Suppress focus ring for mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}
```

### 21.3 键盘导航规范

| **区域** | **Tab 顺序** | **箭头键行为** | **Enter / Space** | **Esc** |
| --- | --- | --- | --- | --- |
| Icon Rail | 图标从上到下，Settings 最后 | `↑↓` 在图标间切换，自动循环 | 激活对应路由 | 焦点回到编辑区 |
| Context Panel 文件树 | 进入 Panel 后 Tab 进第一个节点 | `↑↓` 节点间移动；`→` 展开；`←` 折叠；`Home/End` 跳首尾 | Enter 打开文件 | 焦点回到 Icon Rail |
| 搜索面板 | 打开即 focus 搜索框 | `↑↓` 在结果列表中移动，左侧列表和右侧预览联动 | 打开选中项 | 关闭面板 |
| AI 面板 Popover | Tab 进入触发按钮，Enter 打开 | `↑↓` 在 Popover 列表中移动 | 选中当前项并关闭 Popover | 关闭 Popover，焦点回触发按钮 |
| AI 面板输入框 | Tab 进入后可直接输入 | 标准文本编辑 | `Enter` 发送；`Shift+Enter` 换行 | 清空输入框（有内容时）/ 关闭面板（空时） |
| Modal / Dialog | 打开即 focus 第一个元素，Tab 在 Modal 内循环（**焦点陷阱**） | — | 确认 | 关闭 Modal，焦点回触发元素 |

### 21.4 屏幕阅读器（ARIA）要求

- **Icon Rail 图标按钮**：`aria-label="导航：Dashboard"`（必填），`aria-current="page"` 标记激活项
- **Context Panel 文件树**：`role="tree"`，每个节点 `role="treeitem"`，展开/折叠节点加 `aria-expanded`
- **AI FAB**：`aria-label="AI 助手"` + `aria-haspopup="menu"`（有快速菜单时）
- **AI 面板输入框**：`aria-label="向 Creo 提问"`，发送按钮 `aria-label="发送"`
- **AI Inline Block**：`role="status"` + `aria-live="polite"`（流式内容完成后通知屏幕阅读器）
- **搜索面板**：`role="dialog"` + `aria-modal="true"` + `aria-label="搜索 CreoNow"`
- **所有 Spinner**：`role="status"` + `aria-label="加载中"`

---

## 22. 深色模式专属声明 + 响应式规范

### 22.1 深色模式唯一声明

<aside>

**CreoNow 是一个深色模式专属应用。不提供浅色主题，不响应系统浅色模式偏好。** 理由：

1. **定位一致性**：Cinematic Calm 的产品定位要求沉浸式的暗色视觉环境，就像电影院永远关灯
2. **色彩系统完整性**：V3 的色彩系统（`#050505` 底色 + `#7AA2F7` accent）是作为整体设计的，强行适配浅色主题会导致整个视觉语言崩塌
3. **竞品对标**：Cursor 默认深色，且用户群体（创作型专业用户）普遍偏好深色工作环境
</aside>

**实现方式：**

```css
/* 忽略系统浅色模式，强制深色 */
:root {
  color-scheme: dark only;
  /* 不声明 @media (prefers-color-scheme: light) 覆盖 */
}

/* Electron main 进程 */
nativeTheme.themeSource = 'dark';  // 锁定深色，不跟随系统
```

**用户文档说明：** 在设置页 → 外观 Tab 中说明「CreoNow 采用深色主题以提供最佳创作体验」，不提供主题切换选项。

### 22.2 响应式 / 窗口尺寸规范

<aside>

CreoNow 是 Electron 桌面应用，主要目标是 Windows 全屏场景，但必须在小窗口下保持基本可用。以下定义最小可用尺寸和自适应行为。

</aside>

#### 窗口宽度断点

| **断点名** | **宽度范围** | **布局状态** | **说明** |
| --- | --- | --- | --- |
| **Full** | ≥ 1280px | IconRail + ContextPanel（240px）+ 编辑区 + AI 面板（320px）可同时显示 | 全功能布局，四栏完整 |
| **Comfortable** | 1024px – 1279px | IconRail + ContextPanel + 编辑区（AI 面板可开但会覆盖编辑区一部分） | AI 面板以 overlay 模式显示，不挤压编辑区 |
| **Compact** | 800px – 1023px | IconRail + 编辑区（ContextPanel 折叠，需点击 Icon Rail 展开为 overlay） | Context Panel 自动折叠，AI 面板只能 overlay 模式 |
| **Minimal** | 600px – 799px | 仅编辑区 + 极简工具栏（IconRail 缩为 36px） | 紧急兼容模式，Core 功能可用，AI 面板改为全屏 overlay |
| **Below minimum** | < 600px | 显示「请调整窗口大小以获得最佳体验」提示 | 不支持，Electron 可配置 `minWidth: 600` |

#### 最小窗口强制配置（Electron main 进程）

```jsx
const mainWindow = new BrowserWindow({
  minWidth:  600,
  minHeight: 480,
  width:     1440,   // 默认宽度
  height:    900,    // 默认高度
  // Windows 特有：任务栏兼容
  autoHideMenuBar: true,
});
```

#### 各断点下 ContextPanel 宽度

| **断点** | **ContextPanel 宽度** | **模式** | **触发方式** |
| --- | --- | --- | --- |
| Full（≥1280px） | 240px（固定） | Docked（推挤编辑区） | Icon Rail 图标点击 |
| Comfortable（1024-1279px） | 240px | Docked（推挤） | Icon Rail 图标点击 |
| Compact（800-1023px） | 220px | Overlay（浮在编辑区上，50% opacity 遮罩） | Icon Rail 图标点击 |
| Minimal（600-799px） | 200px | Overlay（全屏高度） | Icon Rail 图标点击 |

#### 编辑区最小可用宽度

- **Full 布局下**（IconRail 48px + ContextPanel 240px + AI 面板 320px）：`1440 - 48 - 240 - 320 = 832px`——充裕
- **Compact 布局下**（IconRail 36px，其余收起）：`800 - 36 = 764px`——可用
- **编辑区绝对最小值**：`480px`——低于此宽度编辑体验无法接受，Context Panel 必须强制收起

#### 高度断点

| **高度范围** | **调整项** |
| --- | --- |
| ≥ 768px | 完整布局，底部状态栏高度 32px |
| 600px – 767px | 底部状态栏折叠（仅显示字数），工具栏高度从 48px 缩为 40px |
| < 600px | 仅编辑区，底部状态栏隐藏，工具栏合并至顶部单行 |

---

## 23. 间距系统（Spacing Scale）

<aside>

**基础单位：4px。所有间距必须是 4 的倍数。** 常用档位是 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px，每个档位都有语义名称。开发不得使用系统外的间距值（如 5px、10px、15px、18px）。间距的一致性是界面「呼吸感」的来源。

</aside>

### 23.1 间距档位表

| **Token** | **值** | **Tailwind 等价** | **语义** | **典型用途** |
| --- | --- | --- | --- | --- |
| `--space-1` | 4px | `p-1` / `gap-1` | 最小间距，「触碰」 | 图标与文字的间距、Badge 内边距、分隔线上下 padding |
| `--space-2` | 8px | `p-2` / `gap-2` | 紧凑间距，「相邻」 | 列表项内部 padding（水平）、按钮内图标间距、Tag 间距 |
| `--space-3` | 12px | `p-3` / `gap-3` | 标准小间距，「组内」 | 用户消息气泡 padding、卡片内标题与内容间距、工具栏按钮 padding |
| `--space-4` | 16px | `p-4` / `gap-4` | 标准间距，「模块内」 | 面板内容区 padding（垂直）、侧边栏内容 padding、列表分组间距 |
| `--space-6` | 24px | `p-6` / `gap-6` | 宽松间距，「模块间」 | 卡片与卡片之间、Dashboard KPI 之间、Settings 各 Section 间距 |
| `--space-8` | 32px | `p-8` / `gap-8` | 大间距，「区块间」 | Modal 内容区 padding、搜索面板结果区上下 padding、页面级 Section 间距 |
| `--space-12` | 48px | `p-12` / `gap-12` | 超大间距，「页面留白」 | 空状态图示与文字的间距、Dashboard 顶部留白 |
| `--space-16` | 64px | `p-16` / `gap-16` | 最大间距，「视觉呼吸」 | 编辑器左右 padding（§8.1 规定 80px，可用 `--space-16`  • `--space-4`） |

### 23.2 组件内部间距规范

| **组件** | **内部 padding** | **元素间距（gap）** | **说明** |
| --- | --- | --- | --- |
| Icon Rail 图标按钮 | 可点击区域 36×36px，图标 18×18px 居中 | 图标间 `--space-1`（6px 见 §3.1） | 图标与边缘的空白 = `(36-18)/2 = 9px` |
| Context Panel 文件节点 | 左右 `--space-3`（12px），上下 `--space-2`（8px） | 图标与文字 `--space-2`（8px） | 行高固定 32px |
| AI 面板对话气泡（用户消息） | 全向 `--space-3`（12px） | 消息之间 `--space-4`（16px） | 气泡圆角 8px（`--radius-md`） |
| AI 面板输入框 | 左右 `--space-3`（12px），上下 `--space-3`（12px） | 输入框与底部工具栏 `--space-2`（8px） | 最小高度 44px，自动扩展 |
| 底部工具栏（Mode/Model/Skill） | 左右 `--space-3`（12px），上下 `--space-2`（8px） | 选择器按钮间 `--space-2`（8px） | 整体高度 40px |
| Popover 列表行 | 左右 `--space-3`（12px），上下 `--space-2`（8px） | 列表项间无额外 gap | 行高 36px，Popover 外边距 `--space-2`（8px）与触发元素 |
| 搜索面板搜索框 | 左右 `--space-4`（16px），上下居中 | 图标与输入框 `--space-3`（12px） | 总高度 48px |
| 搜索面板结果行 | 左右 `--space-4`（16px），上下 `--space-2`（8px） | 图标与文字 `--space-3`（12px） | 行高 40px |
| FAB 快速菜单选项 | 图标居中（36×36px 圆形） | 选项间距由弧形布局决定，相邻项圆心距 ≥ 48px | 防止误触 |
| 编辑器正文区 | 左右 80px（`--space-16`  • `--space-4`）；顶部 `--space-8`（32px） | 段落间 `--space-4`（16px）；标题与下方正文 `--space-3`（12px） | 编辑区最大宽度 640px（Zen Mode）/ 无限制（普通模式） |
| Dashboard 卡片 | 全向 `--space-6`（24px） | 卡片间 `--space-6`（24px） | 圆角 `--radius-lg`（12px） |
| Settings Modal | 内容区 `--space-8`（32px） | Tab 与内容区 `--space-6`（24px）；表单项间 `--space-4`（16px） | Modal 宽度 640px，高度最大 80vh |

### 23.3 间距节奏原则

- **相关元素靠近，不相关元素拉开**——同一功能组内用 `--space-2` 或 `--space-3`，不同功能组间用 `--space-6` 或 `--space-8`
- **垂直间距 > 水平间距**——给眼睛更多向下扫描的空间，符合阅读习惯
- **不要用 padding 和 margin 混用修补视觉问题**——间距问题从根源（Token）解决
- **编辑区的段落间距不受 UI 间距系统约束**——编辑器内的排版间距由 `line-height` 和 `margin-bottom` 控制，使用 `--text-leading-relaxed`（1.8）

### 23.4 CSS Token 声明

```css
/* === Spacing Tokens (base unit: 4px) === */
:root {
  --space-1:   4px;
  --space-2:   8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-6:  24px;
  --space-8:  32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Semantic aliases */
  --space-icon-gap:       var(--space-2);  /* icon → text */
  --space-item-padding-x: var(--space-3);  /* list item horizontal */
  --space-item-padding-y: var(--space-2);  /* list item vertical */
  --space-panel-padding:  var(--space-4);  /* panel content padding */
  --space-card-padding:   var(--space-6);  /* card internal padding */
  --space-section-gap:    var(--space-8);  /* section-level separation */
}
```

---

## 24. 视觉层级（Elevation）

<aside>
🏔️

**深色界面的层级靠「越亮越近」。** 背景最深（`#050505`），往上每升一层背景色略微变亮，最顶层（Modal、Tooltip）用最亮的背景色。阴影在深色界面中作用有限，主要靠颜色区分层级。每一层都有对应的 z-index 档位，所有组件必须遵守，不得随意用高 z-index 盖过其他元素。

</aside>

### 24.1 层级色彩体系

| **层级** | **名称** | **背景色** | **Token** | **属于这一层的组件** |
| --- | --- | --- | --- | --- |
| Layer 0 | **地基（Base）** | `#050505` | `--background` | App 最底层背景，编辑器正文区 |
| Layer 1 | **侧边栏（Rail）** | `#000000` | `--sidebar` | Icon Rail、Context Panel、AI 面板——**比背景更暗，「消退」进背景** |
| Layer 2 | **卡片/面板（Surface）** | `#0A0A0A` | `--card` | Dashboard 卡片、AI 面板对话气泡、Settings 内容区 |
| Layer 3 | **悬浮元素（Raised）** | `#111111` | `--raised`（新增 Token） | Hover 时浮起的卡片、展开的 Accordion、活动的编辑器工具栏 |
| Layer 4 | **浮层（Overlay）** | `#161616` | `--overlay`（新增 Token） | Popover、Dropdown、Context Menu、Tooltip |
| Layer 5 | **模态（Modal）** | `#1A1A1A` | `--modal`（新增 Token） | Settings Modal、确认对话框、搜索面板 |
| Layer 6 | **最顶层（Toast）** | `#222222` | `--toast`（新增 Token） | Toast 通知、全局 Spinner 遮罩 |

<aside>
💡

**为什么侧边栏（`#000000`）比背景（`#050505`）更暗？** 这是 Cinematic Calm 的核心视觉技巧——侧边栏应该「消失」，让视线聚焦在编辑区。编辑区（`#050505`）比侧边栏（`#000000`）略亮，自然形成「光源在中央」的沉浸感，就像舞台灯光。

</aside>

### 24.2 阴影体系

深色界面阴影主要用于区分「浮起」的元素，不用于装饰。

| **Token** | **CSS 值** | **适用层级** | **用途** |
| --- | --- | --- | --- |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` | Layer 3 | 卡片轻微浮起、工具栏底部投影 |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.5)` | Layer 4 | Popover、Dropdown、Context Menu |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.6)` | Layer 5 | Modal、搜索面板、AI 面板（大面积浮层） |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,0.7)` | Layer 6 | Toast、FAB（拖拽中） |
| `--shadow-accent` | `0 0 0 6px rgba(122,162,247,0.15)` | 任意层 | FAB hover 时的 accent 光晕，不用于其他组件 |

### 24.3 z-index 档位

| **Token** | **值** | **组件** | **说明** |
| --- | --- | --- | --- |
| `--z-base` | 0 | 编辑器正文、页面内容 | 文档流层 |
| `--z-sidebar` | 10 | Icon Rail、Context Panel、AI 面板（Docked 模式） | 侧边栏层，不盖过 overlay |
| `--z-toolbar` | 20 | 编辑器顶部工具栏、底部状态栏 | 工具栏层 |
| `--z-fab` | 100 | AI FAB | 始终浮在所有面板之上，除 Modal |
| `--z-overlay` | 200 | Popover、Dropdown、Context Menu、Tooltip | 浮层，盖过 FAB |
| `--z-modal` | 300 | Settings Modal、确认对话框、搜索面板（`Ctrl+K`） | 模态层，盖过所有 overlay |
| `--z-toast` | 400 | Toast 通知 | 最顶层，永远可见 |
| `--z-loading` | 500 | 全局加载遮罩（仅初次启动） | 绝对最顶层，启动完成后移除 |

### 24.4 层级边界线（Border Separator）

相邻不同层级的组件之间，用极细的边界线区分（而非依赖颜色差异）：

- **Icon Rail | Context Panel**：右侧 1px `rgba(255,255,255,0.06)`（`--sidebar-border`）
- **Context Panel | 编辑区**：右侧 1px `rgba(255,255,255,0.06)`
- **编辑区 | AI 面板**：左侧 1px `rgba(255,255,255,0.06)`
- **编辑器工具栏 | 正文区**：底部 1px `rgba(255,255,255,0.06)`
- **编辑器正文区 | 状态栏**：顶部 1px `rgba(255,255,255,0.06)`
- **所有 Modal**：有 `--shadow-lg` 即可，不需要额外边框

### 24.5 新增 Token 追加至 theme.css

```css
/* === Elevation Tokens === */
:root {
  /* Surface colors (light = closer to user) */
  --raised:  #111111;   /* Layer 3: hover cards, active toolbar */
  --overlay: #161616;   /* Layer 4: popover, dropdown */
  --modal:   #1a1a1a;   /* Layer 5: settings, search panel */
  --toast:   #222222;   /* Layer 6: notifications */

  /* Shadows */
  --shadow-sm:     0 1px 3px  rgba(0,0,0,0.40);
  --shadow-md:     0 4px 16px rgba(0,0,0,0.50);
  --shadow-lg:     0 8px 32px rgba(0,0,0,0.60);
  --shadow-xl:     0 16px 48px rgba(0,0,0,0.70);
  --shadow-accent: 0 0 0 6px  rgba(122,162,247,0.15);

  /* z-index */
  --z-base:    0;
  --z-sidebar: 10;
  --z-toolbar: 20;
  --z-fab:     100;
  --z-overlay: 200;
  --z-modal:   300;
  --z-toast:   400;
  --z-loading: 500;
}
```

---

## 25. 空状态设计（Empty States）

<aside>
🌑

**空状态是产品的第一印象。** 新用户的第一次体验、数据清零后的状态、搜索无结果——这些瞬间决定用户是否相信这个产品是精心制作的。每个页面/组件都必须有专门设计的空状态，而不是「啥都没有」。

**设计原则：空状态不是错误，是邀请。** 文字要引导用户下一步行动，不要只是说「暂无数据」。

</aside>

### 25.1 Dashboard 空状态

```
┌─────────────────────────────────────────┐
│                                         │
│              ✦                          │
│         （Creo 品牌图形，轻描边）         │
│                                         │
│        你的创作旅程从这里开始            │
│    创建第一个项目，Creo 将陪你走完       │
│                                         │
│        [ + 新建项目 ]                   │
│                                         │
│    或  [ 导入现有文稿 ]                  │
│                                         │
└─────────────────────────────────────────┘
```

- **图形**：Creo 品牌符号（✦ 或自定义线条图），32×32px，描边 `rgba(255,255,255,0.15)`
- **主文案**：Source Serif 4，17px，`#B0B0B0`，居中
- **副文案**：Inter，13px，`#555555`，居中，行高 1.6
- **主按钮**：filled，`#7AA2F7` 背景，`#050505` 文字，高度 36px，圆角 `--radius-md`
- **次按钮**：ghost，无背景，`#737373` 文字，hover `#B0B0B0`
- **Heatmap 区域**：显示全灰格子（`#0A0A0A`），不隐藏——暗示「这里会有你的创作轨迹」

### 25.2 编辑器空状态（新建文档）

编辑器打开空文档时，不显示任何提示框，只显示光标在第一行：

```
│                                     │
│  无题                               │  ← 标题行，灰色 placeholder
│  ─────────────────────────────      │
│                                     │
│  开始写作，或按 / 调用命令…          │  ← 第一行 placeholder 文字
│  |                                  │  ← 光标
│                                     │
```

- **标题 Placeholder**：`无题` / `Untitled`，Playfair Display 24px，`#3A3A3A`（低对比度，不抢镜）
- **正文 Placeholder**：`开始写作，或按 / 调用命令…`，Source Serif 4 16px，`#3A3A3A`
- **点击任意位置**：placeholder 消失，光标聚焦
- **不显示**：任何引导横幅、功能提示、欢迎信息——编辑器的空状态是「干净的纸」

### 25.3 Context Panel 空状态

**文件树为空时：**

```
📁
还没有文稿
[ + 新建文稿 ]
```

- 图标：Folder 24px，`#3A3A3A`，居中
- 文字：Inter 13px，`#555555`
- 按钮：ghost 小按钮，`#7AA2F7` 文字

**大纲为空时（文档无标题）：**

```
添加标题后
这里会显示文章大纲
```

- 文字：Inter 12px，`#3A3A3A`，居中，无按钮

### 25.4 AI 面板空状态（新会话）

```
┌──────────────────────────────┐
│  New Chat            + ···   │
├──────────────────────────────┤
│                              │
│         ✦ Creo               │
│                              │
│    你好，我是 Creo。          │
│    我们来写点什么？           │
│                              │
│  ┌──────────────────────┐    │
│  │  续写当前章节         │    │
│  │  分析人物弧光         │    │
│  │  检查情节漏洞         │    │
│  └──────────────────────┘    │
│                              │
├──────────────────────────────┤
│  [输入框]                    │
└──────────────────────────────┘
```

- **Creo 标识**：✦ 符号 + 「Creo」，Inter 13px `#737373`，居中
- **欢迎语**：Source Serif 4 15px，`#B0B0B0`，居中，行高 1.8
- **快捷建议卡片**：3 个最常用操作，背景 `rgba(255,255,255,0.04)`，圆角 `--radius-md`，hover `rgba(255,255,255,0.08)`，点击直接发送
- **快捷建议内容**：根据当前打开的文档动态生成（有文档时显示文档相关操作；无文档时显示通用操作）

### 25.5 搜索面板无结果状态

```
没有找到「Elara 的妹妹」的结果

换个关键词试试？
或者让 Creo 帮你找找看  →
```

- **主文案**：Inter 13px，`#B0B0B0`，关键词部分用 `#F0F0F0` 加粗
- **建议文案**：Inter 12px，`#555555`
- **Creo 链接**：`#7AA2F7`，点击把搜索词直接发送到 AI 面板

### 25.6 Dashboard Analytics 空状态

```
📊
还没有创作数据
开始写作后，这里会显示
你的创作趋势和 Creo 洞察
```

- Analytics 图表区域显示「淡化的图表轮廓」（描边 `rgba(255,255,255,0.04)`，暗示功能将来会有数据）
- **不显示**：随机假数据、占位数字

### 25.7 Knowledge Graph 空状态

```
     ○
    ╱ ╲
   ○   ○
（轻描边，3 个节点模糊图）

还没有角色和世界设定
创建第一个角色，Creo 会
自动构建你的世界知识图谱

[ + 创建角色 ]
```

- 背景节点图：SVG 描边，`rgba(255,255,255,0.05)`，blur 2px，暗示功能
- **文案**：Source Serif 4 15px，`#737373`，居中
- **按钮**：filled，`#7AA2F7` 背景

---

## 26. 图标使用规范（Icon Guidelines）

<aside>
✦

**V3 使用 Lucide React 图标库（v0.400+），全部 stroke 风格，stroke-width 1.5px。** 不混用 filled 风格图标（除非是品牌符号 ✦）。图标本身不传递颜色语义，颜色由父容器的状态决定。

</aside>

### 26.1 尺寸规范

| **尺寸** | **stroke-width** | **使用场景** | **禁止场景** |
| --- | --- | --- | --- |
| **16×16px** | 1.5px | 行内图标（列表项左侧）、Badge 内图标、键盘快捷键提示图标 | 导航图标、独立展示的图标 |
| **18×18px** | 1.5px | Icon Rail 导航图标（§3.1）、编辑器工具栏图标 | 正文行内（过大） |
| **20×20px** | 1.5px | AI FAB 图标、Modal 标题旁图标、Card 主图标 | 导航图标（用 18px 代替） |
| **24×24px** | 1.5px | 空状态插图图标、设置页分类图标、大型操作按钮图标 | 行内、小型 UI 组件 |
| **32px+** | 1.5px | 空状态主视觉（仅空状态场景） | 任何功能性 UI 元素 |

### 26.2 各区域图标索引

| **位置** | **图标名（Lucide）** | **尺寸** | **颜色逻辑** |
| --- | --- | --- | --- |
| Icon Rail — Search | `Search` | 18px | Default `#737373`，Selected `#7AA2F7` |
| Icon Rail — Dashboard | `LayoutDashboard` | 18px | 同上 |
| Icon Rail — 文件树 | `Folder` | 18px | 同上 |
| Icon Rail — Analytics | `BarChart2` | 18px | 同上 |
| Icon Rail — Calendar | `Calendar` | 18px | 同上 |
| Icon Rail — Characters | `User` | 18px | 同上 |
| Icon Rail — KG | `Network` | 18px | 同上 |
| Icon Rail — Settings | `Settings` | 18px | 同上（无 Selected 态，Settings 不是路由） |
| AI FAB | `Bot` | 20px | 始终 `#050505`（在 `#7AA2F7` 背景上） |
| AI FAB（菜单展开后） | `X` | 20px | 始终 `#050505` |
| Zen Mode 进入 | `Maximize2` | 18px | 工具栏图标颜色规则 |
| Zen Mode 退出 | `Minimize2` | 18px | 同上 |
| AI Inline Block（已移除，改用指示线） | `~~Sparkles~~` | — | **V3 不在 Inline Block 上显示图标，改用左侧 2px 指示线** |
| AI 面板发送按钮 | `Send`（或 `CornerDownLeft`） | 16px | Default `#737373`，有内容时 `#7AA2F7` |
| 行动栏——接受 | `Check` | 16px | `#555555`，hover `#22c55e`（绿色，表示「完成」语义） |
| 行动栏——编辑 | `Pencil` | 16px | `#555555`，hover `#F0F0F0` |
| 行动栏——重新生成 | `RefreshCw` | 16px | `#555555`，hover `#F0F0F0` |
| 搜索面板——搜索框图标 | `Search` | 16px | `#555555` |
| Context Panel——展开箭头 | `ChevronRight`（展开后旋转 90°） | 16px | `#3A3A3A`，hover `#737373` |
| Context Panel——文件 | `FileText` | 16px | 同文件节点文字色 |
| Context Panel——文件夹 | `Folder` / `FolderOpen` | 16px | 同文件节点文字色 |
| Toast——成功 | `CheckCircle2` | 16px | `#22c55e`（`--brand-success`） |
| Toast——错误 | `XCircle` | 16px | `#EF4444`（`--destructive`） |
| Toast——警告 | `AlertTriangle` | 16px | `#F59E0B`（`--brand-warning`） |

### 26.3 图标使用禁区

- ❌ **不得使用 filled 风格图标**（除品牌符号 ✦）——Lucide 是 stroke 库，混用 filled 破坏风格统一性
- ❌ **不得用 emoji 替代功能性图标**——emoji 字体渲染在不同系统下大小和基线不一致
- ❌ **不得让图标单独承载语义**——图标必须配合 Tooltip 或文字标签，纯图标按钮必须有 `aria-label`
- ❌ **不得随意修改 stroke-width**——全局统一 1.5px，修改会破坏视觉重量的一致性
- ❌ **不得在正文段落中直接内嵌 20px+ 图标**——会破坏行高节奏
- ✅ **Sparkles 图标的使用**：仅用于 AI Actions 搜索类别的分类标题，不用于单个 AI 功能按钮

---

## 27. 加载状态视觉设计

<aside>
⏳

**加载状态设计的核心原则：让用户感知到「正在发生事情」，同时最小化焦虑感。** 不同的加载场景用不同的视觉方案，选错方案会让界面显得迟钝或过度设计。

</aside>

### 27.1 三种加载模式及使用规则

| **模式** | **外观** | **适用场景** | **不适用场景** | **触发阈值** |
| --- | --- | --- | --- | --- |
| **Skeleton Screen（骨架屏）** | 与真实内容形状相同的灰色矩形，带 shimmer 动画（从左到右光泽扫过） | Dashboard 卡片加载、Context Panel 文件树首次加载、Analytics 图表加载 | AI 流式输出、按钮点击反馈、数据量小（< 5 项） | 预期加载时间 > 300ms 时显示 |
| **Spinner（旋转加载）** | 16px 圆形，`border-2 border-accent border-t-transparent`，旋转 360° 1s linear 无限循环 | 按钮提交中、AI 面板等待首 token、文件保存中 | 大面积内容加载（用 Skeleton）、页面路由切换（用 Progress Bar） | 立即显示（无延迟阈值），但按钮内的 spinner 需替换图标 |
| **Progress Bar（进度条）** | 顶部全宽 2px 线条，从左向右填充，颜色 `--accent` | 页面路由切换、文件导入/导出、初次启动资源加载 | 按钮操作、局部内容加载 | 预期加载时间 > 200ms |

### 27.2 Skeleton Screen 规范

```css
/* Skeleton shimmer animation */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #111111 25%,
    #1a1a1a 50%,
    #111111 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
```

**各组件 Skeleton 形状：**

| **组件** | **Skeleton 形状** | **高度** | **宽度** |
| --- | --- | --- | --- |
| Dashboard KPI 数字 | 单行矩形 | 28px | 80px |
| Dashboard KPI 标签 | 单行矩形 | 14px | 120px |
| 文件树节点 | 单行矩形，带左侧 16px 小圆（图标占位） | 32px | 70%（随机 50%-85%，模拟真实文件名长度差异） |
| AI 面板 Creo 回复 | 3-4 行矩形（每行宽度随机 60%-95%，最后一行最短） | 每行 18px，间距 8px | 60%-95% |
| Dashboard Heatmap | 52×7 格子，全部 `#0A0A0A`（即空状态 Heatmap） | — | — |
| Analytics 图表 | 矩形占位，内部无内容 | 200px | 100% |

### 27.3 Spinner 规范

```css
/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--accent-muted);      /* rgba(122,162,247,0.20) */
  border-top-color: var(--accent);            /* #7aa2f7 */
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**尺寸规则：**

- **按钮内 spinner**：16px，替换按钮图标，文字保持不变
- **AI 面板等待 spinner**：20px，显示在对话区底部，`#737373` 三点跳动（`...` 动画）替代 spinner
- **Icon Rail loading**：16px，替换导航图标

**注意：AI 面板等待首 token 时，用「三点跳动」而非旋转 spinner：**

```css
/* Three dots waiting animation */
.waiting-dots span {
  animation: dot-bounce 1.4s ease-in-out infinite;
  color: var(--muted-foreground);
  font-size: 20px;
  line-height: 1;
}
.waiting-dots span:nth-child(2) { animation-delay: 0.2s; }
.waiting-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30%            { transform: translateY(-6px); }
}
```

### 27.4 Progress Bar 规范

```css
/* Top progress bar */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  background: var(--accent);       /* #7aa2f7 */
  z-index: var(--z-toast);         /* 400，始终在最顶层 */
  transition: width var(--duration-normal) var(--ease-out);
  box-shadow: 0 0 8px rgba(122,162,247,0.4);  /* 轻微光晕 */
}

/* 完成时快速收尾并消失 */
.progress-bar.done {
  width: 100% !important;
  transition: width 200ms ease-out, opacity 300ms ease 200ms;
  opacity: 0;
}
```

**使用规则：**

- 路由切换开始 → 立即显示 Progress Bar，宽度快速到 70%，然后缓慢增长
- 路由加载完成 → 迅速跳到 100%，200ms 后 fade out
- **不显示百分比数字**——百分比对用户无实际意义，只需要「在动」即可

### 27.5 加载状态优先级决策树

```
需要加载状态吗？
│
├─ 加载时间 < 100ms？
│   └─ ❌ 不显示任何加载状态（闪烁比等待更烦）
│
├─ 是「按钮操作」触发的？
│   └─ ✅ Spinner（替换按钮图标）
│
├─ 是「页面路由切换」？
│   └─ ✅ Progress Bar（顶部 2px 线）
│
├─ 是「大面积内容区域」加载（列表、卡片、图表）？
│   └─ ✅ Skeleton Screen（形状匹配真实内容）
│
├─ 是「AI 生成内容」等待中？
│   └─ ✅ 三点跳动动画（不用 spinner，更符合「思考」语义）
│
└─ 是「后台静默同步」（自动保存、云端同步）？
    └─ ✅ 状态栏极小图标（不打扰用户）
```

---

## 28. 第一次启动体验（Onboarding）

<aside>
✨

**第一次启动是产品最重要的设计时刻。** 用户在这 30 秒内决定「这个产品值不值得继续用」。CreoNow 的第一次体验必须做到：**立刻感受到产品的气质（Cinematic Calm），立刻理解核心价值（AI 辅助创作），立刻能开始行动（一步进入编辑器）。**

不做：功能介绍幻灯片、强制填写资料表单、复杂的设置向导。

</aside>

### 28.1 启动序列（全程 < 8 秒）

| **阶段** | **时长** | **画面** | **背后发生的事** |
| --- | --- | --- | --- |
| ① **Splash（启动画面）** | 0 – 1.5s | 纯黑背景，中央 ✦ 品牌符号从透明 fade in（`opacity 0→1`，800ms，`--ease-out`）。无文字，无 loading 动画 | Electron 主进程初始化，加载 React |
| ② **品牌展示** | 1.5 – 2.5s | ✦ 符号保持，「CreoNow」字样从下方 `translateY(8px)→0`  • `opacity 0→1` 淡入（400ms，`--ease-out`）。字体：Playfair Display 20px，`#B0B0B0` | 用户数据加载，检查是否首次启动 |
| ③A **首次启动 → 欢迎页** | 2.5s 起 | Splash fade out，进入「欢迎页」（见 §22.2） | 跳过 Dashboard，直接引导创建第一个项目 |
| ③B **再次启动 → 直接进入** | 2.5s 起 | Splash fade out，直接进入 Dashboard 或上次打开的文档 | 恢复上次状态（Last opened document） |

### 28.2 欢迎页设计（仅首次启动）

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│                   ✦                         │
│             CreoNow                         │
│                                             │
│      ─────────────────────────────          │
│                                             │
│       你的创作空间，由 AI 驱动              │
│                                             │
│       请为你的工作区起一个名字：            │
│       ┌─────────────────────────┐           │
│       │  我的小说工作室  |      │           │
│       └─────────────────────────┘           │
│                                             │
│             [ 开始创作 →  ]                 │
│                                             │
│         或  [ 导入现有文稿 ]                │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

**设计规则：**

- **只有一个必填项**：工作区名称（可以是 placeholder `我的创作空间`，用户直接点「开始创作」也可以跳过）
- **不要邮箱、不要密码、不要功能选择**——这些都是摩擦
- **背景**：`#050505` 纯黑，与 Splash 无缝衔接
- **品牌符号 ✦**：32px，`rgba(255,255,255,0.20)`，位于页面顶部 1/3
- **主标题**：Playfair Display 24px，`#B0B0B0`（刻意不用 `#F0F0F0`——欢迎页要「低调优雅」）
- **副标题**：Inter 14px，`#555555`
- **输入框**：标准输入框规范（§13.4），宽度 280px，居中
- **主按钮**：filled，`#7AA2F7`，高度 40px，宽度 160px，Playfair Display 15px
- **次按钮**：ghost，`#555555` 文字，Inter 13px
- **整体动画**：元素从上到下 stagger 入场，每项间隔 80ms，`--ease-out`，`--duration-slow`

### 28.3 欢迎页完成后 → 首个示例文档

点击「开始创作」后：

1. Progress Bar 出现（顶部 2px）
2. 路由跳转至编辑器，打开一个**示例文档**
3. 示例文档内容：

```
【示例文档内容】
─────────────────────────────────────

第一章

清晨的光透过百叶窗斜照进来，在地
板上切出细长的金黄条纹。Elara 站在
窗边，手指轻抚着那块据说有千年历
史的水晶——

─────────────────────────────────────
  💡 提示（Callout，30秒后自动消失）

  这是你的第一个文稿。
  按 Ctrl+K 搜索任何内容，
  或点击右下角的 ✦ 让 Creo 帮你续写。
─────────────────────────────────────
```

**示例文档规则：**

- 只有**一个提示 Callout**，不超过 3 行，**30 秒后自动 fade out 并删除**
- 提示消失后，页面是纯净的编辑器状态，不留任何引导痕迹
- 示例文档可以直接编辑，用户可以删除所有内容重新开始
- 示例文档的存在让用户「立刻看到产品是干什么的」，而不是面对空白页茫然

### 28.4 再次启动：恢复上次状态

- 记录上次关闭时打开的文档 URL（存储在 Electron 本地 `userData`）
- 再次启动时，Splash 结束后直接打开该文档
- 如上次打开的是 Dashboard，则恢复 Dashboard
- 如文档已被删除，则打开 Dashboard + Toast 提示「上次打开的文档已删除」
- **记住侧边栏状态**：Context Panel 是否展开，宽度设置，AI 面板是否打开

### 28.5 从不打扰原则（No Interrupt Policy）

一旦用户进入正式使用后，CreoNow 承诺：

- ❌ 不弹出「新功能介绍」浮层
- ❌ 不显示「你知道吗？」Tooltip
- ❌ 不在写作途中弹出任何主动引导
- ❌ 不要求评分或反馈（除非用户主动触发）
- ✅ 新功能通过**状态栏极小图标**（`•` 小圆点）静默提示，用户点击后才展开说明
- ✅ 更新日志可在 Settings → About 中查看，从不主动弹出

---

## 29. App Shell 完整规范

<aside>
🏗️

**App Shell 是 CreoNow 的骨架层（`AppLayout`），所有页面和面板都挂载在它内部。** 它的设计决策影响整个产品的第一印象、操作流畅度和扩展性。本节覆盖：标题栏、AI 三模式架构、文档 Tab 管理、章节大纲、Toast 通知体系、App Shell 进场动画，以及应用图标规范。

</aside>

### 29.1 标题栏（Title Bar）

<aside>
💡

**方案：自定义极简标题栏，`frame: false` + 手动绘制。** 原生标题栏与 Cinematic Calm 的视觉语言完全冲突，必须替换。但完全无标题栏会导致 Windows 上无法拖动窗口，因此保留 32px 极薄的自定义标题栏，让用户几乎感觉不到它的存在。

</aside>

#### 27.1.1 布局结构

```
┌─────────────────────────────────────────────────────────┐
│ ✦  │ [当前文档名 ▾]                    │ — □ ✕ │  ← 32px
└─────────────────────────────────────────────────────────┘
  ↑       ↑                                  ↑
图标区   Tab 触发区（点击弹出文档列表）    系统按钮区
(24px)                                   (Notion 同款)
```

#### 27.1.2 区域规范

| **区域** | **宽度** | **内容** | **行为** |
| --- | --- | --- | --- |
| **图标区**（左） | 48px（与 Icon Rail 等宽） | ✦ 应用图标 SVG，20×20px，居中 | 不可点击，仅视觉标识；整条标题栏为拖拽区（`-webkit-app-region: drag`） |
| **Tab 触发区**（中） | flex-1（占满剩余空间） | 当前激活文档标题 + `▾` chevron；未保存时标题前有   `•`  | 点击弹出文档切换列表（见 §23.3）；`-webkit-app-region: no-drag` |
| **系统按钮区**（右） | 约 104px（3 按钮 × 约 35px） | 最小化 `—`、最大化 `□`、关闭 `✕`，使用 Notion 同款组件风格 | `-webkit-app-region: no-drag`；关闭按钮 hover 变红（`#EF4444`），其余 hover `rgba(255,255,255,0.10)` |

#### 27.1.3 视觉规范

- **高度**：32px
- **背景色**：`#000000`（与 Icon Rail 齐平，标题栏「融入」侧边栏）
- **标题文字**：Inter 13px，`#737373`（低调，不抢眼）
- **最大化状态**：`□` 图标切换为「还原」图标
- **Zen Mode 中**：标题栏保留但高度缩为 24px，仅保留系统按钮区，图标区和 Tab 区隐藏

#### 27.1.4 应用图标（✦ CreoNow Icon）

**设计理念**：✦（四芒星）是创作灵感的象征，也是 AI 辅助的通用符号，同时形态简洁，在 16-512px 各尺寸下均清晰。深色圆底 + 白色四芒星，与产品的 Cinematic Calm 气质一致。

```
<!-- CreoNow App Icon - SVG 源码（20×20px 标题栏版本）-->
<svg width="20" height="20" viewBox="0 0 20 20" fill="none"
     xmlns="http://www.w3.org/2000/svg">
  <!-- 背景圆 -->
  <circle cx="10" cy="10" r="10" fill="#050505"/>
  <!-- 四芒星：由 4 个细长菱形组成 -->
  <!-- 垂直轴 -->
  <path d="M10 3 L11 9.5 L10 11 L9 9.5 Z" fill="#F0F0F0"/>
  <path d="M10 17 L11 10.5 L10 9 L9 10.5 Z" fill="#F0F0F0"/>
  <!-- 水平轴 -->
  <path d="M3 10 L9.5 9 L11 10 L9.5 11 Z" fill="#F0F0F0"/>
  <path d="M17 10 L10.5 9 L9 10 L10.5 11 Z" fill="#F0F0F0"/>
</svg>
```

**多尺寸规范：**

| **用途** | **尺寸** | **背景** | **说明** |
| --- | --- | --- | --- |
| 标题栏图标 | 20×20px | `#050505` 圆形 | 无边框，直接嵌在标题栏 `#000000` 背景上 |
| Windows 任务栏图标 | 256×256px | `#050505` 圆角矩形（圆角 40px） | ✦ 符号占图标面积 60%，居中 |
| Windows 安装程序图标 | 512×512px | 同上 | 可在四芒星外加一圈极细的 `rgba(255,255,255,0.08)` 光晕（12px blur） |
| macOS Dock 图标 | 1024×1024px | `#050505` 圆角矩形（macOS 标准圆角，约 22.5% 圆角比） | 同上 |

---

### 29.2 AI 三模式架构

<aside>
🤖

**创作工具的 AI 使用方式在快速演进。** 现在已经有大量用户完全不看编辑器，只和 AI 对话；也有人需要「边写边问」；也有人只需要偶尔「选中一段让 AI 快速改一下」。CN 必须支持全部三种工作流，而不是强迫用户只用一种模式。这三种模式共享同一个 AI 面板组件，只是呈现方式不同。

</aside>

#### AI 模式一：AI 侧边栏（Sidebar Mode）

**适用场景**：边写边问，保持对编辑器内容的感知。

```
┌────┬──────────────────────────┬─────────────┐
│    │                          │             │
│ 🔲 │    编辑器（正文区）        │  AI 面板    │
│    │                          │  320px      │
│    │    ...Elara 发现水晶...   │  ┌────────┐ │
│    │                          │  │ Creo:  │ │
│    │                          │  │ 续写中 │ │
│    │                          │  └────────┘ │
└────┴──────────────────────────┴─────────────┘
```

- AI 面板默认宽度 320px，Docked（推挤编辑区）
- 通过 Icon Rail 底部 AI 图标或 FAB 双击开启
- 编辑器与 AI 面板同时可见，互相联动（`@` 引用当前选中内容）

#### AI 模式二：AI Focus 模式（Focus Mode）

**适用场景**：深度对话、方案推演、让 AI 先把细节讲清楚再动手。不需要看编辑器。

```
┌────┬────────────────────────────────────────┐
│    │                                        │
│ 🔲 │         AI Focus 面板（全宽）           │
│    │                                        │
│    │  ┌──────────────────────────────────┐  │
│    │  │ Creo:                            │  │
│    │  │ 根据你描述的设定，我建议第三幕   │  │
│    │  │ 分三个场景展开……                │  │
│    │  └──────────────────────────────────┘  │
│    │                                        │
│    │  ┌──────────────────────────────────┐  │
│    │  │  继续深入探讨，或 / 命令…        │  │
│    │  └──────────────────────────────────┘  │
└────┴────────────────────────────────────────┘
```

- **编辑器完全隐藏**，AI 面板占满 Icon Rail 右侧全部空间
- 对话区更宽（最大宽度 720px 居中），更适合长段落 AI 输出
- Creo 输出文学内容时仍用 Source Serif 4，输出分析内容用 Inter
- **触发方式**：标题栏 Tab 区旁边的 `✦ Focus` 图标按钮，或快捷键 `Alt+A`（macOS `Opt+A`）
- **退出**：再按 `Alt+A` 或点击「返回编辑器」按钮（左上角，`←` 图标）
- **状态独立**：Focus 模式下的对话历史与 Sidebar 模式共享（同一个 AI 面板实例）

#### Inline 工具栏（选中即弹出，通用编辑 + AI）

**核心定位：通用编辑工具栏，不只服务于 AI。** 参考 Notion 的设计——选中文字后弹出的是格式化工具 + 内容操作 + AI 入口的统一工具栏。

**触发方式：** 选中任意文字，0ms 延迟，立即弹出。

**工具栏布局（两行，参考 Notion 截图）：**

```
┌───────────────────────────────────────────────┐
│  T  A  B  I  U  ~  </>  Link  ···  Comment  |  AI  │  ← 第一行
│───────────────────────────────────────────────│
│ Skills: 提升写作  校对  解释  改写语气  重格式化  ⋯ │  ← 第二行
└───────────────────────────────────────────────┘
```

**第一行——基础格式化区（全部用 Lucide 图标）：**

`T`(块类型) | `A`(颜色) | `B`(加粗) | `I`(斜体) | `U`(下划线) | `~`(删除线) | `</>`(行内代码) | `Link`(超链接) | `···`(下标/上标/公式/) | `Comment`(添加注释) | 分隔线 | `AI`(Sparkles图标，`#7AA2F7`，打开 AI 指令框，`Alt+Shift+E`)

**第二行——Skill 快捷区（选中即动态展示，Skill 系统是 CN 的核心差异化能力）：**

提升写作 / 校对 / 解释 / 改写语气 / 重格式化 / 扩写 / 缩写 / 续写 / `···` 更多 Skill

Skill 列表根据选中内容动态过滤（如选中 ≤ 2 句时优先显示「扩写」，选中 ≥ 3 句时优先显示「缩写」）。点击任意 Skill 立即执行，结果以 AI Inline Block （见 §8.2）嵌入编辑区。

**视觉规范：** 宽度 320–520px，背景 `#161616`，圆角 8px，阴影 `0 8px 24px rgba(0,0,0,0.6)`，进入 `opacity+translateY(4px)→0 150ms ease-out`，退出 `opacity 80ms`，第一行 36px，第二行 32px，`z-index: --z-overlay`（200）。查看全部 Skill 入口点击 `···` 更多 → 弹出 Skill 管理面板。

**适用场景**：选中一段文字，快速让 AI 润色/改写，不需要打开完整 AI 面板。

```
用户选中文字后，弹出浮动工具条（正上方或正下方，避免遮挡选区）：

  ┌────────────────────────────────────────────┐
  │ ✦ 润色  扩写  缩写  改写  翻译  解释  更多 ▾ │
  └────────────────────────────────────────────┘

点击「润色」后，弹框展开为 mini AI 面板：

  ┌──────────────────────────────────────────┐
  │ ✦ 润色结果：                              │
  │                                          │
  │  Elara 的指尖刚触碰到水晶表面，整个密    │
  │  室便骤然亮起——不是那种温柔的磷光，而    │
  │  是刺破黑暗的白炽。                      │
  │                                          │
  │  [✅ 替换]  [📋 复制]  [🔄 重试]  [✕]  │
  └──────────────────────────────────────────┘
```

**Inline 弹框规范：**

| **属性** | **值** |
| --- | --- |
| 触发方式 | 鼠标选中文字后自动出现（延迟 300ms 防误触），或 `Alt+/`（macOS `Opt+/`） |
| 工具条高度 | 32px |
| 工具条背景 | `--overlay`（`#161616`），`--shadow-md`，圆角 `--radius-md`（8px） |
| 工具条文字 | Inter 12px，`#B0B0B0`；hover `#F0F0F0`；间距 `--space-3`（12px） |
| 展开后 mini 面板宽度 | 320px，最大高度 240px（超出内部滚动） |
| 展开后内容字体 | Source Serif 4 15px（文学内容）/ Inter 13px（分析内容），`--editor-text` 色 |
| 位置 | 选区正上方（距选区顶部 8px）；空间不足时改为选区正下方；避免超出窗口边界 |
| 关闭方式 | 点击 `✕`，或点击编辑区任意位置，或按 `Esc` |
| 「替换」动画 | 原文本 fade-out 80ms，新文本逐字 fade-in（§14.3 AI Inline Block 动画） |
| 「更多 ▾」展开 | 弹出二级列表：续写 / 生成对话 / 分析人物语气 / 添加细节 / 自定义指令 |

#### FAB 球（全局 AI 入口——始终可见）

**无论用户处于哪种模式，右下角的 FAB 球始终存在**（Zen Mode 除外），作为最快速的 AI 唤起入口：

- 单击 → 展开快速菜单（§5）
- 双击 → 切换 AI Sidebar 开关
- 长按（500ms）→ 进入 AI Focus 模式
- 有选中文字时单击 → 直接触发 Inline AI 弹框

**四种 AI 入口总览：**

| **入口** | **触发** | **结果** | **用户画像** |
| --- | --- | --- | --- |
| FAB 球 | 右下角始终可见 | 快速菜单 / Sidebar / Focus / Inline | 所有用户 |
| Icon Rail AI 图标 | 点击 Bot 图标 | 打开/关闭 AI Sidebar | 习惯用导航栏的用户 |
| 标题栏 Focus 按钮 | 点击 `✦ Focus` | 进入 AI Focus 模式 | 深度对话用户 |
| 选中文字 | 选中后自动出现（300ms） | Inline AI 弹框 | 快速润色用户 |

---

### 29.3 文档 Tab 管理

<aside>
📂

**CN 的 Tab 不是横排滑动，而是「点击标题栏触发文档切换列表」。** 横排 Tab 在文件名较长时会截断，需要滚动查找。CreoNow 的文档名通常是章节名（如「第十二章·水晶的秘密」），弹出列表能显示完整标题，体验更好。

</aside>

#### 27.3.1 标题栏 Tab 触发区

点击标题栏中央的「当前文档名 ▾」区域，弹出文档切换列表：

```
┌──────────────────────────────────────────┐
│ ✦  第十二章·水晶的秘密 ▾      — □ ✕  │  ← 标题栏
└────────────┬─────────────────────────────┘
             │
    ┌────────▼──────────────────────────────┐
    │ 📄 第十二章·水晶的秘密    刚刚       │  ← 当前（✓）
    │ 📄 第十一章·密林追踪      2小时前    │
    │ 📄 人物设定·Elara Vance   昨天       │  • 未保存
    │ 📄 第十章·城市边缘        3天前      │
    ├───────────────────────────────────────┤
    │ + 新建文档                            │
    │ 📁 从文件树打开…                      │
    └───────────────────────────────────────┘
```

**列表规范：**

| **属性** | **值** |
| --- | --- |
| 列表宽度 | 280px（固定） |
| 最大行数 | 8 条（超出内部滚动） |
| 行高 | 40px |
| 背景 | `--overlay`（`#161616`），`--shadow-lg`，圆角 `--radius-md`（8px） |
| 当前激活文档 | 左侧 ✓ 标记（`#7AA2F7`），背景 `--accent-subtle`，文字 `#F0F0F0` |
| 未保存文档 | 标题右侧显示   `•` （`#7AA2F7`，8px 实心圆），时间戳替换为「未保存」 |
| 文档名字体 | Inter 13px，`#B0B0B0`；激活文档 `#F0F0F0` |
| 时间戳字体 | Inter 11px，`#555555`，右对齐 |
| 行 hover | 背景 `rgba(255,255,255,0.06)`，文字 `#F0F0F0` |
| 关闭列表中某文档 | 行 hover 时右侧出现 `✕` 图标（16px），点击关闭该文档 |
| 弹出动画 | `opacity 0→1`  • `translateY(-4px)→0`，`--duration-normal`，`--ease-out` |
| 关闭方式 | 点击列表外任意区域，或按 `Esc` |

#### 27.3.2 多文档状态管理

- **每个 Tab 独立**：AI 面板对话历史、Context Panel 展开状态、编辑器滚动位置均独立
- **切换时恢复滚动位置**：切回某文档时回到离开时的位置
- **最多同时打开**：10 个文档（超出时弹出提示「建议关闭一些文档以提高性能」）
- **未保存提示**：关闭文档时若有未保存更改，弹出确认 Dialog（「保存」/「不保存」/「取消」）
- **快捷键切换**：`Ctrl+Tab`（向右切换）/`Ctrl+Shift+Tab`（向左切换）

---

### 29.4 编辑器内大纲（In-Editor Minimap Outline）

**核心纠正：大纲不是编辑器外部的独立面板，而是嵌在编辑器滚动内容区内部的右侧导航条。** 就像代码编辑器的 minimap，它不推挤内容，不占用布局空间，只是展示在编辑区右侧边缘内部，默认焦点抵消均「不存在」。

**两种状态：**

| **状态** | **外观** | **触发方式** | **宽度** | **行为** |
| --- | --- | --- | --- | --- |
| **收起（默认）** | 一组小横线，每条线代表一个标题/锦点的位置与层级 | 默认状态 | 20px | 点击任意小横线 → 滚动到对应位置 |
| **展开（hover）** | 展开显示完整标题文字，层级缩进，当前位置高亮 | 鼠标移入大纲条，或光标所在层段对应的小横线 | 160px | 点击标题文字 → 滚动到对应位置 |

**小横线规格（收起状态呈现内容）：**

| **内容类型** | **小横线宽度** | **颜色** | **左缩进** | **说明** |
| --- | --- | --- | --- | --- |
| H1 标题 | 16px（最长） | `#555555` | 0px | 文档最高层结构节点 |
| H2 标题 | 12px | `#444444` | 4px | 二级结构节点 |
| H3 标题 | 8px | `#383838` | 8px | 三级结构节点 |
| 用户手动锦点 | 10px（虚线） | `#444444` | 4px | 用户在编辑器内手动添加的锦点 |
| AI 生成场景摘要 | 6px（点线） | `rgba(122,162,247,0.4)` | 8px | 一文件一章场景下 AI 自动提取的场景分割点 |
| 当前光标所在行 | 对应类型宽度 | `#7AA2F7`（`--accent`） | 对应层级缩进 | 个光标实时跟踪，高亮当前段落对应的横线 |

**位置与层叠方式：**

- **属于编辑区 scroll 容器**，不属于 App Shell；`position: sticky; right: 0; top: 0`，叠在编辑内容右侧边缘上方，不改变内容区宽度
- **z-index**：编辑内容层＋1（不需要 `--z-sidebar` 级别）
- **高度**：100% 编辑区可视区高度，随内容滚动自动更新
- **背景**：收起时全透明；展开时 `rgba(5,5,5,0.85)` + `backdrop-filter: blur(4px)`
- **进入/退出**：`width 0px→20px`，`--duration-slow`，`--ease-out`；展开 `width 20px→160px`，`--duration-normal`，`--ease-out`

**Zen Mode 下大纲的行为：**

Zen Mode 进入后，In-Editor Minimap Outline 保留（因为它属于编辑器内部，不属于 Shell）。但使用更严格的默认收起规则：**光标静止 5s 后，大纲条完全淡出；鼠标移入编辑区右侧 40px 时复现。**

**实现要点：**

- 小横线的位置和长度由**文档中实际内容的相对高度比例**决定（如同代码编辑器的 minimap）
- 光标移动时，当前段落对应的横线实时高亮，不需等待 hover
- 展开时显示标题文字超过 160px 则省略号处理
- 点击小横线：`scrollIntoView({ behavior: 'smooth', block: 'start' })`

<aside>
📑

**Notion 式大纲：悬浮在编辑区右侧，不占布局空间，点击跳转。** 由于 CN 的使用场景是「一文件一章」（通常 2000-8000 字），大纲的核心需求是**场景级导航**，而不是章节级导航。因此大纲内容来源不是 Markdown 标题，而是「锚点」——用户手动添加或 AI 自动生成的场景摘要。

</aside>

#### 27.4.1 大纲显示位置

```
┌────────────────────────────────────────┬─────────────────┐
│                                        │  ≡ 大纲         │
│   正文区（Source Serif 4 16px）         │  ─────────────  │
│                                        │  ○ 清晨·密室    │
│   清晨的光透过百叶窗斜照进来...          │  ○ 水晶触碰瞬间  │
│                                        │  ▶ 符文亮起（当前│
│   「第一章·开篇」锚点 ▶                 │  ○ Elara 独白   │
│                                        │                 │
└────────────────────────────────────────┴─────────────────┘
                                          大纲宽度 160px
                                          overlay，不推挤编辑区
```

- **位置**：编辑区右侧 overlay，距编辑区右边缘 16px，距顶部工具栏 48px
- **宽度**：160px
- **背景**：`rgba(0,0,0,0.6)` backdrop-filter blur(8px)——半透明磨砂玻璃效果
- **z-index**：`--z-toolbar`（20），不覆盖 Popover
- **触发显示**：鼠标移入编辑区右侧 20px 范围时 fade-in；鼠标离开 1s 后 fade-out
- **手动锁定**：大纲右上角「📌」图标，点击后固定显示不自动隐藏
- **Zen Mode 中**：锁定状态的大纲缩为仅 8px 宽的指示条，hover 时展开

#### 27.4.2 锚点来源（三层优先级）

| **优先级** | **来源** | **显示样式** | **说明** |
| --- | --- | --- | --- |
| ① 最高 | **Markdown 标题**（H1 / H2 / H3） | 实心圆 `●`，根据层级缩进 | 用户写了标题就自动提取，无需操作 |
| ② 中 | **用户手动锚点**（右键菜单 → 「添加大纲锚点」） | 空心菱形 `◇`，用户输入的名称 | 添加后永久保存在文档 metadata 中，不影响正文内容 |
| ③ 辅助 | **AI 生成场景摘要锚点**（用户触发） | 空心圆 `○`，Italic 样式，颜色 `#555555` | 用户在空白大纲区点击「✦ 让 Creo 生成大纲」，AI 扫描全文自动打锚点。生成后可编辑/删除，可转换为手动锚点（变为 `◇`） |

**当前滚动位置对应的锚点**：高亮显示（`▶`），文字 `#7AA2F7`。点击任意锚点：平滑滚动到对应段落，`--ease-in-out`，时长根据距离计算（最短 200ms，最长 600ms）。

**AI 生成大纲的触发流程：**

1. 大纲区为空时，显示「✦ 让 Creo 为这一章生成大纲」按钮
2. 点击后，Creo 扫描全文，每 600-800 字生成一个场景摘要（不超过 10 个字）
3. 生成完毕，锚点以 stagger 方式出现在大纲区（每项延迟 80ms）
4. 用户可以：双击锚点文字编辑、拖拽调整顺序、点击 `✕` 删除

---

### 29.5 Toast 通知体系

<aside>
🔔

**设计原则：Toast 是最后手段，不是默认反馈方式。** 只有在「用户必须知道但又不需要立刻操作」的场景才用 Toast。操作的即时反馈（如按钮点击）用按钮状态变化；错误用内联提示；只有异步结果、系统状态变更、重要提醒才用 Toast。

**保存状态是 Toast 使用最容易犯错的场景**：自动保存必须无感，绝对不能每次保存都弹 Toast。

</aside>

#### 27.5.1 Toast 位置与堆叠

- **位置**：窗口右下角，距底部 16px，距右侧 16px（`position: fixed; bottom: 16px; right: 16px`）
- **宽度**：300px（固定）
- **堆叠**：多个 Toast 同时存在时，新 Toast 从底部进入，旧 Toast 向上移动（stagger，`--duration-fast`）
- **最多同时显示**：3 条（第 4 条进入时，最早的一条加速消失）
- **z-index**：`--z-toast`（400）

#### 27.5.2 Toast 视觉规范

```
┌─────────────────────────────────────────┐
│ ✅  文档「第十二章」已导出为 PDF         │
│     刚刚                           ✕   │
└─────────────────────────────────────────┘
```

| **属性** | **值** |
| --- | --- |
| 背景 | `--toast`（`#222222`），`--shadow-xl`，圆角 `--radius-md`（8px） |
| 左侧图标 | 16px，类型色（成功 `#22c55e`，警告 `#F59E0B`，错误 `#EF4444`，信息 `#7AA2F7`） |
| 主文字 | Inter 13px，`#F0F0F0`，行高 1.4，最多 2 行 |
| 次文字（时间戳） | Inter 11px，`#555555` |
| 关闭按钮 | `✕` 16px，`#555555`，hover `#F0F0F0`，始终存在 |
| 进入动画 | `translateY(100%)→0`  • `opacity 0→1`，`--duration-normal`，`--ease-out` |
| 退出动画 | `translateX(0)→(120%)`  • `opacity 1→0`，`--duration-fast`，`--ease-in`（向右滑出） |
| 左侧 4px 色条 | 与图标同色，圆角左侧 |

#### 27.5.3 Toast 场景完整分类表

| **场景** | **类型** | **图标** | **文案** | **持续时间** | **是否显示** |
| --- | --- | --- | --- | --- | --- |
| 常规自动保存（每 30s 或有修改后 3s） | — | — | — | — | ❌ **完全不显示**——状态栏极小图标静默更新 |
| 超过 **5 分钟**未保存（网络断开或异常） | 警告 | `AlertTriangle` `#F59E0B` | 「文档已 5 分钟未保存，请检查网络连接」 | **不自动消失**，需用户手动关闭 | ✅ 显示 |
| 手动触发保存（`Ctrl+S`） | — | — | — | — | ❌ 不显示——状态栏「已保存 · 刚刚」即时更新即可 |
| 保存失败（磁盘空间不足 / 权限问题） | 错误 | `XCircle` `#EF4444` | 「保存失败：磁盘空间不足（剩余 200MB）」 | 不自动消失 | ✅ 显示 |
| AI 生成完成（后台生成，用户已切到其他文档） | 信息 | `CheckCircle2` `#7AA2F7` | 「Creo 已完成「第十章」的大纲生成」+ [查看] 按钮 | 6s | ✅ 显示 |
| AI 生成完成（用户在当前文档） | — | — | — | — | ❌ 不显示——结果直接在 AI 面板呈现即可 |
| AI 生成失败 | 错误 | `XCircle` `#EF4444` | 「生成失败，请稍后重试」 | 5s | ✅ 显示 |
| 文档导出成功（PDF / TXT / DOCX） | 成功 | `CheckCircle2` `#22c55e` | 「已导出为 PDF」+ [打开文件夹] 按钮 | 5s | ✅ 显示 |
| 文件导入成功 | 成功 | `CheckCircle2` `#22c55e` | 「已导入「xxx.docx」」 | 3s | ✅ 显示 |
| 剪贴板复制成功（「复制全文」等操作） | — | — | — | — | ❌ 不用 Toast——用按钮状态变化（图标变 ✓，1s 后恢复） |
| 网络断开 | 警告 | `AlertTriangle` `#F59E0B` | 「网络已断开，AI 功能暂不可用」 | 不自动消失 | ✅ 显示（网络恢复时自动消失 + 新 Toast「网络已恢复」3s） |
| 新版本可用 | 信息 | `RefreshCw` `#7AA2F7` | 「CreoNow v1.x 已就绪」+ [立即重启] 按钮 | 不自动消失 | ✅ 显示（只在用户空闲时，不在写作中途打断） |
| 撤销删除（误删文档后） | 信息 | `Trash2` `#737373` | 「已删除「第十章」」+ [撤销] 按钮 | **8s**（给足撤销时间） | ✅ 显示 |
| 操作成功（重命名、移动文件等轻操作） | — | — | — | — | ❌ 不显示——Context Panel 直接更新即可 |

**撤销 Toast 的特殊规则**：「撤销删除」的 Toast 有倒计时进度条（8px 高，底部，从右向左收缩），直观显示撤销窗口剩余时间。

---

### 29.6 App Shell 进场动画（Splash 结束后）

<aside>
🎬

**目标：0 感知延迟 + 100% 仪式感。** 数据加载和动画并行进行——不等动画播完再加载数据，也不等数据加载完再开始动画。用户看到的是「一个精心设计的产品正在为我准备好」，实际上数据已经在动画过程中静默加载完毕。

</aside>

#### 27.6.1 进场时序（总时长 ≈ 500ms）

```
t=0ms    Splash fade-out 开始（300ms）
         ↕ 同时：数据已在 Splash 期间加载完毕（不阻塞）

t=100ms  Icon Rail 从左侧 translateX(-48px)→0 + opacity 0→1
         （200ms，--ease-out）

t=180ms  Context Panel 从左侧 translateX(-240px)→0 + opacity 0→1
         （250ms，--ease-out）

t=240ms  标题栏 translateY(-32px)→0 + opacity 0→1
         （200ms，--ease-out）

t=300ms  编辑区内容 opacity 0→1
         （200ms，--ease-out）

t=420ms

---
### 29.8 多文档分栏对比

**是否有必要设计？是的，对 CN 的目标用户（小说创作者）有显著业务价值。** 常见场景：对比同一章节的两个版本（A 稿 vs B 稿）、参考上一章内容续写当前章节、把人物设定文档和当前章节并排查阅。

#### 27.8.1 触发方式

<table fit-page-width="true" header-row="true">
<tr color="blue_bg">
<td>**操作**</td>
<td>**结果**</td>
</tr>
<tr>
<td>`Ctrl` + 单击文件树中任意文件</td>
<td>在右侧新分栏打开，形成左右两栏布局</td>
</tr>
<tr>
<td>文件树节点右键 → 「在右侧分栏打开」</td>
<td>相同效果</td>
</tr>
<tr>
<td>FAB 快速菜单 → 「在右侧分栏打开...」</td>
<td>弹出文件选择列表，选择后分栏打开</td>
</tr>
<tr>
<td>已开文档 Tab → 按住拖拽到右侧分栏区域</td>
<td>移动成分栏</td>
</tr>
</table>

#### 27.8.2 分栏布局规范

<table fit-page-width="true" header-row="true">
<tr color="blue_bg">
<td>**属性**</td>
<td>**值**</td>
</tr>
<tr>
<td>最大分栏数</td>
<td>3 栏（主 + 副1 + 副2）</td>
</tr>
<tr>
<td>最小每栏宽度</td>
<td>320px</td>
</tr>
<tr>
<td>分隔线</td>
<td>1px `rgba(255,255,255,0.08)`，可拖拽调整分栏比例</td>
</tr>
<tr>
<td>每栏标题条</td>
<td>24px 高，文件名 Inter 12px `#737373` + 未保存圆点 + 关闭按钮</td>
</tr>
<tr>
<td>各栏独立</td>
<td>独立滚动 / 光标 / 编辑 / AI 历史，修改一栏不影响另一栏</td>
</tr>
</table>

#### 27.8.3 AI 跨文档分析能力（CN 系统优势）

<table fit-page-width="true" header-row="true">
<tr color="blue_bg">
<td>**分析场景**</td>
<td>**纯 AI 对话**</td>
<td>**CN 系统下**</td>
</tr>
<tr>
<td>读取文档</td>
<td>用户手动复制粘贴，受上下文窗口限制</td>
<td>AI 直接读取所有当前打开文档全文，无需用户操作</td>
</tr>
<tr>
<td>结构性 Diff</td>
<td>语义描述，无法定位到具体段落</td>
<td>输出段落级增删改列表，可直接在两栏中高亮对应位置</td>
</tr>
<tr>
<td>角色一致性</td>
<td>AI 不知道你的角色设定数据库</td>
<td>AI 可调用 KG 数据校验：「Elara 第5章蓝眼睛，第12章改成了绿色」</td>
</tr>
<tr>
<td>情感曲线对比</td>
<td>只能给出文字描述</td>
<td>Skill「情感曲线分析」可同时计算两段的情绪曲线，展示在段落边空白</td>
</tr>
<tr>
<td>版本感知</td>
<td>无法判断两文档是否为同一章节的不同版本</td>
<td>CN 的 AI 可识别同一文档的多个版本，自动切换为「版本对比」模式</td>
</tr>
</table>

分栏状态下，AI 输入框 Placeholder 变为：`Ask about both documents, @ to reference specific sections...`；上下文范围选择器默认值变为 `All open panes`。

#### 27.8.4 快捷键

- `Ctrl+\`（macOS `Cmd+\`）：在当前光标所在栏右侧新建分栏
- `Ctrl+W`：关闭当前光标所在栏（只有一栏时无效，防止意外关闭）
- `Ctrl+Alt+←` / `→`：在分栏间移动光标焦点  AI FAB scale(0)→1 + opacity 0→1
         （150ms，--ease-spring，带弹性）

t=500ms  🎉 进场完成，所有元素就位
```

**AI 面板不参与进场动画**（默认关闭），仅在用户主动打开时才有独立的 slide-in 动画。

#### 27.6.2 再次启动（非首次）的进场

再次启动时用户更熟悉产品，仪式感需求降低，速度优先：

- stagger 间隔从 80ms 压缩到 40ms
- 各元素 duration 压缩为首次的 70%（Icon Rail 140ms，Context Panel 175ms 等）
- 恢复上次打开的文档，编辑区内容直接显示（无 fade-in，感觉「上次离开的地方还在」）

#### 27.6.3 动画与加载的解耦

- **不能做**：等所有数据加载完才开始动画（会出现「卡住了」的感觉）
- **正确做法**：Splash 期间并行加载用户数据 → Splash 结束时数据已就绪 → 进场动画开始时直接填充真实内容，无 Skeleton 过渡
- **如果数据加载超时**（> 2.5s）：Splash 延长，显示极细的 Progress Bar（顶部 2px `--accent`），完成后立即开始进场动画

---

### 29.7 App Shell 整体布局 Z 轴堆叠顺序

```
┌─────────────────────────────────────────────────────┐
│                Layer 6: Toast (z:400)               │
├─────────────────────────────────────────────────────┤
│             Layer 5: Modal/Search (z:300)           │
├─────────────────────────────────────────────────────┤
│           Layer 4: Popover/Dropdown (z:200)         │
├─────────────────────────────────────────────────────┤
│               Layer 3: FAB (z:100)                  │
├─────────────────────────────────────────────────────┤
│     Layer 2: Toolbar (z:20) + Titlebar (z:20)       │
├─────────────────────────────────────────────────────┤
│           Layer 1: Sidebar (z:10)                   │
│  ┌──────────┬────────────────────────┬───────────┐  │
│  │Icon Rail │   Context Panel        │  AI Panel │  │
│  │  48px    │     240px              │   320px   │  │
├──┼──────────┼────────────────────────┼───────────┤  │
│  │          │   Editor (z:0)         │           │  │
│  │          │   Source Serif 4       │           │  │
│  │          │   #050505 background   │           │  │
│  └──────────┴────────────────────────┴───────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 相关页面

- [CN-fd-v1](https://www.notion.so/CN-fd-v1-6a3d6a4c25014372976d2d4e70427046?pvs=21) — V1 完整源码
- [CN-fd-v2](https://www.notion.so/CN-fd-v2-21383986f305448eb7a10c4f550e92d5?pvs=21) — V2 完整源码