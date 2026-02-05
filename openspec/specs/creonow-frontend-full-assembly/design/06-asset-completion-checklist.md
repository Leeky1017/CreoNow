# Design 06 — Asset Completion Checklist（56/56 逐项补齐清单）

> Spec: `../spec.md#cnfa-req-001`
>
> 本文件来自审计建议：`/home/leeky/.windsurf/plans/creonow-frontend-assembly-planning-assessment-d1c925.md`

本文件的目的：把 56 个前端资产（Storybook meta.title；截至 2026-02-05）逐项拆成“当前 → 目标”的补齐清单，并明确：

- 需要补的功能/字段/交互
- 需要的 IPC（已存在 / 需要新增）
- 需要新增/更新的测试（unit/component/E2E）
- 对应的 P0 任务卡与 PR 粒度建议

> 说明：本清单是 **Implementation DoD**（Definition of Done）。执行时应在对应任务卡的 `Acceptance Criteria` 与 `Tests` 中逐项落地，并在 RUN_LOG 留证（见 `design/08-test-and-qa-matrix.md`）。

---

## 1) 使用方法（执行者指南）

1. 先看 `design/01-asset-inventory-and-surface-map.md`：确定该资产的 App/QA 归属与入口。
2. 再看本文件：把该资产的补齐项拆到对应任务卡（P0/P1），并按建议 PR 粒度拆分。
3. 每完成一个 PR：
   - 补齐自动化测试（至少 unit 或 E2E 之一，关键路径必须 E2E）
   - 做 Storybook WSL-IP 视觉/交互验收并留证（见 `design/04-qa-gates-storybook-wsl.md`）

---

## 2) 56/56 Summary Matrix（逐项概览）

> 表格里的 “补齐要点” 是最小摘要；详细步骤见 §3。

### 2.1 Features（26）

