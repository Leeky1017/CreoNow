# CreoNow V1 Workbench — OpenSpec

## 元信息

| 字段                    | 值                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| 规范名称                | `creonow-v1-workbench`                                                                                |
| 状态                    | Draft                                                                                                 |
| 更新日期                | 2026-01-31                                                                                            |
| 目标                    | 在 CN 仓库内交付一套“可执行、可验收、Windows-first”的 V1 Workbench 规范（spec + design + task cards） |
| 上游依赖（CN）          | `AGENTS.md`、`design/DESIGN_DECISIONS.md`、`design/Variant/designs/*.html`                            |
| 参考输入（不作为 SSOT） | `.cursor/plans/cn_v1_windows_full.plan.md`（本地计划，不入库）                                        |
| 参考来源（WN）          | 见各 `design/**` 末尾的 `Reference (WriteNow)`                                                        |

---

## Purpose

CreoNow（CN）V1 的目标是“AI 创作工作台（Workbench）”：以写作编辑器为中心，把 AI（skills）、上下文工程、记忆、知识图谱、检索/RAG、版本历史与可测试的 IPC 契约整合成**单链路**且**可在 Windows 上稳定交付**的桌面应用。

本规范的定位是：**实现 Agent 的施工图**。因此它强调：

- Windows-first：打包/运行/E2E 以 Windows 为真相来源。
- Spec-first：先规范与任务卡，再实现；任务卡必须做到“不给执行者留脑补空间”。
- 可验收：每个关键能力都有明确验收条款与可跑的测试（尤其是 Windows Playwright Electron E2E 门禁）。

---

## Scope

### In scope（V1 必须具备）

- 桌面端：Electron（`electron-vite`）+ React 18 + TS + Vite + Tailwind 4 + Radix UI + TipTap 2 + Zustand + SQLite。
- 写作工作台：三栏布局（IconBar + Sidebar + Editor + Right Panel），并严格对齐 `design/DESIGN_DECISIONS.md` 与 `design/Variant/designs/*.html`。
- 文档模型 SSOT：TipTap/ProseMirror JSON；派生字段用于 FTS/Embedding/导出/版本 diff，但**不得反写**为 SSOT。
- IPC 契约：所有通道返回可判定结果 `{ ok: true|false }`；错误码稳定、可测试；禁止 silent failure。
- AI Runtime：流式输出、取消、超时、上游错误映射；AI Diff → 用户确认 → Apply → 自动落版本（actor=ai）。
- Context Engineering：分层上下文、token budget 与裁剪证据、redaction（脱敏）与 context viewer（可视化）；`.creonow/` 目录语义与 watch。
- Memory：CRUD、settings、injection preview、偏好学习闭环；语义召回可选但必须有降级策略（不阻断技能）。
- Skills：skill package 格式 + validator；builtin/global/project 作用域；UI 入口（AI Panel skills popup + 命令面板）。
- Knowledge Graph：实体/关系 CRUD 与可视化；可作为上下文来源。
- Search/Embedding/RAG：FTS5 全文检索 + 语义检索 + RAG retrieve；retrieved layer 可视化；Windows-first 依赖风险下可降级。
- Constraints/Judge：最小可用的质量门禁通道与 UI；Windows 模型 ensure 或可测降级。
- 测试：Windows runner 上的 Playwright Electron E2E 是门禁；AI 测试必须使用 Fake Provider/Proxy（禁止真实 key / 真实网络依赖）。

### Non-goals（V1 明确不做，且不得作为 P0 阻塞项）

- 浅色主题：V1 只交付深色主题；浅色主题仅作为 P1+ 规划，不进入 P0 验收。
- 云同步/分享/登录体系：不引入账号/云端状态；登录/引导页设计稿若落地，只能是**本地入口**（项目选择/创建），不得引入真实鉴权链路。
- 自动更新：可保留接口位，但不作为 V1 交付要求。
- 多模态（音视频/图片生成）与在线联网搜索：不作为 V1 门禁能力。

---

## Conformance（规范优先级）

1. 仓库宪法：`AGENTS.md`（硬约束）。
2. 前端规范 SSOT：`design/DESIGN_DECISIONS.md`（MUST/SHOULD/MAY）+ `design/Variant/designs/*.html`（像素与交互参考）。
3. 本规范：`openspec/specs/creonow-v1-workbench/spec.md`。
4. 本规范配套设计：`openspec/specs/creonow-v1-workbench/design/*.md`。
5. 本规范配套任务卡：`openspec/specs/creonow-v1-workbench/task_cards/**/*.md`。

