# CreoNow Frontend Full Assembly — OpenSpec

## 元信息

| 字段 | 值 |
| --- | --- |
| 规范名称 | `creonow-frontend-full-assembly` |
| 状态 | Draft |
| 更新日期 | 2026-02-04 |
| 目标 | 把**当前已完成的前端资产**（组件/页面/Storybook）组装成一个“能完整使用”的桌面应用前端（App Surface 完整可达、可操作、可测试），并把与后端对接所需的接口位**预留完整**。 |
| 上游依赖（硬约束） | `AGENTS.md`、`design/DESIGN_DECISIONS.md` |
| SSOT（本规范以此为准） | `apps/desktop/renderer/src/**`（真实 App 入口与组装方式）+ `apps/desktop/renderer/src/**/*.stories.tsx`（资产清单） |
| 参考输入（不作为 SSOT） | `design/Variant/designs/*.html`（仅作参考：像素/布局/交互灵感；不得“回退到原型”作为实现目标） |

---

## 给非程序员看的解释（你关心的“是否已组装成完全体？”）

你可以把现在的 CN 前端理解成：

1. **房子主体已经盖起来了**：应用能启动，有“引导页/仪表盘/编辑器/左右面板/命令面板”等骨架。
2. **很多房间家具都做好了（Storybook 里能看到）**：按钮、弹窗、设置页、导出页、禅模式等很多 UI 已经完成。
3. 但目前仍有一些地方属于“**门没装好** / **按钮还没接电**”：
   - 有些面板还在用空数据（显示空列表）或点了只打印日志；
   - 有些完成度很高的 UI（例如 SettingsDialog、ExportDialog、ZenMode、AiDialogs 等）还只在 Storybook，没真正接入应用主流程；
   - 版本对比/恢复、项目管理的部分操作还缺“真正可用”的闭环。

所以答案是：**目前不是完全体**。它已经“半组装可跑”，但还需要一次“把所有资产装进一个可完整使用的应用表面（App Surface）”的工程化组装与验收。

---

## Purpose

本规范是“把现有前端资产拼成完整 App”的**施工图**：

- 不新增“全新设计方向”；以现有资产为准进行组装与补齐。
- 不允许留下“storybook-only 的孤儿组件/页面”（除非被明确标注为仅供 QA 的 Surface，且仍需可达与可验收）。
- 同步把与 main（后端/Electron 主进程）对接所需的 IPC 接口位预留完整，保持 `{ ok: true|false }` 可判定语义。

---

## Scope

### In scope（必须）

- **全资产组装**：以 Storybook meta title（共 57 个）为资产清单，逐一映射到可达的 App Surface 或 QA Surface（见 `design/01-asset-inventory-and-surface-map.md`）。
- **真实可用的 App Surface**：
  - IconBar / Sidebar / RightPanel / CommandPalette 的入口要完整；
  - 所有“可点击的按钮/菜单项/快捷键”必须有明确行为（完成闭环或显式禁用并解释原因；本规范目标是做到“完成闭环”）。
- **后端接口位预留**：对缺失的 IPC 通道给出稳定的 request/response/error 规范（见 `design/03-ipc-reservations.md`）。
- **验证门禁**：
  - 自动化：现有 Playwright Electron E2E + 单元/组件测试扩充到覆盖新增/补齐的组装点。
  - 手工：必须通过“WSL IP 访问 Storybook”的视觉/交互检查并留下证据（见 `design/04-qa-gates-storybook-wsl.md`）。

### Non-goals（本规范不强行推动的事）

- 不引入新的框架/技术选型（遵循仓库既定栈）。
- 不要求把 `design/Variant/designs/*.html` 原型“重新做一遍”；它们只作参考。
- 不要求新增云同步/账号系统等超出当前资产范围的能力。

---

## Conformance（规范优先级）

