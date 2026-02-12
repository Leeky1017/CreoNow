# AI Native 审计路线图：22 Changes × 6 Phases

> 基于 `docs/audit/` 七份审计报告，拆解为可执行的 OpenSpec Change 序列。
> 创建时间：2026-02-12
> 总实现量：~41.5d（不含 spec 编写 ~11d）

---

## 架构原则

在执行任何 change 之前，所有 Agent 必须理解以下原则：

### 1. 本地文件系统 > 大上下文窗口

CN 是 Electron 桌面应用，直接访问用户项目文件夹。这是 Sudowrite/NovelCrafter（SaaS Web App）不具备的结构性优势。

| 能力 | SaaS (Sudowrite/NC) | CN (本地 Electron) |
|------|---------------------|-------------------|
| 文件访问 | 用户手动上传/粘贴 | 直接读取整个项目文件夹 |
| 索引 | 每次会话重建 | 本地 SQLite 持久索引，增量更新 |
| 缓存 | 会话结束即失 | 本地磁盘缓存，跨会话持久 |
| 章节摘要 | 每次在线生成 | 生成一次持久存储，内容变更时才重新生成 |
| KG 查询 | API 调用 | 本地 SQLite 毫秒级查询 |

**策略**：不追求大窗口，而是精确注入（Codex 引用检测）+ 持久缓存（章节摘要）+ 增量索引。

### 2. Codex 引用检测 > 向量 RAG

写作场景 80% 的上下文需求是结构化知识（角色/地点/世界观），不是非结构化文本的语义搜索。Codex 引用检测（字符串匹配 + KG 查询）优先于向量 embedding + RAG。

### 3. 用户主动触发 > AI 自动弹出

编程 IDE 的 Ghost Text 不适合创作写作（ACM CHI 论文论证）。CN 的编辑器 AI 交互应为用户主动触发（续写按钮、Bubble Menu、Slash Command），而非自动弹出补全。

### 4. 流动角色 > 固定助手

创作者在不同任务中需要不同类型的 AI 参与（ghostwriter/muse/editor/actor/painter）。系统提示词必须支持角色流动。

### 5. 叙事状态 > 通用偏好

写作中的"记忆"是叙事状态（角色受伤、伏笔揭示、关系变化），不是通用 AI 的用户偏好。

---

## Phase 总览

| Phase | 主题 | Changes | 实现量 | Spec 编写 | 累计 |
|-------|------|---------|--------|-----------|------|
| 1 | AI 可用 | 4 | ~6d | ~2d | 8d |
| 2 | Codex 上下文 | 4 | ~5d | ~2d | 15d |
| 3 | 写作技能 + 编辑器 | 5 | ~8d | ~2.5d | 25.5d |
| 4 | 叙事记忆 + 摘要 | 3 | ~6d | ~1.5d | 33d |
| 5 | 语义检索 | 3 | ~6d | ~1.5d | 40.5d |
| 6 | 体验完善 | 3 | ~10.5d | ~1.5d | 52.5d |
| **合计** | | **22** | **~41.5d** | **~11d** | **~52.5d** |

---

## Phase 1 — AI 可用（解决 P0）

目标：让 AI 功能从"不可用"变为"基本可用"。用户可以在 AI 面板中进行多轮对话，AI 具有写作身份和上下文感知。

### Change 1: `ai-identity-prompt`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/ai-service/spec.md` |
| **审计来源** | `docs/audit/01-system-prompt-and-identity.md` §3.1, §3.2 |
| **实现量** | 1.5d |
| **前置依赖** | 无 |

**Scope**：
- 创建全局 AI 身份提示词模板（含 `<identity>`, `<writing_awareness>`, `<role_fluidity>`, `<behavior>`, `<context_awareness>` 五个 XML 区块）
- 改造 `combineSystemText` → `assembleSystemPrompt`，支持分层组装：身份 → 用户规则 → 技能指令 → 模式 → 记忆 → 上下文

**需要新增的 Spec Scenario**：
- GIVEN AI 服务启动 WHEN 组装系统提示词 THEN 身份层始终包含写作素养和角色流动定义
- GIVEN 技能指定了 system prompt WHEN 组装系统提示词 THEN 技能 prompt 插入到身份层之后、上下文层之前
- GIVEN 用户有记忆偏好 WHEN 组装系统提示词 THEN 记忆层注入到上下文层之前