若本规范与前端规范冲突：以 `design/DESIGN_DECISIONS.md` 为准，并在本规范内显式修订（不得“默认忽略”）。

---

## Definitions

- **Workbench**：CN V1 的桌面写作工作台（编辑器 + 面板 + AI 工作流）。
- **SSOT**：Single Source of Truth（单一事实源）。V1 的文档 SSOT 是 TipTap JSON。
- **Derived fields**：由 SSOT 生成的派生字段（`content_text` / `content_md` 等），用于索引/检索/版本 diff/导出。
- **Stable Prefix**：为 KV-cache / prompt caching 设计的稳定 system prompt 前缀（结构与序列化稳定）；变化应可解释且可验收。
- **Redaction**：脱敏规则，将敏感信息在 context viewer 与日志中替换为占位符（例如 `***REDACTED***`），并提供证据。

---

## Requirements

> 说明：每条 Requirement 都必须可验收（Acceptance）且能在 task cards 中找到实现路径与测试项。

<a id="cnwb-req-001"></a>

### CNWB-REQ-001: Windows-first 交付真相

CN V1 的打包、运行与 E2E 测试 MUST 以 Windows 为最高优先级；任何“仅在 macOS/Linux 通过”的实现不得视为完成。

#### Scenarios

- **WHEN** PR 合并前运行 CI
  - **THEN** MUST 在 `windows-latest` 运行：安装 → typecheck → lint → Playwright Electron E2E → build:win（产物上传）
- **WHEN** E2E 运行
  - **THEN** MUST 使用隔离的 `CREONOW_USER_DATA_DIR`，不得污染真实用户数据

<a id="cnwb-req-005"></a>

### CNWB-REQ-005: Project 生命周期（create/list/setCurrent/delete + rootPath）

系统 MUST 提供 project 生命周期与 “current project” 的稳定语义，用于承载 `.creonow/`（rules/settings/skills/constraints）、documents/filetree 与 Windows E2E 的可重复入口。

#### Scenarios

- **WHEN** 用户创建项目（或 E2E 创建项目）
  - **THEN** MUST 生成稳定 `projectId`，并返回 `rootPath`
  - **AND** MUST 确保 `<projectRoot>/.creonow/` 存在（见 `design/04-context-engineering.md`）
  - **AND** `rootPath` MUST 支持空格/中文路径（Windows 常见）
- **WHEN** 用户切换当前项目
  - **THEN** MUST 持久化 `currentProjectId`，并在 app 重启后恢复
- **WHEN** 用户删除项目
  - **THEN** MUST 从 `project:list` 消失，且对该 `projectId` 的后续访问 MUST 返回 `NOT_FOUND`（不得 silent fallback）

<a id="cnwb-req-006"></a>

### CNWB-REQ-006: Documents / FileTree（最小闭环：create/open/switch/rename/delete）

系统 MUST 在单个 project 内提供 documents 的最小闭环，并在 UI 提供 Sidebar Files（`12-sidebar-filetree.html`）作为可发现入口；documents 的编辑与保存必须与 `CNWB-REQ-020/030`（SSOT/版本）一致。

#### Scenarios

- **WHEN** 用户创建文档
  - **THEN** MUST 返回稳定 `documentId`，并在 filetree 列表中可见
- **WHEN** 用户切换当前文档（点击 filetree 项）
  - **THEN** editor MUST 切换到对应文档内容，且 `currentDocumentId` MUST 可重启恢复（project 作用域）
- **WHEN** 用户重命名/删除文档
  - **THEN** filetree 与后端 list MUST 立刻一致，且错误语义可判定（例如删除不存在文档 → `NOT_FOUND`）
- **WHEN** E2E 运行
  - **THEN** MUST 提供稳定 `data-testid`（例如 `sidebar-files`、`file-row-<documentId>`）以断言创建/切换/重命名/删除

<a id="cnwb-req-010"></a>

### CNWB-REQ-010: 前端必须以 DESIGN_DECISIONS 为 SSOT（深色主题 P0）

前端实现 MUST 遵循 `design/DESIGN_DECISIONS.md`（tokens/布局/交互/PreferenceStore/验收清单），并以 `design/Variant/designs/*.html` 为像素与交互参考。

#### Scenarios

- **WHEN** 实现三栏布局（Workbench）
  - **THEN** MUST 满足 `IconBar=48px`、`StatusBar=28px`、窗口最小 `1024×640`、Sidebar/Panel 拖拽范围与双击复位等硬约束
