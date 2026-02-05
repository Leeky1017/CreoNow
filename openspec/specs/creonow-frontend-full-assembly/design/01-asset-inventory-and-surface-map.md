# Design 01 — Asset Inventory & Surface Map（全资产清单 + 组装映射）

> Spec: `../spec.md#cnfa-req-001`

本文件的目标：把“当前前端资产”完整列出来，并明确每一项在真实应用中的归属与入口。

## 1) 资产清单的生成方式（SSOT）

资产清单以 Storybook meta.title 为准（数量随 stories 变化；截至 2026-02-05 为 56 个），推荐用以下命令提取：

```bash
rg -n 'title:\\s*\"((Primitives|Layout|Features)/[^\"]+)\"' apps/desktop/renderer/src --glob '*.stories.tsx' \
  | sed -E 's/^([^:]+):[0-9]+:.*title:\\s*\"([^\"]+)\".*/\\2\\t\\1/' \
  | sort
```

该输出就是本表格的 SSOT：**任何新增/删除 stories 都必须同步更新本文件。**

## 2) Reachability 口径（如何算“已组装”）

- **App（完整）**：在真实 app 中可通过 UI/快捷键到达，并可完成基本交互闭环。
- **App（部分）**：在 app 中可达，但仍存在空数据/占位动作/TODO/console.log 等，不能视为“完全体”。
- **Storybook-only**：只能在 Storybook 看到，未接入 app（属于孤儿资产，必须组装）。

> 注：Primitives 通常不要求单独的 App 页面；但**必须被真实 App 使用**，并通过 Storybook WSL-IP 做视觉/交互验收。

进一步的“逐项补齐清单（字段/IPC/测试/PR 粒度）”见：`design/06-asset-completion-checklist.md`。

---

## 3) Inventory（56/56）

### 3.1 Features（26）