1. 仓库宪法：`AGENTS.md`（硬约束）。
2. 设计规范：`design/DESIGN_DECISIONS.md`（MUST/SHOULD/MAY）。
3. 前端资产 SSOT：`apps/desktop/renderer/src/**` + Storybook stories。
4. 本规范：`openspec/specs/creonow-frontend-full-assembly/spec.md`。
5. 本规范配套设计：`openspec/specs/creonow-frontend-full-assembly/design/*.md`。
6. 本规范配套任务卡：`openspec/specs/creonow-frontend-full-assembly/task_cards/**/*.md`。

若出现冲突：

- 视觉/交互/快捷键：以 `design/DESIGN_DECISIONS.md` 为准；
- 资产取舍：以“当前前端资产（含 Storybook）”为准，禁止回退到旧原型进行重做；
- 任何冲突都必须在本规范或任务卡中显式记录与消解（不得默认忽略）。

---

## Definitions

- **Asset（资产）**：当前仓库中已经存在的 UI 组件/页面/功能代码与 Storybook stories。
- **Storybook Inventory（资产清单）**：所有 `*.stories.tsx` 的 meta.title（共 57 个）。本规范以它作为“必须覆盖”的最小全集。
- **App Surface（应用表面）**：用户在真实应用中可通过 UI/快捷键到达并操作的页面/面板/弹窗/覆盖层。
- **QA Surface（验收表面）**：为“覆盖全部资产”而存在的可达入口，可以是：
  - App 内的隐藏入口/开发者模式页面；或
  - Storybook（从 Windows 浏览器经 WSL IP 访问）。
  无论哪种形式，都必须可验收且可留下证据。
- **Orphan（孤儿资产）**：存在 Storybook story，但在 App Surface/QA Surface 中没有可达入口、或有入口但无法完成基本交互闭环的资产。

---

## Requirements

> 说明：每条 Requirement 都必须可验收（Acceptance），并能在 task cards 中找到实现路径与测试项。

<a id="cnfa-req-001"></a>

### CNFA-REQ-001: 资产清单 SSOT 与“零孤儿”门禁

系统 MUST 把 Storybook Inventory（57 个 meta.title）作为前端资产清单 SSOT，并为每个条目提供**可追溯的 Surface 映射**：

- 要么映射到 App Surface（正常用户可达）；
- 要么映射到 QA Surface（App 隐藏入口或 Storybook 皆可，但必须可达、可验收且可留下证据）。

#### Scenarios

- **WHEN** 新增/删除 `*.stories.tsx`
  - **THEN** MUST 更新 `design/01-asset-inventory-and-surface-map.md` 的映射表，并确保无孤儿项
- **WHEN** 任何一个 story 的交互路径变化（入口/快捷键/按钮）
  - **THEN** MUST 同步更新映射与验收清单（含 Storybook WSL-IP 检查项）

<a id="cnfa-req-002"></a>

### CNFA-REQ-002: 真实应用可达（入口完整、路径单一）

系统 MUST 提供清晰一致的入口体系，使关键能力可发现：

- IconBar：左侧面板切换（Files/Search/Outline/History/Memory/Characters/KG/Settings）。
- CommandPalette：全局动作（Open Settings / Export / Toggle Panels / Create New Doc 等）。
- 主流程：Onboarding → Dashboard → Editor（含面板与对话框）。

并且 MUST 遵循“一条链路一套实现”：同一能力不得出现两套互相竞争的入口/状态机。

<a id="cnfa-req-003"></a>

### CNFA-REQ-003: 所有可点击交互必须“接电”（禁止占位与 silent failure）

任何用户可触发的交互（按钮/菜单/快捷键）必须满足：

- MUST 有可判定结果（成功/失败），失败必须可观察（UI + 日志/错误码）。
- MUST NOT 仅 `console.log` 或空实现。
- MUST NOT 使用 `catch {}` 吞掉错误。

<a id="cnfa-req-004"></a>

### CNFA-REQ-004: Project Dashboard 完整操作闭环

Dashboard MUST 实现项目的关键操作闭环（至少）：

- rename / duplicate / archive / delete
- 操作必须有确认（用统一的 SystemDialog，而不是散落的 `window.confirm`）
- 操作完成后列表与当前 project 状态一致