- **WHEN** 主题实现
  - **THEN** P0 只要求深色主题；浅色主题 MUST NOT 作为 P0 阻塞项

<a id="cnwb-req-020"></a>

### CNWB-REQ-020: 文档模型 SSOT（TipTap JSON）与派生字段

V1 MUST 以 TipTap/ProseMirror JSON 作为文档单一事实源；每次保存时生成派生字段用于索引与 diff，但派生字段 MUST NOT 反写为 SSOT。

#### Scenarios

- **WHEN** 文档保存
  - **THEN** MUST 持久化 `content_json`（SSOT）与 `content_text`/`content_md`（derived）
- **WHEN** derived 生成失败
  - **THEN** MUST 可判定失败路径（错误码 + 可恢复），不得 silent failure；但不得导致 SSOT 丢失

<a id="cnwb-req-030"></a>

### CNWB-REQ-030: 版本历史（snapshot + diff + restore）

系统 MUST 提供版本历史：快照、diff、恢复；并支持 AI Apply 自动创建版本（actor=ai）。

#### Scenarios

- **WHEN** 自动保存或用户手动保存
  - **THEN** MUST 按策略写入版本（actor=`auto|user`）并可列出
- **WHEN** 用户接受 AI Apply
  - **THEN** MUST 创建新版本（actor=`ai`），并可与上一版本 diff

<a id="cnwb-req-040"></a>

### CNWB-REQ-040: IPC 契约（Envelope + 错误码 + streaming + 取消/超时）

所有 IPC invoke MUST 返回统一 Envelope：成功 `{ ok: true, data }`；失败 `{ ok: false, error }`。错误码 MUST 稳定且集中定义；streaming 事件协议与 cancel/timeout 语义 MUST 明确并可测试。禁止 silent failure。

#### Scenarios

- **WHEN** 参数校验失败
  - **THEN** MUST 返回 `INVALID_ARGUMENT`
- **WHEN** 用户取消
  - **THEN** MUST 返回/回调 `CANCELED` 并清理 pending 状态
- **WHEN** 请求超时
  - **THEN** MUST 返回/回调 `TIMEOUT` 并清理 pending 状态

<a id="cnwb-req-050"></a>

### CNWB-REQ-050: AI Runtime（Fake-first 测试、prompt caching、单链路 proxy）

AI Runtime MUST 支持流式输出、取消、超时、上游错误映射，并提供 Fake Provider/Proxy 以支持在 CI 中无网络/无 key 的可重复测试。

#### Scenarios

- **WHEN** CI/本地以 `CREONOW_E2E=1` 运行
  - **THEN** MUST 可通过 Fake AI server 完成 streaming success/delay/timeout/upstream-error 四种路径的 E2E
- **WHEN** 启用 proxy
  - **THEN** MUST 遵循“单链路原则”：本次请求要么走直连 provider，要么走 proxy；不得同请求双栈重试

<a id="cnwb-req-060"></a>

### CNWB-REQ-060: Context Engineering（layers + 稳定前缀 + 预算/证据 + redaction + viewer）

系统 MUST 实现分层上下文：`rules/settings/retrieved/immediate`；并定义 stable systemPrompt 与 dynamic userContent 的边界，提供 `stablePrefixHash` 验收口径；必须提供 token budget 与裁剪证据；必须实现 redaction，并在 context viewer 中可视化与可断言。

#### Scenarios

- **WHEN** 同一 skill 在相同静态条件下重复运行
  - **THEN** `stablePrefixHash` MUST 一致
- **WHEN** 动态内容变化（选区/指令/检索结果）
  - **THEN** `stablePrefixHash` MUST 不变（仅 `promptHash` 变化）
- **WHEN** 上下文包含敏感信息（key/path 等）
  - **THEN** viewer/logs MUST 展示 `***REDACTED***`，不得泄露明文

<a id="cnwb-req-070"></a>

### CNWB-REQ-070: Memory（可控 + 可学习 + 可降级）

系统 MUST 提供 memory CRUD、settings、injection preview、偏好学习闭环；语义召回（embedding/vector）不可用时 MUST 明确降级且不得阻断技能运行。

#### Scenarios

- **WHEN** injectionEnabled=false
  - **THEN** 注入结果 MUST 为空且模板保持稳定空占位
- **WHEN** embedding/vector 不可用
  - **THEN** memory injection MUST 回退到确定性排序，并记录可观测降级原因

<a id="cnwb-req-080"></a>

### CNWB-REQ-080: Skill System（package + validator + scopes + UI surface）

