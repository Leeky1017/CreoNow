# AI Native 审计路线图：36 Changes × 6 Phases

> 基于 `docs/audit/` 七份审计报告，拆解为可执行的 OpenSpec Change 序列。
> 创建时间：2026-02-12 | 更新：2026-02-13（P1 完成，P2 就绪）
> 总实现量：~29d（不含 spec 编写 ~11d）

## 拆分原则

每个 change 必须满足：
1. **≤1d 实现**（含测试）
2. **只改一个模块的 spec**
3. **可独立验证**（有明确的 `pnpm vitest run` 命令）
4. **Scenario 精确到数据结构和边界条件**

## 架构原则

1. **本地文件系统 > 大上下文窗口** — CN 是 Electron 桌面应用，直接访问项目文件夹。不追求大窗口，而是精确注入 + 持久缓存 + 增量索引。
2. **Codex 引用检测 > 向量 RAG** — 写作上下文 80% 是结构化知识，字符串匹配 + KG 查询优先于向量 embedding。
3. **用户主动触发 > AI 自动弹出** — 续写按钮而非 Ghost Text（ACM CHI 论文论证）。
4. **流动角色 > 固定助手** — ghostwriter/muse/editor/actor/painter 按任务切换。
5. **叙事状态 > 通用偏好** — 记忆是角色状态、伏笔揭示、关系变化，不是通用偏好。

---

## Phase 总览

| Phase | 主题 | Changes | 实现量 | Spec | 累计 |
|-------|------|---------|--------|------|------|
| 1 | AI 可用 | 7 | 5.5d | 2d | 7.5d |
| 2 | Codex 上下文 | 6 | 4.5d | 2d | 14d |
| 3 | 写作技能 + 编辑器 | 8 | 6d | 2.5d | 22.5d |
| 4 | 叙事记忆 + 摘要 | 5 | 4d | 1.5d | 28d |
| 5 | 语义检索 | 4 | 4d | 1.5d | 33.5d |
| 6 | 体验完善 | 6 | 5d | 1.5d | 40d |
| **合计** | | **36** | **29d** | **11d** | **~40d** |

---

## Phase 1 — AI 可用（7 changes, 5.5d）✅ 已完成

目标：AI 功能从"不可用"→"基本可用"。用户可在 AI 面板多轮对话，AI 有写作身份。

| # | Change ID | Module | Scope | Est | 状态 |
|---|-----------|--------|-------|-----|------|
| 1 | `p1-identity-template` | ai-service | 身份提示词模板（5 个 XML 区块） | 0.5d | ✅ #468 |
| 2 | `p1-assemble-prompt` | ai-service | combineSystemText → assembleSystemPrompt 分层组装 | 1d | ✅ #477 |
| 3 | `p1-chat-skill` | skill-system | chat 技能 SKILL.md + 基础意图路由 | 0.5d | ✅ #469 |
| 4 | `p1-aistore-messages` | ai-service | aiStore 增加 messages 数组 + add/clear | 0.5d | ✅ #483 |
| 5 | `p1-multiturn-assembly` | ai-service | LLM 多轮消息组装 + token 裁剪 | 1d | ✅ #486 |
| 6 | `p1-apikey-storage` | workbench | API Key safeStorage + IPC 通道 | 1d | ✅ #470 |
| 7 | `p1-ai-settings-ui` | workbench | AI 设置面板 UI（Key/模型/测试/降级） | 1d | ✅ #476 |

**依赖**：C2→C1, C5→C4→C2, C3 独立, C7→C6, C6 独立

**详细 Scenario 见** `docs/plans/phase1-agent-instruction.md`

---

## Phase 2 — Codex 上下文（6 changes, 4.5d）

目标：KG 实体自动注入 AI 上下文——写作场景最关键的上下文来源。

| # | Change ID | Module | Scope | Est |
|---|-----------|--------|-------|-----|
| 8 | `p2-kg-context-level` | knowledge-graph | entity 增加 `aiContextLevel` 字段 + migration + 编辑 UI | 0.5d |
| 9 | `p2-kg-aliases` | knowledge-graph | entity 增加 `aliases: string[]` 字段 + migration + 编辑 UI | 0.5d |
| 10 | `p2-entity-matcher` | knowledge-graph | 实体名/别名匹配引擎（替换 mock recognizer），100 实体×1000 字 <10ms | 1d |
| 11 | `p2-fetcher-always` | context-engine | rules fetcher: 查询 `aiContextLevel="always"` 实体，格式化注入 | 0.5d |
| 12 | `p2-fetcher-detected` | context-engine | retrieved fetcher: 调用匹配引擎，注入 `when_detected` 实体 | 1d |
| 13 | `p2-memory-injection` | memory-system | Memory previewInjection → AI prompt + KG rules → Context | 1d |