**关键文件**：
- `apps/desktop/main/src/services/ai/` — 新建身份模板、改造组装函数
- `packages/shared/types/` — 可能需要更新 AI 相关类型

### Change 2: `chat-skill`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/skill-system/spec.md` |
| **审计来源** | `docs/audit/01-system-prompt-and-identity.md` §3.3, §3.4 |
| **实现量** | 1d |
| **前置依赖** | Change 1（身份模板） |

**Scope**：
- 创建 `chat` 技能 SKILL.md（对话、问答、追问澄清）
- 实现基础智能技能路由（关键词 + 启发式规则推断用户意图 → 自动选择技能）

**需要新增的 Spec Scenario**：
- GIVEN 用户发送自由文本 WHEN 未显式指定技能 THEN 默认使用 chat 技能
- GIVEN 用户输入包含"续写"/"写下去" WHEN 技能路由分析 THEN 推断为 write 技能（Phase 3 实现，此处预留路由逻辑）
- GIVEN 用户输入包含"帮我想想"/"头脑风暴" WHEN 技能路由分析 THEN 推断为 brainstorm 技能

**关键文件**：
- `apps/desktop/main/src/services/skill/` — 新建 chat SKILL.md、技能路由函数

### Change 3: `multi-turn-conversation`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/ai-service/spec.md` |
| **审计来源** | `docs/audit/02-conversation-and-context.md` §3.1, §3.2 |
| **实现量** | 2d |
| **前置依赖** | Change 1（assembleSystemPrompt） |

**Scope**：
- aiStore 增加 `messages: ChatMessage[]` 数组和管理逻辑（add/clear/trim）
- LLM 调用时组装多轮消息：system prompt + 历史消息 + 当前用户输入
- 消息裁剪策略：保留最近 N 轮 + 首条系统消息

**需要新增的 Spec Scenario**：
- GIVEN 用户发送第 N 条消息 WHEN LLM 调用 THEN 请求包含前 N-1 条历史消息
- GIVEN 历史消息总 token 超过预算 WHEN 组装消息 THEN 从最早的非系统消息开始裁剪
- GIVEN 用户切换文档/项目 WHEN 对话上下文 THEN 清空历史消息

**关键文件**：
- `apps/desktop/renderer/src/stores/aiStore.ts` — 增加 messages 管理
- `apps/desktop/main/src/services/ai/` — LLM 调用组装逻辑

### Change 4: `api-key-settings`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/workbench/spec.md` |
| **审计来源** | `docs/audit/06-onboarding-ux-config.md` §3.1 |
| **实现量** | 2d |
| **前置依赖** | 无（可与 Change 1-3 并行） |

**Scope**：
- 设置面板增加 AI 配置区：API Key 输入（OpenAI / Anthropic / 自定义）、模型选择、连接测试
- API Key 安全存储（Electron safeStorage）
- 无 Key 时的降级提示（AI 面板显示配置引导）

**需要新增的 Spec Scenario**：
- GIVEN 用户打开设置 WHEN 进入 AI 配置区 THEN 显示 API Key 输入框和模型选择
- GIVEN 用户输入 API Key WHEN 点击测试连接 THEN 发送测试请求并显示结果
- GIVEN 无可用 API Key WHEN 用户尝试使用 AI 功能 THEN 显示配置引导而非报错

**关键文件**：
- `apps/desktop/renderer/src/features/settings/` — AI 配置 UI
- `apps/desktop/main/src/services/ai/` — Key 存储和验证
- `apps/desktop/preload/` — 可能需要新 IPC 通道

---

## Phase 2 — Codex 上下文

目标：实现写作场景最关键的上下文来源——KG 实体自动注入 AI 上下文。

### Change 5: `kg-codex-schema`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/knowledge-graph/spec.md` |
| **审计来源** | `docs/audit/04-rag-embedding-retrieval.md` §2.6, §四 step 1 |
| **实现量** | 1d |
| **前置依赖** | 无 |

**Scope**：
- KG entity schema 增加 `aiContextLevel` 字段：`"always" | "when_detected" | "manual_only" | "never"`，默认 `"when_detected"`
- KG entity schema 增加 `aliases` 字段：`string[]`，默认 `[]`
- SQLite migration 脚本
- 前端 KG 编辑 UI 增加这两个字段的编辑