| Story title | Story file | 当前状态 | 目标归属 / 入口（组装后） | Primary task card |
| --- | --- | --- | --- | --- |
| `Features/AiDialogs` | `apps/desktop/renderer/src/components/features/AiDialogs/AiDialogs.stories.tsx` | Storybook-only | 作为全局确认/错误/AI diff 的统一对话框体系（替换 `window.confirm` / AI apply 相关弹窗） | `task_cards/p0/P0-012-aidialogs-systemdialog-and-confirm-unification.md` |
| `Features/AiPanel` | `apps/desktop/renderer/src/features/ai/AiPanel.stories.tsx` | App（部分） | RightPanel → AI tab；补齐：skill settings、history/new chat 行为、错误可观察性等 | `task_cards/p0/P0-013-ai-surface-assembly-and-observability.md` |
| `Features/AnalyticsPage` | `apps/desktop/renderer/src/features/analytics/AnalyticsPage.stories.tsx` | App（部分） | Settings（单一路径）内可达（从 SettingsDialog 进入） | `task_cards/p0/P0-003-settingsdialog-as-single-settings-surface.md` |
| `Features/CharacterPanel` | `apps/desktop/renderer/src/features/character/CharacterPanel.stories.tsx` | App（部分） | Sidebar → Characters；用 KG 作为 SSOT（Character=KG entity subtype）实现 CRUD + 关系 | `task_cards/p0/P0-008-characters-via-knowledge-graph.md` |
| `Features/CommandPalette` | `apps/desktop/renderer/src/features/commandPalette/CommandPalette.stories.tsx` | App（部分） | Cmd/Ctrl+P；实现全部命令并修正快捷键冲突 | `task_cards/p0/P0-002-command-palette-commands-and-shortcuts.md` |
| `Features/CreateProjectDialog` | `apps/desktop/renderer/src/features/projects/CreateProjectDialog.stories.tsx` | App（部分） | Welcome/Dashboard 入口；补齐模板/描述/封面字段语义（至少不误导） | `task_cards/p0/P0-005-dashboard-project-actions-and-templates.md` |
| `Features/CreateTemplateDialog` | `apps/desktop/renderer/src/features/projects/CreateTemplateDialog.stories.tsx` | App（部分） | CreateProjectDialog 内；自定义模板的保存/校验/错误反馈闭环 | `task_cards/p0/P0-005-dashboard-project-actions-and-templates.md` |
| `Features/Dashboard/DashboardPage` | `apps/desktop/renderer/src/features/dashboard/DashboardPage.stories.tsx` | App（部分） | AppShell → Dashboard；实现 rename/duplicate/archive/delete | `task_cards/p0/P0-005-dashboard-project-actions-and-templates.md` |
| `Features/DiffView` | `apps/desktop/renderer/src/features/diff/DiffView.stories.tsx` | App（部分） | AI apply diff + Version compare diff 统一呈现（单一路径） | `task_cards/p0/P0-007-version-history-compare-diff-restore.md` |
| `Features/Editor/EditorPane` | `apps/desktop/renderer/src/features/editor/EditorPane.stories.tsx` | App（完整） | AppShell → Editor（保持不回归） | `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md` |
| `Features/Editor/EditorToolbar` | `apps/desktop/renderer/src/features/editor/EditorToolbar.stories.tsx` | App（完整） | EditorPane 内；快捷键与 CommandPalette 对齐 | `task_cards/p0/P0-002-command-palette-commands-and-shortcuts.md` |
| `Features/ExportDialog` | `apps/desktop/renderer/src/features/export/ExportDialog.stories.tsx` | Storybook-only | 作为唯一导出 UI（入口：CommandPalette + Toolbar 可选） | `task_cards/p0/P0-004-exportdialog-integration-and-format-support.md` |
| `Features/FileTreePanel` | `apps/desktop/renderer/src/features/files/FileTreePanel.stories.tsx` | App（部分） | Sidebar → Files；确认/删除对话框统一（不使用 `window.confirm`） | `task_cards/p0/P0-012-aidialogs-systemdialog-and-confirm-unification.md` |
| `Features/KnowledgeGraph` | `apps/desktop/renderer/src/components/features/KnowledgeGraph/KnowledgeGraph.stories.tsx` | Storybook-only | Sidebar → KG：在 CRUD 基础上提供“Graph 可视化”视图 | `task_cards/p0/P0-009-knowledge-graph-visualization-assembly.md` |
| `Features/MemoryCreateDialog` | `apps/desktop/renderer/src/features/memory/MemoryCreateDialog.stories.tsx` | App（完整） | MemoryPanel 内（保持不回归） | `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md` |
| `Features/MemoryPanel` | `apps/desktop/renderer/src/features/memory/MemoryPanel.stories.tsx` | App（完整） | Sidebar → Memory（保持不回归） | `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md` |
| `Features/MemorySettingsDialog` | `apps/desktop/renderer/src/features/memory/MemorySettingsDialog.stories.tsx` | App（完整） | MemoryPanel 内（保持不回归） | `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md` |
| `Features/Onboarding/OnboardingPage` | `apps/desktop/renderer/src/features/onboarding/OnboardingPage.stories.tsx` | App（完整） | AppRouter → Onboarding（保持不回归） | `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md` |
| `Features/OutlinePanel` | `apps/desktop/renderer/src/features/outline/OutlinePanel.stories.tsx` | App（部分） | Sidebar → Outline：从当前文档生成大纲并可导航 | `task_cards/p0/P0-006-outline-derived-from-editor-and-navigate.md` |
| `Features/QualityGatesPanel` | `apps/desktop/renderer/src/features/quality-gates/QualityGatesPanel.stories.tsx` | App（部分） | RightPanel → Quality：接入 judge/constraints 的真实状态 | `task_cards/p0/P0-010-rightpanel-info-and-quality-wiring.md` |
| `Features/SearchPanel` | `apps/desktop/renderer/src/features/search/SearchPanel.stories.tsx` | App（完整/需回归验证） | Sidebar → Search（保持可用，补齐空态与错误语义） | `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md` |
| `Features/SettingsDialog` | `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.stories.tsx` | Storybook-only | Settings 的唯一权威 surface（收敛 SettingsPanel） | `task_cards/p0/P0-003-settingsdialog-as-single-settings-surface.md` |
| `Features/SkillPicker` | `apps/desktop/renderer/src/features/ai/SkillPicker.stories.tsx` | App（部分） | AI Surface 内：技能选择 + settings 入口与行为闭环 | `task_cards/p0/P0-013-ai-surface-assembly-and-observability.md` |
| `Features/VersionHistoryPanel` | `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.stories.tsx` | App（部分） | Sidebar → Version History：list/compare/restore | `task_cards/p0/P0-007-version-history-compare-diff-restore.md` |
| `Features/WelcomeScreen` | `apps/desktop/renderer/src/features/welcome/WelcomeScreen.stories.tsx` | App（完整） | AppShell：无项目时展示（保持不回归） | `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md` |
| `Features/ZenMode` | `apps/desktop/renderer/src/features/zen-mode/ZenMode.stories.tsx` | Storybook-only（App 仅有“折叠面板”的半实现） | F11 进入/退出：使用 ZenMode 资产作为单一路径 | `task_cards/p0/P0-011-zen-mode-as-real-surface.md` |

### 3.2 Layout（7）