| Story | 状态 | App/QA 目标归属 | Owner (P0) | 补齐要点（摘要） | IPC 依赖 | 测试（新增/更新） |
| --- | --- | --- | --- | --- | --- | --- |
| Features/AiDialogs | Storybook-only | App: SystemDialog/AiError/AiDiff 单链路 | P0-012 | 替换 window.confirm；统一 destructive confirm；（可选）收敛 diff modal | N/A | E2E system-dialog；更新 filetree/kg/dashboard/version restore 流程 |
| Features/AiPanel | App（部分） | RightPanel → AI tab | P0-013 | 消除 console.log 占位；Skill settings 入口对齐 SettingsDialog；History/New Chat 行为可判定 | `ai:skill:*`, `skill:*` | 更新 `ai-runtime.spec.ts`/`skills.spec.ts`；新增 AI surface E2E（history/new chat） |
| Features/AnalyticsPage | App（部分） | SettingsDialog 内 | P0-003 | 把入口从 SettingsPanel 迁移到 SettingsDialog | `stats:*` | 更新 settings-dialog E2E（含打开 analytics） |
| Features/CharacterPanel | App（部分） | Sidebar → Characters | P0-008 | 从 KG 真数据；CRUD + relations；删除确认 | `kg:*` | 新增 characters E2E；unit metadataJson 映射 |
| Features/CommandPalette | App（部分） | Cmd/Ctrl+P 全局入口 | P0-002 | 命令补齐；快捷键不冲突（禁止占用 Cmd/Ctrl+B） | `export:*` 等 | 新增 command-palette E2E |
| Features/CreateProjectDialog | App（部分） | Welcome/Dashboard | P0-005 | 模板/描述/封面字段语义（支持或禁用不误导）；禁止 silent catch | `project:create`, `file:*` | 更新 create-project E2E（如需） |
| Features/CreateTemplateDialog | App（部分） | CreateProjectDialog 内 | P0-005 | 自定义模板校验/错误反馈；若支持模板应用需定义 SSOT | N/A（当前 localStorage） | unit 校验；Storybook QA |
| Features/Dashboard/DashboardPage | App（部分） | AppShell: dashboard | P0-005 | rename/duplicate/archive/delete 真闭环；confirm 统一 | `project:*`（新增） | 新增 dashboard actions E2E |
| Features/DiffView | App（部分） | App: AI apply + version compare | P0-007 | 版本 compare/diff/restore 真闭环；避免多套 diff UI | `version:*` | 新增 version-history E2E |
| Features/Editor/EditorPane | App（基线） | AppShell: editor | P0-001 | 回归不破坏；快捷键不冲突 | `file:*` | 现有 editor E2E 回归 |
| Features/Editor/EditorToolbar | App（基线） | EditorPane | P0-002 | 与命令面板/快捷键一致（尤其 Cmd/Ctrl+B） | N/A | 回归 toolbar unit/component |
| Features/ExportDialog | Storybook-only | App: ExportDialog 唯一 UI | P0-004 | 入口统一（Export…）；UNSUPPORTED 禁用；成功/失败反馈 | `export:*` | 新增 export-dialog E2E；更新 export-markdown E2E |
| Features/FileTreePanel | App（部分） | Sidebar → Files | P0-012 | 删除确认改 SystemDialog；保持原闭环 | `file:*` | 更新 filetree E2E（确认弹窗） |
| Features/KnowledgeGraph | Storybook-only | App: KG Graph view | P0-009 | 可视化接入 KG IPC；node 位置持久化策略 | `kg:*` | 新增 kg visualization E2E；unit kgToGraph |
| Features/MemoryCreateDialog | App（基线） | MemoryPanel 内 | P0-001 | 回归不破坏 | `memory:*` | 现有 memory tests 回归 |
| Features/MemoryPanel | App（基线） | Sidebar → Memory | P0-001 | 回归不破坏 | `memory:*` | 现有 memory E2E 回归 |
| Features/MemorySettingsDialog | App（基线） | MemoryPanel 内 | P0-001 | 回归不破坏 | `memory:*` | 现有 tests 回归 |
| Features/Onboarding/OnboardingPage | App（基线） | AppRouter | P0-001 | 回归不破坏 | N/A | 现有 launch/onboarding E2E 回归 |
| Features/OutlinePanel | App（部分） | Sidebar → Outline | P0-006 | 从编辑器派生；导航到位置；active 高亮 | N/A | unit deriveOutline；新增 outline E2E |
| Features/QualityGatesPanel | App（部分） | RightPanel → Quality | P0-010 | 接 judge/constraints 真状态；禁止“假通过”空数组 | `judge:*`, `constraints:*` | 新增 rightpanel info/quality E2E |
| Features/SearchPanel | App（基线） | Sidebar → Search | P0-001 | 回归 + 空态/错误语义检查 | `search:*`, `rag:*` | 现有 search-rag E2E 回归 |
| Features/SettingsDialog | Storybook-only | App: SettingsDialog 唯一入口 | P0-003 | 吸收 SettingsPanel；持久化；快捷键/入口统一 | `ai:proxy:*`, `judge:*`, `stats:*` | 新增 settings-dialog E2E |
| Features/SkillPicker | App（部分） | AI surface 内 | P0-013 | onOpenSettings 不再 console.log；与 SettingsDialog 对齐 | `skill:*` | component/unit + AI surface E2E |
| Features/VersionHistoryPanel | App（部分） | Sidebar → Version History | P0-007 | 真 list/compare/restore；新增 version:read | `version:*`（新增 read） | 新增 version-history E2E |
| Features/WelcomeScreen | App（基线） | AppShell 空态 | P0-001 | 回归不破坏 | `project:*` | 现有 E2E 回归 |
| Features/ZenMode | Storybook-only（App 半实现） | App: ZenMode overlay | P0-011 | F11/ESC 行为；内容来自当前文档；避免仅折叠面板 | N/A | 新增 zen-mode E2E |

### 2.2 Layout（7）