**需要新增的 Spec Scenario**：
- GIVEN 创建 KG entity WHEN 未指定 aiContextLevel THEN 默认为 "when_detected"
- GIVEN KG entity 有 aliases WHEN 查询实体 THEN 返回 name + aliases
- GIVEN 用户编辑 entity WHEN 修改 aiContextLevel THEN 持久化到 SQLite

### Change 6: `codex-reference-detection`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/knowledge-graph/spec.md` |
| **审计来源** | `docs/audit/04-rag-embedding-retrieval.md` §四 step 2 |
| **实现量** | 1.5d |
| **前置依赖** | Change 5 |

**Scope**：
- 替换 `kgRecognitionRuntime.ts` 中的 mock recognizer
- 新 recognizer 从 KG 数据库动态加载实体 name + aliases，构建匹配器
- 扫描输入文本，返回匹配到的实体 ID 列表
- 性能要求：100 个实体 × 1000 字文本 < 10ms

**需要新增的 Spec Scenario**：
- GIVEN KG 有实体 {name: "林默", aliases: ["小默"]} WHEN 文本包含 "小默" THEN 返回该实体
- GIVEN KG 有 50+ 实体 WHEN 扫描 1000 字文本 THEN 响应时间 < 10ms
- GIVEN 实体被删除 WHEN 下次扫描 THEN 不再匹配该实体

### Change 7: `context-codex-fetchers`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/context-engine/spec.md` |
| **审计来源** | `docs/audit/02-conversation-and-context.md` §3.3 |
| **实现量** | 1.5d |
| **前置依赖** | Change 5 + Change 6 |

**Scope**：
- `rules` fetcher：查询 `aiContextLevel="always"` 的 KG 实体，格式化为上下文注入
- `retrieved` fetcher：调用 Codex 引用检测（Change 6），查询 `aiContextLevel="when_detected"` 的匹配实体
- `immediate` fetcher：从 editor state 获取光标位置、选中文本、当前场景标题
- 替换 `defaultFetchers()` 中的 stub 实现

**需要新增的 Spec Scenario**：
- GIVEN 有 always 级实体 WHEN 组装上下文 THEN rules 层始终包含该实体档案
- GIVEN 光标前文本包含 "林默" WHEN 组装上下文 THEN retrieved 层包含林默的 when_detected 档案
- GIVEN 实体 aiContextLevel="never" WHEN 组装上下文 THEN 该实体永远不出现在任何层

### Change 8: `memory-ai-injection`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/memory-system/spec.md`, `openspec/specs/context-engine/spec.md` |
| **审计来源** | `docs/audit/05-memory-and-learning.md` §3.1, §3.2 |
| **实现量** | 1d |
| **前置依赖** | Change 1（assembleSystemPrompt） |

**Scope**：
- `settings` fetcher：调用 Memory `previewInjection`，注入用户偏好和写作风格记忆
- 将 KG `buildRulesInjection` 接入 Context Engine rules fetcher
- 确认 Memory previewInjection 输出格式与 assembleSystemPrompt 的 memoryOverlay 参数兼容

**需要新增的 Spec Scenario**：
- GIVEN 用户有写作偏好记忆 WHEN AI 调用 THEN 系统提示词包含偏好内容
- GIVEN 项目有 KG 规则 WHEN AI 调用 THEN 系统提示词包含 KG 规则

---

## Phase 3 — 写作技能 + 编辑器

目标：实现核心写作交互——续写按钮、Bubble Menu AI、Slash Command。

### Change 9: `writing-skills-core`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/skill-system/spec.md` |
| **审计来源** | `docs/audit/01-system-prompt-and-identity.md` §3.3 |
| **实现量** | 1d |
| **前置依赖** | Change 2（chat 技能框架） |

**Scope**：
- 创建 5 个核心写作技能 SKILL.md：`write`（续写）、`expand`（扩写）、`describe`（描写）、`shrink`（缩写）、`dialogue`（对白）
- 每个技能定义：system prompt、输入格式（选中文本 / 光标位置）、输出格式、AI 角色

### Change 10: `write-button-ui`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/editor/spec.md` |
| **审计来源** | `docs/audit/03-editor-ai-integration.md` §3.2 |
| **实现量** | 1.5d |
| **前置依赖** | Change 9（write 技能） |

**Scope**：
- 编辑器右下角悬浮按钮组：续写 / 扩写 / 缩写
- 点击触发对应技能，输出在光标下方临时区域显示
- 用户可接受/编辑/丢弃

