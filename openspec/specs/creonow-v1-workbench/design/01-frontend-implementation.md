# 01 - Frontend Implementation（规范映射 / 页面组件表 / 稳定选择器）

> 前端规范 SSOT：`design/DESIGN_DECISIONS.md`（MUST/SHOULD/MAY）  
> 像素与交互参考：`design/Variant/designs/*.html`（19 个）

本章把“设计规范 + 设计稿”翻译成实现 Agent 可直接施工的前端清单：路由、组件、store、稳定选择器与 E2E 覆盖点。

---

## 1. 硬约束（必须逐条满足）

对应 `openspec/specs/creonow-v1-workbench/spec.md#cnwb-req-010`：

- 前端实现 MUST 以 `design/DESIGN_DECISIONS.md` 为规范来源（含布局尺寸、拖拽规则、快捷键、PreferenceStore 契约、验收清单）。
- 所有颜色/间距/字体 MUST 使用 Design Tokens（CSS Variables）；禁止硬编码色值。
- P0 只交付深色主题；浅色主题 MUST NOT 进入 P0 验收链路。
- 必须提供稳定选择器 `data-testid`，并在 E2E 中使用（禁止依赖易变的 class/文本）。

---

## 2. 代码结构落点（必须对齐 DESIGN_DECISIONS 附录 A.1）

> 说明：本仓库当前 `apps/desktop/**` 为空壳；实现任务必须按此结构创建，避免后续重构成本。

推荐落点（MUST）：

- `apps/desktop/renderer/src/styles/`
  - `tokens.css` / `fonts.css` / `globals.css`
- `apps/desktop/renderer/src/components/`
  - `primitives/`：Button/Input/Card/Separator/Tabs/Dialog/Popover/Tooltip
  - `patterns/`：EmptyState/LoadingState/Toast/ErrorDialog/CommandPalette
  - `layout/`：AppShell/IconBar/Sidebar/Panel/StatusBar/Resizer
- `apps/desktop/renderer/src/features/`：`editor/files/ai/context/memory/kg/search/settings`
- `apps/desktop/renderer/src/stores/`：Zustand stores（含 PreferenceStore 镜像）
- `apps/desktop/renderer/src/lib/`：`ipcClient.ts`、`preferences.ts`、`keybindings.ts`、`redaction.ts`、`diff.ts`

---

## 3. 页面/组件映射表（19 个 HTML → 路由/组件/状态/测试）

> 约定：
>
> - Route 仅用于说明信息架构；实现可用 `react-router` 或等价路由，但必须保持“可从 URL/命令面板抵达”。
> - `Store` 指 Zustand store（或 store slice），用于 E2E 断言“偏好持久化/面板状态”。

| 设计稿                            | 建议 Route / Surface               | 主要组件（建议）          | Store / 状态     | 必须的 `data-testid`        | 最小 E2E 覆盖点               |
| --------------------------------- | ---------------------------------- | ------------------------- | ---------------- | --------------------------- | ----------------------------- |
| `01-login.html`                   | `/welcome`（本地入口，不是云登录） | `WelcomeScreen`           | `projectStore`   | `welcome-screen`            | 打开→可创建项目               |
| `02-onboarding.html`              | `/onboarding`（可跳过）            | `OnboardingScreen`        | `settingsStore`  | `onboarding-screen`         | E2E 模式自动跳过              |
| `03-dashboard-bento-cards.html`   | `/dashboard`（备选布局）           | `DashboardBento`          | `projectStore`   | `dashboard`                 | 不作为 P0 门禁                |
| `04-dashboard-list-progress.html` | `/dashboard`（备选布局）           | `DashboardList`           | `projectStore`   | `dashboard`                 | 不作为 P0 门禁                |
| `05-dashboard-sidebar-full.html`  | `/dashboard`（采用）               | `DashboardShell`          | `projectStore`   | `dashboard`                 | 最近项目列表可用              |
| `06-dashboard-sidebar-dark.html`  | `/dashboard`（备选）               | `DashboardShellAlt`       | `projectStore`   | `dashboard`                 | 不作为 P0 门禁                |
| `07-editor-simple.html`           | Workbench 子状态：Zen              | `ZenMode`                 | `layoutStore`    | `workbench-zen`             | `F11` 进入/退出               |
| `08-editor-workspace.html`        | Workbench（备选）                  | `WorkbenchShellAlt`       | `layoutStore`    | `workbench`                 | 不作为 P0 门禁                |
| `09-editor-full-ide.html`         | `/workbench`（采用）               | `AppShell` + `EditorPane` | `layoutStore`    | `app-shell` `tiptap-editor` | 主链路（创建→编辑→保存）      |
| `10-settings.html`                | `/settings`                        | `SettingsPage`            | `settingsStore`  | `settings-page`             | 可读写关键设置                |
| `11-analytics.html`               | `/analytics`（P1）                 | `AnalyticsPage`           | `statsStore`     | `analytics-page`            | 不作为 P0 门禁                |
| `12-sidebar-filetree.html`        | Sidebar Tab: Files                 | `FileTreePanel`           | `fileStore`      | `sidebar-files`             | 新建/重命名/删除              |
| `13-sidebar-outline.html`         | Sidebar Tab: Outline               | `OutlinePanel`            | `outlineStore`   | `sidebar-outline`           | 跳转到段落/标题               |
| `14-ai-panel.html`                | Right Panel Tab: AI                | `AiPanel`                 | `aiStore`        | `ai-panel`                  | fake AI stream + diff + apply |
| `15-info-panel.html`              | Right Panel Tab: Info              | `InfoPanel`               | `editorStore`    | `info-panel`                | 字数/版本/状态                |
| `16-create-project-dialog.html`   | Dialog                             | `CreateProjectDialog`     | `projectStore`   | `create-project-dialog`     | 创建项目成功                  |
| `17-command-palette.html`         | Overlay                            | `CommandPalette`          | `commandStore`   | `command-palette`           | `Cmd/Ctrl+P` 打开             |
| `18-character-manager.html`       | Sidebar Tab: Characters            | `CharacterManager`        | `characterStore` | `sidebar-characters`        | CRUD（最小）                  |
| `19-knowledge-graph.html`         | Sidebar Tab: KG                    | `KnowledgeGraphPanel`     | `kgStore`        | `sidebar-kg`                | CRUD + context integration    |

