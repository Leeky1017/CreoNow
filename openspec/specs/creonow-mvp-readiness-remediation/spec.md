# CreoNow MVP Readiness Remediation — OpenSpec

## 元信息

| 字段                    | 值                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 规范名称                | `creonow-mvp-readiness-remediation`                                                                                                                                                         |
| 状态                    | Draft                                                                                                                                                                                       |
| 更新日期                | 2026-02-05                                                                                                                                                                                  |
| 目标                    | 基于 MVP 审评报告，把剩余阻塞项与关键短板**执行化**为可并行、可验收、可测试的任务卡：Phase 1（P0）把 MVP 就绪度从 ~85% 拉到 ≥95%；Phase 2/3（P1/P2）提供 1–2 周的质量/安全/性能加固施工图。 |
| 上游依赖（硬约束）      | `AGENTS.md`、`design/Variant/DESIGN_SPEC.md`、`design/DESIGN_DECISIONS.md`                                                                                                                  |
| 上游规格（关联）        | `openspec/specs/creonow-frontend-full-assembly/spec.md`（本 spec 为其“审评后 delta 执行化”，见 `design/01-delta-map.md`）                                                                   |
| 参考输入（不作为 SSOT） | `/home/leeky/.cursor/plans/creonow_mvp审评报告_1a7946f4.plan.md`                                                                                                                            |
| SSOT（本规范以此为准）  | 本 spec + `design/**` + `task_cards/**`（每张任务卡写死触碰文件、验收标准、测试与边界场景）                                                                                                 |

---

## 给非程序员看的解释（你最关心的：MVP 还能差哪一步？）

审评结论很明确：**MVP 已经能跑、能用，但有 1 个 P0 阻塞会让用户“点了没反应”，以及几处 P0 小缺口会带来明显风险**。

### 当前唯一阻塞（必须优先修）

- **Dashboard 项目操作未闭环（rename/duplicate/archive）**：入口已经在 UI 上，但点击只打印日志，用户无法管理项目（属于“按钮没接电”）。

### P0 小修（不修会有风险/体验断点）

- **Version History Preview 未实现**：版本列表有 Preview 入口，但无行为。
- **Version restore 缺确认**：两处 restore 直接执行，没有 “Are you sure?”，容易误操作。
- **缺少 React ErrorBoundary**：一旦发生渲染异常可能白屏，属于基础稳定性风险。
- **CI 未运行组件测试**：renderer 的 Vitest（组件/Store）缺门禁，容易“本地过、合并后炸”。

本规范的目标是把上述内容变成**可直接派发给执行 Agent 的任务卡**：每张卡都写清楚要改哪些文件、如何验收、必须补哪些测试、哪些边界条件不能漏，从而把 “审评报告” 变成 “可落地施工图”。

---

## Purpose

本规范是 “MVP 审评报告执行化” 的施工图：

- **Spec-first**：先把要求与验收写死，再实现（后续实现必须逐卡执行）。
- **可验收**：每条 Requirement 都能在任务卡里找到对应实现与测试项。
- **不留脑补空间**：任务卡必须写清楚：触碰文件、错误码/确认语义、测试命令、边界场景、并行冲突约束。

---

## Scope

### In scope（本 spec 负责）

#### Phase 1（P0）：MVP 闭环（2–3 天）

- Dashboard：`rename / duplicate / archive` 全链路闭环（含 IPC + service + UI + tests）
- Version History：Preview（只读查看）闭环
- Restore：所有入口必须先确认（SystemDialog）
- React：全局 ErrorBoundary（防白屏 + 可恢复）
- CI：新增 `pnpm -C apps/desktop test:run`（Vitest 组件/Store 门禁）

#### Phase 2（P1）：质量 / 安全 / 架构加固（约 1 周）

- AI History：移除 `MOCK_HISTORY`，切换到真实聊天历史（P1 scope）
- 核心服务单测：`projectService / documentService / kgService / aiService`
- 核心 Store 测试：`aiStore / editorStore / fileStore / projectStore / versionStore / searchStore / kgStore / memoryStore / layoutStore`
- 安全：API Key 使用 keytar 安全存储（替代 SQLite 明文）
- 安全：XSS 防护（禁止裸 `dangerouslySetInnerHTML`；必须 sanitize 或改用安全渲染）
- 架构：消除 `projectId/documentId` 状态冗余（单一事实源）
- 功能：AI 请求重试（429、5xx 指数退避 + jitter + 可取消）