系统 MUST 支持 skills 包格式（`SKILL.md` YAML frontmatter + markdown body），并对 `context_rules` 做严格校验（未知字段拒绝）。必须支持 builtin/global/project 作用域与启停逻辑，并提供 UI 入口（AI Panel skills popup + 命令面板）。

#### Scenarios

- **WHEN** 读取到不合法 skill
  - **THEN** MUST 标记 invalid 并返回可读错误（不得 silent failure）
- **WHEN** skill 被禁用
  - **THEN** UI 与运行入口 MUST 不可用或明确提示

<a id="cnwb-req-090"></a>

### CNWB-REQ-090: Knowledge Graph（CRUD + context integration）

系统 MUST 提供知识图谱实体/关系的 CRUD 与可视化；图谱内容 MUST 可作为上下文来源（可解释、可关闭、可断言）。

#### Scenarios

- **WHEN** 用户创建实体/关系
  - **THEN** MUST 立刻在 UI 刷新可见，并可被 context viewer 显示为 `retrieved` 或等价来源

<a id="cnwb-req-100"></a>

### CNWB-REQ-100: Search / Embedding / RAG（Windows-first + fallback）

系统 MUST 提供：

- FTS5 全文检索（语法错误映射为 `INVALID_ARGUMENT`）
- 语义检索（embedding + vector store）
- RAG retrieve（预算、分页/游标、retrieved layer 可视化）

Windows-first 下 native 依赖存在风险时，必须有可测的降级策略（不阻断 Workbench 主链路）。

<a id="cnwb-req-110"></a>

### CNWB-REQ-110: Constraints / Judge（最小可用 + 可观测）

系统 SHOULD 提供最小可用的 constraints/judge 通道与 UI，以支持质量门禁与一致性检查；Windows 上模型 ensure/download 必须可观测，或提供可测降级（不 silent failure）。

<a id="cnwb-req-120"></a>

### CNWB-REQ-120: 测试与可观测（证据优先）

V1 的关键链路必须可测且可观测：

- Unit/Integration：覆盖契约校验、序列化稳定性、错误映射、降级策略。
- E2E（Windows Playwright Electron）：覆盖启动、编辑/保存、AI 成功/取消/超时/上游错误、context viewer/redaction、memory preference 学习、skills 启停、KG、search/rag 的最小闭环。
- Observability：日志（main/renderer）必须提供关键证据行；E2E 必须断言关键证据（例如“降级原因”“redaction 生效”）。

---

## Deliverables（本规范在 CN 仓库内的落点）

- 主规范：`openspec/specs/creonow-v1-workbench/spec.md`（本文件）
- 设计文档：`openspec/specs/creonow-v1-workbench/design/00-10*.md`
- 任务卡：`openspec/specs/creonow-v1-workbench/task_cards/`（P0/P1 分级）与 `task_cards/index.md`

---

## Acceptance（文档阶段 DoD）

- [ ] `openspec/specs/creonow-v1-workbench/` 目录存在且包含 `spec.md` + `design/` + `task_cards/`
- [ ] `design/00-10` 最小集合齐全，且每章末尾有 `Reference (WriteNow)`（路径 + 语义提炼；无大段原文粘贴）
- [ ] `task_cards/` 至少 10 张 P0，且每张卡满足“不可误解”的字段要求（Goal/Deps/FileChanges/Acceptance/Tests/EdgeCases/Observability）
- [ ] 内部链接不悬空：引用的 CN 文件必须存在；WN 仅允许以路径引用
- [ ] 明确将“浅色主题”从 V1 关键路径移除（写入 spec + design + task_cards）

---

## Reference (WriteNow)

> 说明：仅列出参考路径；具体“借鉴语义/约束”写在各 `design/**` 文档末尾。

- `WriteNow/openspec/specs/api-contract/spec.md`（IPC envelope + error codes + codegen gate）
- `WriteNow/openspec/specs/sprint-ai-memory/spec.md`（stable prefix + context_rules + preference learning）
- `WriteNow/openspec/specs/sprint-ai-memory-semantic-recall/spec.md`（user_memory_vec + fallback + stablePrefixHash boundary）
- `WriteNow/openspec/specs/sprint-write-mode-ide/spec.md`（写作 IDE 主链路、E2E 门禁、稳定选择器）
- `WriteNow/openspec/specs/sprint-open-source-opt/design/01-prompt-caching.md`（provider native prompt caching）
- `WriteNow/openspec/specs/sprint-open-source-opt/design/05-litellm-proxy.md`（proxy 单链路原则）
