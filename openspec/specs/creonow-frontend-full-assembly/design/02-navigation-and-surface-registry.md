# Design 02 — Navigation & Surface Registry（入口与组装中枢）

> Spec: `../spec.md#cnfa-req-002`

本文件定义：把所有资产“装进应用里”时，入口怎么设计、状态怎么收敛、如何避免双栈。

## 1) 核心原则

1. **入口必须少而清晰**：用户不需要知道组件叫啥，只需要知道从哪里进。
2. **同一能力只能有一条权威路径**：尤其是 Settings / Export / Confirm / Zen / Version Compare。
3. **快捷键以 `design/DESIGN_DECISIONS.md` 为准**（全局 MUST 表）。

## 2) Surface 分类（统一语言）

- **Pages（主内容区）**
  - Onboarding / Welcome / Dashboard / Editor / Diff(Compare)
- **Left Panels（Sidebar）**
  - files / search / outline / versionHistory / memory / characters / knowledgeGraph
  - ⚠️ 建议：Settings 不再作为左侧 panel，而是 SettingsDialog（避免双栈）
- **Right Panels（RightPanel）**
  - ai / info / quality
- **Dialogs / Overlays（对话框/覆盖层）**
  - CommandPalette / SettingsDialog / ExportDialog / CreateProjectDialog / CreateTemplateDialog / MemoryCreateDialog / MemorySettingsDialog / SystemDialog / AiDiffModal / ZenMode

## 3) Surface Registry（建议实现形态）

> 目标：让“资产清单”与“应用入口”有一个单点可查的注册表，避免遗漏与双栈。

建议新增一个 registry（实现任务见 `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md`）：

- `SurfaceId`：稳定枚举（字符串 union）
- `SurfaceKind`：`page | leftPanel | rightPanel | dialog | overlay`
- `EntryPoints`：IconBar / CommandPalette / Shortcut / Contextual button（例如 toolbar）
- `TestIds`：每个 surface 至少一个稳定 `data-testid`

示例（概念示意，非代码要求）：

```ts
type SurfaceId = "settings" | "export" | "zenMode" | "versionCompare" | ...;
type EntryPoint = { type: "shortcut" | "command" | "icon" | "button"; id: string };

type SurfaceRegistryItem = {
  id: SurfaceId;
  kind: "page" | "leftPanel" | "rightPanel" | "dialog" | "overlay";
  entryPoints: EntryPoint[];
  testId: string;
  storybookTitle?: string; // 用于零孤儿对齐
};
```

## 4) 入口规范（必须满足）

### 4.1 IconBar（左侧图标栏）

- 只负责“左侧面板的切换”和“进入设置（建议为 SettingsDialog）”。
- 点击行为：
  - 点击不同面板：切换并展开 Sidebar
  - 点击当前面板：折叠/展开 Sidebar（Windsurf 风格）

### 4.2 CommandPalette（命令面板）

必须覆盖（至少）：

- Open Settings（Cmd/Ctrl+,）
- Export…（打开 ExportDialog）
- Toggle Sidebar（Cmd/Ctrl+\\）
- Toggle Right Panel（Cmd/Ctrl+L）
- Toggle Zen Mode（F11）
- Create New Document（Cmd/Ctrl+N）
- Create New Project（Cmd/Ctrl+Shift+N）

并且 MUST 修正快捷键冲突：

- `Cmd/Ctrl+B` 必须留给编辑器加粗（不得占用为 Toggle Sidebar）

### 4.3 快捷键（与 DESIGN_DECISIONS 对齐）

| 功能 | MUST 快捷键 |
| --- | --- |
| Command Palette | Cmd/Ctrl+P |
| Toggle Right Panel | Cmd/Ctrl+L |
| Toggle Sidebar | Cmd/Ctrl+\\ |
| Zen Mode | F11 |
| Settings | Cmd/Ctrl+, |
| New Document | Cmd/Ctrl+N |
| New Project | Cmd/Ctrl+Shift+N |

## 5) 双栈消解（本规范强制收敛点）

### 5.1 Settings：`SettingsPanel` vs `SettingsDialog`

现状：

- App 中已存在 `SettingsPanel`（左侧面板）
- Storybook 中存在 `SettingsDialog`（更完整，但未组装）

规范决策（MUST）：

- **以 `Features/SettingsDialog` 作为唯一 Settings Surface**；
- `SettingsPanel` 的“必要能力”（appearance/proxy/judge/analytics 入口）必须被吸收到 SettingsDialog 中；
- IconBar 的 Settings 点击应打开 SettingsDialog（而不是切换到 left panel）。

### 5.2 Export：CommandPalette 直出 vs ExportDialog

现状：

- CommandPalette 里存在 `Export Markdown`（直接 IPC 调用）
- Storybook 中存在 `ExportDialog`（更完整，但未组装）

规范决策（MUST）：

- 以 `ExportDialog` 作为唯一导出 UI；
- CommandPalette/Toolbar 统一“打开 ExportDialog”，由对话框内部执行导出并给反馈。

### 5.3 Confirm：`window.confirm` vs `SystemDialog`

规范决策（MUST）：

- 全部 destructive 操作必须使用 `Features/AiDialogs` 中的 `SystemDialog`（统一视觉与可测试性）。

## 6) 稳定 `data-testid`（验收必需）

每个 surface 至少一个 testid，建议命名：

- pages：`surface-<id>`（或沿用现有：`welcome-screen`、`dashboard-*`、`editor-pane`）
- dialogs：`dialog-<id>`（例如 `settings-dialog`、`export-dialog`）
- panels：沿用现有 `layout-sidebar` / `layout-panel` 并对内容补齐（例如 `sidebar-outline`）

实现时以“不破坏现有 E2E 断言”为优先。