#### Phase 3（P2）：性能 / 代码质量（约 1 周）

- 列表项性能：对高频列表项组件做 `React.memo`（必要时先抽组件）
- 列表虚拟化：Outline/VersionHistory/CommandPalette/SearchPanel
- Zustand：选择器使用 `useShallow`，减少不必要重渲染
- 代码：清理生产代码中的 `console.*`，收敛到统一日志路径
- 代码：处理硬编码 UI 字符串（先常量化；i18n 仅作为后续演进）

### Non-goals（本 spec 不强推，避免范围爆炸）

- Provider 嵌套重构（9 层）与全局架构重排（可作为 P2+）
- IPC handler 拆分（170 行注册函数）的大规模重构（可作为 P2+）
- DB 迁移历史的彻底修复（包括 `0005` 的破坏性迁移）——本 spec 只在相关任务需要时做最小更改
- 完整权限体系（IPC 方法级鉴权）——仅作为安全路线图输入，不作为 P0/P1 阻塞项

---

## Conformance（规范优先级）

1. 仓库宪法：`AGENTS.md`（硬约束，尤其：IPC `{ ok: true|false }`、禁止 silent failure、必须有测试）。
2. 设计规范：`design/Variant/DESIGN_SPEC.md` + `design/DESIGN_DECISIONS.md`（所有 UI/token/交互必须遵循）。
3. 上游组装规范：`openspec/specs/creonow-frontend-full-assembly/spec.md`（本 spec 作为其审评后的 delta；冲突时以本 spec 的**显式决策**为准）。
4. 本规范：`openspec/specs/creonow-mvp-readiness-remediation/spec.md`。
5. 本规范配套设计：`openspec/specs/creonow-mvp-readiness-remediation/design/*.md`。
6. 本规范配套任务卡：`openspec/specs/creonow-mvp-readiness-remediation/task_cards/**/*.md`。

---

## Definitions

- **审评报告**：指 `/home/leeky/.cursor/plans/creonow_mvp审评报告_1a7946f4.plan.md` 的结论与 todo 列表。
- **Delta spec**：只覆盖“审评指出的缺口与后续加固”，不重复描述已完成的 P0 资产组装工作。
- **MVP 阻塞**：用户关键流程无法完成（本 spec 当前唯一阻塞：Dashboard 项目操作）。
- **门禁（Gate）**：在 CI 或 E2E 中可重复执行的验证规则；不允许“肉眼觉得可以”。

---

## Requirements

> 每条 Requirement MUST 可验收（Acceptance），并能在 `task_cards/` 找到对应任务卡与测试项。

<a id="cnmvp-req-001"></a>

### CNMVP-REQ-001: Dashboard 项目操作必须“接电”（rename/duplicate/archive）

Dashboard 中 ProjectCard 的菜单操作 MUST 实现真实行为（禁止 `console.log` 占位）：

- rename：重命名后列表立即更新，重启后仍一致
- duplicate：复制后生成新项目（新 `projectId` + 新 rootPath），并可进入编辑器使用
- archive：归档后从默认列表移出（并提供可恢复语义，见 `design/02-dashboard-project-actions.md`）

#### Scenarios

- **WHEN** 用户在 Dashboard 对项目执行 rename
  - **THEN** MUST 走 IPC → main service → DB 更新 → renderer 列表刷新，并通过 E2E 断言
- **WHEN** 用户执行 duplicate
  - **THEN** MUST 在列表中出现新项目，且能 setCurrent 并进入 Editor
- **WHEN** 用户执行 archive
  - **THEN** MUST 从默认列表隐藏；并且必须存在“可见 + 可操作”的恢复路径（不允许变相 delete）

<a id="cnmvp-req-002"></a>

### CNMVP-REQ-002: Version History Preview 必须是“只读真实内容”

Version History 的 Preview MUST 展示该版本的真实内容（来自 `version:read`），并且 MUST 为只读模式（不得写入/触发 autosave）。

#### Scenarios

