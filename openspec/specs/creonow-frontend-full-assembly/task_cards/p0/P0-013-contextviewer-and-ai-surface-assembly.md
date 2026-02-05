# P0-013: ContextViewer 与 AI Surface 组装（入口 + 选择器对齐）

Status: todo

## Goal

把 `Features/ContextViewer` 从 Storybook-only 组装进真实 AI Surface，并修复/对齐 E2E 选择器：

- AI 面板提供明确的“Context”开关入口（`data-testid="ai-context-toggle"`）
- 打开后渲染 `ContextViewer`（`data-testid="ai-context-panel"`）
- 现有 `context-viewer-redaction.spec.ts` 必须可通过（并留下证据）

同时清理 AI Surface 内残留的占位交互（例如 Skill settings / ChatHistory 的 console.log）。

## Dependencies

- Spec: `../spec.md#cnfa-req-012`
- Spec: `../spec.md#cnfa-req-003`
- Design: `../design/01-asset-inventory-and-surface-map.md`（`Features/ContextViewer` 孤儿）
- P0-002: `./P0-002-command-palette-commands-and-shortcuts.md`
- P0-003: `./P0-003-settingsdialog-as-single-settings-surface.md`（Skill settings 入口）

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/features/ai/AiPanel.tsx`（加入 context toggle 与 ContextViewer 渲染；移除 console.log 占位） |
| Update | `apps/desktop/renderer/src/features/ai/SkillPicker.tsx`（onOpenSettings 打开 SettingsDialog） |
| Update | `apps/desktop/tests/e2e/context-viewer-redaction.spec.ts`（若选择器或流程需同步） |
| Add/Update | `apps/desktop/renderer/src/features/ai/ContextViewer.stories.tsx`（确保与真实入口一致） |

## Acceptance Criteria

- [ ] 入口与可达：
  - [ ] AI 面板存在 Context toggle（`ai-context-toggle`）
  - [ ] 点击后显示 ContextViewer panel（`ai-context-panel`）
  - [ ] 再次点击可关闭（写死语义）
- [ ] 内容与证据：
  - [ ] `ContextViewer` 展示 4 layers（rules/settings/retrieved/immediate）
  - [ ] 展示 stablePrefixHash/promptHash
  - [ ] 展示 trim evidence 与 redaction evidence
- [ ] 占位交互消除：
  - [ ] SkillPicker 的 “settings” 入口不再 `console.log`，而是打开 SettingsDialog（可指定 tab）
  - [ ] ChatHistory 选择 chat 不得 `console.log` 无动作（需实现最小可判定行为：加载/提示不可用/禁用）

## Tests

- [ ] E2E `context-viewer-redaction.spec.ts`（Windows gate）：
  - [ ] 运行 skill 后输出包含 `***REDACTED***` 且不泄露敏感信息
  - [ ] 点击 `ai-context-toggle` → `ai-context-panel` 可见
  - [ ] 断言 4 layers 与 trim 区域存在（选择器与现有断言对齐）

## Edge cases & Failure modes

- 未运行 AI 前打开 ContextViewer：
  - 必须显示 “No context yet” 或 “Loading context…”（可测）
- context 组装失败：
  - 必须显示错误原因（code/message），不得 silent

## Observability

- main.log 必须包含 redaction 证据（E2E 已断言）

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/ContextViewer`：
  - [ ] 长内容滚动正常、不溢出
  - [ ] hashes/层级信息可读（留证到 RUN_LOG）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