<a id="cnfa-req-005"></a>

### CNFA-REQ-005: Sidebar 面板必须是“真数据 + 真动作”

左侧 Sidebar 面板 MUST 满足：

- Files：已具备闭环（作为基线），不得破坏。
- Search：必须可用，且与 project/document 状态一致。
- Outline：必须来自当前文档（而不是空数组），点击可定位到编辑器位置。
- Version History：必须列出版本、可 compare、可 restore（见 CNFA-REQ-006）。
- Memory：已具备闭环（作为基线），不得破坏。
- Characters：必须可 CRUD（本规范推荐复用 Knowledge Graph 作为 SSOT；见 `design/03-ipc-reservations.md`）。
- Knowledge Graph：CRUD + 可视化（至少一个可用视图）。
- Settings：必须只有一个规范入口与持久化语义（见 CNFA-REQ-010）。

<a id="cnfa-req-006"></a>

### CNFA-REQ-006: Version History（list + compare + diff + restore）闭环

系统 MUST 支持版本历史完整闭环：

- list：按时间分组显示
- compare：与当前文档或另一个版本进行 diff，并在 DiffViewPanel 展示
- restore：恢复到某版本（需要确认），并确保 editor/版本/索引一致
- 必须预留并实现 `version:read`（或等价能力）以获得历史内容

<a id="cnfa-req-007"></a>

### CNFA-REQ-007: Export 作为一等公民（对话框 + IPC + 证据）

系统 MUST 将 ExportDialog 组装进真实 App Surface：

- 打开入口：CommandPalette 与（可选）EditorToolbar
- markdown MUST 可用（已实现 IPC），并给出成功/失败反馈
- pdf/docx：若后端暂不支持，UI MUST 明确展示为不可选/不可用，并在 IPC 层返回稳定错误码（接口位必须预留）

<a id="cnfa-req-008"></a>

### CNFA-REQ-008: Command Palette 完整且快捷键不冲突

命令面板 MUST：

- 覆盖本规范要求的关键动作（见 `design/02-navigation-and-surface-registry.md`）
- 快捷键 MUST 与 `design/DESIGN_DECISIONS.md` 一致；不得占用编辑器常用格式化键位（如 Cmd/Ctrl+B）
- 每条命令必须可测试（至少通过一个 E2E 断言入口存在且可触发）

<a id="cnfa-req-009"></a>

### CNFA-REQ-009: Zen Mode 必须是“真实禅模式”

Zen Mode MUST：

- 有明确进入/退出入口（F11 与命令面板）
- 具备可感知的 UI 行为（不只是 collapse panels；应使用 ZenMode 资产或整合为单一路径）

<a id="cnfa-req-010"></a>

### CNFA-REQ-010: Settings（单一路径 + 可持久化 + 可验收）

Settings MUST：

- 在 App 中只有一个权威入口（推荐使用 `Features/SettingsDialog` 作为唯一设置 surface，并吸收现有 SettingsPanel 的必要能力）
- 所有设置项必须有明确持久化语义（PreferenceStore 或 IPC settings），并可通过 E2E 断言“重启后仍生效”

<a id="cnfa-req-011"></a>

### CNFA-REQ-011: Quality Gates 面板必须接入真实 judge/constraints

Quality 面板 MUST：

- 展示来自 `judge:model:*` 与 `constraints:*` 的真实状态
- 失败/降级路径必须可观察（UI 文案 + 错误码 + 日志证据）

<a id="cnfa-req-012"></a>

### CNFA-REQ-012: 验收门禁（自动化 + Storybook WSL-IP 手工）

任何把组装推进一步的 PR 都 MUST：

- 通过自动化测试（至少：相关单测/组件测 + 必要的 Playwright Electron E2E）
- 通过 Storybook 视觉/交互检查（从 Windows 浏览器经 WSL IP 访问），并把证据写入 `RUN_LOG`

验收流程与清单见：`design/04-qa-gates-storybook-wsl.md`。