### Change 11: `bubble-menu-ai`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/editor/spec.md` |
| **审计来源** | `docs/audit/03-editor-ai-integration.md` §3.1 |
| **实现量** | 1.5d |
| **前置依赖** | Change 9（describe/dialogue 技能） |

**Scope**：
- `EditorBubbleMenu.tsx` 增加 AI 按钮组：润色 / 改写 / 描写 / 对白
- 点击后通过 IPC 调用对应技能，选中文本作为 input
- AI 输出通过 Inline Diff（Change 13）展示

### Change 12: `slash-commands`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/editor/spec.md` |
| **审计来源** | `docs/audit/03-editor-ai-integration.md` §3.3 |
| **实现量** | 2d |
| **前置依赖** | Change 9 |

**Scope**：
- 基于 `@tiptap/suggestion` 实现 Slash Command 扩展
- 命令集：/续写、/描写、/对白、/角色、/大纲、/头脑风暴、/搜索
- 命令面板 UI：模糊搜索、键盘导航

### Change 13: `inline-diff-preview`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/editor/spec.md` |
| **审计来源** | `docs/audit/03-editor-ai-integration.md` §3.4 |
| **实现量** | 2d |
| **前置依赖** | 无（可与 Change 10-12 并行） |

**Scope**：
- AI 输出后在编辑器中用 decoration 标记修改区域（绿色=新增、红色删除线=删除）
- 接受/拒绝按钮
- 替代当前的 `window.confirm` 交互

---

## Phase 4 — 叙事记忆 + 摘要

目标：支撑长篇小说写作——角色状态自动跟踪、章节摘要、Generation Trace 持久化。

### Change 14: `narrative-state-tracking`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/knowledge-graph/spec.md`, `openspec/specs/memory-system/spec.md` |
| **审计来源** | `docs/audit/05-memory-and-learning.md` §3.3 |
| **实现量** | 2.5d |
| **前置依赖** | Change 5（KG schema）+ LLM 调用链（Phase 1） |

**Scope**：
- KG entity 增加 `last_seen_state` 字段（文本，描述角色当前状态）
- 章节完成时调用 LLM 提取角色状态变化，自动更新 KG entity
- 用户可手动编辑 `last_seen_state`

### Change 15: `chapter-synopsis`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/skill-system/spec.md`, `openspec/specs/context-engine/spec.md` |
| **审计来源** | `docs/audit/02-conversation-and-context.md` §3.4 |
| **实现量** | 2d |
| **前置依赖** | Change 9（技能框架） |

**Scope**：
- `synopsis` 技能 SKILL.md：为章节/段落生成 200-300 字摘要
- 章节完成时自动生成摘要，持久存储到 SQLite
- 续写时将前几章摘要注入上下文（替代塞入全文）

### Change 16: `trace-persistence`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/memory-system/spec.md` |
| **审计来源** | `docs/audit/05-memory-and-learning.md` §3.4 |
| **实现量** | 1.5d |
| **前置依赖** | 无 |

**Scope**：
- 将 `createInMemoryMemoryTraceService` 改为 SQLite 实现
- generation_traces 表 + trace_feedback 表
- 支持跨会话查询历史 trace

---

## Phase 5 — 语义检索

目标：在 Codex 引用检测之外，提供非结构化文本的语义搜索能力。

### Change 17: `local-embedding-onnx`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/search-and-retrieval/spec.md` |
| **审计来源** | `docs/audit/04-rag-embedding-retrieval.md` §3.1 |
| **实现量** | 3d |
| **前置依赖** | 无 |

**Scope**：
- 集成 ONNX Runtime + bge-small-zh-v1.5（本地中文 embedding）
- embeddingService 支持三级降级：本地 ONNX → 远程 API → hash fallback
- 替换当前的 hash-based pseudo-embedding

### Change 18: `hybrid-rag-ranking`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/search-and-retrieval/spec.md` |
| **审计来源** | `docs/audit/04-rag-embedding-retrieval.md` §3.2 |
| **实现量** | 2d |
| **前置依赖** | Change 17 |

**Scope**：
- RAG 服务支持 semantic + FTS hybrid ranking（Reciprocal Rank Fusion）
- Context Engine `retrieved` fetcher 在 Codex 结果之后补充 RAG 结果

