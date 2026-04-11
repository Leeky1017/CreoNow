# 边界决策 + 技术选型记录

> 已确认的技术决策。任何人想改变这些决策，必须提供有力理由并经 Owner 批准。

## 已确认决策

### D-01: 编辑器内核 = ProseMirror（非 TipTap）

**决策日期**：2025（代码考古确认）
**理由**：package.json 依赖 8 个 `prosemirror-*` 包；`shared/editor/prosemirror.ts` 提供类型；已从 TipTap 2 迁移
**影响范围**：`openspec/specs/editor/spec.md`、`apps/desktop/main/src/services/editor/`
**不可逆性**：高——Schema 定义、Plugin 系统、NodeView 全部基于 ProseMirror API

### D-02: 平台 = Electron Only（非 Web）

**决策日期**：2026-04-10
**理由**：Owner 明确指令"我们开发的就是 Electron 的 App 而不是 web"
**影响范围**：所有架构决策、IPC 设计、native 功能（文件系统、SQLite、系统通知）
**`creonow-app/`**：历史原型项目（Next.js），非主前端。保留做 marketing site 或废弃

### D-03: 前端黄金标准 = `figma_design/前端完整参考/`

**决策日期**：2026-04-10
**理由**：Owner 明确指令"我现在要的前端就是 figma_design/前端完整参考这个文件夹中的形态"
**策略**：小修补，不大动。现有设计中的动效、Zen Mode、布局结构、交互模式均属优秀设计，禁止推翻重建
**影响**：所有前端任务必须先读黄金源对应页面的 .tsx 源码

### D-04: 数据层 = SQLite + better-sqlite3 + FTS5 + sqlite-vec

**决策理由**：Electron 本地应用，无服务器；INV-4 Memory-First 要求
**禁止**：FAISS、Pinecone 等外部向量存储（INV-4）
**搜索路径**：KG + FTS5 为主检索，sqlite-vec 语义召回为补充

### D-05: 字体 = Lora + Source Han Serif SC（衬线正文）

**决策日期**：2026-04-11（最终对齐）
**权威源**：`design/system/01-tokens.css` L45
**完整回退链**：`"Lora", "Source Han Serif SC", "Noto Serif SC", serif`
**UI 字体**：Inter
**代码字体**：JetBrains Mono

### D-06: 审计模型 = 1+1+1+Duck（3 路独立审计）

**决策日期**：2026-04-11
**构成**：与主会话同模型 Subagent + Claude Sonnet 4.6 + Rubber Duck GPT-5.4
**主会话**：仅编排，不直接审计
**收口条件**：三路都 zero findings + FINAL-VERDICT + ACCEPT

### D-07: IPC 响应格式 = `{ ok: true/false }`

**决策来源**：`openspec/specs/ipc/spec.md` L114
**注意**：WritingEvent 事件推送负载使用 `success` 字段（已在 document-management/spec.md 中 NOTE 标注）

### D-08: 颜色系统 = 纯黑白单色系

**决策来源**：`CLAUDE.md` Design Context
**禁止**：紫色、蓝色、金色、琥珀色等 "AI 美学" 色彩
**实现**：语义化 Design Token（`--cn-*`），禁止硬编码 hex

### D-09: 视觉 DNA = Linear × Cursor × Bear

**决策来源**：`AGENTS.md` §四 P-V
**关键词**：冷灰、紧凑、克制
**反参考**：聊天气泡 AI、渐变 AI 美学、密集工具栏、扁平到无层次

### D-10: 成瘾触点禁止打断心流

**决策来源**：`docs/references/engagement-engine.md` §八
**约束**：所有通知融入 Dashboard / 边栏 / Toast，禁止弹窗
**查询类 ≤ 200ms**：纯 SQLite + KG，禁止 LLM 调用

## 待决策（需要 Owner 输入）

### PENDING-01: `creonow-app/` 命运
- 选项 A：废弃/归档（纯 Electron，不需要 Web 版）
- 选项 B：改为 marketing site / landing page
- 选项 C：保留为独立 playground

### PENDING-02: 社区 / 分享功能范围
- KG Fork 生态需要服务端（当前纯本地）
- 年度回顾分享需要图片导出能力
- 社交认同（机制 6）依赖用户基数

### PENDING-03: 白噪音音频资源版权
- 维度 1C 白噪音需要内置音频资源
- 需确认：自制 vs 授权 vs CC0 素材
- 打包体积约束：单文件 ≤ 1MB，总计 ≤ 5MB