| Story title | Story file | 当前状态 | 目标归属 / 入口（组装后） | Primary task card |
| --- | --- | --- | --- | --- |
| `Layout/AppShell` | `apps/desktop/renderer/src/components/layout/AppShell.stories.tsx` | App（部分） | 主壳：补齐 compare mode、对话框入口、zen mode 等 | `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md` |
| `Layout/IconBar` | `apps/desktop/renderer/src/components/layout/IconBar.stories.tsx` | App（完整） | 左侧导航（保持不回归） | `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md` |
| `Layout/Resizer` | `apps/desktop/renderer/src/components/layout/Resizer.stories.tsx` | App（完整） | 布局基础（保持不回归） | `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md` |
| `Layout/RightPanel` | `apps/desktop/renderer/src/components/layout/RightPanel.stories.tsx` | App（部分） | Info/Quality tab 真实接电（AI 已可用） | `task_cards/p0/P0-010-rightpanel-info-and-quality-wiring.md` |
| `Layout/Sidebar` | `apps/desktop/renderer/src/components/layout/Sidebar.stories.tsx` | App（部分） | Outline/History/Characters 真实接电 | `task_cards/p0/P0-006-outline-derived-from-editor-and-navigate.md` |
| `Layout/StatusBar` | `apps/desktop/renderer/src/components/layout/StatusBar.stories.tsx` | App（完整/需回归验证） | 状态栏作为可观测入口（可选增加 export/status 快捷信息） | `task_cards/p0/P0-001-surface-registry-and-zero-orphans-gate.md` |
| `Layout/综合测试` | `apps/desktop/renderer/src/components/layout/Layout.stories.tsx` | Storybook-only | 作为“全布局回归”QA story（不要求单独 App 页面） | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |

### 3.3 Primitives（23）

> 目标口径：Primitives 不要求单独的 App 页面；它们通过真实 App 使用 + Storybook WSL-IP 视觉/交互验收来保证“可用且正确”。

| Story title | Story file | 当前状态 | 目标归属 / 入口（组装后） | Primary task card |
| --- | --- | --- | --- | --- |
| `Primitives/Accordion` | `apps/desktop/renderer/src/components/primitives/Accordion.stories.tsx` | Storybook（基线） | 作为 DS 组件；Storybook WSL-IP 验收 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Avatar` | `apps/desktop/renderer/src/components/primitives/Avatar.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Badge` | `apps/desktop/renderer/src/components/primitives/Badge.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Button` | `apps/desktop/renderer/src/components/primitives/Button.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Card` | `apps/desktop/renderer/src/components/primitives/Card.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Checkbox` | `apps/desktop/renderer/src/components/primitives/Checkbox.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Dialog` | `apps/desktop/renderer/src/components/primitives/Dialog.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Heading` | `apps/desktop/renderer/src/components/primitives/Heading.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/ImageUpload` | `apps/desktop/renderer/src/components/primitives/ImageUpload.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Input` | `apps/desktop/renderer/src/components/primitives/Input.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/ListItem` | `apps/desktop/renderer/src/components/primitives/ListItem.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Popover` | `apps/desktop/renderer/src/components/primitives/Popover.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Radio` | `apps/desktop/renderer/src/components/primitives/Radio.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Select` | `apps/desktop/renderer/src/components/primitives/Select.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Skeleton` | `apps/desktop/renderer/src/components/primitives/Skeleton.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Slider` | `apps/desktop/renderer/src/components/primitives/Slider.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Spinner` | `apps/desktop/renderer/src/components/primitives/Spinner.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Tabs` | `apps/desktop/renderer/src/components/primitives/Tabs.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Text` | `apps/desktop/renderer/src/components/primitives/Text.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Textarea` | `apps/desktop/renderer/src/components/primitives/Textarea.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Toast` | `apps/desktop/renderer/src/components/primitives/Toast.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Toggle` | `apps/desktop/renderer/src/components/primitives/Toggle.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |
| `Primitives/Tooltip` | `apps/desktop/renderer/src/components/primitives/Tooltip.stories.tsx` | Storybook（基线） | 同上 | `task_cards/p0/P0-014-storybook-wsl-ip-qa-gate.md` |

---

## 4) 当前“孤儿资产”（必须组装）

以下资产当前仍是 Storybook-only，必须被接入真实 App Surface（或明确的 QA Surface）：

- `Features/SettingsDialog`
- `Features/ExportDialog`
- `Features/AiDialogs`
- `Features/ZenMode`
- `Features/KnowledgeGraph`（可视化部分）
- `Layout/综合测试`（可保持 storybook-only，但必须纳入 QA 回归清单）