- **WHEN** 用户点击某个版本的 Preview
  - **THEN** MUST 在 UI 显示该版本内容与元信息（actor/reason/timestamp），并提供退出预览入口
- **WHEN** 用户处于 Preview
  - **THEN** MUST 禁止编辑；不得触发 `file:document:write`

<a id="cnmvp-req-003"></a>

### CNMVP-REQ-003: Restore 必须统一“确认语义”（SystemDialog）

任何 restore 入口（至少：DiffViewPanel 的 restore、VersionHistoryPanel 的 restore）都 MUST 先弹出确认对话框（SystemDialog），确认后才可调用 `version:restore`。

#### Scenarios

- **WHEN** 用户点击 restore
  - **THEN** MUST 弹 SystemDialog（含明确描述与不可逆提示）；取消则不触发 restore

<a id="cnmvp-req-004"></a>

### CNMVP-REQ-004: React ErrorBoundary 必须防止白屏并可恢复

renderer MUST 提供全局 ErrorBoundary：

- 捕获 render 阶段异常并展示一致的错误 UI（复用 patterns）
- 用户必须能恢复（至少：Reload App / Back to Dashboard 二选一；必须写死行为）

<a id="cnmvp-req-005"></a>

### CNMVP-REQ-005: CI 必须运行 renderer 组件/Store 测试

CI MUST 在 `check` job 中新增一步运行：

- `pnpm -C apps/desktop test:run`

并且失败时阻止合并（required checks 由仓库配置保证）。

<a id="cnmvp-req-006"></a>

### CNMVP-REQ-006: API Key 不得明文落 SQLite（必须迁移到 keytar）

AI Proxy 的 API Key MUST 使用 keytar 存储（系统密钥链），SQLite settings 中不得保留可恢复明文；需要提供向后迁移（从旧值迁入 keytar，并清理旧值）。

<a id="cnmvp-req-007"></a>

### CNMVP-REQ-007: 禁止不经处理的 HTML 注入（XSS 防护）

任何 `dangerouslySetInnerHTML` MUST：

- 要么被移除（改为安全渲染路径）
- 要么在写入前通过 `DOMPurify.sanitize()`（或等价的、写死的 sanitizer）处理

并在测试中覆盖一个“包含潜在 XSS payload 的输入”不会执行脚本。

<a id="cnmvp-req-008"></a>

### CNMVP-REQ-008: projectId/documentId 必须单一事实源（消除冗余）

renderer 的 `projectId/documentId` MUST 形成单一事实源（SSOT），其他 store 不得各自缓存/复制导致可能不一致（详见 `design/07-state-ssot-and-redundancy.md`）。

<a id="cnmvp-req-009"></a>

### CNMVP-REQ-009: AI 请求必须可重试且可取消

AI upstream 请求 MUST：

- 对 429 与 5xx（以及可判定的网络错误）进行指数退避重试（含 jitter）
- 允许 AbortController 取消（取消后不得继续重试）
- 重试策略必须可测试（至少覆盖：429→重试、401/403→不重试、Abort→停止）

<a id="cnmvp-req-010"></a>

### CNMVP-REQ-010: 性能优化必须“可度量且不破坏语义”

P2 性能任务（memo/virtualization/useShallow）必须：

- 不改变交互语义（点击/快捷键/选中态）
- 通过至少一个性能回归保护（例如：渲染次数断言 / 大列表 smoke）

<a id="cnmvp-req-011"></a>

### CNMVP-REQ-011: 生产代码禁止散落 `console.*` 与硬编码字符串扩散

生产代码中的 `console.*` MUST 收敛为统一路径（logger 或 IPC 上报）；UI 字符串 MUST 开始常量化，避免继续扩散（详见 `design/10-code-quality-console-and-strings.md`）。

---

## Deliverables（交付物清单）

- Spec：`openspec/specs/creonow-mvp-readiness-remediation/spec.md`
- Design：`openspec/specs/creonow-mvp-readiness-remediation/design/*.md`
- Task cards：`openspec/specs/creonow-mvp-readiness-remediation/task_cards/**/*.md`

入口索引：

- Task cards index：`openspec/specs/creonow-mvp-readiness-remediation/task_cards/index.md`
