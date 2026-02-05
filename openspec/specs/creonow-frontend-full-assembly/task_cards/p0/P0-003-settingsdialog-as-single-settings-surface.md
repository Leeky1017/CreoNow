# P0-003: SettingsDialog 收敛为唯一 Settings Surface（吸收 SettingsPanel）

Status: todo

## Goal

把 Settings 组装成“单一路径、可持久化、可验收”的真实功能：

- `Features/SettingsDialog` 成为唯一权威设置入口
- 吸收当前 `SettingsPanel` 的必要能力（Appearance / Proxy / Judge / Analytics 入口）
- 入口统一：IconBar Settings + Cmd/Ctrl+, + CommandPalette
- 设置修改后重启仍生效（PreferenceStore/IPC）

## Assets in Scope（对应 Storybook Inventory）

- `Features/SettingsDialog`
- `Features/AnalyticsPage`（作为 Settings 内内容）
-（入口/双栈消解）`Layout/IconBar`、`Layout/Sidebar`

## Dependencies

- Spec: `../spec.md#cnfa-req-010`
- Design: `../design/02-navigation-and-surface-registry.md`
- Design: `../design/03-ipc-reservations.md`
- Design: `../../../design/DESIGN_DECISIONS.md`（快捷键/偏好存储）
- P0-001: `./P0-001-surface-registry-and-zero-orphans-gate.md`
- P0-002: `./P0-002-command-palette-commands-and-shortcuts.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.tsx`（接入真实 settings；新增必要 tab/section；保存/取消语义） |
| Update | `apps/desktop/renderer/src/components/layout/IconBar.tsx`（点击 Settings 打开 SettingsDialog） |
| Update | `apps/desktop/renderer/src/components/layout/Sidebar.tsx`（移除/重定向 settings panel，避免双栈） |
| Update | `apps/desktop/renderer/src/features/settings/SettingsPanel.tsx`（被吸收后应删除或降级为内部组件；不得保留两套入口） |
| Add/Update | `apps/desktop/renderer/src/stores/settingsDialogStore.ts`（可选：管理 dialog open/tab 状态；必须显式依赖注入） |
| Update | `apps/desktop/tests/e2e/theme.spec.ts`（若入口变化需同步） |
| Add | `apps/desktop/tests/e2e/settings-dialog.spec.ts`（新增门禁：打开/修改/持久化） |

## Detailed Breakdown（建议拆分 PR）

1. PR-A：入口统一 + 禁止双栈
   - IconBar/快捷键/命令面板都打开 SettingsDialog
   - Sidebar settings panel 移除或重定向（用户路径只剩一个）
2. PR-B：能力吸收（Appearance/Proxy/Judge/Analytics）
   - SettingsPanel 必要能力迁移到 SettingsDialog（或被内部化组件复用）
   - IPC 错误路径可观察（`code: message`）
3. PR-C：持久化门禁（E2E）
   - 增加 `settings-dialog.spec.ts`：修改设置 → 重启仍生效

## Conflict Notes（并行约束）

- `AppShell.tsx` / `IconBar.tsx` / `Sidebar.tsx` 为高冲突点：按 `design/09-parallel-execution-and-conflict-matrix.md` 规划并行与先后顺序。

## Acceptance Criteria

- [ ] 单一路径（必须）：
  - [ ] IconBar Settings 打开 SettingsDialog（不是切换左侧 settings panel）
  - [ ] Cmd/Ctrl+, 打开 SettingsDialog
  - [ ] CommandPalette “Open Settings” 打开 SettingsDialog
  - [ ] 不再存在第二套 Settings UI 可达入口（禁止双栈）
- [ ] Appearance：
  - [ ] 主题（dark/light/auto 若有）与现有 `themeStore` 一致
  - [ ] 修改后重启仍保持
- [ ] Proxy：
  - [ ] 在 SettingsDialog 内可查看/更新 `ai:proxy:settings:*`
  - [ ] 失败路径可观察（显示错误码与说明）
- [ ] Judge：
  - [ ] 在 SettingsDialog 内可查看 `judge:model:getState`，并可触发 `judge:model:ensure`
  - [ ] 降级/失败语义清晰（UI 文案 + error.code）
- [ ] Analytics：
  - [ ] SettingsDialog 内可打开 AnalyticsPage（或直接吸收其内容）
- [ ] 交互质量：
  - [ ] 对话框焦点管理正确（打开聚焦、关闭回焦点）
  - [ ] ESC 可关闭；点击遮罩关闭语义与现有设计一致

## Tests

- [ ] E2E `settings-dialog.spec.ts`（Windows gate）：
  - [ ] Cmd/Ctrl+, 打开 SettingsDialog（断言 `data-testid`）
  - [ ] 修改一个可持久化设置（例如主题 mode）→ 重启 app → 仍生效
  - [ ] Proxy settings 更新失败时显示错误提示（可用 Fake 响应或断言表单校验）
  - [ ] Judge ensure 触发后 UI 状态更新（可用 Fake/已存在 ensure）

## Edge cases & Failure modes

- Settings 初始值缺失/损坏：
  - MUST 使用以下默认值（不崩溃）：
    - `theme`: `"system"`（跟随系统）
    - `proxyEnabled`: `false`
    - `proxyUrl`: `""`（空字符串）
    - `judgeModelEnabled`: `false`
    - `analyticsEnabled`: `false`
  - 迁移策略：若 schema 变更，MUST 保留已有有效值，缺失字段用默认值填充
- IPC 超时/不可用：
  - MUST 显示明确错误（`code: message`），不得 silent failure
  - 统一超时 30s（见 `design/07-ipc-interface-spec.md`）

## Observability

- 关键设置更新应写入 main.log（若走 IPC），至少包含事件名与 projectId（若相关）
- renderer 侧禁止 `catch {}` 吞错；错误必须进入 UI 提示

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/SettingsDialog`：
  - [ ] 切换 tab 不错乱、滚动正常
  - [ ] 保存/取消按钮行为符合预期（留证到 RUN_LOG；证据格式见 `../design/08-test-and-qa-matrix.md`）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`