| Story | 状态 | App/QA 目标归属 | Owner (P0) | 补齐要点（摘要） | IPC 依赖 | 测试（新增/更新） |
| --- | --- | --- | --- | --- | --- | --- |
| Layout/AppShell | App（部分） | App 主壳 | P0-007/P0-011/P0-003 | compare mode 接入真实 diff；zen overlay；settings/export dialog 入口统一 | `version:*` 等 | 更新/新增 E2E：version/zen/settings/export |
| Layout/IconBar | App（基线） | 左侧导航 | P0-001 | Settings icon 行为改为打开 SettingsDialog | N/A | 更新 layout E2E（如断言变更） |
| Layout/Resizer | App（基线） | 布局拖拽 | P0-001 | 回归不破坏 | N/A | 现有 layout E2E 回归 |
| Layout/RightPanel | App（部分） | AI/Info/Quality tabs | P0-010 | Info/Quality 真接电；空态/错误态清晰 | `stats:*`, `judge:*`, `constraints:*` | 新增 rightpanel E2E |
| Layout/Sidebar | App（部分） | files/search/outline/history/... | P0-006/P0-007/P0-008/P0-012 | Outline/History/Characters 真数据；confirm 统一 | 多 | 新增/更新对应 E2E |
| Layout/StatusBar | App（基线） | 底部状态栏 | P0-001 | 回归不破坏；（可选）补充状态文本 | N/A | 现有 tests 回归 |
| Layout/综合测试 | Storybook-only | QA story（回归） | P0-014 | 纳入 WSL-IP 抽查清单 + 证据格式 | N/A | N/A（手工为主） |

### 2.3 Primitives（23）

> Primitives 的“补齐”口径：
>
> - 必须在 Storybook 通过 WSL-IP 视觉/交互验收并留证（P0-014）
> - 必须在真实 App 中至少被一个 surface 使用（否则属于设计系统孤儿）

| Story | 状态 | Owner (P0) | 补齐要点（摘要） | IPC 依赖 | 测试（新增/更新） |
| --- | --- | --- | --- | --- | --- |
| Primitives/Accordion | 基线 | P0-014 | Storybook QA + App 使用点确认 | N/A | Storybook QA + 关键交互单测（如有） |
| Primitives/Avatar | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Badge | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Button | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Card | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Checkbox | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Dialog | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Heading | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/ImageUpload | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Input | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/ListItem | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Popover | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Radio | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Select | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Skeleton | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Slider | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Spinner | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Tabs | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Text | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Textarea | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Toast | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Toggle | 基线 | P0-014 | 同上 | N/A | 同上 |
| Primitives/Tooltip | 基线 | P0-014 | 同上 | N/A | 同上 |

---

## 3) Detailed Completion Checklists（高风险项逐项补齐）

> 说明：这里聚焦 “Storybook-only / App（部分）” 项，给出可直接落到 task card 的步骤列表。

### 3.1 Features/SettingsDialog（Storybook-only → App 单一路径）

- 对应：`P0-003`
- 当前：
  - SettingsPanel 已存在（App 内可达）
  - SettingsDialog 更完整，但未接入 App（孤儿资产）
- 目标：
  - 只有 SettingsDialog 作为权威 Settings Surface（入口：IconBar / Cmd,Ctrl+, / CommandPalette）
- 补齐步骤（最小闭环）：
  - [ ] 增加统一 open/close（来自 Surface Registry），并提供稳定 testid（例如 `settings-dialog`）
  - [ ] 把 SettingsPanel 的能力（appearance/proxy/judge/analytics 入口）迁移到 SettingsDialog
  - [ ] 删除或内部化 SettingsPanel（确保用户路径只有一个）
  - [ ] 持久化：至少一个设置项可在重启后保持（E2E 必测）
  - [ ] 错误可观察：Proxy/Judge IPC 失败时显示 `code: message`
- IPC：
  - 已有：`ai:proxy:settings:get/update/test`、`judge:model:getState/ensure`、`stats:*`
- 测试：
  - E2E：`settings-dialog.spec.ts`（打开/修改/重启仍生效）
  - 回归：`theme.spec.ts`（若入口变化）
- Storybook WSL-IP：
  - 必查：`Features/SettingsDialog`（tab/滚动/焦点/ESC）

### 3.2 Features/ExportDialog（Storybook-only → App 唯一导出 UI）

- 对应：`P0-004`
- 当前：
  - CommandPalette 里有 `Export Markdown`（直出）
  - ExportDialog 存在但未接入（孤儿资产）