**依赖**：C10→C8+C9, C12→C10+C11, C11→C8, C13→Phase1.C2

**详细 Scenario 见** `docs/plans/phase2-agent-instruction.md`

**关键 Scenario 示例**：

C10 `p2-entity-matcher`:
```
GIVEN KG 有实体 {name: "林默", aliases: ["小默"], aiContextLevel: "when_detected"}
AND KG 有实体 {name: "长安城", aliases: ["长安"]}
AND 输入文本 = "小默推开门，走进长安城"
WHEN 调用 matchEntities(text, entities)
THEN 返回 [{entityId: "林默的ID"}, {entityId: "长安城的ID"}]
AND 执行时间 < 10ms
```

C12 `p2-fetcher-detected`:
```
GIVEN 实体 "林默" aiContextLevel="when_detected"
AND 实体 "魔法系统" aiContextLevel="always"
AND 实体 "大纲笔记" aiContextLevel="never"
AND 光标前文本包含 "林默"
WHEN Context Engine 组装 retrieved 层
THEN 包含林默档案（因为 detected）
AND 不包含魔法系统（由 rules 层处理）
AND 不包含大纲笔记（never）
```

---

## Phase 3 — 写作技能 + 编辑器（8 changes, 6d）

目标：核心写作交互——续写按钮、Bubble AI、Slash Command、Inline Diff。

| # | Change ID | Module | Scope | Est |
|---|-----------|--------|-------|-----|
| 14 | `p3-writing-skills` | skill-system | 5 个写作技能 SKILL.md（write/expand/describe/shrink/dialogue） | 0.5d |
| 15 | `p3-conversation-skills` | skill-system | 3 个对话技能 SKILL.md（brainstorm/roleplay/critique） | 0.5d |
| 16 | `p3-write-button` | editor | 续写悬浮按钮组 UI + 技能调用 | 1d |
| 17 | `p3-bubble-ai` | editor | Bubble Menu AI 按钮（润色/改写/描写/对白） | 1d |
| 18 | `p3-slash-framework` | editor | TipTap Slash Command 扩展框架 + 命令面板 UI | 1d |
| 19 | `p3-slash-commands` | editor | 写作命令集注册（/续写 /描写 /对白 /角色 /大纲 /搜索） | 0.5d |
| 20 | `p3-inline-diff` | editor | Inline diff decoration + 接受/拒绝按钮 | 1d |
| 21 | `p3-shortcuts` | editor | 快捷键系统（Ctrl+Enter 续写、Ctrl+Shift+R 润色等） | 0.5d |

**依赖**：C16/C17→C14, C19→C18, C21→C16+C17, C15/C20 独立

---

## Phase 4 — 叙事记忆 + 摘要（5 changes, 4d）

目标：长篇小说支撑——角色状态跟踪、章节摘要、trace 持久化。

| # | Change ID | Module | Scope | Est |
|---|-----------|--------|-------|-----|
| 22 | `p4-kg-last-seen` | knowledge-graph | entity 增加 `last_seen_state` 字段 + migration + UI | 0.5d |
| 23 | `p4-state-extraction` | knowledge-graph | 章节完成时 LLM 提取角色状态变化，更新 KG | 1d |
| 24 | `p4-synopsis-skill` | skill-system | synopsis 技能 SKILL.md（生成 200-300 字章节摘要） | 0.5d |
| 25 | `p4-synopsis-injection` | context-engine | 摘要持久存储 + 续写时注入前几章摘要 | 1d |
| 26 | `p4-trace-persistence` | memory-system | generation_traces + trace_feedback SQLite 持久化 | 1d |

**依赖**：C23→C22, C25→C24, C26 独立

---

## Phase 5 — 语义检索（4 changes, 4d）

目标：Codex 之外的补充检索——非结构化文本语义搜索。