### Change 19: `entity-name-completion`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/editor/spec.md` |
| **审计来源** | `docs/audit/03-editor-ai-integration.md` §3.2 |
| **实现量** | 1d |
| **前置依赖** | Change 5（KG aliases） |

**Scope**：
- TipTap 扩展：从 KG 加载实体 name + aliases 构建补全列表
- 输入时自动提示匹配的实体名（角色名、地点名）
- 不需要 LLM 调用，纯本地匹配

---

## Phase 6 — 体验完善

目标：打磨产品体验——i18n、搜索、导出、禅模式、项目模板。

### Change 20: `i18n-framework`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/workbench/spec.md` |
| **审计来源** | `docs/audit/07-quality-and-polish.md` §3.1 |
| **实现量** | 2d |
| **前置依赖** | 无 |

**Scope**：
- 集成 react-i18next
- 抽取所有硬编码中文字符串到 locale 文件
- 支持中英切换

### Change 21: `search-panel-export`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/workbench/spec.md`, `openspec/specs/document-management/spec.md` |
| **审计来源** | `docs/audit/07-quality-and-polish.md` §3.3, §3.4 |
| **实现量** | 4.5d |
| **前置依赖** | 无 |

**Scope**：
- 搜索面板前端（全文搜索 UI、结果列表、跳转到文档位置）
- 导出功能：Markdown / TXT / DOCX 格式

### Change 22: `zen-mode-templates`

| 字段 | 内容 |
|------|------|
| **涉及 Spec** | `openspec/specs/editor/spec.md`, `openspec/specs/project-management/spec.md` |
| **审计来源** | `docs/audit/03-editor-ai-integration.md` §3.5, `docs/audit/06-onboarding-ux-config.md` §3.2 |
| **实现量** | 3d |
| **前置依赖** | 无 |

**Scope**：
- 禅模式：全屏编辑器，隐藏侧边栏/工具栏/面板，仅保留续写按钮
- 项目模板系统：小说 / 短篇 / 剧本 / 自定义，模板定义 KG 预设实体类型和文档结构

---

## 依赖关系图

```
Phase 1 (AI 可用)
  C1 ai-identity-prompt ──┐
  C2 chat-skill ───────────┤ (C2 依赖 C1)
  C3 multi-turn ───────────┤ (C3 依赖 C1)
  C4 api-key-settings ─────┘ (C4 独立，可并行)

Phase 2 (Codex 上下文) ← 依赖 Phase 1
  C5 kg-codex-schema ──────┐
  C6 codex-ref-detection ──┤ (C6 依赖 C5)
  C7 context-codex-fetcher ┤ (C7 依赖 C5+C6)
  C8 memory-ai-injection ──┘ (C8 依赖 C1)

Phase 3 (写作技能+编辑器) ← 依赖 Phase 1
  C9  writing-skills-core ─┐
  C10 write-button-ui ─────┤ (C10 依赖 C9)
  C11 bubble-menu-ai ──────┤ (C11 依赖 C9)
  C12 slash-commands ───────┤ (C12 依赖 C9)
  C13 inline-diff-preview ─┘ (C13 独立)

Phase 4 (叙事记忆) ← 依赖 Phase 1+2
  C14 narrative-state ─────┐ (C14 依赖 C5)
  C15 chapter-synopsis ────┤ (C15 依赖 C9)
  C16 trace-persistence ───┘ (C16 独立)

Phase 5 (语义检索) ← 独立
  C17 local-embedding ─────┐
  C18 hybrid-rag ──────────┤ (C18 依赖 C17)
  C19 entity-completion ───┘ (C19 依赖 C5)

Phase 6 (体验完善) ← 独立
  C20 i18n ────────────────┐
  C21 search-export ───────┤
  C22 zen-templates ───────┘
```

注意：Phase 2 和 Phase 3 之间无依赖，可以并行执行。Phase 5 和 Phase 6 也可并行。

---

## Spec 编写策略

所有 change 在现有 `openspec/specs/<module>/spec.md` 基础上增加内容，不新建 spec 文件。

流程：
1. 创建 `openspec/changes/<change-id>/proposal.md`，用 `[ADDED]`/`[MODIFIED]` 标记 delta
2. 创建 `openspec/changes/<change-id>/tasks.md`，按 TDD 六段式
3. 实现 + 测试
4. PR 合并后将 delta 归档到主 spec