- 目标：
  - ExportDialog 成为唯一导出 UI；CommandPalette/Toolbar 只负责“打开它”
- 补齐步骤：
  - [ ] 入口统一：CommandPalette “Export…” 打开对话框
  - [ ] markdown 导出成功/失败可反馈（success view / error）
  - [ ] pdf/docx 若 `UNSUPPORTED`：必须禁用选项并解释（不允许误导）
  - [ ]（可选）将导出结果（relativePath/bytes）展示或可复制
- IPC：
  - 已有：`export:markdown/pdf/docx`（pdf/docx 可能 `UNSUPPORTED`）
- 测试：
  - 更新：`export-markdown.spec.ts`（从直出改为对话框）
  - 新增：`export-dialog.spec.ts`

### 3.3 Features/AiDialogs（Storybook-only → Confirm/Errors 单链路）

- 对应：`P0-012`
- 当前：renderer 中仍有 `window.confirm`（FileTree/KG）
- 目标：全部 destructive confirm 走 SystemDialog；AI 错误/确认 UI 收敛
- 补齐步骤：
  - [ ] 提供全局可复用的 SystemDialog open API（通过 Surface Registry 或局部注入）
  - [ ] 替换 `window.confirm`（FileTree/KG/Dashboard/Version restore）
  - [ ] 为 confirm 添加稳定 testid（可被 E2E 断言）
- 测试：
  - 新增：`system-dialog.spec.ts`（Cancel/Confirm 两条路径）

### 3.4 Features/AiPanel + Features/SkillPicker（App 部分 → 行为可判定 + 无占位）

- 对应：`P0-013`
- 当前：
  - History / New Chat / Skill settings 存在 `TODO`/`console.log` 占位（“看起来能点，其实没闭环”）
  - 现有 E2E 已依赖稳定选择器：`ai-panel`、`ai-input`、`ai-send-stop`、`ai-output`、`ai-error-code`、`ai-skills-toggle`、`ai-skill-<id>`
- 目标：
  - 所有可点击入口必须有可判定行为（完成闭环或显式禁用并解释原因）
  - Skill settings 入口打开 SettingsDialog（可指定 tab/section），禁止 `console.log`
  - History/New Chat 的语义写死并可测（推荐：先做“会话内历史”；不强制引入新 IPC）
- 补齐步骤（最小闭环）：
  - [ ] 清理 AiPanel 内 `console.log`/`TODO`（load chat / new chat / open settings）
  - [ ] 定义并实现 “New Chat” 最小语义：清空当前对话并聚焦输入框（可测）
  - [ ] 定义并实现 “History” 最小语义：展示会话内历史列表；选择后切换对话（可测）
  - [ ] SkillPicker 的 settings 入口对齐 SettingsDialog（参照 `P0-003`：单一路径）
  - [ ] 保持现有 E2E 断言选择器稳定（不得破坏 `ai-runtime.spec.ts`/`skills.spec.ts`）
- IPC：
  - 已有：`ai:skill:run/cancel/feedback`、`skill:list/read/toggle/write`
  - 新增（仅当明确需要持久化聊天）：`ai:chat:*`（必须单独提案；本规范不默认要求）
- 测试：
  - 回归/更新：`apps/desktop/tests/e2e/ai-runtime.spec.ts`、`apps/desktop/tests/e2e/skills.spec.ts`
  - 新增（若引入 History/New Chat 交互）：`apps/desktop/tests/e2e/ai-history.spec.ts`（或扩展 ai-runtime）
- Storybook WSL-IP：
  - 必查：`Features/AiPanel`、`Features/SkillPicker`

### 3.5 Features/Dashboard/DashboardPage（App 部分 → 项目操作闭环）

- 对应：`P0-005`
- 当前：rename/duplicate/archive/delete 仍为 TODO + console.log
- 目标：四个操作全部闭环（含确认与错误）
- 补齐步骤：
  - [ ] 后端新增 IPC：`project:rename/duplicate/archive`
  - [ ] 前端 store 增加 actions + optimistic/rollback 策略（可判定）
  - [ ] 删除必须 SystemDialog 确认
  - [ ] current project 被删除/归档时 UI 状态一致（返回 dashboard）