---

## 4. 稳定选择器（`data-testid`）规范（CN 必须新增）

### 4.1 命名规则（MUST）

- 关键容器使用“领域前缀 + 语义名”，避免随 UI 重构漂移：
  - `app-shell`, `layout-sidebar`, `layout-panel`, `layout-statusbar`
  - `resize-handle-sidebar`, `resize-handle-panel`
  - `tiptap-editor`
  - `ai-panel`, `ai-diff`, `ai-context-toggle`, `ai-context-panel`
  - `command-palette`
- 对列表项使用稳定业务 id（不得用数组下标）：
  - `file-row-<fileId>` / `skill-row-<skillId>` / `kg-entity-row-<entityId>`
- 对“可运行的 builtin skill”使用 `ai-skill-<skillId>`（例如 `ai-skill-builtin:polish`）。

### 4.2 必须覆盖的 UI 断言点（P0）

- 布局：Sidebar/Panel 的可见性、宽度持久化（拖拽 + 双击复位）。
- 快捷键：`Cmd/Ctrl+P`（命令面板）、`Cmd/Ctrl+L`（AI 面板）、`Cmd/Ctrl+\\`（侧栏折叠）、`F11`（禅模式）。
- 编辑器：可输入、可保存、保存状态提示可见。
- AI：streaming 输出可见；diff 可见；apply 成功后编辑器内容变化。
- Context viewer：layers 可见、redaction 生效（`***REDACTED***`）可断言。

---

## 5. E2E 测试覆盖建议（最小集合）

> Windows-first：所有 P0 关键交互必须落到 Playwright Electron E2E。

- `layout-panels.spec.ts`：Resizer 拖拽范围、双击复位、折叠/展开、持久化、快捷键。
- `editor-autosave.spec.ts`：输入 → 状态 `saving→saved` → 重启恢复。
- `ai-panel-diff-apply.spec.ts`：fake streaming → diff 出现 → apply → 内容变化 → 版本新增。
- `context-viewer-redaction.spec.ts`：watch `.creonow` → context viewer layers → `***REDACTED***` 断言。

---

## Reference (WriteNow)

参考路径：

- `WriteNow/openspec/specs/sprint-write-mode-ide/spec.md`（稳定选择器 + E2E 形态）
- `WriteNow/tests/e2e/app-launch.spec.ts`（最小可用 E2E：启动/创建/保存/DB/日志断言）
- `WriteNow/tests/e2e/sprint-2.5-context-engineering-context-viewer.spec.ts`（context viewer + redaction 的 E2E 断言点）

从 WN 借鉴并迁移到 CN 的关键约束（摘要）：

- `data-testid` 是 E2E 稳定性的核心：重构组件时也必须保持选择器不漂移。
- E2E 必须断言“可观测证据”（例如 UI 状态文字 + 日志 + DB 表存在），而非只断言“没崩”。
