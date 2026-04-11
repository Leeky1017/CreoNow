# CLAUDE.md

本文件是 CreoNow 的兼容治理入口，供会读取 `CLAUDE.md` 的工具链使用。
它不是第二套宪法；内容应与 `AGENTS.md`、`.github/copilot-instructions.md` 保持一致，若有差异，以那两份治理源为准。

## 治理摘要

### 模型配置（1+1+1+Duck）

| 角色 | 说明 | 数量 |
| --- | --- | --- |
| Main session Agent | 与用户当前对话模型，**仅负责编排**，不直接审计 | 1 |
| Audit Subagent 1 | 与主会话同模型的独立 Subagent，第一路全量审计 | 1 |
| Audit Subagent 2 | Claude Sonnet 4.6，第二路独立全量审计 | 1 |
| Rubber Duck（GPT-5.4） | 每轮任务完成后，强制 `critique this plan` 交叉审计 | 1 |

- 主会话 Agent **仅负责编排**，不直接审计。第一路审计由与主会话同模型的独立 Subagent 执行。
- 工程 Subagent 只有达到"可交审条件"后才可转审；实现、提 PR、修 CI、回应审计都必须全程在 `.worktrees/issue-<N>-<slug>` 中完成。
- "可交审条件"至少包括：PR 已创建或更新，正文含 `Closes #N`、`Invariant Checklist`（INV-1~INV-10 勾选项）、验证证据、回滚点、审计门禁；`scripts/agent_pr_preflight.sh` 已通过；required checks 全绿。
- 前端 PR 还需在正文直接可见截图，并附可点击 Storybook artifact/link 与视觉验收说明。
- 审计采用 1+1+1+Duck 三审交叉制：与主会话同模型的 Subagent 第一路审计 + Claude Sonnet 4.6 Subagent 第二路审计 + Rubber Duck（GPT-5.4）`critique this plan` 第三路交叉审计。
- 只有三路审计全部 zero findings + `FINAL-VERDICT` + `ACCEPT` 才可收口。
- 只要任一路存在任何 finding（含 non-blocking / suggestion / nit），结论必须维持 `REJECT`。
- `auto-merge 默认关闭`；只有在三路审计都对 zero findings 给出 `FINAL-VERDICT` + `ACCEPT` 后，才可显式开启。
- 禁止用 `Accept with risk` 或其他"带问题通过"的表述替代 `REJECT`。

## Design Context

### Users

CreoNow 的用户是**创意写作者**——小说作者、剧本编剧、内容创作者、学术写作者——他们在深度专注中进行长篇创作。他们的使用场景往往是深夜的长时间沉浸式写作，需要一个不打断心流的环境。他们要完成的核心任务是：**在 AI 的辅助下，以更高的效率和质量完成创意文字作品**。

### Brand Personality

**三个词：Poetic × Precise × Invisible（诗意 × 精确 × 隐形）**

- **Poetic（诗意）**：工具本身应有文学气质，不是冷冰冰的效率机器，而是懂得创作者审美的伙伴
- **Precise（精确）**：每一个像素、每一个交互都经过深思熟虑，没有多余的装饰，没有模糊的边界
- **Invisible（隐形）**：最好的工具是你感觉不到它存在的工具——UI 退到背景，创作者和文字才是主角

**情绪基调：心流与沉浸（Flow）+ 安静的信心（Quiet Confidence）**
- 像深夜写作时忘记时间的感觉——工具与思维融为一体
- 工具退到背景，创作者是主角；一切尽在掌握，没有意外

**语调**：克制、温暖但不过度热情；像一个安静但可靠的写作伙伴，不主动打扰，但随时在场。

### Aesthetic Direction

**视觉基调**：纯黑白为底色，极简克制，纯单色系。禁止紫色、蓝色、金色、琥珀色等"AI 美学"色彩。

**参考应用（Reference Apps）**：
- **Cursor**：深色主题沉浸感、上下文感知的 AI Panel、Cmd+K 交互模式
- **Notion**：Inline AI 输出、Slash Commands、无缝工作流
- **Ulysses**：写作者的深度专注体验、Markdown 优先、极简编辑界面

**反参考（Anti-References）**：
- ❌ 聊天气泡式 AI 界面（像 ChatGPT 那样的对话 UI）
- ❌ "AI 美学"紫色/渐变（科技感过重）
- ❌ 过度装饰、过多动画、花哨的入场效果
- ❌ 密集的工具栏和功能堆叠（Word/WPS 风格）
- ❌ 扁平化到没有层次感的 UI

**色彩系统**：纯黑（`#1A1A1A`）× 纯白（`#FFFFFF`），严格单色系。语义化 Token 体系，禁止硬编码颜色值。禁止紫色、蓝色、金色、琥珀色。

**主题**：亮色 + 暗色双主题，均需完整支持。

**排版**：Inter（UI 控件）+ Lora / Source Han Serif SC（正文/CJK）+ JetBrains Mono（代码）。4px 网格系统，8px 为基本节奏单元。

**动效**：高级、精致、有质感。三档时长（80ms/120ms/300ms），ease-out 为主，弹性效果克制使用。动效是品质感的核心载体，不是可有可无的装饰——每一个过渡都应该让人感觉"这个软件很贵"。色盲模式（`prefers-reduced-motion`）为用户主动开启后的降级方案，默认状态下动效全开。

**圆角**：默认 8px（`--cn-radius-md`），小元素 4px，大面板 12px，药丸/头像 9999px。

### Design Principles

1. **「器不夺文」（Tool Serves Text）**：界面的一切设计决策都服务于"让文字更好"。UI 元素不与内容争夺注意力。编辑器正文区域永远是视觉焦点。

2. **「少即是多，但不能少到没有」（Minimal, Not Missing）**：去掉一切不必要的元素，但保留所有必要的功能入口。每个留下的元素都必须有存在的理由。用 progressive disclosure 渐进呈现复杂功能。

3. **「AI 在场但不喧宾夺主」（AI Present, Not Dominant）**：AI 能力自然融入工作流，不用特殊颜色标记、不用夸张的动画或弹窗。AI 是安静的伙伴，不是舞台中央的明星。用户始终保持对创作过程的控制感。

4. **「一致到像素级」（Pixel-Perfect Consistency）**：所有间距、颜色、字号、动效都通过 Design Token 系统统一管理。同类元素在不同场景下保持完全一致的视觉表现。不允许"差不多"。

5. **「色盲友好，动效高级」（Accessible, Premium Motion）**：色盲模式下不依赖颜色作为唯一的信息传达手段，用户主动开启后提供降级方案。默认状态下动效全开且追求高级质感。对比度满足 WCAG AA 标准，关键元素追求 AAA。

### Engagement Engine（成瘾引擎）

CN 的产品设计以人性底层心理机制为哲学基础——14 个心理弱点系统性融入产品功能。完整规范见 `docs/references/engagement-engine.md`。

核心约束：
- 成瘾触点绝不打断写作心流——禁止弹窗，所有通知融入 Dashboard / 边栏 / Toast
- 查询服务 ≤ 200ms（纯 SQLite + KG，禁止 LLM 调用）
- 分析类 Skill 必须注册为 INV-6 合规 Skill
- 世界规模更新通过 INV-8 post-writing Hook 触发