- 测试：
  - 新增：`dashboard-project-actions.spec.ts`（覆盖四个动作 + 重启保持）

### 3.6 Features/OutlinePanel（App 部分 → 从编辑器派生 + 导航）

- 对应：`P0-006`
- 当前：Sidebar 传 `items={[]}`，导航仅 console.log
- 目标：从当前文档派生 heading outline；点击导航到位置；active 高亮
- 补齐步骤：
  - [ ] 新增纯函数 deriveOutline（unit 覆盖边界）
  - [ ] 新增 container 接 editorStore，提供 items/activeId/onNavigate
  - [ ] Sidebar 使用 container，移除占位与 console.log
- 测试：
  - unit：deriveOutline
  - E2E：outline-panel

### 3.7 Features/VersionHistoryPanel（App 部分 → compare/diff/restore）

- 对应：`P0-007`
- 当前：Sidebar 传空 timeGroups；compare placeholder；AppShell compare diffText 为空
- 目标：真实 list/compare/restore + 新增 `version:read`
- 补齐步骤：
  - [ ] main 新增 `version:read`（schema + handler + service）
  - [ ] renderer 获取 timeGroups 并渲染
  - [ ] compare：拉历史内容 → unifiedDiff → Diff surface
  - [ ] restore：SystemDialog 确认 → version:restore → editor 刷新
- 测试：
  - 新增：version-history E2E

### 3.8 Features/CharacterPanel（App 部分 → KG 视图）

- 对应：`P0-008`
- 当前：Sidebar 渲染 `characters={[]}`
- 目标：用 KG entities/relations 表达人物与关系；不引入第二套 SSOT
- 补齐步骤：
  - [ ] 定义 entityType/metadataJson 映射（unit）
  - [ ] container 接入 kgStore，提供 CRUD + relations
  - [ ] 删除确认使用 SystemDialog
- 测试：
  - unit：metadataJson 映射
  - E2E：characters CRUD + relation

### 3.9 Features/KnowledgeGraph（Storybook-only → Graph view 接入）

- 对应：`P0-009`
- 当前：App 只有 KG CRUD panel；可视化组件为孤儿资产
- 目标：Sidebar KG 支持 Graph view（可视化）并与 CRUD 同步
- 补齐步骤：
  - [ ] kgToGraph 映射：KG → graph nodes/edges
  - [ ] 节点位置持久化（metadataJson）
  - [ ] CRUD 与 graph 两个视图一致（创建/删除/更新）
- 测试：
  - unit：kgToGraph
  - E2E：kg visualization

### 3.10 Features/ZenMode（Storybook-only → 真 Zen overlay）

- 对应：`P0-011`
- 当前：AppShell 仅折叠 panels；ZenMode 资产未使用
- 目标：F11/ESC 切换 overlay；内容来自当前文档
- 补齐步骤：
  - [ ] AppShell 渲染 ZenMode overlay（`data-testid="zen-mode"`）
  - [ ] 进入/退出策略写死（恢复布局状态）
  - [ ] 文档内容提取：标题 + 段落文本 + 字数（最小）
- 测试：
  - E2E：zen-mode

### 3.11 Layout/RightPanel + Features/QualityGatesPanel（占位 → 真接电）

- 对应：`P0-010`
- 当前：Info 为占位；Quality 传空 checkGroups 且默认 all-passed（风险：假通过）
- 目标：Info/Quality 展示真实 stats/judge/constraints 与错误语义
- 补齐步骤：
  - [ ] Info：显示至少一个真实字段（word count 或 stats）
  - [ ] Quality：显示 judge 状态 + constraints 数量；失败可观察
- 测试：
  - E2E：rightpanel-info-quality

### 3.12 Layout/综合测试（Storybook-only QA story）

- 对应：`P0-014`
- 补齐步骤：
  - [ ] 纳入 Storybook WSL-IP 抽查清单（Layout 回归）
  - [ ] RUN_LOG 证据格式标准化（截图/操作步骤/日志片段）