| # | Change ID | Module | Scope | Est |
|---|-----------|--------|-------|-----|
| 27 | `p5-onnx-runtime` | search-and-retrieval | ONNX Runtime 集成 + bge-small-zh 模型加载推理 | 1d |
| 28 | `p5-embedding-service` | search-and-retrieval | embedding 服务三级降级：ONNX → API → hash | 1d |
| 29 | `p5-hybrid-rag` | search-and-retrieval | Semantic + FTS hybrid ranking (RRF) | 1d |
| 30 | `p5-entity-completion` | editor | KG 实体名 ghost text 补全（纯本地匹配） | 1d |

**依赖**：C28→C27, C29→C28, C30→Phase2.C8

---

## Phase 6 — 体验完善（6 changes, 5d）

目标：产品打磨——i18n、搜索、导出、禅模式、模板。

| # | Change ID | Module | Scope | Est |
|---|-----------|--------|-------|-----|
| 31 | `p6-i18n-setup` | workbench | react-i18next 集成 + locale 文件结构 | 0.5d |
| 32 | `p6-i18n-extract` | workbench | 硬编码中文 → locale keys 抽取 | 1d |
| 33 | `p6-search-panel` | workbench | 搜索面板 UI（全文搜索 + 结果 + 跳转） | 1d |
| 34 | `p6-export` | document-management | Markdown/TXT/DOCX 导出 | 1d |
| 35 | `p6-zen-mode` | editor | 禅模式（全屏编辑器，隐藏侧边栏） | 0.5d |
| 36 | `p6-project-templates` | project-management | 项目模板系统（小说/短篇/剧本/自定义） | 1d |

**依赖**：C32→C31, 其余独立

---

## 依赖关系图

```
Phase 1 (AI 可用, 5.5d)
  C1 identity-template ─┐
  C2 assemble-prompt ───┤ (C2←C1)
  C3 chat-skill ────────┤ (独立)
  C4 aistore-messages ──┤ (C4←C2)
  C5 multiturn-assembly ┤ (C5←C4)
  C6 apikey-storage ────┤ (独立)
  C7 ai-settings-ui ────┘ (C7←C6)

Phase 2 (Codex, 4.5d) ← Phase 1
  C8  kg-context-level ──┐
  C9  kg-aliases ─────────┤ (独立)
  C10 entity-matcher ─────┤ (C10←C8+C9)
  C11 fetcher-always ─────┤ (C11←C8)
  C12 fetcher-detected ───┤ (C12←C10+C11)
  C13 memory-injection ───┘ (C13←P1.C2)

Phase 3 (技能+编辑器, 6d) ← Phase 1
  C14 writing-skills ─────┐
  C15 conversation-skills ┤ (独立)
  C16 write-button ────────┤ (C16←C14)
  C17 bubble-ai ───────────┤ (C17←C14)
  C18 slash-framework ─────┤ (独立)
  C19 slash-commands ──────┤ (C19←C18)
  C20 inline-diff ─────────┤ (独立)
  C21 shortcuts ───────────┘ (C21←C16+C17)

Phase 4 (叙事记忆, 4d) ← Phase 1+2
  C22 kg-last-seen ──┐
  C23 state-extract ──┤ (C23←C22)
  C24 synopsis-skill ─┤ (独立)
  C25 synopsis-inject ┤ (C25←C24)
  C26 trace-persist ──┘ (独立)

Phase 5 (语义检索, 4d) ← 独立
  C27 onnx-runtime ──┐
  C28 embedding-svc ──┤ (C28←C27)
  C29 hybrid-rag ─────┤ (C29←C28)
  C30 entity-complete ┘ (C30←P2.C8)

Phase 6 (体验, 5d) ← 独立
  C31 i18n-setup ──┐
  C32 i18n-extract ┤ (C32←C31)
  C33 search-panel ┤
  C34 export ──────┤
  C35 zen-mode ────┤
  C36 templates ───┘
```

**并行机会**：Phase 2 和 Phase 3 无互相依赖，可并行。Phase 5 和 Phase 6 也可并行。

---

## Spec 编写策略

- 所有 change 在现有 `openspec/specs/<module>/spec.md` 基础上增加内容，不新建 spec 文件
- 每个 change 创建 `openspec/changes/<change-id>/proposal.md`（delta spec）+ `tasks.md`（TDD 六段式）
- **每个 Phase 的 spec 在该 Phase 开始前编写**，不一次性写完所有 spec
- 当同一 Phase 内有 2+ 活跃 change 时，必须维护 `openspec/changes/EXECUTION_ORDER.md`
